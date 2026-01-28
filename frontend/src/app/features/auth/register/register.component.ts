import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'] // O el archivo de estilos que uses
})
export class RegisterComponent implements OnInit {
  
  // Definimos el objeto que el HTML está buscando
  regData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
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
      const hostname = window.location.hostname;
      // Seguridad: Si entran desde la central, los mandamos al login
      if (hostname === 'centralaudit.tecnodatasa.cl' || hostname === 'localhost') {
        this.router.navigate(['/login']);
      }
    }
  }

  registrar() {
    // Validaciones Básicas
    if (!this.regData.name || !this.regData.email || !this.regData.password) {
      Swal.fire('Atención', 'Todos los campos son obligatorios', 'warning');
      return;
    }

    // Validador de Contraseñas
    if (this.regData.password !== this.regData.password_confirmation) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }

    if (this.regData.password.length < 8) {
      Swal.fire('Seguridad', 'La contraseña debe tener al menos 8 caracteres', 'info');
      return;
    }

    this.loading = true;

    // Llamada al servicio
    this.authService.register(this.regData).subscribe({
      next: (res) => {
        Swal.fire('¡Éxito!', 'Cuenta creada correctamente. Ya puedes iniciar sesión.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Error', err.error?.message || 'No se pudo completar el registro', 'error');
      }
    });
  }
}