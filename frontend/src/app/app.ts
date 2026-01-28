import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser } from '@angular/common'; // Importante para SSR
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { InactivityService } from './core/services/inactivity.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class App implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private inactivityService: InactivityService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  ngOnInit(): void {
    // 1. Solo ejecutar lógica de navegación en el Navegador
    if (isPlatformBrowser(this.platformId)) {
      
      // Monitoreo de inactividad
      this.inactivityService.sessionWarning$
        .pipe(takeUntil(this.destroy$))
        .subscribe((minutesRemaining: number) => {
          console.warn(`Sesión se cerrará en ${minutesRemaining} minutos`);
        });

      // 2. Validación de Sesión Dinámica
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      ).subscribe((event: NavigationEnd) => {
        
        // Lista de rutas que NO requieren validación de sesión
        const publicRoutes = ['/login', '/register'];
        const isPublicRoute = publicRoutes.some(route => event.urlAfterRedirects.startsWith(route));
        const hasToken = !!localStorage.getItem('token');

        // SOLO llamamos a /api/me si:
        // - NO es una ruta pública
        // - Y tenemos un token guardado
        if (!isPublicRoute && hasToken) {
          this.authService.me().subscribe({
            error: (err) => {
              console.error('Session expired or invalid:', err);
              localStorage.removeItem('token');
              this.router.navigate(['/login']);
            }
          });
        } else if (!isPublicRoute && !hasToken) {
          // Si intenta entrar a una ruta privada sin token, al login de una
          this.router.navigate(['/login']);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}