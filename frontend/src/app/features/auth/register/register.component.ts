import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
// BORRA ESTA LÍNEA: import { hostname } from 'node:os';  <-- ESTO DA ERROR

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html', // Asegúrate que la ruta sea correcta
  styles: []
})
export class RegisterComponent implements OnInit {
  
  regData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
    // Quitamos 'hostname' del objeto, el backend lo sabe por el dominio
  };

  loading: boolean = false;
  logoUrl: string = 'assets/logoMonitoreo.png';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const hostname = window.location.hostname.toLowerCase();
      
      // LOGICA DE SEGURIDAD:
      // Si estamos en la central o localhost (sin subdominio), PROHIBIDO REGISTRARSE.
      if (hostname === 'tdmonitor.cl' || hostname === 'localhost' || hostname === '127.0.0.1') {
        Swal.fire('Acceso Restringido', 'El registro de usuarios solo está permitido en los sitios de empresas.', 'warning');
        this.router.navigate(['/login']);
      }
    }
  }

  registrar() {
    // ... (Tus validaciones están bien, déjalas igual) ...

    this.loading = true;

    this.authService.register(this.regData).subscribe({
      next: (res) => {
        // Manejo robusto: A veces el backend devuelve texto o json
        const message = res?.message || 'Cuenta creada correctamente.';
        Swal.fire('¡Éxito!', message + ' Ya puedes iniciar sesión.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        // Mejor manejo de errores de Laravel (suelen venir en 'errors' o 'message')
        const msg = err.error?.message || 'No se pudo completar el registro';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}