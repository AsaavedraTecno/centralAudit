import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Component, inject, Inject, PLATFORM_ID, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InactivityService } from '../../core/services/inactivity.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-layoutComponent',
  imports: [RouterOutlet, CommonModule, RouterModule, ToastComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class layoutComponent implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');
  private destroy$ = new Subject<void>();

  // --- Variables de Usuario ---
  userEmail: string = '';
  userRole: string = '';
  userIdActual: number = 0;
  userName: string = 'Usuario'; // Nombre completo o alias
  userInitial: string = 'U';    // Letra inicial para el avatar

  menuAbierto: boolean = false;

  public logoUrl: string = 'https://www.tecnodatasa.cl/wp-content/uploads/2024/07/Frame-39628.png';
  isCentralDomain: boolean = false;

  constructor(
    private inactivityService: InactivityService,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.userRole = localStorage.getItem('role') || '';
      
      const hostname = window.location.hostname;
      const centralDomain = 'tdmonitor.cl';
      
      this.isCentralDomain = (hostname === centralDomain || hostname === 'localhost' || hostname === '127.0.0.1');
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {

      this.inactivityService.sessionWarning$
        .pipe(takeUntil(this.destroy$))
        .subscribe((minutesRemaining: number) => {
          console.warn(`Sesión se cerrará en ${minutesRemaining} minutos por inactividad`);
        });

      this.authService.me().subscribe({
        next: (response) => {
          if (response) {
            // Asignación de datos básicos
            this.userRole = response.user?.role || response.role || '';
            this.userIdActual = response.user?.id || 0;
            this.userEmail = response.user?.email || '';

            // Determinar Nombre e Inicial Dinámica
            // Asume que la API devuelve 'name' o usamos el inicio del email si no hay nombre
            const fullName = response.user?.name || response.name || this.userEmail.split('@')[0] || 'Usuario';
            this.userName = fullName;
            this.userInitial = fullName.charAt(0).toUpperCase();
          }
        },
        error: (err) => {
          console.error('Error de sesión:', err);
          this.router.navigate(['/login']);
        }
      });
    }
  }

  cerrarMenu() {
    this.menuAbierto = false;
  }

  canSeeGlobalAdmin(): boolean {
    return this.isCentralDomain && (this.userRole === 'admin' || this.userRole === 'superadmin');
  }

  isAdmin(): boolean { 
    return this.userRole === 'admin' || this.userRole === 'superadmin'; 
  }

  logout(): void { 
    this.authService.logout2(); 
  }

  getDisplayRole(): string {
    if (this.userRole === 'superadmin') return 'Super Admin';
    if (this.userRole === 'admin') return 'Administrador';
    return 'Usuario';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}