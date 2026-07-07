import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from './../../../environments/environment';
import {NavController} from '@ionic/angular'
import { TokenStoreService } from './token-store.service';

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
  private tokenStore = inject(TokenStoreService);

  constructor() {
    const tokenFromStorage = this.tokenStore.getAccessTokenSync();
    const expirationTimeFromStorage = this.tokenStore.getExpirationSync();

    this.accessToken.set(tokenFromStorage);
    this.expirationTime.set(expirationTimeFromStorage ?? null);

    if (this.isTokenExpired()) {
      this.logout();
    }
  }

  register(user: any): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/sarys/post/fechetd/register`, user)
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
      void this.tokenStore.setSession(response.token, expirationTime);
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

  clearSession(): void {
    this.accessToken.set(null);
    this.expirationTime.set(null);
    void this.tokenStore.clearSession();
  }

  logout(): void {
    this.clearSession();
    this.navCtrl.navigateBack(['/']);
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

  public updateUserDocument(payload: { prefix: string; rif: string }) {
    const token = (this.tokenStore.getAccessTokenSync() || '').trim();
    const headers = token
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();
    return this.http
      .post<{
        status: boolean;
        message: string;
        token?: string;
      }>(`${this.baseUrl}/sarys/update/fechectd/user/document`, payload, { headers })
      .pipe(
        catchError((err) => {
          this.error.set(err.error?.message || 'No se pudo actualizar el documento');
          return throwError(() => err);
        })
      );
  }

  public applyAccessToken(token: string): void {
    if (!token?.trim()) return;
    const decodedToken = this.decodeToken(token);
    const expirationTime = decodedToken.exp * 1000;
    this.accessToken.set(token);
    this.expirationTime.set(expirationTime);
    void this.tokenStore.setSession(token, expirationTime);
  }

  public edit_user_info(data:string) {
    return this.http.post<any>(`${this.urlUser}/${this.update_user}`, data).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error al actualizar información del usuario'))
      })
    )
  }


}
