import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { commerce } from '../interface/meritop.interface';

@Injectable({
  providedIn: 'root'
})
export class JsonLoaderService {

  private readonly http = inject(HttpClient)
  private readonly jsonPath = 'assets/json/commerce.json'
  private readonly jsonCustomer = 'assets/json/customer.json'
  private readonly jsonBank = 'assets/json/listBank.json'
  private readonly jsonTransaction = 'assets/json/transactionC.json'
  private readonly jsonPayment = 'assets/json/payment.json'

  constructor() { }

  getCommerceData(): Observable<commerce> {
    return this.http.get<commerce>(this.jsonPath);
  }

  getCustomerData(): Observable<any> {
    return this.http.get<any>(this.jsonCustomer);
  }

  getListBank(): Observable<any> {
    return this.http.get<any>(this.jsonBank);
  }

  getTrasactionC(): Observable<any>{
    return this.http.get<any>(this.jsonTransaction);
  }

  getPayment() : Observable<any>{
    return this.http.get<any>(this.jsonPayment)
  }
}
