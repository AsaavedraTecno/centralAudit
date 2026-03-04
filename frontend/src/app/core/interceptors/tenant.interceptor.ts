import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const baseApiUrl = environment.apiUrl; // http://localhost:8000/api


  if (isPlatformBrowser(platformId)) {
    try {
      const currentHostname = window.location.hostname;

      // Si estamos en un subdominio de cliente (NO es central ni local)
      if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1' && currentHostname !== 'centralaudit.tecnodatasa.cl') {
        
        // Solo interceptamos si la petición va a nuestra API
        if (req.url.startsWith(baseApiUrl)) {
          
          const apiLocation = new URL(baseApiUrl);
          apiLocation.hostname = currentHostname;
          
          // CAMBIO CLAVE: Reemplazar '/api' por '/tenant' en la URL base
          let newBaseUrl = apiLocation.href;
          if (apiLocation.pathname.endsWith('/api')) {
             newBaseUrl = apiLocation.href.replace('/api', '/tenant'); 
          }

          // Quitamos slash final por si acaso
          newBaseUrl = newBaseUrl.replace(/\/$/, '');

          // Reemplazamos la parte inicial de la URL original con la nueva
          // Ejemplo: 
          // req.url: http://localhost:8000/api/me
          // baseApiUrl: http://localhost:8000/api
          // newBaseUrl: http://cliente.com:8000/tenant
          // Resultado: http://cliente.com:8000/tenant/me
          const newUrl = req.url.replace(baseApiUrl, newBaseUrl);

          const modifiedReq = req.clone({
            url: newUrl
          });

          return next(modifiedReq);
        }
      }
    } catch (error) {
      console.warn('Error en TenantInterceptor:', error);
    }
  }

  return next(req);
};