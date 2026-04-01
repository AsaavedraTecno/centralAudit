import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 1. Verificar si está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Lógica de seguridad por dominio
    if (isPlatformBrowser(this.platformId)) {
      const hostname = window.location.hostname;
      const centralDomain = 'tdmonitor.cl';
      const isCentral = (hostname === centralDomain || hostname === 'localhost' || hostname === '127.0.0.1');

      const urlDestino = state.url;

      // 3. Bloquear rutas de "Administración Global" si estamos en un tenant
      // Si la URL contiene estas palabras y NO es la central, lo sacamos
      const rutasProhibidasParaTenants = ['/gestion-clientes', '/administracion'];
      
      const esRutaProhibida = rutasProhibidasParaTenants.some(path => urlDestino.startsWith(path));

      if (esRutaProhibida && !isCentral) {
        console.warn('Acceso denegado: Un Tenant intentó entrar a gestión global.');
        this.router.navigate(['/monitoreo/panel']); // Lo mandamos a su sitio
        return false;
      }
    }

    return true;
  }
}