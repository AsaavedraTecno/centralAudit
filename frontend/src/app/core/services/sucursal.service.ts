import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Sucursal } from '../../models/sucursal';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SucursalService {

  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }
  
  /**
   * Obtener todas las sucursales (Global).
   * Nota: Como tu API es multi-tenant, este método retorna vacío por defecto
   * para evitar errores si algún componente antiguo lo llama sin código de cliente.
   */
  getAll(): Observable<Sucursal[]> {
    return of([]); // Retorna un array vacío observable
  }

  /**
   * LISTAR: Obtiene las sucursales de un cliente específico.
   * GET /api/{clientCode}/sucursales
   */
  getByClientCode(clientCode: string): Observable<Sucursal[]> {
    return this.http.get<any>(`${this.baseUrl}/${clientCode}/sucursales`).pipe(
      map(response => {
        // Soporte para estructura Laravel: { sucursales: [...] } o { data: [...] }
        return response.sucursales || response.data || [];
      })
    );
  }

  /**
   * OBTENER UNA: Busca una sucursal específica por ID y Cliente.
   * GET /api/{clientCode}/sucursales/{id}
   */
  getById(id: number | string, clientCode: string): Observable<Sucursal> {
    return this.http.get<any>(`${this.baseUrl}/${clientCode}/sucursales/${id}`).pipe(
      map(response => {
        // Soporte para estructura Laravel: { sucursal: {...} }
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * CREAR: Agrega una nueva sucursal al cliente.
   * POST /api/{clientCode}/sucursales
   */
  create(data: Partial<Sucursal>, clientCode: string): Observable<Sucursal> {
    return this.http.post<any>(`${this.baseUrl}/${clientCode}/sucursales`, data).pipe(
      map(response => {
        // Retorna la sucursal creada confirmada por el backend
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * ACTUALIZAR: Modifica una sucursal existente.
   * PUT /api/{clientCode}/sucursales/{id}
   */
  update(id: number | string, data: Partial<Sucursal>, clientCode: string): Observable<Sucursal> {
    return this.http.put<any>(`${this.baseUrl}/${clientCode}/sucursales/${id}`, data).pipe(
      map(response => {
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * ELIMINAR: Borra (o desactiva) una sucursal.
   * DELETE /api/{clientCode}/sucursales/{id}
   */
  delete(id: number | string, clientCode: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${clientCode}/sucursales/${id}`);
  }
}