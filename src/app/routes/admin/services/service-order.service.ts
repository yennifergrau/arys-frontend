import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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

  private getAuthHeaders(): { headers?: HttpHeaders } {
    const token = (sessionStorage.getItem('accessToken') || '').trim();
    if (!token) return {};
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('x-access-token', token);
    return { headers };
  }

  public getPendingOrders(customerId: number) {
    return this.http.get<PendingOrdersResponse>(
      `${this.baseUrl}/${this.getPendingUrl}/${customerId}`,
      this.getAuthHeaders()
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al obtener ordenes pendientes'));
      })
    );
  }

  public getOrderDetails(orderId: string, idMember?: number) {
    const q =
      idMember != null && !Number.isNaN(idMember) && idMember > 0
        ? `?id_member=${encodeURIComponent(String(idMember))}`
        : '';
    return this.http.get<OrderDetailsResponse>(
      `${this.baseUrl}/${this.getOrderDetailUrl}/${orderId}${q}`,
      this.getAuthHeaders()
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al obtener detalle de orden'));
      })
    );
  }

  public applyCredit(orderId: string, creditAmount: number, idMember?: number) {
    const body: { creditAmount: number; id_member?: number } = { creditAmount };
    if (idMember != null && !Number.isNaN(idMember) && idMember > 0) {
      body.id_member = idMember;
    }
    return this.http.post<ApplyCreditResponse>(
      `${this.baseUrl}/${this.applyCreditUrl}/${orderId}/apply-credit`,
      body,
      this.getAuthHeaders()
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al aplicar credito'));
      })
    );
  }

  public payWithCredit(orderId: string) {
    return this.http.post<PaymentResponse>(
      `${this.baseUrl}/${this.payOrderUrl}/${orderId}/pay`,
      {},
      this.getAuthHeaders()
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al procesar pago con credito'));
      })
    );
  }
}
