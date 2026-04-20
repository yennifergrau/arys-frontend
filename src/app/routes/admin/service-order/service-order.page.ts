import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { ServiceOrderService } from '../services/service-order.service';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ServiceOrder, CreditInfo, ApplyCreditResponse, CustomerProductSummary } from '../interface/service-order.interface';
import { MeritopService } from '../services/meritop.service';
import { DataArysService } from '../services/data-arys.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-service-order',
  templateUrl: './service-order.page.html',
  styleUrls: ['./service-order.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterLink,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
  ],
  providers: [ServiceOrderService, DataArysService]
})
export class ServiceOrderPage implements OnInit {

  private serviceOrderService = inject(ServiceOrderService)
  private meritopService = inject(MeritopService)
  private dataArysService = inject(DataArysService)
  id_user!: number
  private id_member: number = 0
  public pendingOrders: ServiceOrder[] = []
  public showLoading: boolean = false
  public customerProduct: CustomerProductSummary | null = null
  public customerProductFetchReason: string = ''
  private accessTokenData: any = null

  /** Crédito persistido en ARYS (tabla membership); respaldo si Meritop no devuelve producto. */
  public membershipSummary: {
    credit_line_id: string | null;
    credit_limit: string | number | null;
    credit_available: string | number | null;
    credit_used: string | number | null;
  } | null = null

  // Evita “parpadeo” de saldos (membresía -> Meritop)
  // - loading: esperamos respuesta de Meritop antes de pintar montos
  // - ready: ya tenemos datos de Meritop (customerProduct)
  // - fallback: Meritop falló; mostramos membresía ARYS si existe
  public summaryState: 'loading' | 'ready' | 'fallback' = 'loading'
  public summaryMessage: string = ''

  public activeOrderId: string | null = null
  public creditInfo: CreditInfo | null = null
  public selectedCredit: number | null = null
  public maxCredit: number = 0
  public isApplyingCredit: boolean = false
  public applyResult: ApplyCreditResponse | null = null
  private orderDetails: any = null
  public isLoadingCreditPanel: boolean = false
  public creditPanelMessage: string = ''

  private toNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
      const trimmed = value.trim()
      let normalized: string
      if (trimmed.includes(',')) {
        // Formato venezolano: punto=miles, coma=decimal → "1.500,00" → "1500.00"
        normalized = trimmed.replace(/\./g, '').replace(',', '.')
      } else {
        // Formato estándar (API): punto=decimal → "150.00" se conserva tal cual
        normalized = trimmed
      }
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : 0
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  constructor() {
    this.showLoading = true
    const token = sessionStorage.getItem('accessToken')
    if (!token) return

    try {
      this.accessTokenData = jwtDecode(token)
      this.id_user = Number(this.accessTokenData?.id_user || 0)
      this.id_member = Number(this.accessTokenData?.id_member || 0)
    } catch (e) {
      console.error('Token invalido en service-order', e)
    }
  }

  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  get hasDebt(): boolean {
    return (this.summaryState === 'ready' || this.summaryState === 'fallback') && this.displayCreditUsed > 0
  }

