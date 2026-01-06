import { Impresora } from "./impresora";

export interface Sucursal {
  // Campos principales (nueva API)
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // Campos legacy (compatibilidad con código existente)
  rut?: string;           // código del cliente al que pertenece
  glosa?: string;         // observaciones
  nombre?: string;        // alias de name
  direccion?: string;     // alias de address
  contacto?: string;      // alias de contact_name
  fono?: string;          // alias de contact_phone
  vigente?: boolean;      // alias de is_active

  // Para el árbol
  impresoras?: Impresora[];
  expanded?: boolean;
  loading?: boolean;
}

// Clase implementación con getters legacy
export class SucursalImpl implements Sucursal {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  rut?: string;
  glosa?: string;
  impresoras?: Impresora[];
  expanded?: boolean;
  loading?: boolean;

  constructor(data: Partial<Sucursal>) {
    this.id = data.id ?? 0;
    this.name = data.name ?? '';
    this.code = data.code ?? '';
    this.address = data.address;
    this.city = data.city;
    this.contact_name = data.contact_name;
    this.contact_email = data.contact_email;
    this.contact_phone = data.contact_phone;
    this.is_active = data.is_active ?? true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.rut = data.rut;
    this.glosa = data.glosa;
    this.impresoras = data.impresoras;
    this.expanded = data.expanded;
    this.loading = data.loading;
  }

  // Alias legacy como getters
  get nombre(): string { return this.name; }
  get direccion(): string { return this.address ?? ''; }
  get contacto(): string { return this.contact_name ?? ''; }
  get fono(): string { return this.contact_phone ?? ''; }
  get vigente(): boolean { return this.is_active; }
}

// Factory para crear desde API response
export function createSucursal(data: any): Sucursal {
  return new SucursalImpl(data);
}