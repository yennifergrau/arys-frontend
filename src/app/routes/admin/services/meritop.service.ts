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
  private readonly meritop_transactionList = environment.meritop.globalMeritop.transactionList
  private readonly meritop_transactionListByMonth = environment.meritop.globalMeritop.transactionListByMonth

  constructor() { }


  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.error?.message) {
      return error.error.error.message;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    return error.message || 'Error en la operación';
  }

  public listProvider() {
    return this.http.get<string>(`${this.url_meritop}/${this.list_provider}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public getAccessToken() {
    return this.http.get<any>(`${this.url_meritop}/${this.meritop_access_token}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public listCommerce(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_commerce}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public customerProduct(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_customer}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public transactionCustomer(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_transactionC}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public getTransactionList(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_transactionList}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public getTransactionListByMonth(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_transactionListByMonth}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public listBankOption(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_list_bank}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public addPurchased(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_addPurchased}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        // En lugar de devolver el HttpErrorResponse completo, devolvemos un Error con el mensaje extraído
        // para mantener la compatibilidad con el código previo del componente.
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public addPayment(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.meritop_addPayment}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public addPurchasedUser(data: string | any) {
    return this.http.post<any>(`${this.url_meritop}/${this.add_purchased}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  public createCustomer(data: any) {
    return this.http.post<any>(`${this.url_meritop}/${this.customer_user_create}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }
}
