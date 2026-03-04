import { RouterOutlet } from '@angular/router';
import { InactivityService } from '../../core/services/inactivity.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Component, inject, Inject, PLATFORM_ID, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // <--- Importante para que funcionen los *ngIf
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component'; // Ajusta la ruta

@Component({
  selector: 'app-layoutComponent',
  imports: [RouterOutlet,CommonModule, RouterModule, ToastComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class layoutComponent implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');
  private destroy$ = new Subject<void>();

  userEmail: string = '';
  userRole: string = '';
  userIdActual: number = 0;
  
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
        
        // DETERMINAR SI ES EL DOMINIO CENTRAL
        const hostname = window.location.hostname;
        const centralDomain = 'centralaudit.tecnodatasa.cl';
        
        // Es central solo si es el dominio exacto o localhost
        // tecnodatin.centralaudit... NO será central
        this.isCentralDomain = (hostname === centralDomain || hostname === 'localhost' || hostname === '127.0.0.1');
      }
    }

  ngOnInit(): void {

    if (isPlatformBrowser(this.platformId)) {

      this.inactivityService.sessionWarning$
        .pipe(takeUntil(this.destroy$))
        .subscribe((minutesRemaining: number) => {
          // Aquí se podría mostrar un modal de advertencia
          console.warn(`Sesión se cerrará en ${minutesRemaining} minutos por inactividad`);
        });

      // Solo cargamos la sesión. 
      // Ya no recuperamos tabs de localStorage porque la URL manda.
      this.authService.me().subscribe({
        next: (response) => {
          if(response){
            this.userRole = response.user?.role || response.role || '';
            this.userIdActual = response.user?.id || 0;
            this.userEmail = response.user?.email || '';
          }

        },
        error: (err) => {
          console.error('Error de sesión:', err);
          this.router.navigate(['/login']);
        }
      });
    }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
