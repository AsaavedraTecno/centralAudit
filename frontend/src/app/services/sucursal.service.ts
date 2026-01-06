import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Sucursal, createSucursal } from '../models/sucursal';

@Injectable({
  providedIn: 'root'
})
export class SucursalService {

  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }
  
  getAll(): Observable<Sucursal[]> {
    // Este endpoint ya no existe en la nueva API
    // Las sucursales siempre son por cliente
    return this.http.get<any>(`${this.baseUrl}/sucursales`).pipe(
      map(response => response.data?.map((s: any) => createSucursal(s)) ?? [])
    );
  }

  getByClientCode(clientCode: string): Observable<Sucursal[]> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales`).pipe(
      map(response => response.data?.map((s: any) => createSucursal(s)) ?? [])
    );
  }

  // Legacy - redirigir a getByClientCode
  getByRut(rut: string): Observable<Sucursal[]> {
    return this.getByClientCode(rut);
  }

  create(data: Partial<Sucursal>): Observable<Sucursal> {
    // Nota: Requiere clientCode, usar ClienteService.createSucursal en su lugar
    return this.http.post<any>(`${this.baseUrl}/sucursales`, data).pipe(
      map(response => createSucursal(response.data))
    );
  }

  update(id: string | number, data: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.put<any>(`${this.baseUrl}/sucursales/${id}`, data).pipe(
      map(response => createSucursal(response.data))
    );
  }

  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/sucursales/${id}`);
  }
}
