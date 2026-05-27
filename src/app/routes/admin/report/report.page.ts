import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { DataArysService } from '../services/data-arys.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TabComponent]
})
export class ReportPage implements OnInit {

  private dataArys = inject(DataArysService);
  private route = inject(ActivatedRoute);

  data_payment!: any;
  amount!: number;
  data: any;
  phone!: string;
  bank!: any;
  reference = '';

  constructor() { }

  ngOnInit() {
    const paymentId = String(this.route.snapshot.paramMap.get('payment_id') ?? '').trim();
    if (paymentId) {
      this.dataArys.get_credit_payment_by_id(paymentId).subscribe({
        next: (res: any) => {
          const row = res?.data ?? res;
          const orig = row?.payment_orig ?? row;
          this.reference = String(orig?.payment_reference ?? row?.payment_reference ?? paymentId ?? '').trim();
          this.amount = Number(orig?.payment_amount ?? row?.payment_amount ?? 0) || 0;
          this.data = orig?.payment_paidon ?? row?.payment_paidon ?? row?.paidon ?? null;
          this.phone = String(orig?.phonenumber ?? row?.phone ?? row?.payphone ?? '').trim();
          this.bank = String(orig?.bankcode ?? row?.bank ?? row?.bankcode ?? '').trim();
        },
        error: () => {
          // Fallback al dato local anterior si el GET falla
          this.loadFromLocalStorageLegacy();
        },
      });
      return;
    }

    this.loadFromLocalStorageLegacy();
  }

  private loadFromLocalStorageLegacy() {
    setTimeout(() => {
      this.data_payment = JSON.parse(localStorage.getItem('data-payment') || '[]')
      if (this.data_payment) {
        this.amount = this.data_payment.amount
        this.data = this.data_payment.paidon
        this.phone = this.data_payment.payphone
        this.bank = this.data_payment.bankcode
        this.reference = String(this.data_payment.payment_reference ?? this.data_payment.reference ?? '').trim();
      }
    }, 200);
  }

  fechaActual() {
    return new Date().toISOString().split('T')[0];
  }

}
