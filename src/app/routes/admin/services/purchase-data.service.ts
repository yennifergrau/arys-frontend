import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PurchaseDataService {
  get idPurchase(): string | null {
    return localStorage.getItem('idPurchase');
  }

  get amountPurchase(): string | null {
    return localStorage.getItem('amountPurchase');
  }

  get cutDate(): string | null {
    return localStorage.getItem('cutDate');
  }

  //Setters

  set idPurchase(value: string) {
    localStorage.setItem('idPurchase', value);
  }

  set amountPurchase(value: string) {
    localStorage.setItem('amountPurchase', value);
  }

  set cutDate(value: string) {
    localStorage.setItem('cutDate', value);
  }
}
