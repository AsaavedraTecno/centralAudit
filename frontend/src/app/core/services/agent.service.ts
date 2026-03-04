import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentConfig } from '../../models/agent-config';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  saveConfig(clientCode: string, config: AgentConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants/${clientCode}/agent-config`, config);
  }

  getConfig(clientCode: string, agentKeyId: number): Observable<AgentConfig> {
    return this.http.get<AgentConfig>(`${this.apiUrl}/tenants/${clientCode}/agent-config/${agentKeyId}`);
  }
}