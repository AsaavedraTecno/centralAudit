import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import {
  VistaPersonalizada,
  ColumnaVistaSistema,
  ColumnaVistaConfig,
  ColumnasDisponiblesResponse,
  VistaPersonalizadaResponse,
  VistaPersonalizadaListResponse
} from '../../models/vista-personalizada';

@Injectable({
  providedIn: 'root'
})
export class VistaPersonalizadaService {

  private apiUrl = `${environment.apiUrl}/vistas-personalizadas`;

  // Cache de columnas disponibles
  private columnasCache$?: Observable<ColumnasDisponiblesResponse>;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las columnas disponibles del sistema
   * Se cachean automáticamente
   */
  obtenerColumnasDisponibles(): Observable<ColumnasDisponiblesResponse> {

    if (!this.columnasCache$) {
      console.log('🔄 Llamando a:', `${this.apiUrl}/columnas/disponibles`);

      this.columnasCache$ = this.http
        .get<ColumnasDisponiblesResponse>(
          `${this.apiUrl}/columnas/disponibles`
        )
        .pipe(
          tap(res => console.log('✅ Columnas recibidas:', res)),
          shareReplay(1)
        );
    }

    return this.columnasCache$;
  }

  /**
   * Obtener todas las vistas del usuario autenticado
   */
  obtenerVistas(): Observable<VistaPersonalizadaListResponse> {
    return this.http.get<VistaPersonalizadaListResponse>(this.apiUrl);
  }

  /**
   * Obtener vista por defecto
   */
  obtenerVistaPorDefecto(): Observable<VistaPersonalizadaResponse> {
    return this.http.get<VistaPersonalizadaResponse>(
      `${this.apiUrl}/default`
    );
  }

  /**
   * Obtener vista por ID
   */
  obtenerVista(id: number): Observable<VistaPersonalizadaResponse> {
    return this.http.get<VistaPersonalizadaResponse>(
      `${this.apiUrl}/${id}`
    );
  }

  /**
   * Crear nueva vista personalizada
   */
  crearVista(payload: {
    nombre?: string;
    descripcion?: string;
    es_default?: boolean;
    columnas: ColumnaVistaConfig[];
  }): Observable<VistaPersonalizadaResponse> {

    return this.http.post<VistaPersonalizadaResponse>(
      this.apiUrl,
      payload
    );
  }

  /**
   * Actualizar vista existente
   */
  actualizarVista(
    id: number,
    payload: {
      nombre?: string;
      descripcion?: string;
      es_default?: boolean;
      columnas: ColumnaVistaConfig[];
    }
  ): Observable<VistaPersonalizadaResponse> {

    return this.http.put<VistaPersonalizadaResponse>(
      `${this.apiUrl}/${id}`,
      payload
    );
  }

  /**
   * Eliminar vista
   */
  eliminarVista(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Duplicar vista
   */
  duplicarVista(id: number): Observable<VistaPersonalizadaResponse> {
    return this.http.post<VistaPersonalizadaResponse>(
      `${this.apiUrl}/${id}/duplicar`,
      {}
    );
  }

  /**
   * Limpiar cache de columnas
   */
  limpiarCacheColumnas(): void {
    this.columnasCache$ = undefined;
  }
}