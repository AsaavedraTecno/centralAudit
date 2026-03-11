import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private isLoggedIn = false;

  headers: HttpHeaders;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {

    this.headers = new HttpHeaders({
      "Content-Type": "application/json",
      "Accept": "application/json"
    });

  }

  login(email: string, password: string): Observable<any> {

    const loginData = {
      email,
      password,
      client_id: 'web_dashboard'
    };

    return this.http.post(`/api/login`, loginData, { headers: this.headers }).pipe(
      map((datos: any) => {

        const token = datos.access_token || datos.token;

        if ((datos.success || token) && token) {

          this.saveToken(token);
          this.isLoggedIn = true;

          if (datos.client && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('client_info', JSON.stringify(datos.client));
          }

        }

        return datos;

      })
    );
  }

  register(userData: any): Observable<any> {

    return this.http.post(`/api/register`, userData, {
      headers: this.headers,
      responseType: 'text'
    }).pipe(

      map((text: string) => {

        try {
          return JSON.parse(text);
        } catch (e) {
          return {
            success: false,
            error: 'Respuesta inesperada del servidor',
            details: text
          };
        }

      })

    );
  }

  logout(): Observable<any> {

    return this.http.post(`/api/logout`, {}, { headers: this.headers }).pipe(

      map(response => {

        this.logout2();
        return response;

      }),

      catchError(err => {

        this.logout2();
        return of(err);

      })

    );
  }

  private saveToken(token: string): void {

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }

  }

  logout2(): void {

    this.isLoggedIn = false;

    if (isPlatformBrowser(this.platformId)) {

      localStorage.removeItem('token');
      localStorage.removeItem('idUser');
      localStorage.removeItem('id_user');
      localStorage.removeItem('idEmpresa');
      localStorage.removeItem('role');
      localStorage.removeItem('permisos');

      const keys = Object.keys(localStorage);

      keys.forEach(key => {

        if (
          key.startsWith('clientesPage_') ||
          key === 'clienteTreeExpandedNodes' ||
          key === 'clienteTreeClientesWithData' ||
          key === 'lastClientesPerPage'
        ) {

          localStorage.removeItem(key);

        }

      });

    }

    this.clearIndexedDB();

    this.router.navigate(['/login']);

  }

  private clearIndexedDB(): void {

    if (isPlatformBrowser(this.platformId)) {

      try {

        const request = indexedDB.deleteDatabase('ClienteDatabase');

        request.onsuccess = () => {
          console.log('ClienteDatabase deleted successfully');
        };

        request.onerror = () => {
          console.warn('Error deleting ClienteDatabase');
        };

      } catch (error) {

        console.warn('Error clearing IndexedDB:', error);

      }

    }

  }

  getToken(): string | null {

    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }

    return null;

  }

  loginAzure(data: any): Observable<any> {

    return this.http.post<any>(`/api/login-azure`, data, {
      headers: this.headers
    }).pipe(
      map(datos => datos)
    );

  }

  isAuthenticated(): boolean {

    const token = this.getToken();

    if (!token) return false;

    return token.length > 0;

  }

  me(): Observable<any> {

    if (isPlatformBrowser(this.platformId)) {
      return this.http.get(`/api/me`);
    }

    return of(null);

  }

  checkAuthAndRedirect(): void {

    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

  }

}