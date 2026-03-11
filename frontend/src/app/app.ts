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

    if (isPlatformBrowser(this.platformId)) {

      const token = localStorage.getItem('token');

      // Iniciar detector de inactividad si hay sesión
      if (token) {
        this.inactivityService.start();
      }

      // Monitoreo de advertencia de sesión
      this.inactivityService.sessionWarning$
        .pipe(takeUntil(this.destroy$))
        .subscribe((minutesRemaining: number) => {
          console.warn(`Sesión se cerrará en ${minutesRemaining} minutos`);
        });

    }

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}