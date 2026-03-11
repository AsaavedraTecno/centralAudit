import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {

  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const hostname = window.location.hostname;

  const isCentral =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'centralaudit.tecnodatasa.cl';

  if (req.url.startsWith('/api')) {

    // rutas que SIEMPRE son central
    const centralApis = [
      '/api/vistas-personalizadas'
    ];

    const isCentralApi = centralApis.some(r => req.url.startsWith(r));

    // si estamos en tenant y NO es una API central
    if (!isCentral && !isCentralApi) {

      const tenantPath = req.url.replace('/api', '/tenant');

      const newUrl = `http://${hostname}:8000${tenantPath}`;

      console.log('TENANT API:', newUrl);

      return next(req.clone({ url: newUrl }));
    }

    // central
    const newUrl = `http://127.0.0.1:8000${req.url}`;

    console.log('CENTRAL API:', newUrl);

    return next(req.clone({ url: newUrl }));
  }

  return next(req);
};