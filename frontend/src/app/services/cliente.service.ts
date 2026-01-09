import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Cliente, createCliente } from '../models/cliente';
import { Sucursal, createSucursal } from '../models/sucursal';
import { Impresora } from '../models/impresora';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private baseUrl = 'http://127.0.0.1:8000/api';
  
  constructor(private http: HttpClient) { }
  
  // ==================== CLIENTES ====================
  
  // Obtener todos los clientes (paginados)
  getClientes(page: number = 1, perPage: number = 50): Observable<any> {
    const params = {
      page: page.toString(),
      per_page: perPage.toString()
    };
    return this.http.get<any>(`${this.baseUrl}/clients`, { params }).pipe(
      map(response => {
        // API devuelve 'clients', normalizamos a estructura esperada
        const clients = response.data ?? response.clients ?? [];
        return {
          success: true,
          data: clients.map((c: any) => createCliente(c)),
          total: response.total ?? clients.length,
          pagination: response.pagination
        };
      })
    );
  }
  
  // Buscar clientes
  searchClientes(search?: string, page: number = 1, perPage: number = 50): Observable<any> {
    let params: any = { 
      page: page.toString(),
      per_page: perPage.toString() 
    };
    
    if (search) {
      params.search = search;
    }
    
    return this.http.get<any>(`${this.baseUrl}/clients`, { params }).pipe(
      map(response => {
        const clients = response.data ?? response.clients ?? [];
        return {
          success: true,
          data: clients.map((c: any) => createCliente(c)),
          total: response.total ?? clients.length,
          pagination: response.pagination
        };
      })
    );
  }

  // Obtener lista simple de clientes (sin paginación) - para formularios
  getClientesList(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/clients`);
  }

  // Obtener un cliente por código
  getCliente(code: string): Observable<Cliente> {
    return this.http.get<any>(`${this.baseUrl}/clients/${code}`).pipe(
      map(response => createCliente(response.client ?? response.data))
    );
  }

  // Crear cliente - devuelve respuesta completa con agent_key
  createCliente(cliente: Partial<Cliente>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/clients`, cliente).pipe(
      map(response => ({
        client: createCliente(response.client ?? response.data),
        agent_key: response.agent_key,
        message: response.message
      }))
    );
  }

  // Actualizar cliente
  updateCliente(code: string, cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<any>(`${this.baseUrl}/clients/${code}`, cliente).pipe(
      map(response => createCliente(response.client ?? response.data))
    );
  }

  // Eliminar cliente
  deleteCliente(code: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clients/${code}`);
  }
  
  // ==================== SUCURSALES ====================
  
  // Obtener sucursales de un cliente
  getSucursales(clientCode: string): Observable<Sucursal[]> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales`).pipe(
      map(response => {
        // API devuelve 'sucursales', normalizamos
        const sucursales = response.data ?? response.sucursales ?? [];
        return sucursales.map((s: any) => createSucursal(s));
      })
    );
  }

  // Obtener una sucursal
  getSucursal(clientCode: string, sucursalId: number): Observable<Sucursal> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}`).pipe(
      map(response => createSucursal(response.data))
    );
  }

  // Crear sucursal
  createSucursal(clientCode: string, sucursal: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.post<any>(`${this.baseUrl}/clients/${clientCode}/sucursales`, sucursal).pipe(
      map(response => createSucursal(response.data))
    );
  }

  // Actualizar sucursal
  updateSucursal(clientCode: string, sucursalId: number, sucursal: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.put<any>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}`, sucursal).pipe(
      map(response => createSucursal(response.data))
    );
  }

  // Eliminar sucursal
  deleteSucursal(clientCode: string, sucursalId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}`);
  }
  
  // ==================== IMPRESORAS ====================
  
  // Obtener impresoras de una sucursal
  getImpresoras(clientCode: string, sucursalId: number): Observable<Impresora[]> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}/impresoras`).pipe(
      map(response => response.data ?? [])
    );
  }

  // Obtener una impresora
  getImpresora(clientCode: string, sucursalId: number, impresoraId: number): Observable<Impresora> {
    return this.http.get<any>(`${this.baseUrl}/clients/${clientCode}/sucursales/${sucursalId}/impresoras/${impresoraId}`).pipe(
      map(response => response.data)
    );
  }
}