import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role {
  id: number;
  name: string;
  color?: string;
  description: string;
  permissions: any[];
  // ... otros campos que puedan venir
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private apiUrl = `${environment.apiUrl}/admin/roles`;


  constructor(private http: HttpClient) { }

  getRoles(): Observable<any> { 
    return this.http.get<any>(this.apiUrl);
  }

  createRole(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  updateRole(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

   /**
   * Obtiene una lista simple de roles (id, name) para selectores.
   */
  getRolesList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}-list`);
  }
}
