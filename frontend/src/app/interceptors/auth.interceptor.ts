import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;

    // Solo procesar requests a nuestra API
    if (this.isApiRequest(req)) {
      const token = this.getToken();
      
      if (token) {
        // Agregar token a requests protegidas
        authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
      }
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Manejar errores de autenticación
        if (error.status === 401) {
          this.handleUnauthorized();
        }
        return throwError(() => error);
      })
    );
  }

  private isApiRequest(req: HttpRequest<any>): boolean {
    // Verificar que sea request a nuestra API
    const url = req.url;
    return url.includes('/api/') && 
           (url.includes('127.0.0.1:8000') || url.includes('localhost:8000'));
  }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private handleUnauthorized(): void {
    // Limpiar token inválido y redirigir
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.router.navigate(['/login']);
  }
}