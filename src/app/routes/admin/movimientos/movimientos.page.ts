import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ViewWillEnter } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { Transaction } from '../interface/meritop.interface';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs';
import { DataArysService } from '../services/data-arys.service';
import { MeritopSummaryCacheService } from '../services/meritop-summary-cache.service';
import { resolveMeritopClientIdentity } from '../utils/meritop-identity.util';

@Component({
  selector: 'app-movimientos',
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink],
  providers: [DataArysService]
})
export class MovimientosPage implements OnInit, ViewWillEnter {
  private meritopService = inject(MeritopService);
  private meritopCache = inject(MeritopSummaryCacheService);
  private dataArysService = inject(DataArysService);
  private navCtrl = inject(NavController);

  public transactions: Transaction[] = [];
  public groupedTransactions: { date: string, items: Transaction[] }[] = [];
  public selectedTransaction: Transaction | null = null;
  public receiptOpen = false;
  public showLoading = false;
  public selectedSegment: string = 'ultimos';
  public dateFrom: string = '';
  public dateTo: string = '';
  public debtAmount = 0;
  public limitAmount = 0;
  public creditAvailableAmount = 0;
  public minPayAmount = 0;
  public creditPayBefore = '';
  public cardNumber = '';
  private docId: number | null = null;
  private docType = '';
  private productId: string | null = null;

  public membershipSummary: any = null;
  private accessTokenData: any = null;
  private skipNextMeritopViewRefresh = true;

  // Evita “parpadeo” de saldos (membresía -> Meritop)
  public summaryReady = false;
  private membershipLoaded = false;
  private productLoaded = false;

