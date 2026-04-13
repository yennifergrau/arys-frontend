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

@Component({
  selector: 'app-pagar-deuda',
  templateUrl: './pagar-deuda.page.html',
  styleUrls: ['./pagar-deuda.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink]
})
export class PagarDeudaPage implements OnInit {
  private meritopService = inject(MeritopService);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  public showLoading = false;
  public showSuccess = false;
  public debtAmount = 0;
  public limitAmount = 0;
  public minPayAmount = 0;
  public creditPayBefore = '';

  public payAmount: number | null = null;
  public bankCode = '';
  public payPhone = '';
  public paidOn = '';
  public concept = '';

  public cardNumber = '';
  public docId: string | number = '';
  public docType = '';

  constructor() {
    // Inicializaciones pasadas al HTML/usuario
  }

  ngOnInit() {
    this.loadCustomerProduct();
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
      const docType = String(userData?.doctype || userData?.prefix || '').trim();
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
    if (!identity) return;

    this.docType = identity.doctype;
    this.docId = identity.docid;

    const payload = {
      bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
      channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
      terminal: '0',
      ip: '127.0.0.1',
      clientid: identity
    };

    this.showLoading = true;
    this.meritopService.getAccessToken().subscribe({
      next: () => {
        this.meritopService.customerProduct(payload)
          .pipe(finalize(() => this.showLoading = false))
          .subscribe({
            next: (result: any) => {
              const product = result?.products?.[0];
              if (!product) return;

              this.debtAmount = Number(product.amount_used ?? product.present_debt_amt ?? 0);
              this.limitAmount = Number(product.limit ?? 0);
              this.cardNumber = String(product.cardnumber ?? '');
              this.minPayAmount = Number(product.amount_share_to_pay ?? (this.debtAmount * 0.15));
              this.creditPayBefore = String(product.credit_pay_before ?? '');
            },
            error: () => {
              this.showToast('No se pudo cargar la informacion de tu tarjeta.', 'warning');
            }
          });
      },
      error: () => {
        this.showLoading = false;
        this.showToast('No se pudo obtener token de Meritop.', 'warning');
      }
    });
  }

  get availableAmount(): number {
    return Math.max(0, this.limitAmount - this.debtAmount);
  }

  get cardMask(): string {
    const card = (this.cardNumber || '').trim();
    if (!card) return '----';
    return `**** ${card.slice(-4)}`;
  }

  get formattedPayBefore(): string {
    if (!this.creditPayBefore) return '--';
    const date = new Date(this.creditPayBefore);
    if (Number.isNaN(date.getTime())) return this.creditPayBefore;
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  public async confirmPayment() {
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
