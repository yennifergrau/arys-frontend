import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { ServiceOrderService } from '../services/service-order.service';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ServiceOrder, CreditInfo, ApplyCreditResponse } from '../interface/service-order.interface';

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
  id_user!: number
  public pendingOrders: ServiceOrder[] = []
  public showLoading: boolean = false

  // Estado del panel de crédito
  public activeOrderId: string | null = null
  public creditInfo: CreditInfo | null = null
  public selectedCredit: number = 0
  public maxCredit: number = 0
  public remainingPayment: number = 0
  public isApplyingCredit: boolean = false
  public applyResult: ApplyCreditResponse | null = null

  constructor() {
    this.showLoading = true
    const decode: any = sessionStorage.getItem('accessToken')
    const decodeToken: any = jwtDecode(decode)
    this.id_user = decodeToken.id_user
  }

  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
          this.creditInfo = result.credit
          this.maxCredit = parseFloat(Math.min(result.credit.available, order.amount).toFixed(2))
          this.selectedCredit = this.maxCredit
          this.remainingPayment = parseFloat((order.amount - this.selectedCredit).toFixed(2))
        } else {
          this.creditInfo = null
        }
      },
      error: () => {
        this.creditInfo = null
      }
    })
  }

  onAmountChange(value: number, orderAmount: number) {
    if (value > this.maxCredit) {
      this.selectedCredit = this.maxCredit;
    }
    this.selectedCredit = parseFloat(this.selectedCredit.toFixed(2));
    this.remainingPayment = parseFloat((orderAmount - this.selectedCredit).toFixed(2));
  }

  useFullOrder(orderAmount: number) {
    this.selectedCredit = Math.min(orderAmount, this.maxCredit);
    this.remainingPayment = parseFloat((orderAmount - this.selectedCredit).toFixed(2));
  }

  useMaxAvailable() {
    this.selectedCredit = this.maxCredit;
    const order = this.pendingOrders.find(o => o.order_id === this.activeOrderId);
    if (order) {
      this.remainingPayment = parseFloat((order.amount - this.selectedCredit).toFixed(2));
    }
  }

  applyCredit(orderId: string) {
    if (!orderId || this.selectedCredit <= 0) return

    this.isApplyingCredit = true
    this.serviceOrderService.applyCredit(orderId, this.selectedCredit).subscribe({
      next: (result) => {
        this.isApplyingCredit = false
        this.applyResult = result
        if (result.status) {
          const order = this.pendingOrders.find(o => o.order_id === orderId)
          if (order) {
            order.status = (result.order_status as any) || 'credit_applied'
            order.credit_used = result.credit_used
            order.remaining_payment = result.remaining_payment
          }
          if (this.creditInfo) {
            this.creditInfo.available = result.new_credit_balance ?? 0
          }
        }
      },
      error: (err) => {
        this.isApplyingCredit = false
        this.applyResult = { status: false, message: err.message || 'Error al aplicar credito' }
      }
    })
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

  ngOnInit() {
    setTimeout(() => {
      this.getPendingOrders()
    }, 2000);
  }
}
