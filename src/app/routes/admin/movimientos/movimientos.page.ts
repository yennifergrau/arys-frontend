import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { Transaction } from '../interface/meritop.interface';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs';
import { DataArysService } from '../services/data-arys.service';

@Component({
  selector: 'app-movimientos',
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink],
  providers: [DataArysService]
})
export class MovimientosPage implements OnInit {
  private meritopService = inject(MeritopService);
  private dataArysService = inject(DataArysService);
  private navCtrl = inject(NavController);

  public transactions: Transaction[] = [];
  public groupedTransactions: { date: string, items: Transaction[] }[] = [];
  public showLoading = false;
  public selectedSegment: string = 'ultimos';
  public dateFrom: string = '';
  public dateTo: string = '';
  public debtAmount = 0;
  public limitAmount = 0;
  public minPayAmount = 0;
  public creditPayBefore = '';
  public cardNumber = '';
  private readonly MERITOP_CACHE_KEY = 'meritop_summary_v1';

  private docId: number | null = null;
  private docType = '';
  private productId: string | null = null;

  public membershipSummary: any = null;
  private accessTokenData: any = null;

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

    return {
      transactionId: String(raw?.transactionId ?? raw?.id ?? raw?.reference ?? ''),
      amount,
      description: String(
        raw?.description ??
        raw?.concept ??
        raw?.type_transaction ??
        raw?.payment_type ??
        raw?.payment_status ??
        ''
      ),
      merchantName: String(raw?.merchantName ?? raw?.commerceName ?? raw?.commerce_name ?? raw?.commerce ?? ''),
      date: String(date),
      type: String(raw?.type ?? (amount < 0 ? 'purchase' : 'payment')),
      status: String(raw?.status ?? raw?.payment_status ?? '')
    };
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
    if (!usedCache) {
      this.loadCustomerProduct();
    } else {
      this.productLoaded = true;
      this.updateSummaryReady();
      // Solo cargamos listas de movimientos (no re-consultamos products).
      this.fetchTransactions();
    }
  }

  private hydrateMeritopFromCache(): boolean {
    try {
      const raw = sessionStorage.getItem(this.MERITOP_CACHE_KEY);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      const limit = this.toNumber(cached?.limit ?? 0);
      const available = this.toNumber(cached?.available ?? 0);
      if (limit <= 0) return false;
      const used = Math.max(0, limit - available);
      this.limitAmount = limit;
      this.debtAmount = used;
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

  private getIdentity(): { doctype: string; docid: number } | null {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      const tokenDocType = String(decoded?.doctype || decoded?.prefix || '').trim();
      const tokenDocId = Number(decoded?.docid || decoded?.rif || 0);
      if (tokenDocType && tokenDocId > 0) {
        return { doctype: tokenDocType, docid: tokenDocId };
      }
    }

    try {
      const raw = localStorage.getItem('userData');
      const userData = raw ? JSON.parse(raw) : null;
      const docType = String(userData?.doctype || userData?.prefix || userData?.letra_rif || '').trim();
      const docId = Number(userData?.docid || userData?.rif || 0);
      if (docType && docId > 0) {
        return { doctype: docType, docid: docId };
      }
    } catch {
      // noop
    }

    return null;
  }

  private loadCustomerProduct() {
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

    const payload = {
      bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
      channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
      terminal: '0',
      ip: '127.0.0.1',
      clientid: identity
    };

    // `showLoading` se usa para la lista de movimientos, no para el resumen de saldos.
    this.meritopService.getAccessToken().subscribe({
      next: () => {
        this.meritopService.customerProduct(payload)
          .pipe(finalize(() => {
            this.productLoaded = true;
            this.updateSummaryReady();
          }))
          .subscribe({
            next: (result: any) => {
              const product = result?.products?.[0];
              if (!product) {
                this.transactions = [];
                this.groupTransactions();
                return;
              }

              this.debtAmount = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
              this.limitAmount = this.toNumber(product.limit ?? 0);
              this.minPayAmount = this.resolveMeritopMinPayment(product);
              
              this.creditPayBefore = String(product.credit_pay_before ?? '');
              this.cardNumber = String(product.cardnumber ?? '');
              this.productId = String(product.id ?? '');

              this.fetchTransactions();
            },
            error: () => {
              this.transactions = [];
              this.groupTransactions();
            }
          });
      },
      error: () => {
        this.transactions = [];
        this.groupTransactions();
        this.productLoaded = true;
        this.updateSummaryReady();
      }
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
    const avail = this.displayCreditLimit - this.displayDebtAmount;
    return Math.max(0, avail);
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
            this.transactions = source.map((t: any) => this.normalizeTransaction(t));
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
            const source = (res?.transactions || []).map((t: any) => this.normalizeTransaction(t));
            this.transactions = this.filterTransactionsByDateRange(source);
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
}
