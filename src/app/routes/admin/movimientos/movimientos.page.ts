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

@Component({
  selector: 'app-movimientos',
  templateUrl: './movimientos.page.html',
  styleUrls: ['./movimientos.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TabComponent, RouterLink]
})
export class MovimientosPage implements OnInit {
  private meritopService = inject(MeritopService);
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

  private docId: number | null = null;
  private docType = '';
  private productId: string | null = null;

  constructor() {}

  ngOnInit() {
    this.initializeDateRange();
    this.loadCustomerProduct();
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
    if (!identity) {
      this.transactions = [];
      this.groupTransactions();
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

    this.showLoading = true;
    this.meritopService.getAccessToken().subscribe({
      next: () => {
        this.meritopService.customerProduct(payload)
          .pipe(finalize(() => this.showLoading = false))
          .subscribe({
            next: (result: any) => {
              const product = result?.products?.[0];
              if (!product) {
                this.transactions = [];
                this.groupTransactions();
                return;
              }

              this.debtAmount = Number(product.amount_used ?? product.present_debt_amt ?? 0);
              this.limitAmount = Number(product.limit ?? 0);
              this.minPayAmount = Number(product.amount_share_to_pay ?? (this.debtAmount * 0.15));
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
        this.showLoading = false;
        this.transactions = [];
        this.groupTransactions();
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
            this.transactions = res?.transactions || [];
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
      const txTime = new Date(tx.date).getTime();
      if (Number.isNaN(txTime)) return false;
      return txTime >= from && txTime <= to;
    });
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
    const formatted = date.toLocaleDateString('es-ES', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  public goBack() {
    this.navCtrl.back();
  }
}
