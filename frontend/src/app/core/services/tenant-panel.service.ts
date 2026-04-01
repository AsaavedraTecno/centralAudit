import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TenantPanelService {
  constructor(private http: HttpClient) {}
  private baseUrl = `${environment.apiUrl}`;

  isTenant(): boolean {
    const host = window.location.hostname;
    
    if (host === 'localhost' || 
        host === '127.0.0.1' || 
        host === 'tdmonitor.cl') {
      return false;
    }
    
    return host.endsWith('tdmonitor.cl');
  }

  getTenantCode(): string | null {
    const parts = window.location.hostname.split('.');
    const firstSegment = parts[0];
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstSegment);
    
    return isUUID ? firstSegment : null;
  }

  obtenerVistaPanel() {
    return this.http.get(`${this.baseUrl}/panel/vista`);
  }
}
