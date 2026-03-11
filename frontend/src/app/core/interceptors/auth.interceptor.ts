import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRedirecting = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

  if (!isPlatformBrowser(this.platformId)) {
    if (req.url.includes('/api/me')) return EMPTY;
  }

  let authReq = req;

  if (this.isApiRequest(req)) {

    let headers = req.headers.set('Accept', 'application/json');

    const token = this.getToken();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (isPlatformBrowser(this.platformId)) {

      const hostname = window.location.hostname;

      let tenantHeader =
        hostname === 'localhost' || hostname === '127.0.0.1'
          ? 'pruebaagent.centralaudit.tecnodatasa.cl'
          : hostname;

      headers = headers.set('X-Tenant-Domain', tenantHeader);

      const sub = hostname.split('.')[0];

      if (sub && sub !== 'centralaudit' && hostname !== 'localhost') {
        headers = headers.set('X-Tenant-Code', sub.replace(/-centralaudit$/, ''));
      }
    }

    authReq = req.clone({
      headers,
      withCredentials: true
    });
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
    return req.url.includes('/api') || req.url.includes('/tenant');
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private handleUnauthorized(): void {

    if (!isPlatformBrowser(this.platformId)) return;

    if (this.isRedirecting) return;

    this.isRedirecting = true;

    localStorage.removeItem('token');

    this.router.navigate(['/login']).finally(() => {
      this.isRedirecting = false;
    });
  }
}
