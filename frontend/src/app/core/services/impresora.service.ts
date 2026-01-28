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

  // Nueva API: requiere clientCode y sucursalId
  getImpresoras(clientCode: string, sucursalId: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}/impresoras`).pipe(
      map(response => {
        const impresoras = response.data ?? response.impresoras ?? [];
        return { data: impresoras };
      })
    );
  }

  // Legacy - mantener por compatibilidad pero redirigir
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
}
