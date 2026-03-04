import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, Renderer2, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Impresora } from '../../../models/impresora';
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-detalle-impresora-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalle-impresora-modal.html',
  styleUrls: ['./detalle-impresora-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class DetalleImpresoraModalComponent implements OnChanges, OnDestroy {
  @Input() impresora: any = null;
  @Input() mostrar: boolean = false;
  @Output() alCerrar = new EventEmitter<void>();
  @Output() alGuardar = new EventEmitter<any>();

  editando: boolean = false;

  suministrosProcesados: any[] = [];

  private readonly DEFINICION_SUMINISTROS = [
    { type: 'toner_black', label: 'Tóner Negro', colorClass: 'text-dark', icon: '⚫', barColor: '#000000' },
    { type: 'toner_cyan', label: 'Tóner Cyan', colorClass: 'text-info', icon: '🔵', barColor: '#00BCD4' },
    { type: 'toner_magenta', label: 'Tóner Magenta', colorClass: 'text-danger', icon: '🔴', barColor: '#E91E63' },
    { type: 'toner_yellow', label: 'Tóner Amarillo', colorClass: 'text-warning', icon: '🟡', barColor: '#FFC107' },
    
    { type: 'drum_black', label: 'Cilindro Negro', colorClass: 'text-secondary', icon: '⚙️', barColor: '#2c3e50' },
    { type: 'drum_cyan', label: 'Cilindro Cyan', colorClass: 'text-secondary', icon: '⚙️', barColor: '#17a2b8' },
    { type: 'drum_magenta', label: 'Cilindro Magenta', colorClass: 'text-secondary', icon: '⚙️', barColor: '#c2185b' },
    { type: 'drum_yellow', label: 'Cilindro Amarillo', colorClass: 'text-secondary', icon: '⚙️', barColor: '#f39c12' },
    
    { type: 'fuser', label: 'Fusor', colorClass: 'text-secondary', icon: '🔥', barColor: '#FF6B00' },
    { type: 'transfer', label: 'Transfer Roller', colorClass: 'text-secondary', icon: '🔄', barColor: '#9C27B0' },
    { type: 'adf_roller', label: 'ADF Roller', colorClass: 'text-secondary', icon: '📄', barColor: '#2196F3' },
    { type: 'tray_roller', label: 'Rodillos Bandeja', colorClass: 'text-secondary', icon: '📥', barColor: '#4CAF50' },
    { type: 'pad', label: 'Separation Pad', colorClass: 'text-secondary', icon: '🛑', barColor: '#FF5252' },
    { type: 'mp_pad', label: 'MP Holder Pad', colorClass: 'text-secondary', icon: '📋', barColor: '#FF9800' },
    { type: 'waste', label: 'Caja Residuos', colorClass: 'text-secondary', icon: '🗑️', barColor: '#795548' }
  ];

  constructor(private cdr: ChangeDetectorRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrar']) {
      if (this.mostrar) {
        this.renderer.setStyle(document.body, 'overflow', 'hidden');
      } else {
        this.renderer.removeStyle(document.body, 'overflow');
      }
    }

    if (changes['impresora'] && this.impresora) {
      console.log('📋 Procesando suministros para:', this.impresora.nombre);
      this.procesarSuministros();
      this.cdr.markForCheck();
    }
  }

  private procesarSuministros(): void {
    this.suministrosProcesados = [];

    if (!this.impresora) return;

    // Primero intentamos obtener el array completo de supplies
    let rawSupplies = this.impresora?.supplies || [];

    console.log('📋 Supplies recibidos:', rawSupplies);

    // Si tenemos supplies como array (del backend nuevo), procesamos directamente
    if (Array.isArray(rawSupplies) && rawSupplies.length > 0) {
      console.log('✅ Supplies encontrados como array:', rawSupplies.length);
      this.procesarSuppliesArray(rawSupplies);
    } else {
      console.log('⚠️ No hay supplies, usando propiedades individuales como fallback');
      this.procesarSuppliesArrayFallback();
    }

    // NO agregamos componentes sin datos - solo mostramos los que tienen información real
    console.log('✅ Total de componentes con datos:', this.suministrosProcesados.length);
  }

  private procesarSuppliesArrayFallback(): void {
    // Fallback: convertir propiedades individuales a formato de array supplies
    const propiedadMap: { [key: string]: string } = {
      'tonerBlack': 'toner_black',
      'tonerCyan': 'toner_cyan',
      'tonerMagenta': 'toner_magenta',
      'tonerYellow': 'toner_yellow',
      'drumBlack': 'drum_black',
      'drumCyan': 'drum_cyan',
      'drumMagenta': 'drum_magenta',
      'drumYellow': 'drum_yellow',
      'fusor': 'fuser',
      'transferRoller': 'transfer',
      'adfRoller': 'adf_roller',
      'mpRoller': 'tray_roller',
      'retardPad': 'pad',
      'cajaResiduos': 'waste'
    };

    for (const def of this.DEFINICION_SUMINISTROS) {
      const propiedad = Object.entries(propiedadMap).find(
        ([_, tipo]) => tipo === def.type
      )?.[0];

      if (propiedad && this.impresora.hasOwnProperty(propiedad)) {
        const valor = this.impresora[propiedad];
        
        if (valor !== null && valor !== undefined && valor !== '') {
          const porcentaje = parseFloat(valor);

          this.suministrosProcesados.push({
            ...def,
            data: {
              percentage: isNaN(porcentaje) ? 0 : porcentaje,
              status: this.obtenerEstadoDesdePercentaje(porcentaje),
              serial_number: 'Sin Serial',
              description: `${porcentaje}%`
            }
          });
        }
      }
    }

    console.log('⚠️ Suministros procesados desde propiedades individuales:', this.suministrosProcesados.length);
  }

  private procesarSuppliesArray(supplies: any[]): void {
    // Crear un mapa temporal SOLO para evitar duplicados exactos del mismo supply_type
    const procesadosMap: { [key: string]: any } = {};

    // Procesar cada supply del array
    for (const supply of supplies) {
      const supplyId = (supply.id || supply.supply_type || '').toLowerCase();
      const supplyName = (supply.name || '').toLowerCase();
      const supplyType = (supply.type || '').toLowerCase();

      console.log(`🔍 Supply: id="${supplyId}", name="${supplyName}", type="${supplyType}"`);

      // Buscar el tipo de componente basado en el ID, nombre o type
      const tipoComponente = this.mapearSupplyAlComponente(supplyId, supplyName, supplyType);

      if (tipoComponente) {
        // Encontrar la definición del componente
        const def = this.DEFINICION_SUMINISTROS.find(d => d.type === tipoComponente);
        
        if (def) {
          // Usar el supplyId como clave para evitar duplicados EXACTOS del mismo supply
          const mapKey = `${tipoComponente}_${supplyId}`;
          
          if (!procesadosMap[mapKey]) {
            procesadosMap[mapKey] = {
              ...def,
              data: {
                percentage: supply.percentage || 0,
                status: supply.status || this.obtenerEstadoDesdePercentaje(supply.percentage),
                serial_number: supply.serial_number || 'Sin Serial',
                description: supply.description || supply.name || ''
              }
            };
            console.log(`✅ Mapeado: ${supplyId} → ${tipoComponente}`);
          }
        }
      }
    }

    // Agregar a la lista final
    this.suministrosProcesados = Object.values(procesadosMap);
    console.log('✅ Total suministros mapeados:', this.suministrosProcesados.length);
  }

  private mapearSupplyAlComponente(id: string, name: string, type: string): string | null {
    // Normalizar entrada
    id = id.toLowerCase();
    name = name.toLowerCase();
    type = type.toLowerCase();
    
    console.log(`🔎 Buscando tipo para: id="${id}", name="${name}"`);
    
    // TÓNERS - buscar por "toner", "tóner", "ink", "cartucho"
    if ((id.includes('toner') || id.includes('ink') || (id.includes('cartridge') && !id.includes('drum') && !id.includes('imaging'))) ||
        (name.includes('toner') || name.includes('ink') || (name.includes('cartridge') && !name.includes('drum') && !name.includes('imaging')))) {
      
      if (id.includes('black') || name.includes('black') || id.includes('cn625') || name.includes('cn625') || id.includes('006r01509')) {
        console.log('  → TONER_BLACK');
        return 'toner_black';
      }
      if (id.includes('cyan') || name.includes('cyan') || id.includes('cn626') || name.includes('cn626') || id.includes('006r01512')) {
        console.log('  → TONER_CYAN');
        return 'toner_cyan';
      }
      if (id.includes('magenta') || name.includes('magenta') || id.includes('cn627') || name.includes('cn627') || id.includes('006r01511')) {
        console.log('  → TONER_MAGENTA');
        return 'toner_magenta';
      }
      if (id.includes('yellow') || name.includes('yellow') || id.includes('cn628') || name.includes('cn628') || id.includes('006r01510')) {
        console.log('  → TONER_YELLOW');
        return 'toner_yellow';
      }
    }

    // TAMBORES/IMAGING UNITS - buscar por "drum", "imaging", "cartridge (r" (Xerox)
    if ((id.includes('drum') || id.includes('imaging') || id.includes('cartridge_(r')) || 
        (name.includes('drum') || name.includes('imaging') || name.includes('cartridge (r'))) {
      
      if (id.includes('black') || name.includes('black') || id.includes('013r00662') || name.includes('013r00662')) {
        console.log('  → DRUM_BLACK');
        return 'drum_black';
      }
      if (id.includes('cyan') || name.includes('cyan')) {
        console.log('  → DRUM_CYAN');
        return 'drum_cyan';
      }
      if (id.includes('magenta') || name.includes('magenta')) {
        console.log('  → DRUM_MAGENTA');
        return 'drum_magenta';
      }
      if (id.includes('yellow') || name.includes('yellow')) {
        console.log('  → DRUM_YELLOW');
        return 'drum_yellow';
      }
      // Por defecto si encontramos "drum" o "cartridge_(r" pero no sabe el color → black
      if (id.includes('drum') || id.includes('cartridge_(r') || name.includes('drum') || name.includes('cartridge (r')) {
        console.log('  → DRUM_BLACK (por defecto)');
        return 'drum_black';
      }
    }

    // FUSER - múltiples variantes
    if (id.includes('fuser') || name.includes('fuser') || type.includes('fuser')) {
      console.log('  → FUSER');
      return 'fuser';
    }

    // TRANSFER ROLLER - múltiples variantes
    if ((id.includes('transfer') || id.includes('bias_roll') || id.includes('bias_transfer')) ||
        (name.includes('transfer') || name.includes('bias'))) {
      console.log('  → TRANSFER');
      return 'transfer';
    }

    // ADF ROLLER - múltiples variantes
    if ((id.includes('adf') && id.includes('roller')) || (name.includes('adf') && name.includes('roller'))) {
      console.log('  → ADF_ROLLER');
      return 'adf_roller';
    }

    // MP HOLDER PAD - DEBE IR ANTES DE PAD GENÉRICO
    if (id.includes('mp_holder') || name.includes('mp holder') || 
        (id.includes('mp') && id.includes('pad') && !id.includes('adf') && !id.includes('retard'))) {
      return 'mp_pad';
    }

    // TRAY ROLLER / RETARD ROLLER - múltiples variantes
    if ((id.includes('tray') && id.includes('roller')) || (name.includes('tray') && name.includes('roller')) ||
        (id.includes('tray') && id.includes('retard')) || (name.includes('tray') && name.includes('retard')) ||
        id.includes('tray_2_retard_roller_life') || name.includes('tray_2_retard_roller_life') ||
        id.includes('tray_1_roller') || name.includes('tray_1_roller')) {
      return 'tray_roller';
    }

    // PAD (ADF/RETARD) - múltiples variantes (SIN MP_HOLDER)
    if ((id.includes('retard') && id.includes('pad')) || (name.includes('retard') && name.includes('pad')) ||
        ((id.includes('adf') && id.includes('pad')) || (name.includes('adf') && name.includes('pad'))) ||
        id.includes('adf_rubber_pad') || name.includes('adf_rubber_pad') ||
        id.includes('adf_retard_pad') || name.includes('adf_retard_pad')) {
      return 'pad';
    }

    // WASTE CONTAINER - múltiples variantes
    if ((id.includes('waste') || name.includes('waste')) ||
        (type.includes('waste') || type.includes('toner') && (id.includes('waste') || name.includes('waste')))) {
      console.log('  → WASTE');
      return 'waste';
    }

    console.log('  → NO MAPEABLE');
    return null;
  }



  private obtenerEstadoDesdePercentaje(porcentaje: number): string {
    if (porcentaje >= 75) return 'good';
    if (porcentaje >= 50) return 'ok';
    if (porcentaje >= 25) return 'low';
    return 'critical';
  }

  ngOnDestroy(): void {
    this.renderer.removeStyle(document.body, 'overflow');
  }

  autoResize(event: any): void {
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  toggleEditar() {
    this.editando = !this.editando;
    this.cdr.detectChanges();
  }

  cancelar() {
    this.editando = false;
    // Aquí podrías recargar el objeto original si quieres descartar cambios locales
    this.cdr.detectChanges();
  }

  guardar() {
    if (this.impresora) {
      this.alGuardar.emit(this.impresora);
      this.editando = false;
      this.cdr.detectChanges();
    } else {
      console.error('No hay datos de impresora para emitir');
    }
  }
  

  // ============ MÉTODOS PARA SUMINISTROS Y CRUM ============

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'good': return 'bg-success';
      case 'ok': return 'bg-success';
      case 'low': return 'bg-warning text-dark';
      case 'critical': return 'bg-danger';
      case 'unknown': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  translateStatus(status: string): string {
    switch (status?.toLowerCase()) {
      case 'good': return 'Bueno';
      case 'ok': return 'Aceptable';
      case 'low': return 'Bajo';
      case 'critical': return 'Crítico';
      case 'unknown': return 'Sin datos';
      default: return status || 'N/A';
    }
  }

  /**
   * Extrae el CRUM o Serial Number
   * Samsung: CRUM-14120536139
   * Xerox: SN99172880E000044B
   * HP: CN625A (código del cartucho)
   */
  extractCRUM(serial_number: string, description: string): string {
    // SAMSUNG: CRUM
    if (serial_number && serial_number.includes('CRUM')) {
      const match = serial_number.match(/CRUM-\d+/);
      if (match) return match[0];
    }

    // XEROX: SN (Serial Number)
    if (serial_number && serial_number.includes(';SN')) {
      const match = serial_number.match(/;SN([^;]+)/);
      if (match && match[1] && match[1] !== 'unknown') {
        return `SN${match[1]}`;
      }
    }
    
    if (description && description.includes(';SN')) {
      const match = description.match(/;SN([^;]+)/);
      if (match && match[1] && match[1] !== 'unknown') {
        return `SN${match[1]}`;
      }
    }

    // HP: Código del cartucho (CN625A, CN626A, etc)
    if (serial_number && serial_number.includes('CN') && /CN[0-9A-Z]+/.test(serial_number)) {
      const match = serial_number.match(/(CN[0-9A-Z]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    if (description && description.includes('CN') && /CN[0-9A-Z]+/.test(description)) {
      const match = description.match(/(CN[0-9A-Z]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '-';
  }

  /**
   * Extrae la serie/descripción del componente
   * Samsung: "Black Toner Cartridge"
   * Xerox: "PN006R01509"
   * HP: "black ink HP"
   */
  extractSerie(serial_number: string, description: string): string {
    // XEROX: Extraer Part Number (PN)
    if (description && description.includes('PN')) {
      const match = description.match(/PN\s*([0-9A-Z]+)/);
      if (match && match[1]) {
        return `PN${match[1]}`;
      }
    }
    
    if (serial_number && serial_number.includes('PN')) {
      const match = serial_number.match(/PN\s*([0-9A-Z]+)/);
      if (match && match[1]) {
        return `PN${match[1]}`;
      }
    }

    // SAMSUNG: Extraer descripción (antes de "S/N:")
    if (description && description.includes('S/N:')) {
      const parts = description.split('S/N:');
      const desc = parts[0].trim();
      if (desc && desc.length > 3) {
        return desc;
      }
    }

    // HP: Extraer descripción (sin el código CN)
    if (description && description.includes('CN')) {
      // Remover el código CN para obtener la descripción
      const desc = description.replace(/CN[0-9A-Z]+/g, '').trim();
      if (desc && desc.length > 3) {
        return desc;
      }
    }

    // Descripción simple (sin caracteres especiales)
    if (description && !description.includes(',') && !description.includes(';') && 
        !description.includes('PN') && description.length > 3) {
      return description;
    }

    return '-';
  }

  /**
   * Verifica si el CRUM y la Serie son iguales
   */
  sonIgualesCRUMySerie(serial_number: string, description: string): boolean {
    const crum = this.extractCRUM(serial_number, description);
    const serie = this.extractSerie(serial_number, description);
    return crum === serie && crum !== '-';
  }

  cerrar() {
    this.editando = false; 
    this.alCerrar.emit();
  }
}