
import { Sucursal } from "./sucursal";

// --- Estructura para un Contacto ---
export interface Contacto {
  id?: number; // El ID solo existirá para contactos ya guardados
  nombre: string;
  email: string | null;
  telefono: string | null;
  telefono_alternativo: string | null;
  comentarios: string | null;
}

// --- Estructura Principal del Cliente (Tenant) ---
export interface Cliente {
  // --- Identificación ---
  id: string; // Corresponde al ID del Tenant
  code: string;
  nombre: string;
  rut: string;
  status: 'active' | 'suspended' | 'maintenance' | 'ended';

  // --- Ubicación ---
  direccion?: string;
  comuna?: string;
  region?: string;
  
  // --- Personalización y Configuración ---
  logo_url?: string;
  
  // --- Lista de Contactos ---
  contactos?: Contacto[];

  // --- Relaciones y Estado de la UI ---
  sucursales?: Sucursal[];
  expanded?: boolean;
  loading?: boolean;

  // --- Timestamps ---
  created_at?: string;
  updated_at?: string;
}

// Clase de implementación para inicializar con valores por defecto
export class ClienteImpl implements Cliente {
  id: string;
  code: string;
  nombre: string;
  rut: string;
  status: 'active' | 'suspended' | 'maintenance' | 'ended';
  
  direccion?: string;
  comuna?: string;
  region?: string;
  
  logo_url?: string;
  
  contactos?: Contacto[];
  
  sucursales?: Sucursal[];
  expanded?: boolean;
  loading?: boolean;
  created_at?: string;
  updated_at?: string;

  constructor(data: Partial<Cliente>) {
    this.id = data.id ?? '';
    this.code = data.code ?? '';
    this.nombre = data.nombre ?? '';
    this.rut = data.rut ?? '';
    this.status = data.status ?? 'active';
    
    this.direccion = data.direccion;
    this.comuna = data.comuna;
    this.region = data.region;
    
    this.logo_url = data.logo_url;
    
    this.contactos = data.contactos ?? [];
    
    this.sucursales = data.sucursales;
    this.expanded = data.expanded ?? false;
    this.loading = data.loading ?? false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}

// Función helper para crear una instancia de Cliente
export function createCliente(data: any): Cliente {
  return new ClienteImpl(data);
}
