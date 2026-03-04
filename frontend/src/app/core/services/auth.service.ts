import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;
  private isLoggedIn = false;
  headers:HttpHeaders;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.headers=new HttpHeaders({"Content-Type": "application/json", "Accept": "application/json"});
  }

  private getDynamicApiUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const currentHostname = window.location.hostname;
        
        // MUNDO CENTRAL (localhost o dominio raíz)
        if (currentHostname === 'localhost' || currentHostname === '127.0.0.1' || currentHostname === 'centralaudit.tecnodatasa.cl') {
          return this.apiUrl; // Devuelve ".../api"
        }

        // MUNDO TENANT (Subdominio detectado)
        // Aquí cambiamos el host Y el prefijo de la ruta.
        const apiLocation = new URL(this.apiUrl);
        
        // Cambiar Host (ej: de localhost a cliente1.tecnodatasa...)
        apiLocation.hostname = currentHostname;

        // Cambiar Path (ej: de /api a /tenant)
        // Esto asume que tu environment.apiUrl termina en "/api"
        if (apiLocation.pathname.endsWith('/api')) {
            apiLocation.pathname = apiLocation.pathname.replace('/api', '/tenant');
        } else {
            // Fallback por si tu environment no tiene /api
            apiLocation.pathname = '/tenant';
        }

        return apiLocation.href.replace(/\/$/, ''); // Quitamos slash final

      } catch (e) {
        console.error('Error construyendo URL dinámica', e);
        return this.apiUrl;
      }
    }
    return this.apiUrl;
  }

  login(email: string, password: string): Observable<any> {
    const loginData = {
      email,
      password,
      client_id: 'web_dashboard' // Identificador específico para el dashboard web
    };

    const url = `${this.getDynamicApiUrl()}/login`;

    return this.http.post<any>(url, loginData, {headers:this.headers}).pipe(
      map(datos => {
        const token = datos.access_token || datos.token;

        if ((datos.success || token) && token) {
          this.saveToken(token);
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

  register(userData: any): Observable<any> {
    // SIMPLIFICADO: Ya no necesitamos el hack de X-Tenant-Code.
    // Al usar getDynamicApiUrl(), la petición va a "http://testerempresa.../api/register"
    // El middleware de Laravel detectará el tenant automáticamente.
    
    const url = `${this.getDynamicApiUrl()}/register`;

    // Mantenemos tu lógica de parseo de texto por seguridad (error 500 HTML)
    return this.http.post(url, userData, { headers: this.headers, responseType: 'text' }).pipe(
      map((text: string) => {
        try {
          return JSON.parse(text);
        } catch (e) {
          return { success: false, error: 'Respuesta inesperada del servidor', details: text };
        }
      })
    );
  }


  logout(){
    const url = `${this.getDynamicApiUrl()}/logout`;
    return this.http.post(url, {}).pipe(
      map(response => {
        this.logout2();
        return response;
      }),
      catchError(err => {
        // Si falla el logout en servidor, cerramos localmente igual
        this.logout2();
        return of(err);
      })
    );
  }

  private saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
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
    if (isPlatformBrowser(this.platformId)) {
      const url = `${this.getDynamicApiUrl()}/me`; 
      return this.http.get(url);
    }
    return of(null);
  }

  checkAuthAndRedirect(): void {
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

}
