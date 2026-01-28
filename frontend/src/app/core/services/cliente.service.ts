import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Cliente, createCliente } from '../../models/cliente';
import { Sucursal } from '../../models/sucursal';
import { Impresora } from '../../models/impresora';
import { environment } from '../../../environments/environment';

// Respuesta específica para el flujo de Onboarding (Paso 2)
export interface ClienteResponse {
  success: boolean;
  agent_key: string;
  domain: string;
  agent_id: number;
  client_code: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private baseUrl = `${environment.apiUrl}/clients`;
  
  constructor(private http: HttpClient) { }

  // ==========================================
  // WIZARD DE ONBOARDING (PASOS 2 Y 3)
  // ==========================================

  /**
   * PASO 2: Crear infraestructura inicial (Tenant, DB, Dominio y Sucursal)
   */
  create(data: any): Observable<ClienteResponse> {
    return this.http.post<ClienteResponse>(this.baseUrl, data);
  }

  /**
   * PASO 3: Configuración técnica del agente
   * PATCH /api/clients/{code}/agents/{id}/setup
   */
  setupAgent(code: string, agentId: number, config: any): Observable<any> {
    const url = `${this.baseUrl}/${code}/agents/${agentId}/setup`;
    return this.http.patch(url, config);
  }

  // ==========================================
  // GESTIÓN DE CLIENTES
  // ==========================================
  
  // Obtener todos los clientes (paginados)
  getClientes(page: number = 1, perPage: number = 50): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.http.get<any>(this.baseUrl, { params }).pipe(
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
  
  // Buscar clientes - Útil para filtrado y vistas de árbol
  searchClientes(search?: string, page: number = 1, perPage: number = 50): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<any>(this.baseUrl, { params }).pipe(
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

  // Obtener lista simple de clientes para selectores
  getClientesList(): Observable<any> {
    return this.http.get<any>(this.baseUrl);
  }

  // Obtener un cliente por código
  getCliente(code: string): Observable<Cliente> {
    return this.http.get<any>(`${this.baseUrl}/${code}`).pipe(
      map(response => createCliente(response.client ?? response.data))
    );
  }

  // Alias para obtener cliente por código (más descriptivo)
  getClienteByCode(code: string): Observable<Cliente> {
    return this.getCliente(code);
  }

  // Actualizar cliente
  updateCliente(code: string, cliente: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<any>(`${this.baseUrl}/${code}`, cliente).pipe(
      map(response => createCliente(response.client ?? response.data))
    );
  }

  // Eliminar cliente
  deleteCliente(code: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${code}`);
  }
  

  
  // ==========================================
  // IMPRESORAS
  // ==========================================
  
  getImpresoras(clientCode: string, sucursalId: number): Observable<Impresora[]> {
    return this.http.get<any>(`${this.baseUrl}/${clientCode}/sucursales/${sucursalId}/impresoras`).pipe(
      map(response => response.data ?? [])
    );
  }

  getImpresora(clientCode: string, sucursalId: number, impresoraId: number): Observable<Impresora> {
    return this.http.get<any>(`${this.baseUrl}/${clientCode}/sucursales/${sucursalId}/impresoras/${impresoraId}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Vista de árbol (Sucursales > Impresoras)
   * GET /api/clients/{code}/tree
   */
  getTree(code: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${code}/tree`);
  }
}