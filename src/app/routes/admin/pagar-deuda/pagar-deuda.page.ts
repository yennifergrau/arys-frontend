import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { addPayment } from '../interface/meritop.interface';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs';
import { DataArysService } from '../services/data-arys.service';

@Component({
  selector: 'app-pagar-deuda',
  templateUrl: './pagar-deuda.page.html',
  styleUrls: ['./pagar-deuda.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink],
  providers: [DataArysService]
})
export class PagarDeudaPage implements OnInit {
  private meritopService = inject(MeritopService);
  private dataArysService = inject(DataArysService);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  public showLoading = false;
  public showSuccess = false;
  public debtAmount = 0;
  public limitAmount = 0;
  public minPayAmount = 0;
  public creditPayBefore = '';

  public membershipSummary: any = null;

  private accessTokenData: any = null;

  public payAmount: number | null = null;
  public bankCode = '';
  public payPhone = '';
  public paidOn = '';
  public concept = '';

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

  private readonly MERITOP_CACHE_KEY = 'meritop_summary_v1';

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
   * Pago mínimo en customer/products: varias claves posibles; si no viene, 15% de la deuda.
   */
  private resolveMeritopMinPayment(product: any): number {
    if (!product || typeof product !== 'object') return 0;
    const debt = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
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
    if (debt > 0) return parseFloat((debt * 0.15).toFixed(2));
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
    this.loadMembershipSummary();
    // Si Inicio ya precargó Meritop, no lo volvemos a pedir aquí.
    const usedCache = this.hydrateMeritopFromCache();
    if (!usedCache) {
      this.loadCustomerProduct();
    } else {
      this.productLoaded = true;
      this.updateSummaryReady();
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
      const debt = Math.max(0, limit - available);
      this.limitAmount = limit;
      this.debtAmount = debt;
      this.minPayAmount = this.resolveMeritopMinPayment({ amount_used: debt });
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

    // `showLoading` aquí NO se usa, porque está reservado para el submit de pago.
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
              if (!product) return;

              this.debtAmount = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
              this.limitAmount = this.toNumber(product.limit ?? 0);
              this.cardNumber = String(product.cardnumber ?? '');
              this.minPayAmount = this.resolveMeritopMinPayment(product);
              this.mapReceivingAccount(product);
              this.creditPayBefore = String(product.credit_pay_before ?? '');
            },
            error: () => {
              this.showToast('No se pudo cargar la informacion de tu tarjeta.', 'warning');
            }
          });
      },
      error: () => {
        this.showToast('No se pudo obtener token de Meritop.', 'warning');
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
      .pipe(finalize(() => this.showLoading = false))
      .subscribe({
        next: (res) => {
          console.log('Pago exitoso:', res);
          this.showSuccess = true;
          this.updateLocalBalance();
        },
        error: (err) => {
          console.error('Error en pago:', err);
          this.showToast('Error al procesar el pago. Intente de nuevo.', 'danger');
        }
      });
  }

  private updateLocalBalance() {
    this.debtAmount = Math.max(0, this.debtAmount - Number(this.payAmount));
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
