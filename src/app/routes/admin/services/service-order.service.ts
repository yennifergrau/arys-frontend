import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PendingOrdersResponse, OrderDetailsResponse, PaymentResponse, ApplyCreditResponse } from '../interface/service-order.interface';

@Injectable({
  providedIn: 'root'
})
export class ServiceOrderService {

  private http = inject(HttpClient)
  private readonly baseUrl = environment.arys.url
  private readonly getPendingUrl = environment.arys.OtherApis.get_pending_orders
  private readonly getOrderDetailUrl = environment.arys.OtherApis.get_order_details
  private readonly payOrderUrl = environment.arys.OtherApis.pay_order_credit
  private readonly applyCreditUrl = environment.arys.OtherApis.apply_credit

  constructor() { }

  public getPendingOrders(customerId: number) {
    return this.http.get<PendingOrdersResponse>(`${this.baseUrl}/${this.getPendingUrl}/${customerId}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al obtener ordenes pendientes'));
      })
    );
  }

  public getOrderDetails(orderId: string) {
    return this.http.get<OrderDetailsResponse>(`${this.baseUrl}/${this.getOrderDetailUrl}/${orderId}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al obtener detalle de orden'));
      })
    );
  }

  public applyCredit(orderId: string, creditAmount: number) {
    return this.http.post<ApplyCreditResponse>(
      `${this.baseUrl}/${this.applyCreditUrl}/${orderId}/apply-credit`,
      { creditAmount }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al aplicar credito'));
      })
    );
  }

  public payWithCredit(orderId: string) {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/${this.payOrderUrl}/${orderId}/pay`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al procesar pago con credito'));
      })
    );
  }
}