  private updateSummaryReady() {
    this.summaryReady = this.membershipLoaded && this.productLoaded;
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      let normalized: string;
      if (trimmed.includes(',')) {
        normalized = trimmed.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = trimmed;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Pago mínimo: solo campos de Meritop; si no envía monto, 0. */
  private resolveMeritopMinPayment(product: any): number {
    if (!product || typeof product !== 'object') return 0;
    const candidates = [
      product.amount_share_to_pay,
      product.amount_share_to_pay_converted,
      product.min_pay,
      product.minimum_payment,
      product.share_to_pay,
    ];
    for (const c of candidates) {
      const n = this.toNumber(c);
      if (n > 0) return parseFloat(n.toFixed(2));
    }
    return 0;
  }

  private normalizeTransaction(raw: any): Transaction {
    const date = raw?.date ?? raw?.datetime ?? raw?.created_at ?? raw?.createdAt ?? '';
    const amount = this.toNumber(raw?.amount ?? raw?.monto ?? 0);
    const typeTransaction = String(raw?.type_transaction ?? '').trim();
    const reference = String(raw?.reference ?? '').trim();
    const concept = String(raw?.concept ?? raw?.description ?? raw?.transaction_desc ?? '').trim();
    const displayName = typeTransaction || 'Movimiento';

    return {
      transactionId: String(raw?.transactionId ?? raw?.id ?? reference ?? ''),
      amount,
      description: concept,
      merchantName: displayName,
      reference,
      date: String(date),
      type: this.resolveTransactionVisualType(typeTransaction, raw, amount),
      status: String(raw?.status ?? '').trim(),
      paymentType: String(raw?.payment_type ?? '').trim(),
      paymentStatus: String(raw?.payment_status ?? '').trim(),
      symbol: String(raw?.symbol ?? 'Bs').trim() || 'Bs',
      cardNumber: String(raw?.cardnumber ?? raw?.cardNumber ?? '').trim(),
      amountConverted: this.toNumber(raw?.amount_converted ?? 0),
      exchangeRate: this.toNumber(raw?.exchange_rate ?? 0),
    };
  }

  private resolveTransactionVisualType(
    typeTransaction: string,
    raw: any,
    amount: number
  ): string {
    const t = typeTransaction.toLowerCase();
    if (/comisi[oó]n|commission/i.test(t)) return 'commission';
    if (/consumo|purchase/i.test(t)) return 'purchase';
    if (/pago|payment/i.test(t)) return 'payment';
    if (this.isCommissionFromRaw(raw, amount, typeTransaction, '')) return 'commission';
    return amount < 0 ? 'purchase' : 'payment';
  }

  private isCommissionFromRaw(
    raw: any,
    amount: number,
    description: string,
    merchantName: string
  ): boolean {
    const blob = [
      raw?.type_transaction,
      raw?.payment_type,
      raw?.concept,
      raw?.description,
      raw?.transaction_desc,
      raw?.transaction_type,
      raw?.tipo,
      description,
      merchantName,
    ]
      .filter((v) => v != null && String(v).trim() !== '')
      .join(' ')
      .toLowerCase();

    if (/comisi[oó]n|commission|\bfee\b|cargo\s*(admin|servicio|bancario)?/i.test(blob)) {
      return true;
    }
    return amount < 0 && !description && !merchantName;
  }

  private isPagoMovilTx(tx: Transaction): boolean {
    const text = `${tx.description} ${tx.merchantName}`.toLowerCase();
    return /pago\s*m[oó]vil|addpurchase|purchase/i.test(text);
  }

  /** Empareja cargos sin etiqueta (~5% del Pago Móvil del mismo minuto) como comisión. */
  private labelLinkedCommissions(transactions: Transaction[]): Transaction[] {
    const minuteKey = (tx: Transaction): string => {
      const d = this.parseTxDate(tx);
      if (!d) return `id:${tx.transactionId}`;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    };

    const groups = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = minuteKey(tx);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    for (const items of groups.values()) {
      const pagoMoviles = items.filter((t) => t.type !== 'commission' && this.isPagoMovilTx(t));
      if (!pagoMoviles.length) continue;

      for (const tx of items) {
        if (tx.type === 'commission') continue;
        const desc = `${tx.description} ${tx.merchantName}`.trim();
        if (desc) continue;
        if (tx.amount >= 0) continue;

        const absCommission = Math.abs(tx.amount);
        const linked = pagoMoviles.find((pm) => {
          const absPm = Math.abs(pm.amount);
          if (absPm <= 0) return false;
          const ratio = absCommission / absPm;
          return ratio >= 0.01 && ratio <= 0.12;
        });
        if (!linked) continue;

        tx.type = 'commission';
        if (!tx.merchantName || tx.merchantName === 'Movimiento') {
          tx.merchantName = 'Comisión';
        }
      }
    }

    return transactions;
  }

  private prepareTransactions(source: any[]): Transaction[] {
    const mapped = source.map((t: any) => this.normalizeTransaction(t));
    return this.labelLinkedCommissions(mapped);
  }

  private parseTxDate(tx: Transaction): Date | null {
    const raw = (tx?.date ?? '').toString().trim();
    if (!raw) return null;

    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;

    // Soporte extra por si viene sin separadores / formatos raros.
    const normalized = raw.replace(' ', 'T');
    const d2 = new Date(normalized);
    if (!Number.isNaN(d2.getTime())) return d2;

    return null;
  }

  constructor() {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      try {
        this.accessTokenData = jwtDecode(token);
      } catch (e) {
        console.error('Token invalido', e);
      }
    }
  }

  ngOnInit() {
    this.summaryReady = false;
    this.membershipLoaded = false;
    this.productLoaded = false;
    this.initializeDateRange();
    this.loadMembershipSummary();
    const usedCache = this.hydrateMeritopFromCache();
    if (usedCache) {
      this.productLoaded = true;
      this.updateSummaryReady();
      this.fetchTransactions();
    }
    this.loadCustomerProduct(usedCache);
  }

  ionViewWillEnter(): void {
    if (this.skipNextMeritopViewRefresh) {
      this.skipNextMeritopViewRefresh = false;
      return;
    }
    this.refreshMeritopSilent();
  }

  private hydrateMeritopFromCache(): boolean {
    try {
      const cached = this.meritopCache.read();
      if (!cached) return false;
      const limit = this.toNumber(cached?.limit ?? 0);
      const available = this.toNumber(cached?.available ?? 0);
      if (limit <= 0) return false;
      this.limitAmount = limit;
      this.creditAvailableAmount = available;
      this.debtAmount = this.toNumber(cached?.amount_used ?? 0);
      this.minPayAmount = this.resolveMeritopMinPayment({
        amount_share_to_pay: cached?.amount_share_to_pay,
        amount_share_to_pay_converted: cached?.amount_share_to_pay_converted,
        min_pay: cached?.min_pay,
        minimum_payment: cached?.minimum_payment,
        share_to_pay: cached?.share_to_pay,
      });
      this.creditPayBefore = cached?.credit_pay_before != null ? String(cached.credit_pay_before) : '';
      this.cardNumber = cached?.cardnumber != null ? String(cached.cardnumber) : this.cardNumber;
      this.productId = cached?.id != null ? String(cached.id) : this.productId;

      // Si no viene productId en caché, no podemos pedir movimientos.
      if (!this.productId) return false;

      const identity = this.getIdentity();
      if (!identity) return false;
      this.docType = identity.doctype;
      this.docId = identity.docid;
      return true;
    } catch {
      return false;
    }
  }

  private loadMembershipSummary() {
    const idRaw = sessionStorage.getItem('id_member');
    const idMember = idRaw ? Number(idRaw) : NaN;
    const email = this.accessTokenData?.email != null ? String(this.accessTokenData.email).trim() : '';

    const req = !Number.isNaN(idMember) && idMember > 0
      ? this.dataArysService.get_membership(idMember)
      : email ? this.dataArysService.get_membership_by_email(email) : null;

    if (!req) {
      this.membershipLoaded = true;
      this.updateSummaryReady();
      return;
    }

    req.subscribe({
      next: (res: any) => {
        const row = res?.status && Array.isArray(res.data) && res.data.length ? res.data[0] : null;
        if (!row) {
          this.membershipSummary = null;
          return;
        }
        this.membershipSummary = {
          credit_line_id: row.credit_line_id != null ? String(row.credit_line_id) : null,
          cedrif_credit: row.cedrif_credit != null ? String(row.cedrif_credit) : null,
          credit_limit: row.credit_limit,
          credit_available: row.credit_available,
          credit_used: row.credit_used,
        };
        this.membershipLoaded = true;
        this.updateSummaryReady();
      },
      error: () => {
        this.membershipSummary = null;
        this.membershipLoaded = true;
        this.updateSummaryReady();
      }
    });
  }

  private initializeDateRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom = this.toInputDate(firstDay);
    this.dateTo = this.toInputDate(now);
  }

