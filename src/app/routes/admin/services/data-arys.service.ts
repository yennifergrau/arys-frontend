import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataArysService {

  private http = inject(HttpClient)
  private readonly baseUrl = environment.arys.url
  private readonly add_person_url = environment.arys.OtherApis.add_person
  private readonly add_vehicle_url = environment.arys.OtherApis.add_vehicle
  private readonly add_payment_url = environment.arys.OtherApis.add_payment
  private readonly add_membership_url = environment.arys.OtherApis.add_membership
  private readonly get_membership_url = environment.arys.OtherApis.get_membership
  private readonly retry_credit_line_url = environment.arys.OtherApis.retry_credit_line
  private readonly updateCredit = environment.arys.OtherApis.update_credit
  private readonly getPurchased = environment.meritop.addData.get_purchase

  constructor() { }

  public updatecredit(data:any){
    return this.http.post<any>(`${this.baseUrl}/${this.updateCredit}`,data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al actuaizar credito'));
      })
    );
  }

  public get_purchased() {
    return this.http.get<any>(`${this.baseUrl}/${this.getPurchased}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al extraer data'));
      })
    );
  }

  public add_person(data: string) {
    return this.http.post<any>(`${this.baseUrl}/${this.add_person_url}`,data) .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error añadir persona'));
      })
    );
  }

  public add_vehicle(data:string) {
    return this.http.post<any>(`${this.baseUrl}/${this.add_vehicle_url}`,data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error añadir vehículo'));
      })
    )
  }

  public add_payment(data: any) {
    return this.http.post<any>(`${this.baseUrl}/${this.add_payment_url}`,data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error añadir pago'));
      })
    )
  }

  public add_membership(data: any) {
    return this.http.post<any>(`${this.baseUrl}/${this.add_membership_url}`,data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error añadir membresía'));
      })
    )
  }


  public get_membership(id_user: any) {
    console.log(id_user);

    return this.http.get<any>(`${this.baseUrl}/${this.get_membership_url}/${id_user}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error obtener membresía'));
      })
    )
  }

  public retry_credit_line(id_user: any) {
    return this.http.post<any>(`${this.baseUrl}/${this.retry_credit_line_url}/${id_user}`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al reintentar línea de crédito'));
      })
    )
  }
}
