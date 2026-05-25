import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, ViewWillEnter } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { addPayment } from '../interface/meritop.interface';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { jwtDecode } from 'jwt-decode';
import { catchError, concatMap, finalize, map, of, tap } from 'rxjs';
import { DataArysService } from '../services/data-arys.service';
import { MeritopSummaryCacheService } from '../services/meritop-summary-cache.service';
import { resolveMeritopClientIdentity } from '../utils/meritop-identity.util';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-pagar-deuda',
  templateUrl: './pagar-deuda.page.html',
  styleUrls: ['./pagar-deuda.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, NgxMaskDirective],
  providers: [DataArysService, provideNgxMask()]
})
export class PagarDeudaPage implements OnInit, ViewWillEnter {
  private meritopService = inject(MeritopService);
  private meritopCache = inject(MeritopSummaryCacheService);
  private dataArysService = inject(DataArysService);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  public showLoading = false;
  public showSuccess = false;
  public debtAmount = 0;
  public limitAmount = 0;
  public creditAvailableAmount = 0;
  public minPayAmount = 0;
  public creditPayBefore = '';

  public membershipSummary: any = null;

  private accessTokenData: any = null;
  /** Evita doble refetch Meritop en la primera entrada (ngOnInit ya refresca). */
  private skipNextMeritopViewRefresh = true;

  public payAmount: number | null = null;
  /** Input de monto: se escribe como “céntimos” y se muestra con coma. */
  public payAmountDisplay = '';
  private payAmountCents = 0;
  public bankCode = '';
  public payPhone = '';
  public paidOn = '';
  public concept = '';

