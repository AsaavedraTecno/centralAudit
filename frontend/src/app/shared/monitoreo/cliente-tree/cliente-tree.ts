import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, PLATFORM_ID, Inject, OnDestroy, NgModule } from '@angular/core';
import { CommonModule, isPlatformBrowser  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../../core/services/cliente.service';
import { ImpresoraService } from '../../../core/services/impresora.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { Cliente } from '../../../models/cliente';
import { Sucursal } from '../../../models/sucursal';
import { Impresora } from '../../../models/impresora';
import { DetalleImpresoraModalComponent } from '../../../shared/monitoreo/detalle-impresora-modal/detalle-impresora-modal.component';
import { DetalleImpresoraService } from '../../../shared/services/detalle-impresora.service';
import { ToastService } from '../../../core/services/toast.service'; 
import { Subscription, interval } from 'rxjs';
import { VistaStateService } from '../../../shared/services/vista-state.service';
import { VistaPersonalizadaService } from '../../../shared/services/vista-personalizada.service';
import {
  VistaPersonalizada,
  ColumnaVistaUI,
} from '../../../models/vista-personalizada';
import { TenantPanelService } from '../../../core/services/tenant-panel.service';



@Component({
  selector: 'app-cliente-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, DetalleImpresoraModalComponent ],
  templateUrl: './cliente-tree.component.html',
  styleUrls: ['./cliente-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class ClienteTreeComponent implements OnInit, OnDestroy {
  // ================= VISTAS =================

  vistas: VistaPersonalizada[] = [];
  vistaActivaId?: number;
  private vistasLoaded = false;
  private initialized = false;

  columnasVisibles: ColumnaVistaUI[] = [];

  totalOnline = 0;
  totalWarning = 0;
  totalOffline = 0;


  busqueda: string = '';
  clientes: Cliente[] = [];
  expandedNodes: { [key: string]: boolean } = {};
  loadingNodes: { [key: string]: boolean } = {}; 
  loading = false;
  currentPage = 1;
  totalPages = 1;
  totalClientes = 0;
  clientesPerPage = 50;
  
  emptyColumns = Array(27).fill(null);
  
  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLElement>;
  
  private buscarTimeout: any;
  private isLoadingData = false;
  private isSearching = false;

  private loadingSuccursales = new Set<string>();
  private loadingImpresoras = new Set<string>();
  
  impresora_seleccionada: Impresora | null = null;
  mostrar_modal_detalles: boolean = false;

  ultimaActualizacion: Date = new Date();
  private autoRefreshSub?: Subscription;

  constructor(
    private TenantPanelService: TenantPanelService,
    public vistaState: VistaStateService,
    private vistaService: VistaPersonalizadaService,
    private detalleService: DetalleImpresoraService,
    private toastService: ToastService,
    private sucursalService: SucursalService, 
    private clienteService: ClienteService,
    private impresoraService: ImpresoraService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) { }

  isTenant(): boolean {
    return this.TenantPanelService.isTenant();
  }

  cargarVistaCentral(){
    this.vistaService.obtenerColumnasDisponibles().subscribe(res => {
      this.vistaState.establecerColumnasDisponibles(res.columnas);
      this.cdr.markForCheck();
    });

    this.recargarVistas();
  }

  cargarVistaTenant(){
    this.vistaService.obtenerColumnasDisponibles().subscribe(res => {
      this.vistaState.establecerColumnasDisponibles(res.columnas);

      this.TenantPanelService.obtenerVistaPanel().subscribe((res:any)=>{
        const vista = res.vista;
        this.vistas = [vista];
        this.vistaActivaId = vista.id;
        this.vistaState.establecerVistaActiva(vista);
        this.cdr.markForCheck();
      });
    });
  }
        
  ngOnInit(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.cargarResumenGlobal();

    // Cargar vistas (central o tenant)
    if (this.TenantPanelService.isTenant())  {
      this.vistas = [];
      this.cargarVistaTenant();
    } else {
      this.cargarVistaCentral();
    }

    // Suscribirse a cambios de columnas visibles
    this.vistaState.obtenerColumnasVisibles().subscribe(cols => {
      this.columnasVisibles = cols;
      this.cdr.markForCheck();
    });

    // Cargar clientes
    this.loadClientes();

    // Iniciar refresco automático
    this.iniciarAutoRefresh();
  }

  cargarResumenGlobal() {
    // Llamamos al nuevo endpoint que cuenta TODO en el servidor
    this.impresoraService.obtenerResumenGlobalConexiones().subscribe({
      next: (res) => {
        // Asignamos los valores globales directamente
        this.totalOnline = res.active;
        this.totalWarning = res.warning;
        this.totalOffline = res.offline;
        
        // Como usas ChangeDetectionStrategy.OnPush, hay que avisar a Angular
        this.cdr.markForCheck(); 
      },
      error: (err) => console.error('Error al cargar resumen global', err)
    });
  }


  ngOnDestroy(): void {
    if (this.autoRefreshSub) {
      this.autoRefreshSub.unsubscribe();
    }
  }

  obtenerValor(impresora:any,col:any){
    return impresora[col.identificador] ?? null;
  }

  cambiarVista(id: any) {
    const idNumber = Number(id);

    const vista = this.vistas.find(v => v.id === idNumber);
    if (!vista) {
      console.log('Vista no encontrada para id:', idNumber);
      return;
    }

    this.vistaActivaId = idNumber;
    localStorage.setItem('vista_activa', String(idNumber));

    this.vistaState.establecerVistaActiva(vista);
    this.cdr.markForCheck();
  }

  recargarVistas(seleccionarUltima: boolean = true) {
    if (this.vistasLoaded) return;
    this.vistasLoaded = true;

    this.vistaService.obtenerVistas().subscribe(res => {
      this.vistas = res.data;

      if (!this.vistas.length) return;

      let vistaInicial: VistaPersonalizada | undefined;

      if (seleccionarUltima) {
        const vistaGuardada = localStorage.getItem('vista_activa');
        if (vistaGuardada) {
          vistaInicial = this.vistas.find(v => v.id === Number(vistaGuardada));
        }
      }

      if (!vistaInicial) {
        vistaInicial = this.vistas.find(v => v.es_default) || this.vistas[0];
      }

      this.vistaActivaId = vistaInicial.id;
      this.vistaState.establecerVistaActiva(vistaInicial);

      this.cdr.markForCheck();
    });
  }
    

  iniciarAutoRefresh(): void {
    if (this.autoRefreshSub) return;

    this.autoRefreshSub = interval(600000).subscribe(() => {
      if (!this.isSearching && !this.isLoadingData) {
        this.recargarSilenciosamente();
      }
    });
  }

  async recargarSilenciosamente(): Promise<void> {
    this.ultimaActualizacion = new Date();
    this.cargarResumenGlobal();
    this.cdr.markForCheck();

    // Para recargar solo las impresoras que el usuario está viendo actualmente.
    for (const nodeId of Object.keys(this.expandedNodes)) {
      if (this.expandedNodes[nodeId] && nodeId.startsWith('sucursal_')) {
        const parts = nodeId.split('_');
        const clientCode = parts[1];
        const sucursalIdStr = parts[parts.length - 1];
        
        const cliente = this.clientes.find(c => c.code === clientCode || c.rut === clientCode);
        if (cliente && cliente.sucursales) {
          const sucursalIdx = cliente.sucursales.findIndex(s => String(s.id) === sucursalIdStr);
          if (sucursalIdx !== -1) {
            await this.cargarImpresorasDelaSucursal(cliente, sucursalIdx, nodeId);
          }
        }
      }
    }
    this.toastService.show('Datos de impresoras actualizados', 'info');
  }
  
  loadClientes(): void {
    this.currentPage = 1;
    this.loadClientesFromServer();
  }

  private loadClientesFromServer(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;
    this.loading = true;
    this.cdr.markForCheck();
    
    const request$ = this.isSearching 
      ? this.clienteService.searchClientes(this.busqueda.trim(), this.currentPage, this.clientesPerPage)
      : this.clienteService.getClientes(this.currentPage, this.clientesPerPage);

    request$.subscribe({
      next: (response) => {
        const rawData = response?.data || response?.clients || response;
        if (rawData && Array.isArray(rawData)) {
          this.clientes = rawData.map((c: any) => ({
            ...c,
            printers_count: c.printers_count ?? 0,
            sucursales: undefined
          }));
          console.log('Clientes cargados:', rawData);
          this.totalClientes = response.pagination?.total || response.total || rawData.length;
          this.totalPages = response.pagination?.last_page || response.last_page || Math.ceil(this.totalClientes / this.clientesPerPage);
        }
        this.loading = false;
        this.isLoadingData = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading clientes:', error);
        this.loading = false;
        this.isLoadingData = false;
        this.cdr.markForCheck();
      }
    });
  }

  private async cargarSucursalesOnDemand(cliente: Cliente, nodeId: string): Promise<void> {
    const loadingKey = `cliente_${cliente.rut}`;
    if (this.loadingSuccursales.has(loadingKey)) return;
    this.loadingSuccursales.add(loadingKey);
    
    try {
      const response: any = await this.sucursalService.getByClientCode(cliente.code).toPromise();
      const lista = response?.data || response?.sucursales || response;

      if (Array.isArray(lista)) {
        this.updateClienteInList(cliente.code, lista);
        this.cdr.markForCheck();
      }
      this.finalizarCargaNodo(nodeId);
    } catch (error) {
      console.error(`Error loading sucursales:`, error);
      this.finalizarCargaNodo(nodeId);
    } finally {
      this.loadingSuccursales.delete(loadingKey);
    }
  }

  private async cargarImpresorasDelaSucursal(cliente: Cliente, sucursalIndex: number, nodeId: string): Promise<void> {
    const sucursal = cliente.sucursales![sucursalIndex];
    const sucursalId = typeof sucursal.id === 'string' ? parseInt(sucursal.id) : sucursal.id || 0;
    const loadingKey = `suc_${cliente.code}_${sucursalId}`;
    
    if (this.loadingImpresoras.has(loadingKey)) return;
    this.loadingImpresoras.add(loadingKey);
    
    try {
      const response: any = await this.impresoraService.getImpresoras(cliente.code || cliente.rut, sucursalId).toPromise();
      let rawData: any[] = [];

      if (Array.isArray(response?.data)) {
        rawData = response.data;
      } 
      else if (Array.isArray(response?.impresoras)) {
        rawData = response.impresoras;
      }
      else if (Array.isArray(response)) {
        rawData = response;
      }

      if (Array.isArray(rawData)) {
        // Filtrar solo impresoras activas
          const activas = rawData
            .filter((imp: any) => imp.estado === 1)
            .filter((imp: any, index: number, self: any[]) =>
              index === self.findIndex((i) => i.id === imp.id)
          )
          .map((imp: any) => {

            const lastSeen = new Date(imp.last_seen_at).getTime();
            const now = Date.now();

            let minutesOffline = Math.floor((now - lastSeen) / 60000);

            // evitar negativos por desfase de reloj
            if (minutesOffline < 0) {
              minutesOffline = 0;
            }

            return {
              ...imp,
              estadoConexion: imp.connection_color === 'green'
                ? 'online'
                : imp.connection_color === 'yellow'
                ? 'warning'
                : 'offline',

              estadoColor: imp.connection_color,
              minutosSinConexion: minutesOffline
            };

          });
        
        this.updateSucursalInList(cliente.code, sucursalId, activas);
        this.cdr.markForCheck(); 
        console.log('Impresoras cargadas:', activas);
        console.log('Clientes actualizado:', this.clientes);
      }

    } catch (error) {
      console.error(`Error loading printers:`, error);
    } finally {
      this.finalizarCargaNodo(nodeId);
      this.loadingImpresoras.delete(loadingKey);
      
    }
    
  }

  private updateClienteInList(code: string, sucursales: Sucursal[]) {
    this.clientes = this.clientes.map(c => {
      if (c.code === code) {
        return { 
          ...c, 
          sucursales: sucursales.map(s => ({ ...s, impresoras: undefined })) 
        };
      }
      return c;
    });
    this.cdr.markForCheck();
  }

  private updateSucursalInList(clientCode: string, sucursalId: number, impresoras: any[]) {
    this.clientes = this.clientes.map(cliente => {
      if (cliente.code !== clientCode) {
        return cliente;
      }

      return {
        ...cliente,
        sucursales: (cliente.sucursales || []).map(sucursal => {
          if (Number(sucursal.id) !== sucursalId) {
            return sucursal;
          }

          return {
            ...sucursal,
            impresoras: [...impresoras]
          };
        })
      };
    });

    this.cdr.markForCheck();
    this.calcularResumenEstados();
  }

  private finalizarCargaNodo(nodeId: string) {
    this.loadingNodes = { ...this.loadingNodes };
    delete this.loadingNodes[nodeId];
    this.cdr.markForCheck();
  }

  toggleNode(nodeId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.expandedNodes = { ...this.expandedNodes, [nodeId]: !this.expandedNodes[nodeId] };

    if (!this.expandedNodes[nodeId]) return;
    
    if (nodeId.startsWith('cliente_')) {
      const id = nodeId.replace('cliente_', '');
      const cliente = this.clientes.find(c => c.id === id);
      if (cliente && (!cliente.sucursales || cliente.sucursales.length === 0)) {
        this.loadingNodes = { ...this.loadingNodes, [nodeId]: true };
        this.cargarSucursalesOnDemand(cliente, nodeId);
      }
    } 
    else if (nodeId.startsWith('sucursal_')) {
      const parts = nodeId.split('_');
      const clientId = parts[1];
      const sucursalIdStr = parts[parts.length - 1];
      
      const cliente = this.clientes.find(c => c.id === clientId);
      if (cliente?.sucursales) {
        const sucursalIdx = cliente.sucursales.findIndex(s => String(s.id) === sucursalIdStr);
        if (sucursalIdx !== -1 && (!cliente.sucursales[sucursalIdx].impresoras || cliente.sucursales[sucursalIdx].impresoras.length === 0) ){
          this.loadingNodes = { ...this.loadingNodes, [nodeId]: true };
          this.cargarImpresorasDelaSucursal(cliente, sucursalIdx, nodeId);
        }
      }
    }
    this.cdr.markForCheck();
  }

  // ============ BÚSQUEDA ============

  onBuscarRealtime(): void {
    clearTimeout(this.buscarTimeout);
    this.currentPage = 1;
    this.buscarTimeout = setTimeout(() => {
      if (!this.busqueda.trim()) { 
        this.isSearching = false; 
        this.loadClientes(); 
        return; 
      }
      this.isSearching = true;
      this.loadClientesFromServer();
    }, 350);
  }

  onLimpiarBusqueda(): void { 
    this.busqueda = ''; 
    this.isSearching = false; 
    this.currentPage = 1; 
    this.loadClientes(); 
  }

  // ============ PAGINACIÓN ============

  previousPage(): void { 
    if (this.currentPage > 1) { 
      this.currentPage--; 
      this.loadClientesFromServer(); 
    } 
  }
  
  nextPage(): void { 
    if (this.currentPage < this.totalPages) { 
      this.currentPage++; 
      this.loadClientesFromServer(); 
    } 
  }

  // ============ RECARGAR ============

  forzarRecarga(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Limpiar expansión
      this.expandedNodes = {};
      this.loadingNodes = {};
      this.currentPage = 1;
      this.isSearching = false;
      this.busqueda = '';

      this.ultimaActualizacion = new Date();
      this.cdr.markForCheck();
      
      // Recargar desde servidor
      this.loadClientes();
    }
  }

  // ============ MODAL DETALLES ============

  abrirDetalles(imp: Impresora, event?: Event): void {
    let clienteCode = '';
    let locationId = 0;

    this.toastService.show('Cargando detalles...', 'info');

    if (event) {
      event.stopPropagation();
    }

    for (const cliente of this.clientes) {
      if (cliente.sucursales) {
        for (const sucursal of cliente.sucursales) {
          if (sucursal.impresoras?.find(i => i.id === imp.id)) {
            clienteCode = cliente.code || cliente.rut;
            const sucursalId = typeof sucursal.id === 'string' ? parseInt(sucursal.id) : sucursal.id;
            locationId = sucursalId || 0;
            break;
          }
        }
        if (clienteCode) break;
      }
    }

    if (!clienteCode || locationId === 0 || !imp.id) {
      this.toastService.show('Error: No se pudo identificar los datos', 'error');
      return;
    }

    this.mostrar_modal_detalles = false;
    this.detalleService.cargarDetallesCompletos(clienteCode, locationId, imp.id).subscribe({
      next: (response: any) => {
        const detallesFrescos = response.data || response;

        console.log('Respuesta completa:', response);
        console.log('Detalles frescos:', detallesFrescos);
        console.log('Supplies en detallesFrescos:', detallesFrescos.supplies);
        console.log('Supplies en response.data:', response.data?.supplies);

        this.impresora_seleccionada = {
          ...imp,
          ...detallesFrescos,
          supplies: detallesFrescos.supplies || []
        } as Impresora;

        this.mostrar_modal_detalles = true; 
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar detalles:', err);
        this.toastService.show('Error al cargar detalles', 'error');
        this.impresora_seleccionada = imp;
        this.mostrar_modal_detalles = true; 
        this.loading = false;
        this.cdr.markForCheck(); 
      }
    });
  }
    
  cerrarDetalles(): void { 
    this.mostrar_modal_detalles = false; 
    this.impresora_seleccionada = null; 
    this.cdr.markForCheck(); 
  }

  // ============ TRACK BY ============

  trackByClienteRut(i: number, c: Cliente) { return c.code; }
  trackBySucursalId(i: number, s: Sucursal) { return s.id; }
  trackByImpresoraId(i: number, imp: Impresora) { return imp.id }

  onTableScroll(e: Event): void {}

  getTónerByType(impresora: any, tipo: string): any {
    if (!impresora || !impresora.supplies) {
      return null;
    }

    const tipoMap: { [key: string]: string[] } = {
      'black_toner': ['black_toner_cartridge', 'black_toner', 'black_ink_hp_cn625a'],
      'cyan_toner': ['cyan_toner', 'cyan_ink_hp_cn626a'],
      'magenta_toner': ['magenta_toner', 'magenta_ink_hp_cn627a'],
      'yellow_toner': ['yellow_toner', 'yellow_ink_hp_cn628a']
    };

    const idsToSearch = tipoMap[tipo] || [];
    
    return impresora.supplies.find((supply: any) => 
      idsToSearch.some(id => 
        supply.id?.toLowerCase().includes(id.toLowerCase()) ||
        supply.name?.toLowerCase().includes(id.toLowerCase())
      )
    );
  }

  getComponenteByType(impresora: any, tipo: string): any {
    if (!impresora || !impresora.supplies) {
      return null;
    }

    const tipoMap: { [key: string]: string[] } = {
      'black_drum': ['black_drum_cartridge', 'black_imaging_unit', 'drum_cartridge'],
      'cyan_drum': ['cyan_drum', 'cyan_imaging_unit'],
      'magenta_drum': ['magenta_drum', 'magenta_imaging_unit'],
      'yellow_drum': ['yellow_drum', 'yellow_imaging_unit'],
      'fuser': ['fuser'],
      'transfer_roller': ['transfer_roller', 'transfer_roll', 'second_bias_transfer_roll'],
      'adf_roller': ['adf_roller'],
      'tray_2_roller': ['tray_2_roller', 'tray_1_roller', 'mp_tray_roller'],
      'adf_retard_pad': ['adf_retard_pad', 'adf_rubber_pad', 'tray_1_retard_roller'],
      'mp_holder_pad': ['mp_holder_pad'],
      'waste_toner_container': ['waste_toner_container']
    };

    const idsToSearch = tipoMap[tipo] || [];
    
    return impresora.supplies.find((supply: any) => 
      idsToSearch.some(id => 
        supply.id?.toLowerCase().includes(id.toLowerCase()) ||
        supply.name?.toLowerCase().includes(id.toLowerCase())
      )
    );
  }

  getEstadoComponente(supply: any): string {
    const estado = supply?.status || 'unknown';
    const statusMap: { [key: string]: string } = {
      'good': '✓ Bueno',
      'ok': '○ Aceptable',
      'low': '⚠ Bajo',
      'critical': '✕ Crítico',
      'warning': '⚠ Advertencia'
    };
    
    return statusMap[estado] || estado;
  }

  onGuardarCambios(datos: any) {
    let clienteCode = '';
    let locationId = 0;

    for (const cliente of this.clientes) {
      if (cliente.sucursales) {
        for (const sucursal of cliente.sucursales) {
          if (sucursal.impresoras?.find(i => i.id === datos.id)) {
            clienteCode = cliente.code || cliente.rut;
            const sucursalId = typeof sucursal.id === 'string' ? parseInt(sucursal.id) : sucursal.id;
            locationId = sucursalId || 0;
            break;
          }
        }
        if (clienteCode) break;
      }
    }

    if (!clienteCode || locationId === 0) {
      this.toastService.show('Error: No se pudo identificar cliente o sucursal', 'error');
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    this.toastService.show('Guardando cambios...', 'info');

    this.detalleService.actualizarCamposInventario(clienteCode, datos.id, datos).subscribe({
      next: () => {
        this.toastService.show('✓ Ficha de inventario actualizada', 'success');
        this.mostrar_modal_detalles = false;
        this.loading = false;
        this.impresora_seleccionada = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.toastService.show('Error al guardar los cambios', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getClaseColumna(col: ColumnaVistaUI): string {
    const clases: string[] = [];
    // ===== BARRAS DE COMPONENTES =====
    if (col.componente === 'barra') {
      const map: { [key: string]: string } = {
        // Toner
        'imp_toner_black': 'component-bar toner-black',
        'imp_toner_cyan': 'component-bar toner-cyan',
        'imp_toner_magenta': 'component-bar toner-magenta',
        'imp_toner_yellow': 'component-bar toner-yellow',

        // Drum
        'imp_drum_black': 'component-bar drum-black',
        'imp_drum_cyan': 'component-bar drum-cyan',
        'imp_drum_magenta': 'component-bar drum-magenta',
        'imp_drum_yellow': 'component-bar drum-yellow',

        // Revelador
        'imp_revelador_black': 'component-bar revelador-black',
        'imp_revelador_magenta': 'component-bar revelador-magenta',
        'imp_revelador_yellow': 'component-bar revelador-yellow',

        // Otros
        'imp_fusor': 'component-bar fusor',
        'imp_adf_roller': 'component-bar roller',
        'imp_transfer_roller': 'component-bar roller',
        'imp_mp_roller': 'component-bar roller',
        'imp_retard_pad': 'component-bar roller',
        'imp_caja_residuos': 'component-bar waste'
      };

      clases.push(map[col.identificador] || 'component-bar');
    }

    // ===== COLUMNAS DE IMPRESIONES =====
    

    const id = col.identificador?.toLowerCase() || '';

    if (id.includes('total')) {
      clases.push('col-total');
    }

    if (id.includes('bn') || id.includes('black')) {
      clases.push('col-bn');
    }

    if (id.includes('color')) {
      clases.push('col-color');
    }

    if (id.includes('hoy')) {
      clases.push('col-hoy');
    }

    if (id.includes('mes')) {
      clases.push('col-mes');
    }

    return clases.join(' ');
  }



  // STATUS IMPRESORAS

  getEstadoSucursal(sucursal: any) {

    if (!sucursal.impresoras?.length) {
      return { color: 'green' };
    }

    let hasWarning = false;

    for (const imp of sucursal.impresoras) {

      if (imp.estadoColor === 'red') {
        return { color: 'red' };
      }

      if (imp.estadoColor === 'yellow') {
        hasWarning = true;
      }
    }

    if (hasWarning) {
      return { color: 'yellow' };
    }

    return { color: 'green' };
  }

  getEstadoCliente(cliente: any) {

    if (!cliente.sucursales?.length) {
      return { color: 'green' };
    }

    let hasWarning = false;

    for (const sucursal of cliente.sucursales) {

      const estado = this.getEstadoSucursal(sucursal);

      if (estado.color === 'red') {
        return { color: 'red' };
      }

      if (estado.color === 'yellow') {
        hasWarning = true;
      }
    }

    if (hasWarning) {
      return { color: 'yellow' };
    }

    return { color: 'green' };
  }

  calcularResumenEstados() {
    this.cargarResumenGlobal();
  }

  obtenerValorColumnaFormateado(impresora: any, col: ColumnaVistaUI): any {

    const valor = this.vistaState.obtenerValorColumna(impresora, col);

    if (!valor) return '-';

    if (
      col.identificador?.includes('ultima') ||
      col.identificador?.includes('last')
    ) {

      const date = new Date(valor);

      if (isNaN(date.getTime())) return valor;

      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

    }

    return valor;
  }

  getTiempoRelativo(min: number): string {

    if (min < 1) return 'ahora';

    if (min < 60) return `hace ${min} min`;

    const h = Math.floor(min / 60);

    if (h < 24) return `hace ${h} h`;

    const d = Math.floor(h / 24);

    return `hace ${d} d`;
  }
}