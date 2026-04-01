import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el Servidor (SSR), enviamos la petición tal cual 
  // (o podrías configurar una URL base de Docker aquí)
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  // Ahora estamos seguros de que estamos en el Navegador
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const baseUrl = `${protocol}//${hostname}:8000`;

  const isCentral =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'tdmonitor.cl';

  if (req.url.startsWith('/api')) {
    const centralApis = ['/api/vistas-personalizadas'];
    const isCentralApi = centralApis.some(r => req.url.startsWith(r));

    // Lógica para TENANTS
    if (!isCentral && !isCentralApi) {
      const tenantPath = req.url.replace('/api', '/tenant');
      const newUrl = `${baseUrl}${tenantPath}`;
      return next(req.clone({ url: newUrl }));
    }

    // Lógica para CENTRAL
    const newUrl = `${baseUrl}${req.url}`;
    return next(req.clone({ url: newUrl }));
  }

  return next(req);
};