import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError, EMPTY } from 'rxjs'; // Importamos EMPTY
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      // 1. SSR Protection para /api/me
      if (!isPlatformBrowser(this.platformId)) {
          if (req.url.includes('/api/me')) return EMPTY;
      }

      let authReq = req;

      if (this.isApiRequest(req)) {
          const token = this.getToken();
          const hostname = isPlatformBrowser(this.platformId) ? window.location.hostname : '';
          
          let tenantHeader = hostname;

          // AJUSTE PARA PRUEBAS LOCALES
          // Si estamos en localhost, por defecto apuntará a la central, 
          // PERO podemos cambiarlo temporalmente a 'test2-centralaudit...' para probar el registro.
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
              tenantHeader = 'centralaudit.tecnodatasa.cl'; 
              // tenantHeader = 'test2-centralaudit.tecnodatasa.cl'; // Descomenta esta línea para probar como cliente en local
          }

          let headers = req.headers.set('Accept', 'application/json');

          // 3. TOKEN DE AUTENTICACIÓN
          if (token) {
              headers = headers.set('Authorization', `Bearer ${token}`);
          }

          // 4. EL "SWITCH" DE BASE DE DATOS (X-Tenant-Domain)
          // Esta es la cabecera que Stancl Tenancy lee en Laravel
          if (tenantHeader) {
              headers = headers.set('X-Tenant-Domain', tenantHeader);
          }

          authReq = req.clone({ headers });
      }

      return next.handle(authReq).pipe(
          catchError((error: HttpErrorResponse) => {
              // Si el token expiró o es inválido (401)
              if (error.status === 401) {
                  this.handleUnauthorized();
              }
              return throwError(() => error);
          })
      );
  }

  private isApiRequest(req: HttpRequest<any>): boolean {
    // ACTUALIZADO: Ahora permite tus nuevos dominios .tecnodatasa.cl
    const url = req.url;
    return url.includes('/api/') || url.includes(':8000');
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private handleUnauthorized(): void {
    // Solo redirigir si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }
  }
}