import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  VistaPersonalizada,
  ColumnaVistaSistema,
  ColumnaVistaUI,
  ColumnaVistaConfig
} from '../../models/vista-personalizada';

@Injectable({
  providedIn: 'root'
})
export class VistaStateService {

  // 🔹 Vista activa actual
  private vistaActiva$ = new BehaviorSubject<VistaPersonalizada | null>(null);

  // 🔹 Columnas visibles listas para renderizar (YA FUSIONADAS)
  private columnasVisibles$ = new BehaviorSubject<ColumnaVistaUI[]>([]);

  // 🔹 Metadata del sistema (columnas_disponibles)
  private columnasDisponibles: ColumnaVistaSistema[] = [];


  constructor() {}

  private transformarIdentificador(identificador: string): string {


    const overrides: { [key: string]: string } = {
      'imp_paginas_bn': 'paginasBN',
      'imp_serie_secundaria': 'secondary_serial',
      'imp_id_interno': 'internal_id',
      'imp_ubicacion_manual': 'custom_location',
      'imp_comentarios': 'comments',
      'imp_campo_extra_1': 'custom_field_1',
      'imp_campo_extra_2': 'custom_field_2',
      'imp_ultima_conexion': 'last_seen_at',
      'imp_mac': 'mac',
      'imp_firmware': 'firmware',
    };

    if (overrides[identificador]) {
      return overrides[identificador];
    }

    // Cliente
    if (identificador.startsWith('cliente_')) {
      return identificador.replace('cliente_', '');
    }

    // Sucursal
    if (identificador.startsWith('sucursal_')) {
      return identificador.replace('sucursal_', '');
    }

    // Impresora normal snake_case → camelCase
    if (identificador.startsWith('imp_')) {
      const sinPrefijo = identificador.replace('imp_', '');

      return sinPrefijo.replace(/_([a-z])/g, (_, letra) =>
        letra.toUpperCase()
      );
    }

    return identificador;
  }
  /**
   * Establecer metadata del sistema
   * (se llama una vez al iniciar el panel)
   */
  establecerColumnasDisponibles(columnas: ColumnaVistaSistema[]): void {
    this.columnasDisponibles = columnas;
    this.actualizarColumnasVisibles();
  }

  /**
   * Establecer vista activa
   */
  establecerVistaActiva(vista: VistaPersonalizada): void {
    this.vistaActiva$.next(vista);
    this.actualizarColumnasVisibles();
  }

  obtenerVistaActiva(): Observable<VistaPersonalizada | null> {
    return this.vistaActiva$.asObservable();
  }

  obtenerVistaActivaValor(): VistaPersonalizada | null {
    return this.vistaActiva$.value;
  }

  obtenerColumnasVisibles(): Observable<ColumnaVistaUI[]> {
    return this.columnasVisibles$.asObservable();
  }

  obtenerColumnasVisiblesValor(): ColumnaVistaUI[] {
    return this.columnasVisibles$.value;
  }

  /**
   * Fusiona metadata + configuración del usuario
   */
  private actualizarColumnasVisibles(): void {

    const vista = this.vistaActiva$.value;

    if (!vista || !vista.columnas || this.columnasDisponibles.length === 0) {
      this.columnasVisibles$.next([]);
      return;
    }

    const columnasFusionadas: ColumnaVistaUI[] =
      this.columnasDisponibles.map(colSistema => {

        const config = vista.columnas.find(
          c => c.identificador === colSistema.identificador
        );

        return {
          ...colSistema,
          visible: config?.visible ?? false,
          orden: config?.orden ?? colSistema.orden,
          ancho: config?.ancho ?? colSistema.ancho
        };
      });

    const columnasVisibles = columnasFusionadas
    
      .filter(c => c.visible)
      .sort((a, b) => a.orden - b.orden);

    this.columnasVisibles$.next(columnasVisibles);
    console.log('Columnas visibles nuevas:', columnasVisibles);
  }

  obtenerValorColumna(objeto: any, columna: ColumnaVistaUI): any {

    const propiedad = this.transformarIdentificador(columna.identificador);

    return objeto?.[propiedad] ?? null;
  }

  resetear(): void {
    this.vistaActiva$.next(null);
    this.columnasVisibles$.next([]);
  }
}