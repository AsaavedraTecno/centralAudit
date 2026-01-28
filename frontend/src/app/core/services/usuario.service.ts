import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Usuario {
  id: number;
  name: string;
  email: string;
  role?: string;
  active?: boolean;
  created_at?: string;
  roles?: any[];
  tenantAssignments?: any[];
}

export interface UsuariosResponse {
  users: any; // Paginación de Laravel
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  // 1. Definimos la base de Admin para usarla en roles, logs, etc.
  private adminUrl = `${environment.apiUrl}/admin`;
  
  // 2. Definimos la de usuarios basada en la anterior
  private usersUrl = `${this.adminUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<UsuariosResponse> {
    return this.http.get<UsuariosResponse>(this.usersUrl);
  }

  createUsuario(data: any): Observable<any> {
    return this.http.post<any>(this.usersUrl, data);
  }

  updateUsuario(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.usersUrl}/${id}`, data);
  }

  deleteUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.usersUrl}/${id}`);
  }

  updateUsuarioActivo(id: number, active: boolean): Observable<any> {
    return this.http.patch<any>(`${this.usersUrl}/${id}/active`, { active });
  }


}