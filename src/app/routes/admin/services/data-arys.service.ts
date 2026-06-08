import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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
  private readonly get_membership_by_email_url = environment.arys.OtherApis.get_membership_by_email
  private readonly retry_credit_line_url = environment.arys.OtherApis.retry_credit_line
  private readonly validate_credit_line_url = environment.arys.OtherApis.validate_credit_line
  private readonly update_membership_cedrif_credit_url =
    environment.arys.OtherApis.update_membership_cedrif_credit
  private readonly save_credit_payment_url = environment.arys.OtherApis.save_credit_payment
  private readonly get_credit_payment_by_id_url = environment.arys.OtherApis.get_credit_payment_by_id
  private readonly updateCredit = environment.arys.OtherApis.update_credit
  private readonly getPurchased = environment.meritop.addData.get_purchase

  constructor() { }

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('accessToken') || '';
    if (!token) return new HttpHeaders();
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('x-access-token', token);
  }

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

  public save_credit_payment(payload: { payment_id: string; bank: string; phone: string }) {
    const payment_id = String(payload?.payment_id ?? '').trim();
    const bank = String(payload?.bank ?? '').trim();
    const phone = String(payload?.phone ?? '').trim();
    return this.http
      .post<any>(`${this.baseUrl}/${this.save_credit_payment_url}`, { payment_id, bank, phone })
      .pipe(
        catchError(() => {
          return throwError(() => new Error('Error al guardar pago de crédito'));
        })
      );
  }

  public get_credit_payment_by_id(payment_id: string) {
    const id = encodeURIComponent(String(payment_id ?? '').trim());
    return this.http.get<any>(`${this.baseUrl}/${this.get_credit_payment_by_id_url}/${id}`).pipe(
      catchError(() => {
        return throwError(() => new Error('Error al consultar pago de crédito'));
      })
    );
  }

  public add_membership(data: any) {
    return this.http.post<any>(`${this.baseUrl}/${this.add_membership_url}`,data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error añadir membresía'));
      })
    )
  }


  public get_membership(id_member: number | string) {
    return this.http.get<any>(`${this.baseUrl}/${this.get_membership_url}/${id_member}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error obtener membresía'));
      })
    )
  }

  public get_membership_by_email(email: string) {
    const q = encodeURIComponent(email.trim());
    return this.http.get<any>(`${this.baseUrl}/${this.get_membership_by_email_url}?email=${q}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error obtener membresía por email'));
      })
    )
  }

  public validate_credit_line(payload: { rif: string }) {
    const rif = String(payload?.rif ?? '').trim();
    return this.http
      .post<any>(`${this.baseUrl}/${this.validate_credit_line_url}`, { rif }, { headers: this.getAuthHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error al validar línea de crédito'));
        })
      );
  }

  public update_membership_cedrif_credit(id_member: number | string, payload: { rif: string }) {
    const rif = String(payload?.rif ?? '').trim();
    return this.http
      .post<any>(
        `${this.baseUrl}/${this.update_membership_cedrif_credit_url}/${id_member}/cedrif-credit`,
        { rif },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error al actualizar cedrif_credit en membresía'));
        })
      );
  }

  public retry_credit_line(
    id_member: number | string,
    payload?: {
      rif?: string;
      prefix?: string;
      docid?: string;
      docType?: string;
      name?: string;
      last_name?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      phone_number?: string;
      account_number?: string;
      accountNumber?: string;
    }
  ) {
    const body: Record<string, string> = {};
    if (!payload) {
      return this.http.post<any>(
        `${this.baseUrl}/${this.retry_credit_line_url}/member/${id_member}`,
        body,
        { headers: this.getAuthHeaders() }
      ).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error al reintentar línea de crédito'));
        })
      );
    }
    const set = (k: string, v: string | undefined) => {
      if (v != null && String(v).trim() !== '') body[k] = String(v).trim();
    };
    set('rif', payload.rif ?? payload.docid);
    set('prefix', payload.prefix ?? payload.docType);
    set('name', payload.name);
    set('last_name', payload.last_name ?? payload.lastName);
    set('email', payload.email);
    set('phone_number', payload.phone_number ?? payload.phone);
    set('account_number', payload.account_number ?? payload.accountNumber);
    return this.http.post<any>(`${this.baseUrl}/${this.retry_credit_line_url}/member/${id_member}`, body, { headers: this.getAuthHeaders() }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al reintentar línea de crédito'));
      })
    )
  }
}
