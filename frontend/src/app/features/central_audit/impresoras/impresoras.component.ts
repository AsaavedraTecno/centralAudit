import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 Asegúrate de que esté importado para el buscador
import { ImpresoraService } from '../../../core/services/impresora.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { DetalleImpresoraModalComponent } from '../../../shared/monitoreo/detalle-impresora-modal/detalle-impresora-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { DetalleImpresoraService } from '../../../shared/services/detalle-impresora.service';
import { FiltrosImpresoraComponent, FiltrosImpresora } from '../../../shared/monitoreo/filtros-impresora/filtros-impresora.component';
import { ImpresorasCardsComponent } from '../impresoras/impresoras-cards/impresoras-cards.component';
import { ImpresorasGridComponent } from '../impresoras/impresoras-grid/impresoras-grid.component';
import { ToolbarImpresorasComponent } from '../impresoras/toolbar-impresoras/toolbar-impresoras.component';

interface ImpresoraVista {
  id: number; nombre: string; modelo: string; serie: string; ip: string;
  internal_id: string; brand?: string; estado: number; 
  cliente_nombre: string; cliente_rut: string;
  sucursal_nombre: string; sucursal_id: number | string;
  tonerBlack?: number; tonerCyan?: number; tonerMagenta?: number; tonerYellow?: number;
  ubicacion?: string; custom_location?: string;
  impresoHoy?: number; impresoMes?: number;
}

@Component({
  selector: 'app-impresoras',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, // 👈 Agregado para el [(ngModel)] del buscador
    DetalleImpresoraModalComponent, 
    FiltrosImpresoraComponent, 
    ImpresorasCardsComponent,  
    ImpresorasGridComponent,  
    ToolbarImpresorasComponent 
  ],
  templateUrl: './impresoras.html',
  styleUrls: ['./impresoras.scss']
})
export class ImpresoresComponent implements OnInit {
  clientes: any[] = [];
  clientesFiltrados: any[] = []; // 👈 Lista que se muestra en el HTML
  textoBusquedaCliente: string = ''; // 👈 Variable para el buscador
  
  seccionesExpandidas: Map<string, boolean> = new Map();
  
  clienteSeleccionado: any = null;
  sucursalSeleccionada: any = null;
  impresorasExhibidas: ImpresoraVista[] = [];

  impresorasMaestra: ImpresoraVista[] = [];
  marcasDisponibles: string[] = [];
  filtrosActuales: FiltrosImpresora = { busqueda: '', estado: 1, marcas: [] };

  modoVista: 'cards' | 'grid' = 'cards';
  ordenarPor: 'estado' | 'nombre' | 'serie' | 'toner' = 'estado';
  direccionOrden: 'asc' | 'desc' = 'desc';

  cargando: boolean = false;
  mostrar_modal_detalles: boolean = false;
  impresora_seleccionada: ImpresoraVista | null = null;
  cargandoArbol: boolean = false;

  constructor(
    private toastService: ToastService,
    private impresoraService: ImpresoraService,
    private clienteService: ClienteService,
    private sucursalService: SucursalService,
    private cdr: ChangeDetectorRef,
    private detalleService: DetalleImpresoraService
  ) { }

  irAlInicio(): void {
    this.sucursalSeleccionada = null;
    this.clienteSeleccionado = null;
    this.textoBusquedaCliente = '';
    this.filtrarClientes(); 
    this.seccionesExpandidas.clear(); 
    this.cdr.detectChanges();
  }

  ngOnInit(): void { this.cargarArbol(); }

  // --- LÓGICA DEL BUSCADOR DE CLIENTES ---
  filtrarClientes() {
    const termino = this.textoBusquedaCliente.toLowerCase().trim();
    
    if (!termino) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }

    this.clientesFiltrados = this.clientes.filter(c => 
      (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
      (c.razon_social && c.razon_social.toLowerCase().includes(termino)) ||
      (c.rut && c.rut.toLowerCase().includes(termino)) ||
      (c.code && c.code.toLowerCase().includes(termino))
    );
    this.cdr.detectChanges();
  }

