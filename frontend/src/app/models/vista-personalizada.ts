// 🔹 Columna completa del sistema (metadata desde columnas_disponibles)
// Esto viene del backend cuando cargas columnas disponibles
export interface ColumnaVistaSistema {
  identificador: string;
  nombre: string;
  tipo: 'cliente' | 'sucursal' | 'impresora';
  orden: number;
  ancho: number;
  componente?: 'texto' | 'numero' | 'badge' | 'barra';
}

// 🔹 Configuración que se guarda dentro de una vista personalizada
// Esto es lo que realmente se guarda en el JSON columnas en BD
export interface ColumnaVistaConfig {
  identificador: string;
  visible: boolean;
  orden: number;
  ancho: number;
}

// 🔹 Columna usada en el Admin (UI)
// Es la fusión entre metadata + configuración del usuario
export interface ColumnaVistaUI extends ColumnaVistaSistema {
  visible: boolean;
}

// 🔹 Filtros (si luego los usas)
export interface FiltrosVista {
  estado?: 'activa' | 'inactiva' | 'todas';
  busqueda_defecto?: string;
}

// 🔹 Vista personalizada (estructura real que viene del backend)
export interface VistaPersonalizada {
  id: number;
  user_id: number;
  nombre: string;
  descripcion?: string;
  columnas: ColumnaVistaConfig[]; // ⚠️ SOLO CONFIG
  es_default: boolean;
  created_at: string;
  updated_at: string;
}

// 🔹 Respuestas del backend
export interface ColumnasDisponiblesResponse {
  columnas: ColumnaVistaSistema[];
}

export interface VistaPersonalizadaResponse {
  data: VistaPersonalizada;
}

export interface VistaPersonalizadaListResponse {
  data: VistaPersonalizada[];
}