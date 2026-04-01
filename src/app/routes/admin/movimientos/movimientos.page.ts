import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { MeritopService } from '../services/meritop.service';
import { DataArysService } from '../services/data-arys.service';
import { Transaction, TransactionListRequest } from '../interface/meritop.interface';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-movimientos',
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink]
})
export class MovimientosPage implements OnInit {
  private meritopService = inject(MeritopService);
  private arysService = inject(DataArysService);
  private navCtrl = inject(NavController);

  public transactions: Transaction[] = [];
  public groupedTransactions: { date: string, items: Transaction[] }[] = [];
  public showLoading = false;
  public selectedSegment: string = 'ultimos'; // 'ultimos' | 'fecha'
  public debtAmount: number = 0;
  public limitAmount: number = 0;
  public cardNumber: string = '0171000000001134';
  
  private userId: number | null = null;
  private productId: string | null = null;

  constructor() {}

  async ngOnInit() {
    this.loadUserData();
    this.loadMembershipData();
    this.fetchTransactions();
  }

  private loadUserData() {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.id_user;
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
          this.productId = membership.credit_line_id;
        }
      }
    });
  }

  public segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
    this.fetchTransactions();
  }

  public fetchTransactions() {
    this.showLoading = true;
    
    // Mock parameters as per requirements
    const request: TransactionListRequest = {
      ip: '127.0.0.1',
      bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
      channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
      terminal: '0',
      productId: this.productId || ''
    };

    if (this.selectedSegment === 'ultimos') {
      this.meritopService.getTransactionList(request)
        .pipe(finalize(() => this.showLoading = false))
        .subscribe({
          next: (res) => {
            this.transactions = res?.transactions || this.getMockTransactions();
            this.groupTransactions();
          },
          error: () => {
            this.transactions = this.getMockTransactions();
            this.groupTransactions();
          }
        });
    } else {
      // For month/date view, we could use listByMonth with current month
      this.meritopService.getTransactionListByMonth(request)
        .pipe(finalize(() => this.showLoading = false))
        .subscribe({
          next: (res) => {
            this.transactions = res?.transactions || this.getMockTransactions();
            this.groupTransactions();
          },
          error: () => {
            this.transactions = this.getMockTransactions();
            this.groupTransactions();
          }
        });
    }
  }

  private groupTransactions() {
    const groups: { [key: string]: Transaction[] } = {};
    
    this.transactions.forEach(tx => {
      const date = new Date(tx.date);
      const dateStr = this.formatDateHeader(date);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(tx);
    });

    this.groupedTransactions = Object.keys(groups).map(date => ({
      date,
      items: groups[date]
    })).sort((a, b) => new Date(b.items[0].date).getTime() - new Date(a.items[0].date).getTime());
  }

  private formatDateHeader(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let formatted = date.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  public goBack() {
    this.navCtrl.back();
  }

  private getMockTransactions(): Transaction[] {
    return [
      {
        transactionId: '1',
        amount: -150.50,
        description: 'Servicio automotriz',
        merchantName: 'Taller Los Próceres',
        date: '2026-03-18T14:30:00',
        type: 'purchase'
      },
      {
        transactionId: '2',
        amount: 500.00,
        description: 'Pago móvil verificado',
        merchantName: 'Pago de cuota',
        date: '2026-03-17T10:00:00',
        type: 'payment'
      },
      {
        transactionId: '3',
        amount: -40.00,
        description: 'Consumo con línea ARYS',
        merchantName: 'Gasolina',
        date: '2026-03-16T08:20:00',
        type: 'purchase'
      }
    ];
  }
}
