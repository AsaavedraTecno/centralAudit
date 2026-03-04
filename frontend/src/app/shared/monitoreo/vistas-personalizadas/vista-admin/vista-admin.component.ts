import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VistaPersonalizadaService } from '../../../services/vista-personalizada.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  VistaPersonalizada,
  ColumnaVistaSistema,
  ColumnaVistaUI,
  ColumnaVistaConfig
} from '../../../../models/vista-personalizada';

interface CategoriaUI {
  nombre: string;
  columnas: ColumnaVistaUI[];
}

@Component({
  selector: 'app-vista-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vista-admin.html',
  styleUrls: ['./vista-admin.scss']
})
export class VistaAdminComponent implements OnInit {

  vistas: VistaPersonalizada[] = [];
  columnasMaestras: ColumnaVistaSistema[] = [];

  loading = false;
  guardando = false;
  modoEdicion = false;

  vistaActual: {
    id?: number;
    nombre?: string;
    descripcion?: string;
    es_default?: boolean;
    columnas: ColumnaVistaUI[];
  } = {
    columnas: []
  };

  categoriasUI: CategoriaUI[] = [];

  constructor(
    private vistaService: VistaPersonalizadaService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading = true;

    this.vistaService.obtenerColumnasDisponibles().subscribe({
      next: (res) => {
        this.columnasMaestras = res.columnas || [];

        this.vistaService.obtenerVistas().subscribe({
          next: (response: any) => {
            this.vistas = response.data || response || [];
            this.crearNuevaVista();
            this.loading = false;
          },
          error: (err) => {
            this.toastService.show('Error al cargar vistas', 'error');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.toastService.show('Error al cargar columnas', 'error');
        this.loading = false;
      }
    });
  }

  crearNuevaVista(): void {
    this.modoEdicion = false;

    const columnasNuevas: ColumnaVistaUI[] = this.columnasMaestras.map(col => ({
      ...col,
      visible: true
    }));

    this.vistaActual = {
      nombre: '',
      descripcion: '',
      es_default: false,
      columnas: columnasNuevas
    };

    this.construirCategoriasUI(this.vistaActual.columnas);
  }

  editarVista(vista: VistaPersonalizada): void {
    this.modoEdicion = true;

    const columnasFusionadas: ColumnaVistaUI[] = this.columnasMaestras.map(colMaestra => {
      const guardada = vista.columnas.find(
        c => c.identificador === colMaestra.identificador
      );

      return {
        ...colMaestra,
        visible: guardada ? guardada.visible : false,
        orden: guardada?.orden ?? colMaestra.orden,
        ancho: guardada?.ancho ?? colMaestra.ancho
      };
    });

    this.vistaActual = {
      id: vista.id,
      nombre: vista.nombre,
      descripcion: vista.descripcion,
      es_default: vista.es_default,
      columnas: columnasFusionadas
    };

    this.construirCategoriasUI(this.vistaActual.columnas);
  }

  construirCategoriasUI(columnas: ColumnaVistaUI[]): void {
    this.categoriasUI = [
      {
        nombre: 'Identificación y General',
        columnas: columnas.filter(c =>
          ['cliente', 'sucursal'].includes(c.tipo) ||
          [
            'imp_modelo',
            'imp_serie',
            'imp_serie_secundaria',
            'imp_id_interno',
            'imp_ip',
            'imp_campo_extra_1',
            'imp_campo_extra_2',
            'imp_ubicacion',
            'imp_ubicacion_manual',
            'imp_descripcion',
            'imp_comentarios',
            'imp_estado',
            'imp_minutos_sin_conexion',
            'imp_firmware',
            'imp_mac',
            'imp_online',
          ].includes(c.identificador)
        )
      },
      {
        nombre: 'Métricas de Impresión',
        columnas: columnas.filter(c =>
          [
            'imp_paginas_impresas',
            'imp_impreso_hoy',
            'imp_impreso_mes',
            'imp_paginas_bn',
            'imp_paginas_color'
          ].includes(c.identificador)
        )
      },
      {
        nombre: 'Tóners',
        columnas: columnas.filter(c =>
          c.identificador.includes('toner')
        )
      },
      {
        nombre: 'Drums',
        columnas: columnas.filter(c =>
          c.identificador.includes('drum')
        )
      },
      {
        nombre: 'Reveladores',
        columnas: columnas.filter(c =>
          c.identificador.includes('revelador')
        )
      },
      {
        nombre: 'Otros Componentes',
        columnas: columnas.filter(c =>
          [
            'imp_fusor',
            'imp_adf_roller',
            'imp_transfer_roller',
            'imp_mp_roller',
            'imp_retard_pad',
            'imp_caja_residuos'
          ].includes(c.identificador)
        )
      }
    ];
  }

  contarVisibles(vista: VistaPersonalizada): number {
    return vista.columnas?.filter(c => c.visible).length || 0;
  }

  marcarTodas(categoria: CategoriaUI): void {
    categoria.columnas.forEach(c => c.visible = true);
  }

  desmarcarTodas(categoria: CategoriaUI): void {
    categoria.columnas.forEach(c => c.visible = false);
  }

  get totalColumnasVisibles(): number {
    return this.vistaActual.columnas.filter(c => c.visible).length;
  }

  guardarVista(): void {
    if (!this.vistaActual.nombre?.trim()) {
      this.toastService.show('El nombre es obligatorio', 'warning');
      return;
    }

    if (this.totalColumnasVisibles === 0) {
      this.toastService.show('Debes dejar al menos una columna visible', 'warning');
      return;
    }

    this.guardando = true;

    const columnasParaGuardar: ColumnaVistaConfig[] =
      this.vistaActual.columnas.map(c => ({
        identificador: c.identificador,
        visible: c.visible,
        orden: c.orden,
        ancho: c.ancho
      }));

    const payload = {
      nombre: this.vistaActual.nombre,
      descripcion: this.vistaActual.descripcion,
      es_default: this.vistaActual.es_default,
      columnas: columnasParaGuardar
    };

    const peticion$ = this.modoEdicion
      ? this.vistaService.actualizarVista(this.vistaActual.id!, payload)
      : this.vistaService.crearVista(payload);

    peticion$.subscribe({
      next: () => {
        this.toastService.show('Vista guardada correctamente', 'success');
        this.cargarDatosIniciales();
        this.guardando = false;
      },
      error: () => {
        this.toastService.show('Error al guardar', 'error');
        this.guardando = false;
      }
    });
  }

  eliminarVista(vista: VistaPersonalizada): void {
    if (vista.es_default) {
      this.toastService.show('No puedes eliminar la vista por defecto', 'warning');
      return;
    }

    if (confirm(`¿Eliminar la vista "${vista.nombre}"?`)) {
      this.vistaService.eliminarVista(vista.id).subscribe({
        next: () => {
          this.toastService.show('Vista eliminada', 'success');
          this.vistas = this.vistas.filter(v => v.id !== vista.id);
          if (this.vistaActual.id === vista.id) {
            this.crearNuevaVista();
          }
        },
        error: () => this.toastService.show('Error al eliminar', 'error')
      });
    }
  }

  duplicarVista(vista: VistaPersonalizada): void {
    this.vistaService.duplicarVista(vista.id).subscribe({
      next: (res: any) => {
        this.toastService.show('Vista duplicada', 'success');
        this.vistas.push(res.data || res);
      },
      error: () => {
        this.toastService.show('Error al duplicar', 'error');
      }
    });
  }
}