import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';

@Component({
  selector: 'app-report',
  templateUrl: './report.page.html',
  styleUrls: ['./report.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TabComponent]
})
export class ReportPage implements OnInit {

  data_payment !: any
  amount !: number
  data : any
  phone !: string
  bank !: any

  constructor() { }

  ngOnInit() {
  setTimeout(() => {
    this.data_payment = JSON.parse(localStorage.getItem('data-payment') || '[]')
    if(this.data_payment){
      this.amount = this.data_payment.amount
      this.data = this.data_payment.paidon
      this.phone = this.data_payment.payphone
      this.bank = this.data_payment.bankcode
    }
  }, 2000);
  }

  fechaActual() {
    return new Date().toISOString().split('T')[0];
  }

}
