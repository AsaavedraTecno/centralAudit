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
import { forkJoin } from 'rxjs';

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

  modo: 'crear' | 'editar' | 'asignar' = 'crear';
  vistaAsignacionId?: number;
  clientesDisponibles: any[] = [];
  clientesAsignados: any[] = [];
  vistaAsignacionNombre = '';


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

  cargarDatosIniciales(): void 
  {
    this.loading = true;

    forkJoin({
      columnas: this.vistaService.obtenerColumnasDisponibles(),
      vistas: this.vistaService.obtenerVistas()
    })
    .subscribe({
      next: (res: any) => {

        this.columnasMaestras = res.columnas.columnas || [];
        this.vistas = res.vistas.data || res.vistas || [];

        this.crearNuevaVista();
        this.loading = false;

      },
      error: () => {

        this.toastService.show('Error al cargar datos', 'error');
        this.loading = false;

      }
    });

  }

  crearNuevaVista(): void {
    this.modo = 'crear';


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

  editarVista(vista: VistaPersonalizada): void 
  {
    this.modo = 'editar';
    const columnasGuardadas = new Map(
      vista.columnas.map(c => [c.identificador, c])
    );

    const columnasFusionadas: ColumnaVistaUI[] =
      this.columnasMaestras.map(colMaestra => {

        const guardada = columnasGuardadas.get(colMaestra.identificador);

        return {
          ...colMaestra,
          visible: guardada?.visible ?? false,
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

    const nombresCategoria: Record<string, string> = {
      cliente: 'Cliente',
      general: 'Identificación y General',
      metricas: 'Métricas de Impresión',
      toner: 'Tóners',
      drum: 'Drums',
      revelador: 'Reveladores',
      componentes: 'Otros Componentes'
    };

    const categorias: Record<string, ColumnaVistaUI[]> = {};

    columnas.forEach(col => {

      const categoria = col.categoria || 'general';

      if (!categorias[categoria]) {
        categorias[categoria] = [];
      }

      categorias[categoria].push(col);

    });

    this.categoriasUI = Object.entries(categorias)
      .map(([categoria, columnas]) => ({
        nombre: nombresCategoria[categoria] || categoria,
        columnas
      }))
      .filter(cat => cat.columnas.length > 0);
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

    const peticion$ = this.modo === 'editar'
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

  abrirAsignacionClientes(vista: VistaPersonalizada) {

    this.modo = 'asignar';
    this.vistaAsignacionId = vista.id;
    this.vistaAsignacionNombre = vista.nombre;

    this.vistaService.obtenerTenantsVista(vista.id)
      .subscribe((res:any)=>{

        this.clientesDisponibles = res.disponibles;
        this.clientesAsignados = res.asignados;

      });
  }

  asignarCliente(cliente:any)
  {

    this.clientesDisponibles =
      this.clientesDisponibles.filter(c=>c.id !== cliente.id);

    this.clientesAsignados.push(cliente);

  }

  removerCliente(cliente:any)
  {

    this.clientesAsignados =
      this.clientesAsignados.filter(c=>c.id !== cliente.id);

    this.clientesDisponibles.push(cliente);

  }

  guardarAsignacion()
  {

    if(!this.vistaAsignacionId){
      return;
    }

    const tenants = this.clientesAsignados.map(c=>c.id);

    this.vistaService.guardarTenantsVista(
      this.vistaAsignacionId,
      tenants
    ).subscribe(()=>{

      this.toastService.show('Asignación guardada','success');
      this.modo = 'editar';

    });

  }

  cancelarAsignacion(){
    this.modo = 'editar';
  }
}