  // --- LÓGICA DE ACORDEÓN (Toggle único) ---
  toggleCliente(id: any): void { 
    const estabaAbierto = this.seccionesExpandidas.get(id);

    // 1. Cerramos todos (Limpiamos el mapa)
    this.seccionesExpandidas.clear();

    // 2. Si no estaba abierto, lo abrimos ahora
    if (!estabaAbierto) {
      this.seccionesExpandidas.set(id, true);
    }
    
    this.cdr.detectChanges();
  }

  cargarArbol(): void {
    this.cargandoArbol = true;
    this.clienteService.getClientes().subscribe({
      next: (resp: any) => {
        this.clientes = Array.isArray(resp) ? resp : (resp.data || []);
        
        // 👈 Inicializamos la lista filtrada igual a la maestra
        this.clientesFiltrados = [...this.clientes];

        if (this.clientes.length === 0) {
          this.cargandoArbol = false;
          this.cdr.detectChanges();
          return;
        }

        let sucursalesCargadas = 0;
        this.clientes.forEach((c, index) => {
          const code = c.code || c.id;
          this.sucursalService.getByClientCode(code).subscribe({
            next: (sucResp: any) => {
              this.clientes[index].sucursales = Array.isArray(sucResp) ? sucResp : (sucResp.data || []);
              sucursalesCargadas++;
              if (sucursalesCargadas === this.clientes.length) {
                this.cargandoArbol = false;
                this.filtrarClientes(); // 👈 Re-filtramos por si ya escribió algo
              }
              this.cdr.detectChanges();
            },
            error: () => {
              sucursalesCargadas++;
              if (sucursalesCargadas === this.clientes.length) this.cargandoArbol = false;
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        this.cargandoArbol = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarSucursal(cliente: any, sucursal: any): void {
    this.clienteSeleccionado = cliente;
    this.sucursalSeleccionada = sucursal;
    this.cargando = true;
    const clientCode = cliente.code || cliente.id;

    this.impresoraService.getImpresoras(clientCode, sucursal.id).subscribe({
      next: (resp: any) => {
        const impresoras = resp?.data || resp?.impresoras || resp || [];
        this.impresorasMaestra = impresoras.map((imp: any) => ({
          ...imp,
          cliente_rut: clientCode,
          cliente_nombre: cliente.razon_social || cliente.nombre,
          sucursal_nombre: sucursal.nombre,
          sucursal_id: sucursal.id
        }));

        const marcasCrudas = this.impresorasMaestra
          .map(i => i.brand)  
          .filter((b): b is string => !!b);
        
        this.marcasDisponibles = [...new Set(marcasCrudas)];
        this.aplicarFiltros(this.filtrosActuales);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- RESTO DE FUNCIONALIDADES ORIGINALES ---
  private ordenarImpresoras(): void {
    const lista = [...this.impresorasExhibidas];
    lista.sort((a, b) => {
      let valorA: any;
      let valorB: any;

      switch (this.ordenarPor) {
        case 'nombre': valorA = a.nombre?.toLowerCase() || ''; valorB = b.nombre?.toLowerCase() || ''; break;
        case 'serie': valorA = a.serie?.toLowerCase() || ''; valorB = b.serie?.toLowerCase() || ''; break;
        case 'estado': valorA = a.estado; valorB = b.estado; break;
        case 'toner': valorA = a.tonerBlack ?? 0; valorB = b.tonerBlack ?? 0; break;
        default: valorA = a.estado; valorB = b.estado;
      }

      if (valorA < valorB) return this.direccionOrden === 'asc' ? -1 : 1;
      if (valorA > valorB) return this.direccionOrden === 'asc' ? 1 : -1;
      return 0;
    });
    this.impresorasExhibidas = lista;
  }

  cambiarOrden(campo: any): void {
    if (this.ordenarPor === campo) {
      this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordenarPor = campo;
      this.direccionOrden = 'asc';
    }
    this.ordenarImpresoras();
    this.cdr.detectChanges();
  }

  cambiarVista(vista: 'cards' | 'grid'): void {
    this.modoVista = vista;
  }

  toggleEstado(imp: ImpresoraVista): void {
    const nuevoEstado = imp.estado === 1 ? 0 : 1;
    this.impresoraService.updateEstado(imp.cliente_rut, imp.serie, nuevoEstado).subscribe({
      next: () => {
        imp.estado = nuevoEstado; 
        this.ordenarImpresoras();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
        this.toastService.show('Error al actualizar estado', 'error');
      }
    });
  }

  abrirDetalles(imp: ImpresoraVista): void {
    const clientCode = this.clienteSeleccionado?.code || this.clienteSeleccionado?.id;
    const locationId = this.sucursalSeleccionada?.id;
    this.toastService.show('Cargando detalles...', 'info');

    this.detalleService.cargarDetallesCompletos(clientCode, locationId, imp.id).subscribe({
      next: (data) => {
        this.impresora_seleccionada = {
          ...data,
          cliente_rut: clientCode,
          cliente_nombre: this.clienteSeleccionado.razon_social || this.clienteSeleccionado.nombre,
          sucursal_nombre: this.sucursalSeleccionada.nombre,
          sucursal_id: this.sucursalSeleccionada.id
        };
        this.mostrar_modal_detalles = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar detalles:', err);
        this.impresora_seleccionada = imp;
        this.mostrar_modal_detalles = true;
        this.cdr.detectChanges();
        this.toastService.show('No se pudieron cargar todos los detalles', 'warning');
      }
    });
  }

  cerrarDetalles(): void {
    this.mostrar_modal_detalles = false; 
    this.impresora_seleccionada = null; 
    this.cdr.detectChanges();
  }

  onGuardarCambios(datos: any) {
    const clientCode = this.clienteSeleccionado?.code || this.clienteSeleccionado?.id;
    const printerId = datos.id;
    const locationId = this.sucursalSeleccionada?.id;
    
    if (!clientCode || !locationId) {
      this.toastService.show('Error: Datos incompletos.', 'error');
      return;
    }

    this.detalleService.actualizarCamposInventario(clientCode, printerId, datos).subscribe({
      next: () => {
        this.toastService.show('Ficha de inventario actualizada', 'success');
        this.detalleService.cargarDetallesCompletos(clientCode, locationId, printerId).subscribe({
          next: (data) => {
            this.impresora_seleccionada = {
              ...data,
              cliente_rut: clientCode,
              cliente_nombre: this.clienteSeleccionado.razon_social || this.clienteSeleccionado.nombre,
              sucursal_nombre: this.sucursalSeleccionada.nombre,
              sucursal_id: this.sucursalSeleccionada.id
            } as ImpresoraVista;
            
            const index = this.impresorasExhibidas.findIndex(p => p.id === printerId);
            if (index !== -1) {
              this.impresorasExhibidas[index] = this.impresora_seleccionada;
            }
            this.mostrar_modal_detalles = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.toastService.show('Cambios guardados pero no se pudo recargar', 'warning');
            this.mostrar_modal_detalles = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.toastService.show('No se pudieron guardar los cambios', 'error');
      }
    });
  }

  aplicarFiltros(filtros: FiltrosImpresora): void {
    this.filtrosActuales = filtros;
    let resultado = [...this.impresorasMaestra];

    if (filtros.busqueda.trim() !== '') {
      const text = filtros.busqueda.toLowerCase().trim();
      resultado = resultado.filter(imp => 
        (imp.ip && imp.ip.toLowerCase().includes(text)) ||
        (imp.serie && imp.serie.toLowerCase().includes(text)) ||
        (imp.modelo && imp.modelo.toLowerCase().includes(text)) ||
        (imp.nombre && imp.nombre.toLowerCase().includes(text)) ||
        (imp.internal_id && imp.internal_id.toString().toLowerCase().includes(text))
      );
    }

    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(imp => imp.estado === filtros.estado);
    }

    if (filtros.marcas.length > 0) {
      resultado = resultado.filter(imp => imp.brand && filtros.marcas.includes(imp.brand));
    }

    this.impresorasExhibidas = resultado;
    this.ordenarImpresoras();
    this.cdr.detectChanges();
  }
}