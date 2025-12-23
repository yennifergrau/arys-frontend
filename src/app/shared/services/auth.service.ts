import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from './../../../environments/environment';
import {NavController} from '@ionic/angular'

type RegisterResponse = { message: string };
type AuthDto = { email: string; password: string };
type Password = { email: string; password: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.authentication;
  private navCtrl = inject(NavController)
  accessToken = signal<string | null>(null);
  expirationTime = signal<number | any>(null);
  error = signal<string | null>(null);
  private readonly urlUser = environment.user.url
  private readonly view_user = environment.user.data.view_user
  private readonly update_user = environment.user.data.edit_user

  constructor() {
    const tokenFromStorage = sessionStorage.getItem('accessToken');
    const expirationTimeFromStorage = sessionStorage.getItem('tokenExpirationTime');

    this.accessToken.set(tokenFromStorage);
    this.expirationTime.set(expirationTimeFromStorage ? Number(expirationTimeFromStorage) : null);

    if (this.isTokenExpired()) {
      this.logout();
    }
  }

  register(user: any): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/sarys/post/fechetd/logout`, user)
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.message || 'Registration failed');
          return throwError(() => err);
        })
      );
  }

  login(credentials: AuthDto): Observable<any> {
    return this.http
      .post<{ code: number, token: string, message: string }>(`${this.baseUrl}/sarys/post/fechetd/login`, credentials)
      .pipe(
        tap((res) => this.storeTokens(res)),
        catchError((err) => {
          this.error.set(err.error?.message || 'Login failed');
          return throwError(() => err);
        })
      );
  }

  public restore_password(data:any) : Observable<Password>{
    return this.http.post<any>(`${this.baseUrl}/sarys/update/fechectd/restore_password`,data).pipe(
      catchError((err) => {
        this.error.set(err.error?.message || 'pasword failed');
        return throwError(() => err);
      })
    )
  }

  public update_password(data:any) : Observable<any>{
    return this.http.post<any>(`${this.baseUrl}/sarys/update/fechectd/update_password`,data).pipe(
      catchError((err) => {
        this.error.set(err.error?.message || 'email failed');
        return throwError(() => err);
      })
    )
  }

  private storeTokens(response: { code: number, token: string, message: string }): void {
    if (response.token) {
      const decodedToken = this.decodeToken(response.token);
      const expirationTime = decodedToken.exp * 1000;

      this.accessToken.set(response.token);
      this.expirationTime.set(expirationTime);
      sessionStorage.setItem('accessToken', response.token);
      sessionStorage.setItem('tokenExpirationTime', expirationTime.toString());
    } else {
      this.error.set('No token received');
    }
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken() && !this.isTokenExpired();
  }

  private isTokenExpired(): boolean {
    const currentTime = new Date().getTime();
    return this.expirationTime() !== null && currentTime > this.expirationTime();
  }

  logout(): void {
    this.accessToken.set(null);
    this.expirationTime.set(null);
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('tokenExpirationTime');
    this.navCtrl.navigateBack(['/'])
  }
  
  private decodeToken(token: string): any {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }


  public view_user_info(data:any) {
    return this.http.post<any>(`${this.urlUser}/${this.view_user}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al obtener información del usuario'))
      })
    )
  }

  public edit_user_info(data:string) {
    return this.http.post<any>(`${this.urlUser}/${this.update_user}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al actualizar información del usuario'))
      })
    )
  }


}
