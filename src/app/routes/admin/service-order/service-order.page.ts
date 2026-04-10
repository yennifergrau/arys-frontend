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

@Component({
  selector: 'app-service-order',
  templateUrl: './service-order.page.html',
  styleUrls: ['./service-order.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
  ],
  providers: [ServiceOrderService]
})
export class ServiceOrderPage implements OnInit {

  private serviceOrderService = inject(ServiceOrderService)
  private meritopService = inject(MeritopService)
  id_user!: number
  public pendingOrders: ServiceOrder[] = []
  public showLoading: boolean = false
  public customerProduct: CustomerProductSummary | null = null
  public customerProductFetchReason: string = ''
  private accessTokenData: any = null

  public activeOrderId: string | null = null
  public creditInfo: CreditInfo | null = null
  public selectedCredit: number | null = null
  public maxCredit: number = 0
  public remainingPayment: number = 0
  public isApplyingCredit: boolean = false
  public applyResult: ApplyCreditResponse | null = null

  private toNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
      const normalized = value.replace(/\./g, '').replace(',', '.').trim()
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

  get formattedPayBefore(): string {
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
    if (!card) return '----'
    const last4 = card.slice(-4)
    return `**** ${last4}`
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
      return
    }

    this.activeOrderId = order.order_id
    this.applyResult = null
    this.isApplyingCredit = false
    this.creditInfo = null

    this.serviceOrderService.getOrderDetails(order.order_id).subscribe({
      next: (result) => {
        if (result.status && result.credit) {
          const availableFromCustomerProduct = this.toNumber(this.customerProduct?.available)
          const availableFromOrderDetails = this.toNumber(result.credit.available)
          const resolvedAvailable = availableFromCustomerProduct > 0
            ? availableFromCustomerProduct
            : availableFromOrderDetails

          this.creditInfo = {
            ...result.credit,
            available: resolvedAvailable
          }

          const available = resolvedAvailable
          const orderAmount = this.toNumber(order.amount)
          this.maxCredit = parseFloat(Math.min(available, orderAmount).toFixed(2))
          this.selectedCredit = this.maxCredit > 0 ? this.maxCredit : null
          this.remainingPayment = parseFloat((orderAmount - (this.selectedCredit || 0)).toFixed(2))
        } else {
          this.creditInfo = null
        }
      },
      error: () => {
        this.creditInfo = null
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
      this.remainingPayment = parseFloat(safeOrderAmount.toFixed(2))
      return
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      this.selectedCredit = null
      this.remainingPayment = parseFloat(safeOrderAmount.toFixed(2))
      return
    }

    let normalized = Math.max(0, parsed)
    if (normalized > this.maxCredit) {
      normalized = this.maxCredit
    }

    this.selectedCredit = parseFloat(normalized.toFixed(2))
    this.remainingPayment = parseFloat((safeOrderAmount - this.selectedCredit).toFixed(2))
  }

  useFullOrder(orderAmount: number | string) {
    const safeOrderAmount = this.toNumber(orderAmount)
    this.selectedCredit = Math.min(safeOrderAmount, this.maxCredit);
    this.remainingPayment = parseFloat((safeOrderAmount - this.selectedCredit).toFixed(2));
  }

  useMaxAvailable() {
    this.selectedCredit = this.maxCredit;
    const order = this.pendingOrders.find(o => o.order_id === this.activeOrderId);
    if (order) {
      const safeOrderAmount = this.toNumber(order.amount)
      this.remainingPayment = parseFloat((safeOrderAmount - this.selectedCredit).toFixed(2));
    }
  }

  confirmarConsumo(orderId: string) {
    const amountToApply = Number(this.selectedCredit ?? 0)
    if (!orderId || amountToApply <= 0) return;

    this.isApplyingCredit = true;
    // Construir el payload según lo que espera el endpoint add/purchased
    const payload = {
      order_id: orderId,
      amount: amountToApply,
      // Agrega aquí los demás campos requeridos por el backend
    };
    this.meritopService.addPurchased(payload).subscribe({
      next: (result) => {
        this.isApplyingCredit = false;
        this.applyResult = result;
        // Actualiza el estado de la orden si es necesario
        const order = this.pendingOrders.find(o => o.order_id === orderId);
        if (order && result.status) {
          order.status = (result.order_status as any) || 'consumo_confirmado';
        }
      },
      error: (err) => {
        this.isApplyingCredit = false;
        this.applyResult = { status: false, message: err.message || 'Error al confirmar consumo' };
      }
    });
  }

  private getPendingOrders() {
    try {
      this.serviceOrderService.getPendingOrders(this.id_user).subscribe({
        next: (result) => {
          this.pendingOrders = result.data || []
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
    try {
      const identity = this.getCustomerIdentity()
      const doctype = identity?.doctype || ''
      const docid = Number(identity?.docid || 0)

      if (!doctype || !docid) {
        this.customerProductFetchReason = 'Faltan datos de identidad (doctype/docid) para consultar customer/products'
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
            },
            error: (error) => {
              this.customerProduct = null
              this.customerProductFetchReason = error?.message || 'Error al consultar customer/products'
            }
          })
        },
        error: (error) => {
          this.customerProduct = null
          this.customerProductFetchReason = error?.message || 'No se pudo obtener tokenAccess para customer/products'
        }
      })
    } catch (e) {
      this.customerProduct = null
      this.customerProductFetchReason = 'Error inesperado consultando customer/products'
      console.error(e)
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
    this.loadCustomerProduct()
    setTimeout(() => {
      this.getPendingOrders()
    }, 2000);
  }
}
