import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MeritopService {

  private readonly http= inject(HttpClient);
  private readonly url_meritop = environment.meritop.url
  private readonly meritop_customer = environment.meritop.globalMeritop.customer
  private readonly meritop_commerce = environment.meritop.globalMeritop.commerce
  private readonly meritop_addPurchased = environment.meritop.globalMeritop.addPurchased
  private readonly meritop_addPayment = environment.meritop.globalMeritop.addPayment
  private readonly meritop_transactionC = environment.meritop.globalMeritop.transactionC
  private readonly meritop_detailsT = environment.meritop.globalMeritop.detailTransaction
  private readonly meritop_access_token = environment.meritop.access.tokenAccess
  private readonly meritop_list_bank = environment.meritop.listBank.meritoBank
  private readonly customer_user_create = environment.meritop.globalMeritop.createcustomeruser
  private readonly list_provider = environment.meritop.globalMeritop.listProvider
  private readonly add_purchased = environment.meritop.addData.add_purchase

  constructor() { }


  public listProvider() {
    return this.http.get<string>(`${this.url_meritop}/${this.list_provider}`).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al obtener los comercios'))
      })
    )
  }

  public getAccessToken() {
    return this.http.get<any>(`${this.url_meritop}/${this.meritop_access_token}`).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al generar el token'))
      })
    )
  }

  public listCommerce(data:any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_commerce}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al obtener los comercios'))
      })
    )
  }


  public customerProduct(data:any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_customer}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al obtener los productos del cliente'))
      })
    )
  }

  public transactionCustomer(data:any){
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_transactionC}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al obtener las transacciones del cliente'))
      })
    )
  }

  public listBankOption (data:any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_list_bank}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al obtener las opciones de bancos'))
      })
    )
  }

  public addPurchased(data:any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_addPurchased}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al agregar la compra'))
      })
    )
  }

  public addPayment(data:any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_addPayment}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al agregar el pago'))
      })
    )
  }

  public addPurchasedUser(data:
    string | any
  ) {
    return this.http.post<any>(`${this.url_meritop}/${this.add_purchased}`,data).pipe(
      catchError((error:HttpErrorResponse) => {
        return throwError(() => new Error ('Error al agregar el pago'))
      })
    )
  }

  public createCustomer(data:any){
    return this.http.post<any>(`${this.url_meritop}/${this.customer_user_create}`,data).pipe(
      catchError((error:HttpErrorResponse | any) => {
        return throwError(() => new Error (``))
      })
    )
  }
}
