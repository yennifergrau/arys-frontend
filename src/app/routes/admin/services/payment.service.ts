import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = environment.paymentSypago;
  private httpService = inject(HttpClient);

  constructor() {}

  public authToken(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.httpService
      .post<any>(`${this.apiUrl}/sypago/auth`, { headers })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let Msg = 'authentication failed 😰';
          if (err.status === 404 && err.error) {
            return throwError(() => new Error(Msg));
          }
          return throwError(() => err);
        })
      );
  }

  public realizarPago(data: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.httpService
      .post<any>(`${this.apiUrl}/opt/sypago`, data, { headers })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let Msg = 'payment not found 😰';
          if (err.error) {
            return throwError(() => new Error(Msg));
          }
          return throwError(() => err);
        })
      );
  }

  public verifyCodeOTP(data: any) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.httpService.post<any>(`${this.apiUrl}/verify/Code`, data, {
      headers,
    });
  }

  public bankOptions(): Promise<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return firstValueFrom(
      this.httpService.get<any>(`${this.apiUrl}/bankOptions`, { headers }).pipe(
        catchError((err: HttpErrorResponse) => {
          console.log(err)
          let msg = 'no se encontró ningún banco 😰';
          if (err.error) {
            return throwError(() => new Error(msg));
          }
          return throwError(() => err);
        })
      )
    );
  }

  public async registerPayment(data: any): Promise<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return firstValueFrom(
      this.httpService
        .post<any>(`${this.apiUrl}/register/payment`, data, { headers })
        .pipe(
          catchError((err: HttpErrorResponse) => {
            let Msg = 'No se pudo registrar el pago 😰';
            if (err.error && err.status === 404) {
              return throwError(() => new Error(Msg));
            }
            return throwError(() => err);
          })
        )
    );
  }

  public getNotification(data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.httpService
      .post(`${this.apiUrl}/getNotifications`, data, { headers })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          let msg = 'No se pudo obtener la notificación';
          if (err.error) {
            return throwError(() => new Error(msg));
          }
          return throwError(() => err);
        })
      );
  }

  public getTasaBank() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    return firstValueFrom(
      this.httpService.get<any>(`${this.apiUrl}/tasa`, { headers }).pipe(
        catchError((err: HttpErrorResponse) => {
          let msg = 'no se encontró ningúna tasa 😰';
          if (err.error) {
            return throwError(() => new Error(msg));
          }
          return throwError(() => err);
        })
      )
    );
  }
}
