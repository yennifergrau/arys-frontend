import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { PurchaseDataService } from '../services/purchase-data.service';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';

@Component({
  selector: 'app-recipe-purchase',
  templateUrl: './recipe-purchase.page.html',
  styleUrls: ['./recipe-purchase.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    FormatCurrencyPipe,
  ],
  providers: [PurchaseDataService],
})
export class RecipePurchasePage implements OnInit {
  private purchaseService = inject(PurchaseDataService);

  get cutDate(): string {
    return this.purchaseService.cutDate!;
  }

  get idPurchase(): string {
    return this.purchaseService.idPurchase!;
  }

  get amountPurchase(): string {
    return this.purchaseService.amountPurchase!;
  }

  get today() {
    return new Date();
  }

  constructor() {}

  ngOnInit() {}
}
