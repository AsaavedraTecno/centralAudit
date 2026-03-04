import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: evitamos llamadas que rompan
      if (req.url.includes('/api/me')) return EMPTY;
    }

    let authReq = req;

    if (this.isApiRequest(req)) {
      let headers = req.headers.set('Accept', 'application/json');

      // 1 Token Bearer (opcional si usas solo CSRF)
      const token = this.getToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }

      // 2️ X-Tenant-Domain / X-Tenant-Code
      if (isPlatformBrowser(this.platformId)) {
        const hostname = window.location.hostname;
        let tenantHeader = (hostname === 'localhost' || hostname === '127.0.0.1')
            ? 'pruebaagent.centralaudit.tecnodatasa.cl' 
            : hostname;

        headers = headers.set('X-Tenant-Domain', tenantHeader);

        const sub = hostname.split('.')[0];
        if (sub && sub !== 'centralaudit' && hostname !== 'localhost') {
           headers = headers.set('X-Tenant-Code', sub.replace(/-centralaudit$/, ''));
        }
      }

      // Clonar request con los headers
      authReq = req.clone({ headers }); // <-- importante conCredentials
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.handleUnauthorized();
        }
        return throwError(() => error);
      })
    );
  }

  private isApiRequest(req: HttpRequest<any>): boolean {
    const url = req.url;
    return url.includes('/api/') || url.includes(':8000') || url.includes('/tenant/') || req.url.includes('apicentralaudit.tecnodatasa.cl');
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private handleUnauthorized(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }
  }
}
