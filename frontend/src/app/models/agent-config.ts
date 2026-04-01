// ============ RANGO DE IP ============
export interface IPRange {
  id?: number;
  agent_id?: number;
  ip_from: string;
  ip_to: string;
  subnet_mask: string;
  ips_to_scan?: number;
  active: boolean;
}

// ============ CONFIGURACIÓN DEL AGENTE ============
export interface AgentConfig {
  agent_key_id?: number;
  snmp_community: string;
  scan_interval: number;
  
  // Múltiples rangos (NUEVO)
  ip_ranges?: IPRange[];
  
  // Compatibilidad hacia atrás (campos antiguos, DEPRECADOS)
  ip_from?: string;
  ip_to?: string;
  subnet_mask?: string;

  // Campos informativos (Solo lectura)
  hostname?: string;
  ip_address?: string;
  agent_version?: string;
  status?: string;
  last_seen_at?: string;
  ips_to_scan?: number;
  printers_count?: number;
}

// ============ KEY DEL AGENTE ============
export interface AgentKeyResponse {
  id: number;
  masked_key?: string;
  name: string;
  created_at: string;
}

export interface AgentKey {
  id: number;
  name?: string;
  key?: string;       
  masked_key?: string;
  created_at?: string;
}

// ============ RESPUESTA DE CREACIÓN DE CLIENTE ============
export interface CreateClientResponse {
  client_code: string;
  domain: string;
  agent_id?: number; // Legacy/Opcional
  agent_key: AgentKey;
}