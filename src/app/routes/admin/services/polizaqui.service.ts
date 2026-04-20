import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PolizaquiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.polizaqui.baseUrl;
  private readonly registerPaymentUrl = environment.polizaqui.registerPayment;
  private readonly registerMembershipUrl = environment.polizaqui.registerMembership;

  private getHeaders(): { headers: HttpHeaders } {
    // Compatible con Arys-Poliza: intenta enviar token si existe.
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const token = sessionStorage.getItem('accessToken') || '';
      const bearer = token.trim();
      if (bearer) {
        headers = headers.set('x-access-token', bearer).set('Authorization', `Bearer ${bearer}`);
      }
    } catch {
      // noop
    }
    return { headers };
  }

  public registerPayment(payload: any): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(`${this.baseUrl}/${this.registerPaymentUrl}`, payload, this.getHeaders())
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(() => error);
          })
        )
    );
  }

  public registerMembership(payload: {
    certificate: string;
    id_poliza: number | string;
    anio?: number | null;
    marca?: string;
    modelo?: string;
    version?: string;
    placa?: string;
    serial?: string;
    url_membresia?: string;
  }): Promise<any> {
    return firstValueFrom(
      this.http
        .post<any>(`${this.baseUrl}/${this.registerMembershipUrl}`, payload, this.getHeaders())
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(() => error);
          })
        )
    );
  }
}

