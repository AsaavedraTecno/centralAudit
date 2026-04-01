import { Injectable, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private inactivityTimer: any;
  private warningTimer: any;
  private isWarningShown = false;
  private unsubscribe$ = new Subject<void>();
  private isRunning = false;

  // Observable para notificar sobre la advertencia de sesión a punto de cerrar
  sessionWarning$ = new Subject<number>();

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {

    if (isPlatformBrowser(this.platformId) && this.hasSession()) {
      this.initializeInactivityDetection();
    }
    
  }

  start(): void {

    if (this.isRunning) return;

    if (isPlatformBrowser(this.platformId) && this.hasSession()) {
      this.isRunning = true;
      this.initializeInactivityDetection();
    }
  }

  private hasSession(): boolean {
    return !!localStorage.getItem('token'); 
  }

  /**
   * Inicializa la detección de inactividad
   */
  private boundResetTimer = () => this.resetInactivityTimer();

  private initializeInactivityDetection(): void {
    // Escuchar eventos de usuario fuera de Angular para no afectar cambios de detección
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.boundResetTimer);
      window.addEventListener('keydown', this.boundResetTimer);
      window.addEventListener('click', this.boundResetTimer);
      window.addEventListener('scroll', this.boundResetTimer);
      window.addEventListener('touchstart', this.boundResetTimer);
    });

    // Iniciar el timer de inactividad
    this.startInactivityTimer();
  }

  /**
   * Reinicia el timer de inactividad
   */
  private resetInactivityTimer(): void {
    // Limpiar timers existentes
    clearTimeout(this.inactivityTimer);
    clearTimeout(this.warningTimer);
    this.isWarningShown = false;

    // Iniciar nuevo timer
    this.startInactivityTimer();
  }

  /**
   * Inicia el timer de inactividad
   */
  private startInactivityTimer(): void {
    // Timer de advertencia: 25 minutos (5 minutos antes)
    this.warningTimer = setTimeout(() => {
      if (!this.isWarningShown) {
        this.isWarningShown = true;
        // Notificar que la sesión se cerrará en 5 minutos
        this.ngZone.run(() => {
          this.sessionWarning$.next(5); // 5 minutos de advertencia
        });
      }
    }, this.INACTIVITY_TIMEOUT_MS - (5 * 60 * 1000)); // 25 minutos

    // Timer de cierre: 30 minutos
    this.inactivityTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.closeSession();
      });
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  /**
   * Cierra la sesión por inactividad
   */
  private closeSession(): void {
    // Limpiar localStorage y sessionStorage
    if (this.router.url === '/login') return;

    localStorage.removeItem('token');
    sessionStorage.clear();

    // Navegar a login
    this.router.navigate(['/login']).catch(err => {
      console.error('Navigation to login failed:', err);
    });

    console.log('Sesión cerrada por inactividad');
  }

  /**
   * Limpia el servicio al destruir
   */
  ngOnDestroy(): void {
    clearTimeout(this.inactivityTimer);
    clearTimeout(this.warningTimer);
    this.unsubscribe$.next();
    this.unsubscribe$.complete();

    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('mousemove', this.boundResetTimer);
      window.removeEventListener('keydown', this.boundResetTimer);
      window.removeEventListener('click', this.boundResetTimer);
      window.removeEventListener('scroll', this.boundResetTimer);
      window.removeEventListener('touchstart', this.boundResetTimer);
    }
  }
}
