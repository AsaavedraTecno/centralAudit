import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}`; // Reemplaza con tu URL de autenticación
  private isLoggedIn = false;
  headers:HttpHeaders;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.headers=new HttpHeaders({"Content-Type": "application/json", "Accept": "application/json"});
  }

  login(email: string, password: string): Observable<any> {
    const loginData = {
      email,
      password,
      client_id: 'web_dashboard' // Identificador específico para el dashboard web
    };

    return this.http.post<any>(`${this.apiUrl}/login`, loginData, {headers:this.headers}).pipe(
      map(datos => {
        // Guardar token si el login es exitoso
        if (datos.success && datos.token) {
          this.saveToken(datos.token);
          this.isLoggedIn = true;
          
          // Guardar información del cliente si está disponible
          if (datos.client && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('client_info', JSON.stringify(datos.client));
          }
        }
        return datos;
      })
    );
  }

  private saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }

  logout(){
    // El interceptor automáticamente agregará el Authorization header
    return this.http.post(`${this.apiUrl}/logout`,{}).pipe(
      map(response => {
        this.logout2();
        return response;
      })
    );
  }

  logout2(){
    this.isLoggedIn = false;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('idUser');
      localStorage.removeItem('id_user');
      localStorage.removeItem('idEmpresa');
      localStorage.removeItem('role');
      localStorage.removeItem('permisos');
      
      // Limpiar caché de páginas de clientes
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('clientesPage_') || key === 'clienteTreeExpandedNodes' || key === 'clienteTreeClientesWithData' || key === 'lastClientesPerPage') {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Limpiar IndexedDB - llamar al servicio de forma sincrónica
    this.clearIndexedDB();
    
    this.router.navigate(['/login']);
  }

  private clearIndexedDB(): void {
    // Limpiar IndexedDB cuando se hace logout
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Abrir la base de datos Dexie para limpiarla
        const request = indexedDB.deleteDatabase('ClienteDatabase');
        request.onsuccess = () => {
          console.log('ClienteDatabase deleted successfully');
        };
        request.onerror = () => {
          console.warn('Error deleting ClienteDatabase');
        };
      } catch (error) {
        console.warn('Error clearing IndexedDB:', error);
      }
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  loginAzure(data: any){
    return this.http.post<any>(`${this.apiUrl}/login-azure`, data,{headers:this.headers}).pipe(map(datos=>{return datos}));
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Para tokens simples (no JWT), solo verificar que exista
    // La validación real se hace en el backend
    return token.length > 0;
  }

  me(): Observable<any> {
    // El interceptor automáticamente agregará el Authorization header
    if (isPlatformBrowser(this.platformId)) {
    return this.http.get(`${this.apiUrl}/me`);
  }
    return of(null);
  }

  checkAuthAndRedirect(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  register(userData: any): Observable<any> {
    // En el navegador: si la app se carga desde un subdominio de tenant,
    // enviamos la petición al mismo origen para que el middleware
    // `ResolveTenantFromDomain` identifique el tenant por host.
    // Además pedimos la respuesta como texto y la parseamos manualmente,
    // para detectar casos donde el backend devuelve una página HTML
    // (error 500/500 HTML) que provoca "Unexpected token '<'" al parsear JSON.
    const makeRequest = (url: string) =>
      this.http.post(url, userData, { headers: this.headers, responseType: 'text' }).pipe(
        map((text: string) => {
          try {
            return JSON.parse(text);
          } catch (e) {
            // Respuesta no JSON: devolver objeto con información legible
            return { success: false, error: 'Respuesta inesperada del servidor', details: text };
          }
        })
      );

    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      try {
        const apiUrlHost = new URL(this.apiUrl).host;
        const currentHost = window.location.host;

        if (currentHost !== apiUrlHost) {
          // En desarrollo, el frontend corre en otro puerto. En lugar de
          // enviar al origin (que sería el servidor de dev de Angular),
          // hacemos la petición al backend (`apiUrl`) pero añadimos el
          // header `X-Tenant-Code` para que el middleware en el servidor
          // identifique el tenant por ese valor.
          // Derivamos el tenant code del subdominio: "subdominio-centralaudit..." => subdominio
          const hostname = window.location.hostname || currentHost;
          const sub = hostname.split('.')[0] || '';

          // El patrón de dominio es: {tenant_code}-centralaudit.tecnodatasa.cl
          // Quitamos el sufijo "-centralaudit" para obtener el código real del tenant.
          let tenantCode = sub;
          if (sub.endsWith('-centralaudit')) {
            tenantCode = sub.replace(/-centralaudit$/, '');
          }

          const headersWithTenant = this.headers.set('X-Tenant-Code', tenantCode);

          return this.http.post(`${this.apiUrl}/register`, userData, { headers: headersWithTenant, responseType: 'text' }).pipe(
            map((text: string) => {
              try { return JSON.parse(text); } catch (e) { return { success: false, error: 'Respuesta inesperada del servidor', details: text }; }
            })
          );
        }
      } catch (e) {
        // Si falla el parseo del URL, continuamos y usamos apiUrl
      }
    }

    return makeRequest(`${this.apiUrl}/register`);
  }

}

