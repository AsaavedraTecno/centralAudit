import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Impresora } from '../../models/impresora';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImpresoraService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Impresora[]> {
    return this.http.get<any>(`${this.baseUrl}/impresoras`).pipe(
      map(response => response.data || [])
    );
  }

  getImpresoras(clientCode: string, sucursalId: string | number): Observable<any> {
    const url = `${this.baseUrl}/tenants/${clientCode}/sucursales/${sucursalId}/impresoras?all=true`;
    return this.http.get<any>(url);  
  }

  getSeriesBySucursal(sucursalId: string | number, clientCode?: string): Observable<any> {
    if (clientCode) {
      return this.getImpresoras(clientCode, sucursalId);
    }
    // Fallback al endpoint antiguo (si existe)
    return this.http.get<any>(`${this.baseUrl}/sucursales/${sucursalId}/series`).pipe(
      map(response => ({ data: response.data || [] }))
    );
  }

  getSeriesSucursales(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/series-sucursales`).pipe(
      map(response => response.data || [])
    );
  }

  updateEstado(clientCode: string, serie: string, estadoNumerico: number): Observable<any> {
    const statusString = estadoNumerico === 1 ? 'active' : 'not active';
    
    // URL dinámica con el código del cliente
    return this.http.patch(`${this.baseUrl}/tenants/${clientCode}/impresoras/${serie}/status`, { 
      status: statusString 
    });
  }

  asignarASucursal(serie: string, ip: string, sucursalId: string | number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/sucursales/${sucursalId}/asignar-impresora`,
      { serie, ip }
    );
  }

  desasignarDeSucursal(serie: string, ip: string, sucursalId: string | number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/sucursales/${sucursalId}/desasignar-impresora`,
      { body: { serie, ip } }
    );
  }

  updateAdminFields(clientCode: string, printerId: number, data: any): Observable<any> {
    const payload = {
      internal_id: data.internal_id,
      secondary_serial: data.secondary_serial,
      custom_location: data.custom_location,
      comments: data.comments,
      custom_field_1: data.custom_field_1,
      custom_field_2: data.custom_field_2
    };

    return this.http.patch(`${this.baseUrl}/tenants/${clientCode}/impresoras/${printerId}/admin-fields`, payload);
    
  }

  obtenerDetalleImpresora(clientCode: string, locationId: number, printerId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/tenants/${clientCode}/sucursales/${locationId}/impresoras/${printerId}`
    );
  }
}