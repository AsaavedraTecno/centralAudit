import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private apiUrl = `${environment.apiUrl}/admin/permissions-list`;

  constructor(private http: HttpClient) { }

  getPermissionsList(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
