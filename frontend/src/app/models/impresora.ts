export interface Impresora {
  // Campos básicos
  id?: number;
  cod_clie?: string;
  nombre?: string;
  ubicacion?: string;
  descripcion?: string;
  ip?: string;
  estado?: number; // 0 = Inactiva, 1 = Activa
  
  // Información del equipo
  modelo?: string;
  serie?: string;
  
  // Contadores de páginas
  paginasImpresas?: number; // Total de páginas impresas
  paginasBN?: number;       // Páginas en blanco y negro
  paginasColor?: number;    // Páginas a color
  
  // Niveles de tóner (0-100 o 0.00-100.00)
  tonerBlack?: number;
  tonerCyan?: number;
  tonerMagenta?: number;
  tonerYellow?: number;
  
  // Niveles de drum/cilindro (0-100 o 0.00-100.00)
  drumBlack?: number;
  drumCyan?: number;
  drumMagenta?: number;
  drumYellow?: number;
  
  // Niveles de revelador (0-100 o 0.00-100.00)
  reveladorBlack?: number;
  reveladorMagenta?: number;
  reveladorYellow?: number;
  
  // Otros componentes (0-100 o 0.00-100.00)
  fusor?: number;          // Fusora/Fuser
  adfRoller?: number;      // ADF Roller
  transferRoller?: number; // Transfer Roller
  mpRoller?: number;       // MP Roller
  retardPad?: number;      // Retard Pad
  cajaResiduos?: number;   // Caja de residuos/Waste Box
  
  // Información de sucursal (agregada en runtime)
  sucursal_nombre?: string;
  
  // DEPRECATED - Legacy toner fields (mantener para compatibilidad)
  toner_black?: number;
  toner_cyan?: number;
  toner_magenta?: number;
  toner_yellow?: number;
}