  get formattedPayBefore(): string {
    // Meritop puede enviar `credit_pay_before` aunque no exista deuda.
    // Para UX, solo mostramos la fecha cuando hay deuda pendiente.
    if (!this.hasDebt) return '--'
    if (!this.customerProduct?.credit_pay_before) return '--'
    const date = new Date(this.customerProduct.credit_pay_before)
    if (Number.isNaN(date.getTime())) return this.customerProduct.credit_pay_before
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  get cardMask(): string {
    const card = this.customerProduct?.cardnumber?.trim()
    if (card) {
      const last4 = card.slice(-4)
      return `**** ${last4}`
    }
    return this.membershipCreditLineHint || '----'
  }

  /** Valor `cardnumber` que Meritop espera en addPurchase: tarjeta del producto o línea guardada en membresía. */
  private resolveMeritopCardnumber(): string {
    const fromProduct = this.customerProduct?.cardnumber?.trim()
    if (fromProduct) return fromProduct
    return (this.membershipSummary?.credit_line_id ?? '').trim()
  }

  /** Tarjeta Meritop con saldos útiles; si no, usamos membresía ARYS. */
  private preferMeritopMetrics(): boolean {
    const c = this.customerProduct
    if (!c?.cardnumber?.trim()) return false
    return this.toNumber(c.available) > 0 || this.toNumber(c.limit) > 0
  }

  get displayCreditLimit(): number {
    if (this.preferMeritopMetrics()) return this.toNumber(this.customerProduct!.limit)
    const m = this.toNumber(this.membershipSummary?.credit_limit)
    if (m > 0) return m
    return this.toNumber(this.customerProduct?.limit)
  }

  get displayCreditAvailable(): number {
    if (this.preferMeritopMetrics()) return this.toNumber(this.customerProduct!.available)
    const m = this.toNumber(this.membershipSummary?.credit_available)
    if (m > 0) return m
    return this.toNumber(this.customerProduct?.available)
  }

  get displayCreditUsed(): number {
    if (this.preferMeritopMetrics()) return this.toNumber(this.customerProduct!.amount_used)
    if (this.membershipSummary) return this.toNumber(this.membershipSummary.credit_used)
    return this.toNumber(this.customerProduct?.amount_used)
  }

  get membershipCreditLineHint(): string {
    const id = this.membershipSummary?.credit_line_id?.trim()
    if (!id) return ''
    const tail = id.length <= 4 ? id : id.slice(-4)
    return `Línea •••• ${tail}`
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'credit_applied': 'Credito Aplicado',
      'payment_pending': 'Pago Pendiente',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'badge-warning',
      'credit_applied': 'badge-info',
      'payment_pending': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger',
      'completed': 'badge-success',
      'cancelled': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  toggleCreditPanel(order: ServiceOrder) {
    if (this.activeOrderId === order.order_id) {
      this.activeOrderId = null
      this.creditInfo = null
      this.applyResult = null
      this.isLoadingCreditPanel = false
      this.creditPanelMessage = ''
      return
    }

    this.activeOrderId = order.order_id
    this.applyResult = null
    this.isApplyingCredit = false
    this.creditInfo = null
    this.isLoadingCreditPanel = true
    this.creditPanelMessage = ''

    const idMemberRaw = sessionStorage.getItem('id_member');
    const idMember = idMemberRaw ? Number(idMemberRaw) : undefined;
    this.serviceOrderService
      .getOrderDetails(order.order_id, idMember && !Number.isNaN(idMember) ? idMember : undefined)
      .subscribe({
      next: (result) => {
        this.isLoadingCreditPanel = false
        if (result.status && result.credit) {
          const availableFromCustomerProduct = this.toNumber(this.customerProduct?.available)
          const availableFromMembership = this.toNumber(this.membershipSummary?.credit_available)
          const availableFromOrderDetails = this.toNumber(result.credit.available)
          const resolvedAvailable =
            availableFromCustomerProduct > 0
              ? availableFromCustomerProduct
              : availableFromMembership > 0
                ? availableFromMembership
                : availableFromOrderDetails

          this.creditInfo = {
            ...result.credit,
            available: resolvedAvailable
          }
          this.orderDetails = result
          const available = resolvedAvailable
          const orderAmount = this.toNumber(order.amount)
          this.maxCredit = parseFloat(Math.min(available, orderAmount).toFixed(2))
          this.selectedCredit = this.maxCredit > 0 ? this.maxCredit : null
        } else {
          this.creditInfo = null
          this.maxCredit = 0
          this.selectedCredit = null
          this.creditPanelMessage =
            result?.message ||
            'No se pudo obtener la información de crédito para esta orden.'
        }
      },
      error: () => {
        this.isLoadingCreditPanel = false
        this.creditInfo = null
        this.maxCredit = 0
        this.selectedCredit = null
        this.creditPanelMessage = 'Error al cargar el detalle de la orden.'
      }
    })
  }

  clearLeadingZero() {
    if (this.selectedCredit === 0) {
      this.selectedCredit = null
    }
  }

  onAmountChange(value: number | string | null, orderAmount: number | string) {
    const safeOrderAmount = this.toNumber(orderAmount)
    if (value === null || value === '') {
      this.selectedCredit = null
      return
    }

    const parsed = this.toNumber(value)
    if (Number.isNaN(parsed)) {
      this.selectedCredit = null
      return
    }

    let normalized = Math.max(0, parsed)
    if (normalized > this.maxCredit) {
      normalized = this.maxCredit
    }

    this.selectedCredit = parseFloat(normalized.toFixed(2))
  }

  useFullOrder(orderAmount: number | string) {
    const safeOrderAmount = this.toNumber(orderAmount)
    this.selectedCredit = Math.min(safeOrderAmount, this.maxCredit);
  }

  useMaxAvailable() {
    this.selectedCredit = this.maxCredit;
  }

  confirmarConsumo(orderId: string) {
    const amountToApply = Number(this.selectedCredit ?? 0);
    if (!orderId) {
      this.applyResult = { status: false, message: 'No se encontró el id de la orden.' };
      return;
    }
    if (amountToApply <= 0) {
      this.applyResult = { status: false, message: 'El monto a consumir debe ser mayor a 0.' };
      return;
    }


    const order = this.orderDetails;
    if (!order) {
      this.applyResult = {
        status: false,
        message: 'Primero abre el panel de la orden para cargar el detalle antes de confirmar.'
      };
      return;
    }

    const identity = this.getCustomerIdentity();
    if (!identity) {
      this.applyResult = {
        status: false,
        message:
          'No se pudo obtener tu identificación (doctype/docid). Revisa que `userData` esté en localStorage o que el token tenga esos campos.'
      };
      return;
    }

    const cardnumber = this.resolveMeritopCardnumber();
    if (!cardnumber) {
      this.applyResult = {
        status: false,
        message:
          'No hay número de línea/tarjeta Meritop. Activa la línea en tu membresía o verifica el producto en Meritop.',
      };
      return;
    }

    this.isApplyingCredit = true;
    this.applyResult = null;
    console.log('[ARYS crédito] Confirmar consumo', {
      orderId,
      amountToApply,
      identity,
      cardnumber,
      membershipSummary: this.membershipSummary,
      customerProduct: this.customerProduct,
    });


    // Usamos los datos de provider_payment_mobile que vienen del endpoint de la orden
    const providerPayment = order.order.provider_payment_mobile;
    if (!providerPayment) {
      this.isApplyingCredit = false;
      this.applyResult = {
        status: false,
        message:
          'La orden no trae `provider_payment_mobile` (datos de pago del proveedor). Sin esos datos no se puede procesar el consumo.'
      };
      return;
    }
    const rawDoc = providerPayment?.id_number || '';
    const benefitDoctype = rawDoc.match(/^[a-zA-Z]/) ? rawDoc.charAt(0).toUpperCase() : 'V';
    const benefitDocid = rawDoc.replace(/^[a-zA-Z]/, '').trim();
    const bankcode = providerPayment?.bank_code || '';
    const phonenumber = providerPayment?.mobile_number || '';
    if (!bankcode || !benefitDocid || !phonenumber) {
      this.isApplyingCredit = false;
      this.applyResult = {
        status: false,
        message:
          'Faltan datos del proveedor para el pago (bank_code / id_number / mobile_number).'
      };
      return;
    }

    // Payload según doc.md para /transaction/addPurchase
    const payload = {
      client: {
        doctype: identity.doctype,
        docid: identity.docid
      },
      cardnumber,
      amount: amountToApply,
      concept: `Orden N° ${order.order.order_number} - ${order.order.service_name}`,
      channel: 'APP',
      payment: {
        bankcode,
        doctype: benefitDoctype,
        docid: String(benefitDocid),
        name: order.order.provider_name,
        phonenumber,
        account: null
      },
      reference: null,
      ip: '127.0.0.1'
    };

    this.meritopService.addPurchased(payload).subscribe({
      next: (result) => {
        this.isApplyingCredit = false;
        this.applyResult = result;
        // Actualiza el estado de la orden si es necesario
        if (order.order && result.status) {
          order.order.status = (result.order_status as any) || 'credit_applied';
        }
      },
      error: (err) => {
        this.isApplyingCredit = false;
        // El mensaje ya viene extraído correctamente desde el CatchError del servicio (MeritopService)
        this.applyResult = { status: false, message: err.message };
      }
    });
  }

  private loadMembershipSummary() {
    const idRaw = sessionStorage.getItem('id_member')
    const idMember = idRaw ? Number(idRaw) : NaN
    const email =
      this.accessTokenData?.email != null ? String(this.accessTokenData.email).trim() : ''

    const req =
      !Number.isNaN(idMember) && idMember > 0
        ? this.dataArysService.get_membership(idMember)
        : email
          ? this.dataArysService.get_membership_by_email(email)
          : null

    if (!req) return

    req.subscribe({
      next: (res: any) => {
        const row = res?.status && Array.isArray(res.data) && res.data.length ? res.data[0] : null
        if (!row) {
          this.membershipSummary = null
          return
        }
        this.membershipSummary = {
          credit_line_id: row.credit_line_id != null ? String(row.credit_line_id) : null,
          credit_limit: row.credit_limit,
          credit_available: row.credit_available,
          credit_used: row.credit_used,
        }
        if (row.id_master != null) {
          sessionStorage.setItem('id_member', String(row.id_master))
        }
      },
      error: () => {
        this.membershipSummary = null
      },
    })
  }

  private getPendingOrders() {
    try {
      const storedMember = sessionStorage.getItem('id_member')
      const membershipId = storedMember ? Number(storedMember) : this.id_member
      this.serviceOrderService.getPendingOrders(membershipId).subscribe({
        next: (result) => {
          this.pendingOrders = result?.status && Array.isArray(result.data) ? result.data : []
          this.showLoading = false
        },
        error: (error) => {
          this.showLoading = false
          console.log(error);
        }
      })
    } catch (e) {
      console.error(e);
    }
  }

  private loadCustomerProduct() {
    this.summaryState = 'loading'
    this.summaryMessage = ''
    try {
      const identity = this.getCustomerIdentity()
      const doctype = identity?.doctype || ''
      const docid = Number(identity?.docid || 0)

      if (!doctype || !docid) {
        this.customerProductFetchReason = 'Faltan datos de identidad (doctype/docid) para consultar customer/products'
        this.customerProduct = null
        this.summaryState = 'fallback'
        this.summaryMessage = 'No se pudo consultar Meritop (faltan doctype/docid). Mostrando saldo de membresía.'
        return
      }

      const payload = {
        bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
        channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
        terminal: '0',
        ip: '127.0.0.1',
        clientid: {
          doctype,
          docid
        }
      }

      this.meritopService.getAccessToken().subscribe({
        next: () => {
          this.meritopService.customerProduct(payload).subscribe({
            next: (result: any) => {
              const product = result?.products?.[0]
              if (!product) {
                this.customerProductFetchReason = 'customer/products respondio sin products[0]'
                this.customerProduct = null
                this.summaryState = 'fallback'
                this.summaryMessage = 'Meritop no devolvió producto. Mostrando saldo de membresía.'
                return
              }

              this.customerProduct = {
                id: String(product.id ?? ''),
                cardnumber: String(product.cardnumber ?? ''),
                limit: Number(product.limit ?? 0),
                available: Number(product.available ?? 0),
                amount_used: Number(product.amount_used ?? 0),
                amount_share_to_pay: Number(product.amount_share_to_pay ?? 0),
                credit_pay_before: String(product.credit_pay_before ?? '')
              }
              this.customerProductFetchReason = ''
              this.summaryState = 'ready'
            },
            error: (error) => {
              this.customerProduct = null
              this.customerProductFetchReason = error?.message || 'Error al consultar customer/products'
              this.summaryState = 'fallback'
              this.summaryMessage = 'No se pudo consultar Meritop. Mostrando saldo de membresía.'
            }
          })
        },
        error: (error) => {
          this.customerProduct = null
          this.customerProductFetchReason = error?.message || 'No se pudo obtener tokenAccess para customer/products'
          this.summaryState = 'fallback'
          this.summaryMessage = 'No se pudo obtener token de Meritop. Mostrando saldo de membresía.'
        }
      })
    } catch (e) {
      this.customerProduct = null
      this.customerProductFetchReason = 'Error inesperado consultando customer/products'
      console.error(e)
      this.summaryState = 'fallback'
      this.summaryMessage = 'Error inesperado consultando Meritop. Mostrando saldo de membresía.'
    }
  }

  private getUserDataFromLocalStorage(): any {
    try {
      const raw = localStorage.getItem('userData')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  private getCustomerIdentity(): { doctype: string; docid: number } | null {
    const userData = this.getUserDataFromLocalStorage()
    const doctype = String(
      userData?.doctype ||
      this.accessTokenData?.doctype ||
      userData?.letra_rif ||
      userData?.prefix ||
      this.accessTokenData?.prefix ||
      ''
    ).trim()
    const docid = Number(
      userData?.docid ||
      this.accessTokenData?.docid ||
      userData?.rif ||
      this.accessTokenData?.rif ||
      0
    )

    if (!doctype || !docid) return null
    return { doctype, docid }
  }

  ngOnInit() {
    this.summaryState = 'loading'
    this.summaryMessage = ''
    this.loadMembershipSummary()
    this.loadCustomerProduct()
    this.getPendingOrders()
  }
}
