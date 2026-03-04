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
  
  getAll(): Observable<Sucursal[]> {
    return of([]); 
  }

  /**
   * LISTAR: Obtiene las sucursales de un cliente específico.
   * Ahora apunta a: GET /api/tenants/{clientCode}/sucursales
   */
  getByClientCode(clientCode: string): Observable<Sucursal[]> {
    // 👇 AQUÍ AGREGAMOS "/tenants/"
    return this.http.get<any>(`${this.baseUrl}/tenants/${clientCode}/sucursales`).pipe(
      map(response => {
        return response.sucursales || response.data || [];
      })
    );
  }

  /**
   * OBTENER UNA
   * GET /api/tenants/{clientCode}/sucursales/{id}
   */
  getById(id: number | string, clientCode: string): Observable<Sucursal> {
     // 👇 AQUÍ TAMBIÉN
    return this.http.get<any>(`${this.baseUrl}/tenants/${clientCode}/sucursales/${id}`).pipe(
      map(response => {
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * CREAR
   * POST /api/tenants/{clientCode}/sucursales
   */
  create(data: Partial<Sucursal>, clientCode: string): Observable<Sucursal> {
     // 👇 AQUÍ TAMBIÉN
    return this.http.post<any>(`${this.baseUrl}/tenants/${clientCode}/sucursales`, data).pipe(
      map(response => {
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * ACTUALIZAR
   * PUT /api/tenants/{clientCode}/sucursales/{id}
   */
  update(id: number | string, data: Partial<Sucursal>, clientCode: string): Observable<Sucursal> {
     // 👇 AQUÍ TAMBIÉN
    return this.http.put<any>(`${this.baseUrl}/tenants/${clientCode}/sucursales/${id}`, data).pipe(
      map(response => {
        return response.sucursal || response.data;
      })
    );
  }

  /**
   * ELIMINAR
   * DELETE /api/tenants/{clientCode}/sucursales/{id}
   */
  delete(id: number | string, clientCode: string): Observable<void> {
     // 👇 AQUÍ TAMBIÉN
    return this.http.delete<void>(`${this.baseUrl}/tenants/${clientCode}/sucursales/${id}`);
  }
}