import { Sucursal } from "./sucursal";

export interface Cliente {
  // Nueva estructura (API Laravel)
  id: string;
  rut: string;
  nombre: string;
  code: string;
  status: 'active' | 'suspended' | 'ended';
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  region?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  ti_nombre?: string;
  ti_email?: string;
  ti_telefono?: string;
  contrato_inicio?: string;
  contrato_fin?: string;
  created_at?: string;
  updated_at?: string;
  
  // Para el árbol
  sucursales?: Sucursal[];
  expanded?: boolean;
  loading?: boolean;

  // Campos legacy (compatibilidad con código existente)
  cliente?: string;      // alias de nombre
  nombre1?: string;      // alias de nombre
  contacto1?: string;    // alias contacto_nombre
  telefono1?: string;    // alias contacto_telefono
  cod_clie?: string;     // alias de code
}

// Clase implementación con getters legacy
export class ClienteImpl implements Cliente {
  id: string;
  rut: string;
  nombre: string;
  code: string;
  status: 'active' | 'suspended' | 'ended';
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  region?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  contacto_telefono?: string;
  ti_nombre?: string;
  ti_email?: string;
  ti_telefono?: string;
  contrato_inicio?: string;
  contrato_fin?: string;
  created_at?: string;
  updated_at?: string;
  sucursales?: Sucursal[];
  expanded?: boolean;
  loading?: boolean;

  constructor(data: Partial<Cliente>) {
    this.id = data.id ?? '';
    this.rut = data.rut ?? '';
    this.nombre = data.nombre ?? '';
    this.code = data.code ?? '';
    this.status = data.status ?? 'active';
    this.direccion = data.direccion;
    this.comuna = data.comuna;
    this.ciudad = data.ciudad;
    this.region = data.region;
    this.contacto_nombre = data.contacto_nombre;
    this.contacto_email = data.contacto_email;
    this.contacto_telefono = data.contacto_telefono;
    this.ti_nombre = data.ti_nombre;
    this.ti_email = data.ti_email;
    this.ti_telefono = data.ti_telefono;
    this.contrato_inicio = data.contrato_inicio;
    this.contrato_fin = data.contrato_fin;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.sucursales = data.sucursales;
    this.expanded = data.expanded;
    this.loading = data.loading;
  }

  // Alias legacy
  get cliente(): string { return this.nombre; }
  get nombre1(): string { return this.nombre; }
  get contacto1(): string { return this.contacto_nombre ?? ''; }
  get telefono1(): string { return this.contacto_telefono ?? ''; }
  get cod_clie(): string { return this.code; }
}

// Factory para crear desde API response
export function createCliente(data: any): Cliente {
  return new ClienteImpl(data);
}