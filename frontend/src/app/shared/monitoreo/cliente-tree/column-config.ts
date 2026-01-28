/**
 * Configuración de columnas para cliente-tree
 * Sistema de plantillas para mostrar/ocultar columnas según preferencias del usuario
 */

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  description?: string;
}

export interface ColumnTemplate {
  id: string;
  name: string;
  description?: string;
  columns: ColumnConfig[];
  isDefault?: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'nombre', label: 'Nombre / Modelo', visible: true, order: 1 },
  { id: 'ip', label: 'IP Address', visible: true, order: 2 },
  { id: 'serie', label: 'Serie', visible: true, order: 3 },
  { id: 'ubicacion', label: 'Ubicación', visible: true, order: 4 },
  { id: 'descripcion', label: 'Descripción', visible: false, order: 5 },
  { id: 'estado', label: 'Estado', visible: true, order: 6 },
  { id: 'paginasImpresas', label: 'Págs. Impresas', visible: true, order: 7 },
  { id: 'paginasBN', label: 'Págs. B/N', visible: false, order: 8 },
  { id: 'paginasColor', label: 'Págs. Color', visible: false, order: 9 },
  { id: 'tonerBlack', label: 'Black Tóner', visible: true, order: 10 },
  { id: 'tonerCyan', label: 'Cyan Tóner', visible: false, order: 11 },
  { id: 'tonerMagenta', label: 'Magenta Tóner', visible: false, order: 12 },
  { id: 'tonerYellow', label: 'Yellow Tóner', visible: false, order: 13 },
  { id: 'drumBlack', label: 'Black Drum', visible: false, order: 14 },
  { id: 'drumCyan', label: 'Cyan Drum', visible: false, order: 15 },
  { id: 'drumMagenta', label: 'Magenta Drum', visible: false, order: 16 },
  { id: 'drumYellow', label: 'Yellow Drum', visible: false, order: 17 },
  { id: 'reveladorBlack', label: 'Black Revelador', visible: false, order: 18 },
  { id: 'reveladorMagenta', label: 'Magenta Revelador', visible: false, order: 19 },
  { id: 'reveladorYellow', label: 'Yellow Revelador', visible: false, order: 20 },
  { id: 'fusor', label: 'Fusor', visible: false, order: 21 },
  { id: 'adfRoller', label: 'ADF Roller', visible: false, order: 22 },
  { id: 'transferRoller', label: 'Transfer Roller', visible: false, order: 23 },
  { id: 'mpRoller', label: 'MP Roller', visible: false, order: 24 },
  { id: 'retardPad', label: 'Retard Pad', visible: false, order: 25 },
  { id: 'cajaResiduos', label: 'Caja Residuos', visible: false, order: 26 }
];

export const COLUMN_TEMPLATES: ColumnTemplate[] = [
  {
    id: 'default',
    name: 'Por Defecto',
    description: 'Todas las columnas principales visibles',
    isDefault: true,
    columns: DEFAULT_COLUMNS
  },
  {
    id: 'compact',
    name: 'Vista Compacta',
    description: 'Solo información esencial',
    columns: DEFAULT_COLUMNS.map(col => ({
      ...col,
      visible: ['nombre', 'ip', 'serie', 'ubicacion', 'estado'].includes(col.id)
    }))
  },
  {
    id: 'consumibles',
    name: 'Consumibles',
    description: 'Enfocado en tóners y componentes',
    columns: DEFAULT_COLUMNS.map(col => ({
      ...col,
      visible: ['nombre', 'ip', 'estado', 'tonerBlack', 'tonerCyan', 'tonerMagenta', 'tonerYellow', 
                'drumBlack', 'drumCyan', 'drumMagenta', 'drumYellow'].includes(col.id)
    }))
  }
];

export class ColumnConfigService {
  private localStorageKey = 'clienteTreeColumnConfig';
  
  /**
   * Obtiene la configuración de columnas guardada o usa la plantilla por defecto
   */
  getColumnConfig(): ColumnConfig[] {
    const saved = localStorage.getItem(this.localStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse column config, using default');
      }
    }
    return this.getDefaultTemplate().columns;
  }

  /**
   * Guarda la configuración de columnas
   */
  saveColumnConfig(columns: ColumnConfig[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(columns));
    } catch (e) {
      console.error('Failed to save column config:', e);
    }
  }

  /**
   * Obtiene una plantilla por ID
   */
  getTemplate(templateId: string): ColumnTemplate | undefined {
    return COLUMN_TEMPLATES.find(t => t.id === templateId);
  }

  /**
   * Obtiene la plantilla por defecto
   */
  getDefaultTemplate(): ColumnTemplate {
    return COLUMN_TEMPLATES.find(t => t.isDefault) || COLUMN_TEMPLATES[0];
  }

  /**
   * Aplica una plantilla
   */
  applyTemplate(templateId: string): ColumnConfig[] {
    const template = this.getTemplate(templateId);
    if (template) {
      this.saveColumnConfig(template.columns);
      return template.columns;
    }
    return this.getColumnConfig();
  }

  /**
   * Obtiene todas las plantillas disponibles
   */
  getAllTemplates(): ColumnTemplate[] {
    return COLUMN_TEMPLATES;
  }
}
