import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { DataArysService } from '../services/data-arys.service';
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
  private arysService = inject(DataArysService);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);

  public showLoading = false;
  public showSuccess = false;
  public debtAmount = 0;
  public limitAmount = 0;
  public minPayAmount = 0;
  
  // Form fields
  public payAmount: number = 50;
  public bankCode: string = '0102';
  public payPhone: string = '04121234567';
  public paidOn: string = '';
  public concept: string = 'Pago deuda ARYS';

  private userId: number | null = null;
  public cardNumber: string = '0171000000001234';
  public docId: string | number = '';
  public docType: string = '';

  constructor() {
    const now = new Date();
    // Format to yyyy-MM-ddThh:mm for datetime-local
    this.paidOn = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  ngOnInit() {
    this.loadUserData();
    this.loadMembershipData();
  }

  private loadUserData() {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.id_user;
      this.docId = decoded.docid || '';
      this.docType = decoded.doctype || 'V';
    }
  }

  private loadMembershipData() {
    if (!this.userId) return;
    
    this.arysService.get_membership(this.userId).subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
          const membership = res.data[0];
          this.debtAmount = membership.credit_used || 0;
          this.limitAmount = membership.credit_limit || 0;
          this.cardNumber = membership.card_number || this.cardNumber;
          this.minPayAmount = membership.amount_share_to_pay || (this.debtAmount * 0.15);
        }
      }
    });
  }

  public async confirmPayment() {
    if (this.payAmount <= 0) {
      this.showToast('El monto debe ser mayor a 0', 'warning');
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
    // Optional: Sync local state
    this.debtAmount = Math.max(0, this.debtAmount - this.payAmount);
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
