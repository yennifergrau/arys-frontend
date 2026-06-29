import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

@Injectable({ providedIn: 'root' })
export class PolizaquiService {
  private readonly http = inject(HttpClient);
  private readonly tokenStore = inject(TokenStoreService);
  private readonly baseUrl = environment.polizaqui.baseUrl;
  private readonly registerPaymentUrl = environment.polizaqui.registerPayment;
  private readonly registerMembershipUrl = environment.polizaqui.registerMembership;
  private readonly tasaUrl = environment.polizaqui.tasa;

  private getHeaders(): { headers: HttpHeaders } {
    // Compatible con Arys-Poliza: intenta enviar token si existe.
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const bearer = (this.tokenStore.getAccessTokenSync() || '').trim();
      if (bearer) {
        headers = headers.set('x-access-token', bearer).set('Authorization', `Bearer ${bearer}`);
      }
    } catch {
      // noop
    }
    return { headers };
  }

  /** Tasa BCV del día (USD → Bs). */
  public tase_api(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${this.tasaUrl}`, this.getHeaders()).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('error en tase_api', error);
        return throwError(() => error);
      })
    );
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