  /** Bancos Venezuela (código pago móvil → nombre). */
  public readonly banksVE: Array<{ code: string; name: string }> = [
    { code: '0102', name: 'Banco de Venezuela' },
    { code: '0104', name: 'Venezolano de Crédito' },
    { code: '0105', name: 'Banco Mercantil' },
    { code: '0108', name: 'Banco Provincial' },
    { code: '0114', name: 'Bancaribe' },
    { code: '0115', name: 'Banco Exterior' },
    { code: '0128', name: 'Banco Caroní' },
    { code: '0134', name: 'Banesco' },
    { code: '0137', name: 'Banco Sofitasa' },
    { code: '0138', name: 'Banco Plaza' },
    { code: '0146', name: 'Banco de la Gente Emprendedora (BANGENTE)' },
    { code: '0151', name: 'BFC Banco Fondo Común' },
    { code: '0156', name: '100% Banco' },
    { code: '0157', name: 'DelSur Banco Universal' },
    { code: '0163', name: 'Banco del Tesoro' },
    { code: '0166', name: 'Banco Agrícola de Venezuela' },
    { code: '0168', name: 'Bancrecer' },
    { code: '0169', name: 'Mi Banco' },
    { code: '0171', name: 'Banco Activo' },
    { code: '0172', name: 'Bancamiga' },
    { code: '0173', name: 'Banco Internacional de Desarrollo' },
    { code: '0174', name: 'Banplus' },
    { code: '0175', name: 'Banco Bicentenario del Pueblo' },
    { code: '0177', name: 'Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)' },
    { code: '0190', name: 'Citibank' },
    { code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
  ];

  public get selectedBankName(): string {
    const code = (this.bankCode ?? '').toString().trim();
    if (!code) return '';
    return this.banksVE.find(b => b.code === code)?.name ?? '';
  }

  private formatAmountFromCents(cents: number): string {
    const safe = Number.isFinite(cents) ? Math.max(0, Math.trunc(cents)) : 0;
    const amount = safe / 100;
    // es-VE usa coma decimal; incluye separador de miles si aplica.
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }

  public onPayAmountInput(ev: any): void {
    const raw = (ev?.target?.value ?? '').toString();
    const digits = raw.replace(/\D/g, '');
    const cents = digits ? Number(digits) : 0;
    this.payAmountCents = Number.isFinite(cents) ? cents : 0;
    this.payAmount = this.payAmountCents > 0 ? this.payAmountCents / 100 : null;
    this.payAmountDisplay = digits ? this.formatAmountFromCents(this.payAmountCents) : '';
    try {
      // Mantener cursor al final en móvil
      if (ev?.target?.setSelectionRange) {
        const len = this.payAmountDisplay.length;
        ev.target.setSelectionRange(len, len);
      }
    } catch {
      // noop
    }
  }

  public onPayAmountBlur(): void {
    // Normaliza display si hay algo escrito
    if (this.payAmountCents > 0) {
      this.payAmountDisplay = this.formatAmountFromCents(this.payAmountCents);
    }
  }

  private setPayAmountFromBs(amount: number): void {
    const safe = Math.max(0, this.toNumber(amount));
    this.payAmountCents = Math.round(safe * 100);
    this.payAmount = safe > 0 ? safe : null;
    this.payAmountDisplay = safe > 0 ? this.formatAmountFromCents(this.payAmountCents) : '';
  }

  public useTotalDebt(): void {
    this.setPayAmountFromBs(this.displayDebtAmount);
  }

  public useMinPay(): void {
    this.setPayAmountFromBs(this.minPayAmount);
  }

  private toLocalIsoMinutes(d: Date): string {
    const offset = d.getTimezoneOffset();
    const adjusted = new Date(d.getTime() - offset * 60000);
    return adjusted.toISOString().slice(0, 16);
  }

  public normalizePaidOn(value: string): string {
    const raw = (value ?? '').toString().trim();
    if (!raw) return '';
    // Si ya viene como "YYYY-MM-DDTHH:mm", lo usamos tal cual.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
    // Si viene ISO completo, lo convertimos a local minutos.
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return this.toLocalIsoMinutes(d);
  }

  public cardNumber = '';
  public docId: string | number = '';
  public docType = '';

  /** Cuenta receptora para abonos (customer/products → receiving_account). */
  public receivingAccount: {
    bankname: string;
    bankcode: string;
    clientid: string;
    phonenumber: string;
  } | null = null;


  // Evita “parpadeo” de saldos (membresía -> Meritop)
  public summaryReady = false;
  private membershipLoaded = false;
  private productLoaded = false;
  /** Evita redirección o toast duplicado si no hay deuda. */
  private debtGateHandled = false;

  private updateSummaryReady() {
    this.summaryReady = this.membershipLoaded && this.productLoaded;
    if (this.summaryReady) {
      void this.maybeBlockPagarDeudaWithoutDebt();
    }
  }

  /** Sin deuda no se permite usar esta pantalla (evita URL directa). */
  private async maybeBlockPagarDeudaWithoutDebt() {
    if (this.debtGateHandled || this.showSuccess) return;
    if (this.displayDebtAmount > 0) return;
    this.debtGateHandled = true;
    await this.showToast('No tienes deuda pendiente para abonar.', 'warning');
    this.navCtrl.navigateRoot('/admin/dashboard/sarys');
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

  /**
   * Pago mínimo: solo lo que envía Meritop en customer/products (varias claves posibles).
   * Si no viene ningún monto, 0 (no se calcula nada en el cliente).
   */
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

  private mapReceivingAccount(product: any): void {
    const ra = product?.receiving_account;
    if (!ra || typeof ra !== 'object') {
      this.receivingAccount = null;
      return;
    }
    const bankname = ra.bankname != null ? String(ra.bankname).trim() : '';
    const bankcode = ra.bankcode != null ? String(ra.bankcode).trim() : '';
    const clientid = ra.clientid != null ? String(ra.clientid).trim() : '';
    const phonenumber = ra.phonenumber != null ? String(ra.phonenumber).trim() : '';
    if (!bankname && !bankcode && !clientid && !phonenumber) {
      this.receivingAccount = null;
      return;
    }
    this.receivingAccount = { bankname, bankcode, clientid, phonenumber };
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
    /** Siempre: sin esto, la ruta con caché omite `loadCustomerProduct` y docType/docId quedan vacíos. */
    this.syncIdentityFromToken();
    this.loadMembershipSummary();
    // Si Inicio ya precargó Meritop, no lo volvemos a pedir aquí.
    const usedCache = this.hydrateMeritopFromCache();
    if (usedCache) {
      this.productLoaded = true;
      this.updateSummaryReady();
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
      // Guardado desde Inicio: permite mostrar Pago móvil sin refetch.
      if (cached?.receiving_account) {
        this.mapReceivingAccount({ receiving_account: cached.receiving_account });
      }
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

  private getIdentity() {
    return resolveMeritopClientIdentity({ membershipRow: this.membershipSummary });
  }

  /** Rellena docType/docId desde token o userData (necesario aunque Meritop venga solo de caché). */
  private syncIdentityFromToken(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    this.docType = identity.doctype;
    this.docId = identity.docid;
  }

  private persistMeritopCacheFromProduct(product: any): void {
    this.meritopCache.persistFromProduct(product);
  }

  private applyMeritopProductFromResponse(result: any): void {
    const product = result?.products?.[0];
    if (!product) return;
    this.debtAmount = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
    this.limitAmount = this.toNumber(product.limit ?? 0);
    this.creditAvailableAmount = this.toNumber(product.available ?? 0);
    this.cardNumber = String(product.cardnumber ?? '');
    this.minPayAmount = this.resolveMeritopMinPayment(product);
    this.mapReceivingAccount(product);
    this.creditPayBefore = String(product.credit_pay_before ?? '');
    this.persistMeritopCacheFromProduct(product);
  }

  /**
   * Vuelve a pedir `customer/products` y persiste caché (misma fuente que Inicio / órdenes).
   * Encadenado tras addPayment para que el saldo refleje lo último antes de cerrar el loading.
   */
  private refreshMeritopFromServer$() {
    const identity = this.getIdentity();
    if (!identity) {
      return of(undefined);
    }
    return this.meritopCache.refreshFromServer$(identity).pipe(
      tap((product) => {
        if (product) this.applyMeritopProductFromResponse({ products: [product] });
      }),
      map(() => undefined),
      catchError(() => {
        void this.showToast('No se pudo actualizar el saldo desde Meritop.', 'warning');
        return of(undefined);
      })
    );
  }

  private refreshMeritopSilent(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product) => {
        if (product) this.applyMeritopProductFromResponse({ products: [product] });
      },
    });
  }

  private loadCustomerProduct(silentRefresh = false) {
    const identity = this.getIdentity();
    if (!identity) {
      this.productLoaded = true;
      this.updateSummaryReady();
      return;
    }

    this.docType = identity.doctype;
    this.docId = identity.docid;

    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product) => {
        if (product) this.applyMeritopProductFromResponse({ products: [product] });
      },
      error: () => {
        if (!silentRefresh) {
          void this.showToast('No se pudo cargar la informacion de tu tarjeta.', 'warning');
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

  public async confirmPayment() {
    if (!this.hasDebt) {
      this.showToast('No tienes deuda pendiente para pagar.', 'warning');
      return;
    }
    if (!this.payAmount || this.payAmount <= 0) {
      this.showToast('El monto debe ser mayor a 0', 'warning');
      return;
    }

    if (!this.docType || !this.docId || !this.cardNumber) {
      this.showToast('Faltan datos del cliente o de la tarjeta.', 'warning');
      return;
    }

    if (!this.bankCode || !this.payPhone || !this.paidOn || !this.concept) {
      this.showToast('Por favor, complete todos los campos obligatorios.', 'warning');
      return;
    }

    this.showLoading = true;

    const paymentData: addPayment = {
      ip: '127.0.0.1',
      channel: 'APP',
      client: {
        doctype: this.docType,
        docid: this.docId
      },
      cardnumber: this.cardNumber,
      amount: this.payAmount,
      payphone: this.payPhone,
      paidon: this.paidOn,
      bankcode: this.bankCode,
      concept: this.concept
    };

    this.meritopService.addPayment(paymentData)
      .pipe(
        tap((res) => console.log('Pago exitoso:', res)),
        tap(() => {
          this.showSuccess = true;
        }),
        concatMap(() => this.refreshMeritopFromServer$()),
        finalize(() => {
          this.showLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.loadMembershipSummary();
        },
        error: (err) => {
          console.error('Error en pago:', err);
          this.showToast('Error al procesar el pago. Intente de nuevo.', 'danger');
        }
      });
  }

  public goBack() {
    if (this.showSuccess) {
      this.navCtrl.navigateRoot('/admin/dashboard/sarys');
    } else {
      this.navCtrl.back();
    }
  }

  public goToMovements() {
    this.navCtrl.navigateForward('/admin/movimientos');
  }

  /** En móvil, copiar RIF/teléfono/código evita errores al hacer el pago. */
  public async copyReceivingValue(value: string, label: string) {
    const v = (value ?? '').trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      await this.showToast(`${label} copiado al portapapeles`, 'success');
    } catch {
      await this.showToast('No se pudo copiar. Selecciona el texto manualmente.', 'warning');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
