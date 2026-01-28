import { Impresora } from "./impresora"; // Asegúrate de tener este modelo o defínelo como any[]

export interface Sucursal {
  // Campos de la BD (tabla 'locations')
  id: number;
  nombre: string;
  direccion?: string;
  comuna?: string;
  region?: string;
  
  nombre_contacto?: string;
  email_contacto?: string;
  telefono_contacto?: string;
  telefono_alternativo?: string;
  comentarios?: string;
  
  activo: boolean; // boolean en TS, tinyint(1) en MySQL
  
  created_at?: string;
  updated_at?: string;

  // Relaciones
  impresoras?: Impresora[];

  // Campos específicos para la UI (Tree View)
  expanded?: boolean;
  loading?: boolean;
}