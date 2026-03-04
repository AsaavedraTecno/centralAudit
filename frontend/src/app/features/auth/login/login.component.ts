import { Component, inject, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { CommonModule, isPlatformBrowser } from '@angular/common'; 
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule, RouterLink],
  templateUrl: './login.html',
  styles: []
})
export class LoginComponent implements OnInit {
  // --- Variables de Estado ---
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  invalid: boolean = false;
  loading: boolean = false;
  showPassword: boolean = false;
  
  // --- Variables de Branding ---
  isCentral: boolean = true;
  logoUrl: string = 'assets/img/logoAdminMonitoreo.png';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object, // Inyectamos el ID de plataforma
    private authService: AuthService,
    private routes: ActivatedRoute, 
    private router: Router
  ) { 
    this.loading = false;
  }

  ngOnInit(): void {
    // Solo ejecutamos lógica de navegador (window) si estamos en el cliente
    if (isPlatformBrowser(this.platformId)) {
        const hostname = window.location.hostname.toLowerCase().trim();
        
        console.log('DEBUG - Hostname actual:', hostname);

        // 2. Solo si el dominio NO es el central, activamos el modo cliente
        // Comprobamos si el dominio empieza con algo antes de "centralaudit"
        if (hostname.includes('.centralaudit.tecnodatasa.cl') && hostname !== 'centralaudit.tecnodatasa.cl') {
          // Es un subdominio de cliente (ej: test2-centralaudit...)
          this.isCentral = false;
        } else if (hostname === 'centralaudit.tecnodatasa.cl' || hostname === 'localhost') {
          // Es el dominio raíz o local
          this.isCentral = true;
        } else {
          // Por defecto, si no conocemos el dominio, lo tratamos como cliente para que falle el login si es pirata
          this.isCentral = false;
        }
      // Asignación de Logo
      this.logoUrl = this.isCentral 
        ? 'assets/logoAdminMonitoreo.png' 
        : 'assets/logoMonitoreo.png';
    }

    // Escucha de parámetros de Azure (Token)
    this.routes.queryParams.subscribe(params => {
      const param = params['token'];
      if (param) {
        this.loginAzure(param);
      }
    });
  }

  login() {
    this.invalid = false;
    this.errorMessage = '';

    if (!this.email) {
      this.errorMessage = 'El correo electrónico es obligatorio.';
      this.invalid = true;
      return;
    }

    if (!this.password) {
      this.errorMessage = 'La contraseña es obligatoria.';
      this.invalid = true;
      return;
    }

    let validMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.email);

    if (!validMail) {
      this.errorMessage = 'El correo electrónico no es válido.';
    } else {
      this.loading = true;
      this.authService.login(this.email, this.password).pipe(
        catchError((error: any) => {
          Swal.fire(
            'Advertencia!',
            'Error de autenticación: ' + (error.error?.message || 'Credenciales inválidas'),
            'warning'
          );
          this.loading = false;
          return of(null);
        })
      ).subscribe((response: any) => {
        if (response && isPlatformBrowser(this.platformId)) {
          this.saveSession(response);
          this.router.navigate(['/monitoreo/panel']);
        }
      });
    }
  }

  loginAzure(token: any) {
    this.loading = true;
    this.authService.loginAzure({ token: token }).pipe(
      catchError((error: any) => {
        Swal.fire(
          'Advertencia!',
          'Error de autenticación Azure: ' + (error.error?.error || 'Error desconocido'),
          'warning'
        );
        this.loading = false;
        return of(null);
      })
    ).subscribe({
      next: (response: any) => {
        if (response && isPlatformBrowser(this.platformId)) {
          this.saveSession(response);
          this.router.navigate(['/monitoreo/panel']);
        }
      },
      error: (error) => {
        console.error('Error de autenticación', error);
        this.loading = false;
      }
    });
  }

  /**
   * Centraliza el guardado de datos en localStorage para evitar errores de SSR
   */
private saveSession(response: any): void {
    if (isPlatformBrowser(this.platformId)) {
      
      // Guardamos el token (Laravel devuelve 'access_token' o 'token')
      const token = response.access_token || response.token;
      localStorage.setItem("token", token);

      // El usuario viene dentro de un objeto 'user'
      if (response.user) {
          localStorage.setItem("idUser", response.user.id); // UUID
          localStorage.setItem("id_user", response.user.id); // Duplicado por compatibilidad legacy
          localStorage.setItem("email", response.user.email);
          localStorage.setItem("name", response.user.name);
          
          // OJO: Si el tenant_id no viene explícito en el user, 
          // a veces es útil guardarlo si el backend lo mandó en el root del json
          if (response.tenant_id) {
              localStorage.setItem("idEmpresa", response.tenant_id);
          }
          
          // Roles y Permisos (Si tu User model en backend los devuelve)
          if (response.user.role) {
              localStorage.setItem("role", response.user.role);
          }
          
          // Si envías permisos como array
          if (response.user.permissions) {
              localStorage.setItem("permisos", JSON.stringify(response.user.permissions));
          }
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}