  private toInputDate(date: Date): string {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60000);
    return adjusted.toISOString().slice(0, 10);
  }

  private getIdentity() {
    return resolveMeritopClientIdentity({ membershipRow: this.membershipSummary });
  }

  private applyMeritopProduct(product: any): void {
    if (!product) return;
    this.debtAmount = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
    this.limitAmount = this.toNumber(product.limit ?? 0);
    this.creditAvailableAmount = this.toNumber(product.available ?? 0);
    this.minPayAmount = this.resolveMeritopMinPayment(product);
    this.creditPayBefore = String(product.credit_pay_before ?? '');
    this.cardNumber = String(product.cardnumber ?? '');
    this.productId = String(product.id ?? '');
    this.meritopCache.persistFromProduct(product);
  }

  private refreshMeritopSilent(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    this.docType = identity.doctype;
    this.docId = identity.docid;
    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product) => {
        if (product) {
          this.applyMeritopProduct(product);
          this.fetchTransactions();
        }
      },
    });
  }

  private loadCustomerProduct(silentRefresh = false) {
    const identity = this.getIdentity();
    if (!identity) {
      this.transactions = [];
      this.groupTransactions();
      this.productLoaded = true;
      this.updateSummaryReady();
      return;
    }

    this.docType = identity.doctype;
    this.docId = identity.docid;

    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product) => {
        if (!product) {
          this.transactions = [];
          this.groupTransactions();
          return;
        }
        this.applyMeritopProduct(product);
        this.fetchTransactions();
      },
      error: () => {
        if (!silentRefresh) {
          this.transactions = [];
          this.groupTransactions();
        }
      },
      complete: () => {
        this.productLoaded = true;
        this.updateSummaryReady();
      },
    });
  }

  get displayCreditLimit(): number {
    const cLim = this.toNumber(this.limitAmount);
    const mLim = this.toNumber(this.membershipSummary?.credit_limit);
    if (cLim <= 0 && mLim > 0) return mLim;
    return cLim;
  }

  get displayDebtAmount(): number {
    const cDebt = this.toNumber(this.debtAmount);
    const mDebt = this.toNumber(this.membershipSummary?.credit_used);
    if (this.toNumber(this.limitAmount) <= 0 && mDebt > 0) return mDebt;
    return cDebt;
  }

  get availableAmount(): number {
    if (this.toNumber(this.limitAmount) > 0) {
      return this.toNumber(this.creditAvailableAmount);
    }
    return this.toNumber(this.membershipSummary?.credit_available);
  }

  get hasDebt(): boolean {
    return this.summaryReady && this.displayDebtAmount > 0;
  }

  get cardMask(): string {
    const card = (this.cardNumber || '').trim();
    if (!card) return '----';
    return `**** ${card.slice(-4)}`;
  }

  get formattedPayBefore(): string {
    if (!this.summaryReady) return '--';
    const raw = (this.creditPayBefore ?? '').toString().trim();
    if (!raw) return '--';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  public applyDateFilter() {
    this.fetchTransactions();
  }

  public fetchTransactions() {
    this.showLoading = true;
    this.transactions = [];
    this.groupTransactions();

    if (!this.docType || !this.docId || !this.productId) {
      this.transactions = [];
      this.groupTransactions();
      this.showLoading = false;
      return;
    }

    const request = {
      doctype: this.docType,
      docid: this.docId,
      ProductId: this.productId,
      channel: 'APP',
      terminal: 'MOBILE_01',
      ip: '192.168.1.100'
    };

    if (this.selectedSegment === 'ultimos') {
      this.meritopService.getTransactionList(request)
        .pipe(finalize(() => this.showLoading = false))
        .subscribe({
          next: (res) => {
            const source = res?.transactions || [];
            this.transactions = this.prepareTransactions(source);
            this.groupTransactions();
          },
          error: () => {
            this.transactions = [];
            this.groupTransactions();
          }
        });
    } else {
      const requestByDate = {
        ...request,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo
      };

      this.meritopService.getTransactionListByMonth(requestByDate)
        .pipe(finalize(() => this.showLoading = false))
        .subscribe({
          next: (res) => {
            const source = res?.transactions || [];
            this.transactions = this.filterTransactionsByDateRange(this.prepareTransactions(source));
            this.groupTransactions();
          },
          error: () => {
            this.transactions = [];
            this.groupTransactions();
          }
        });
    }
  }

  private filterTransactionsByDateRange(source: Transaction[]): Transaction[] {
    if (!this.dateFrom || !this.dateTo) return source;

    const from = new Date(`${this.dateFrom}T00:00:00`).getTime();
    const to = new Date(`${this.dateTo}T23:59:59`).getTime();

    if (Number.isNaN(from) || Number.isNaN(to) || from > to) return source;

    return source.filter(tx => {
      const d = this.parseTxDate(tx);
      const txTime = d ? d.getTime() : NaN;
      if (Number.isNaN(txTime)) return false;
      return txTime >= from && txTime <= to;
    });
  }

  private groupTransactions() {
    const groups: { [key: string]: Transaction[] } = {};

    this.transactions.forEach(tx => {
      const date = this.parseTxDate(tx);
      const dateStr = date ? this.formatDateHeader(date) : 'Sin fecha';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(tx);
    });

    this.groupedTransactions = Object.keys(groups).map(date => ({
      date,
      items: groups[date]
    })).sort((a, b) => {
      const da = this.parseTxDate(a.items[0])?.getTime() ?? 0;
      const db = this.parseTxDate(b.items[0])?.getTime() ?? 0;
      return db - da;
    });
  }

  private formatDateHeader(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = date.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  public goBack() {
    this.navCtrl.back();
  }

  public openReceipt(tx: Transaction): void {
    this.selectedTransaction = tx;
    this.receiptOpen = true;
  }

  public closeReceipt(): void {
    this.receiptOpen = false;
    this.selectedTransaction = null;
  }

  public formatCardMask(card?: string): string {
    const value = (card ?? this.cardNumber ?? '').trim();
    if (!value) return '----';
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 4) return `**** ${digits.slice(-4)}`;
    return value;
  }

  public receiptStatusLabel(tx: Transaction | null): string {
    if (!tx) return '';
    return (tx.paymentStatus || tx.status || '').trim();
  }

  public receiptCurrency(tx: Transaction | null): string {
    return (tx?.symbol ?? 'Bs').trim() || 'Bs';
  }

  public showReceiptConverted(tx: Transaction | null): boolean {
    if (!tx) return false;
    const converted = tx.amountConverted ?? 0;
    return converted !== 0 && Number.isFinite(converted);
  }

  public showReceiptExchangeRate(tx: Transaction | null): boolean {
    if (!tx) return false;
    const rate = tx.exchangeRate ?? 0;
    return rate > 0 && Number.isFinite(rate);
  }

  public receiptStatusClass(tx: Transaction | null): string {
    const label = this.receiptStatusLabel(tx).toLowerCase();
    if (/exitoso|activo|aprobado|pagado/.test(label)) return 'is-success';
    if (/cancelado|rechazado|fallido|error/.test(label)) return 'is-danger';
    return 'is-neutral';
  }
}
