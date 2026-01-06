import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../services/cliente.service';
import { ImpresoraService } from '../../services/impresora.service';
import { ClienteIndexedDbService } from '../../services/cliente-indexed-db.service';
import { Cliente } from '../../models/cliente';
import { Sucursal } from '../../models/sucursal';
import { Impresora } from '../../models/impresora';

@Component({
  selector: 'app-cliente-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-tree.component.html',
  styleUrls: ['./cliente-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClienteTreeComponent implements OnInit {
  busqueda: string = '';
  clientes: Cliente[] = [];
  expandedNodes: { [key: string]: boolean } = {};
  loadingNodes: { [key: string]: boolean } = {}; // Para rastrear qué nodos están cargando
  loading = false;
  currentPage = 1;
  totalPages = 1;
  totalClientes = 0;
  clientesPerPage = 50;
  
  // Array de columnas vacías (para replicar en filas de cliente y sucursal)
  emptyColumns = Array(25).fill(null);
  
  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLElement>;
  
  private buscarTimeout: any;
  private isLoadingData = false;
  private isSearching = false;
  private sessionStorageSaveTimeout: any;
  
  // Cache LRU - solo últimas 5 páginas para ahorrar memoria
  private readonly MAX_CACHED_PAGES = 5;
  private readonly CACHE_EXPIRY_MINUTES = 30;
  private pageCacheKeys: string[] = [];
  
  // SessionStorage para persistencia de estado en la sesión
  private readonly EXPANDED_NODES_SESSION_KEY = 'clienteTreeExpandedNodes';
  private readonly CLIENTES_WITH_DATA_SESSION_KEY = 'clienteTreeClientesWithData';
  private readonly SESSION_SAVE_THROTTLE_MS = 500;
  private readonly CURRENT_USER_SESSION_KEY = 'currentUserForCache'; // Para validar que no cambió usuario
  
  // Prevenir cargas simultáneas de sucursales e impresoras
  private loadingSuccursales = new Set<string>();
  private loadingImpresoras = new Set<string>();
  
  // Modal de detalles de impresora
  impresora_seleccionada: Impresora | null = null;
  mostrar_modal_detalles: boolean = false;
  
  // NOTA: NO cachea sucursales/impresoras (solo página de clientes)
  // Esto reduce localStorage de MEGA BYTES a KILOBYTES

  constructor(
    private clienteService: ClienteService,
    private impresoraService: ImpresoraService,
    private indexedDbService: ClienteIndexedDbService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) { }
  
  ngOnInit(): void {
    // Validar que el usuario no cambió
    this.validateSessionUser();
    
    // Detectar cambio en clientesPerPage y limpiar caché si es necesario
    const savedClientesPerPage = localStorage.getItem('lastClientesPerPage');
    if (savedClientesPerPage && parseInt(savedClientesPerPage) !== this.clientesPerPage) {
      this.clearCache();
    }
    localStorage.setItem('lastClientesPerPage', this.clientesPerPage.toString());
    
    // Restaurar estado de expansión desde SessionStorage
    this.restoreExpandedNodesFromSession();
    this.loadClientes();
    
    // Scroll horizontal con Shift+scroll
    window.addEventListener('wheel', (event: WheelEvent) => {
      if (event.shiftKey && this.scrollContainer) {
        event.preventDefault();
        this.scrollContainer!.nativeElement.scrollLeft += event.deltaY > 0 ? 200 : -200;
      }
    }, { passive: false });
  }
  
  loadClientes(): void {
    // No usar caché cuando estamos buscando
    if (this.isSearching) {
      this.loadClientesFromServer();
      return;
    }

    // Intentar cargar desde caché primero
    try {
      const cacheData = this.getFromCache(this.currentPage);
      if (cacheData && cacheData.clientes && cacheData.clientes.length > 0) {
        this.clientes = cacheData.clientes;
        this.totalClientes = cacheData.totalClientes || 0;
        this.totalPages = cacheData.totalPages || 1;
        this.restoreClientesWithDataFromSession();
        return;
      }
    } catch (e) {
      console.warn('Cache load failed');
    }

    this.loadClientesFromServer();
  }

  private loadClientesFromServer(): void {
    if (this.isLoadingData) return;
    
    this.isLoadingData = true;
    this.loading = true;
    
    // Cargar con paginación de 50 clientes
    this.clienteService.getClientes(this.currentPage, this.clientesPerPage).subscribe({
      next: (response) => {
        if (response?.success && response?.data?.length > 0) {
          this.clientes = response.data;
          // Leer de pagination si existe
          this.totalClientes = response.pagination?.total || response.total || response.data.length;
          this.totalPages = response.pagination?.last_page || response.last_page || 
            Math.ceil(this.totalClientes / this.clientesPerPage);
          
          // Guardar en caché LRU
          this.saveToCache(this.currentPage, this.clientes, {
            totalClientes: this.totalClientes,
            totalPages: this.totalPages
          });
          
          // Guardar en IndexedDB para búsqueda rápida
          this.indexedDbService.guardarClientes(this.clientes).then(() => {
            this.restoreClientesWithDataFromSession();
            this.cdr.detectChanges();
          });
        } else {
          this.clientes = [];
          this.totalClientes = 0;
          this.totalPages = 1;
        }
        this.loading = false;
        this.isLoadingData = false;
      },
      error: (error) => {
        console.error('Load clientes failed:', error);
        this.loading = false;
        this.isLoadingData = false;
      }
    });
  }

  private saveToCache(page: number, data: Cliente[], pagination: { totalClientes: number; totalPages: number }): void {
    try {
      const cacheKey = `clientesPage_${page}`;
      const cacheData = {
        clientes: data,
        totalClientes: pagination.totalClientes,
        totalPages: pagination.totalPages,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Rastrear orden de acceso para LRU
      if (!this.pageCacheKeys.includes(cacheKey)) {
        this.pageCacheKeys.push(cacheKey);
      } else {
        this.pageCacheKeys = this.pageCacheKeys.filter(k => k !== cacheKey);
        this.pageCacheKeys.push(cacheKey);
      }
      
      // Si excede máximo, borrar la más antigua
      if (this.pageCacheKeys.length > this.MAX_CACHED_PAGES) {
        const oldestKey = this.pageCacheKeys.shift();
        if (oldestKey) localStorage.removeItem(oldestKey);
      }
    } catch (error) {
      console.warn('Cache save failed');
    }
  }

  private getFromCache(page: number): { clientes: Cliente[]; totalClientes: number; totalPages: number } | null {
    try {
      // Validar que el usuario no ha cambiado
      if (!this.isValidSessionUser()) {
        console.log('Session user changed, invalidating cache');
        this.clearCache();
        return null;
      }

      const cacheKey = `clientesPage_${page}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const expiryTime = this.CACHE_EXPIRY_MINUTES * 60 * 1000;

      // Verificar si el caché ha expirado
      if (Date.now() - cacheData.timestamp > expiryTime) {
        localStorage.removeItem(cacheKey);
        this.pageCacheKeys = this.pageCacheKeys.filter(k => k !== cacheKey);
        return null;
      }

      // Marcar como recientemente usado (para LRU)
      if (this.pageCacheKeys.includes(cacheKey)) {
        this.pageCacheKeys = this.pageCacheKeys.filter(k => k !== cacheKey);
        this.pageCacheKeys.push(cacheKey);
      }

      return {
        clientes: cacheData.clientes || [],
        totalClientes: cacheData.totalClientes || 0,
        totalPages: cacheData.totalPages || 1
      };
    } catch (error) {
      console.warn('Cache read failed');
      return null;
    }
  }

  /**
   * Validar que el usuario actual es el mismo que cuando se cachó
   */
  private isValidSessionUser(): boolean {
    try {
      const currentUserId = localStorage.getItem('idUser') || localStorage.getItem('id_user');
      const cachedUserId = localStorage.getItem(this.CURRENT_USER_SESSION_KEY);
      
      // Si no hay usuario actual, es inválido
      if (!currentUserId) {
        return false;
      }
      
      // Si no hay usuario cacheado, cachearlo ahora
      if (!cachedUserId) {
        localStorage.setItem(this.CURRENT_USER_SESSION_KEY, currentUserId);
        return true;
      }
      
      // Comparar usuarios
      const isValid = currentUserId === cachedUserId;
      return isValid;
    } catch (error) {
      console.warn('Error validating session user:', error);
      return false;
    }
  }

  /**
   * Validar la sesión del usuario al iniciar el componente
   */
  private validateSessionUser(): void {
    try {
      const currentUserId = localStorage.getItem('idUser') || localStorage.getItem('id_user');
      const cachedUserId = localStorage.getItem(this.CURRENT_USER_SESSION_KEY);
      
      // Si cambió de usuario, limpiar todo
      if (cachedUserId && currentUserId && cachedUserId !== currentUserId) {
        console.log('User changed, clearing all caches');
        this.clearCache();
        this.clearExpandedNodesSession();
        // Limpiar IndexedDB
        this.indexedDbService.limpiarBaseDatos().catch(err => {
          console.warn('IndexedDB clear on user change failed:', err);
        });
      }
      
      // Actualizar usuario actual en caché
      if (currentUserId) {
        localStorage.setItem(this.CURRENT_USER_SESSION_KEY, currentUserId);
        // Actualizar metadatos en IndexedDB también
        this.indexedDbService.actualizarSessionMetadata(currentUserId).catch(err => {
          console.warn('Error updating session metadata in IndexedDB:', err);
        });
      }
    } catch (error) {
      console.warn('Error validating session:', error);
    }
  }

  /**
   * Validar que los datos de IndexedDB sean de la sesión actual
   */
  private async validarIndexedDbSession(): Promise<boolean> {
    try {
      const currentUserId = localStorage.getItem('idUser') || localStorage.getItem('id_user');
      if (!currentUserId) {
        return false;
      }
      
      const isValid = await this.indexedDbService.validarSessionActual(currentUserId);
      return isValid;
    } catch (error) {
      console.warn('Error validating IndexedDB session:', error);
      return false;
    }
  }

  private clearCache(): void {
    try {
      this.pageCacheKeys.forEach(key => localStorage.removeItem(key));
      this.pageCacheKeys = [];
    } catch (error) {
      console.warn('Cache clear failed');
    }
  }

  private getSucursalesEnCache(clienteRut: string): Sucursal[] | null {
    // No cacheamos sucursales - siempre null
    return null;
  }

  private async cargarImpresiorasDelaSucursal(cliente: Cliente, sucursalIndex: number, nodeId: string): Promise<void> {
    const sucursal = cliente.sucursales![sucursalIndex];
    // Convertir a número para usar como clave consistente
    const sucursalId = typeof sucursal.id === 'string' ? parseInt(sucursal.id) : sucursal.id || 0;
    const loadingKey = `sucursal_${sucursalId}`;
    
    // Prevenir cargas simultáneas
    if (this.loadingImpresoras.has(loadingKey) || !sucursalId) return;
    
    this.loadingImpresoras.add(loadingKey);
    
    try {
      // Validar que la sesión en IndexedDB sea la actual
      const isValidSession = await this.validarIndexedDbSession();
      
      // Intentar desde IndexedDB primero (solo si la sesión es válida)
      if (isValidSession) {
        const impresiorasIndexedDb = await this.indexedDbService.obtenerImpresiorasDelaSucursal(sucursalId);
        
        if (impresiorasIndexedDb?.length > 0) {
          sucursal.impresoras = impresiorasIndexedDb.map((imp: any) => ({
            ...imp,
            sucursal_nombre: sucursal.name || `Sucursal ${sucursalId}`
          })) as Impresora[];
          this.loadingNodes[nodeId] = false;
          this.cdr.detectChanges();
          return;
        }
      }
      
      // Si no está en IndexedDB o sesión inválida, obtener del servidor
      const clientCode = cliente.code || cliente.rut;
      const impresiorasResponse = await this.impresoraService
        .getImpresoras(clientCode, sucursalId)
        .toPromise();
      
      if (impresiorasResponse?.data?.length > 0) {
        // Mapear respuesta a impresoras
        sucursal.impresoras = impresiorasResponse.data.map((imp: any) => ({
          id: imp.id,
          nombre: imp.nombre,
          descripcion: imp.descripcion,
          ubicacion: imp.ubicacion,
          modelo: imp.modelo,
          serie: imp.serie,
          ip: imp.ip,
          estado: imp.estado,
          cod_clie: imp.cod_clie,
          paginasImpresas: imp.paginasImpresas,
          paginasBN: imp.paginasBN,
          paginasColor: imp.paginasColor,
          tonerBlack: imp.tonerBlack,
          tonerCyan: imp.tonerCyan,
          tonerMagenta: imp.tonerMagenta,
          tonerYellow: imp.tonerYellow,
          drumBlack: imp.drumBlack,
          drumCyan: imp.drumCyan,
          drumMagenta: imp.drumMagenta,
          drumYellow: imp.drumYellow,
          reveladorBlack: imp.reveladorBlack,
          reveladorMagenta: imp.reveladorMagenta,
          reveladorYellow: imp.reveladorYellow,
          fusor: imp.fusor,
          adfRoller: imp.adfRoller,
          transferRoller: imp.transferRoller,
          mpRoller: imp.mpRoller,
          retardPad: imp.retardPad,
          cajaResiduos: imp.cajaResiduos,
          sucursal_nombre: sucursal.name || `Sucursal ${sucursalId}`
        } as Impresora));
        
        // Guardar en IndexedDB para próximas veces
        await this.indexedDbService.guardarImpresoras(sucursalId, impresiorasResponse.data);
        this.saveClientesWithDataToSession();
        this.loadingNodes[nodeId] = false;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error(`Error loading printers for sucursal ${sucursalId}:`, error);
      this.loadingNodes[nodeId] = false;
      this.cdr.detectChanges();
    } finally {
      this.loadingImpresoras.delete(loadingKey);
    }
  }

  toggleNode(nodeId: string): void {
    this.expandedNodes[nodeId] = !this.expandedNodes[nodeId];
    this.saveExpandedNodesToSession();
    this.cdr.detectChanges();
    
    // Si se está colapsando, limpiar estado de carga
    if (!this.expandedNodes[nodeId]) {
      if (this.loadingNodes[nodeId]) {
        delete this.loadingNodes[nodeId];
      }
      return;
    }
    
    // Si es un cliente y se abre, cargar sucursales on-demand
    if (nodeId.startsWith('cliente_')) {
      const clienteRut = nodeId.replace('cliente_', '');
      const cliente = this.clientes.find(c => c.rut === clienteRut);
      if (cliente && this.expandedNodes[nodeId]) {
        // Si ya tiene datos, solo actualizar UI
        if (cliente.sucursales && cliente.sucursales.length > 0) {
          if (this.loadingNodes[nodeId]) {
            delete this.loadingNodes[nodeId];
            this.cdr.detectChanges();
          }
          return;
        }
        // Si no tiene datos, cargar
        if (!this.loadingNodes[nodeId]) {
          this.loadingNodes[nodeId] = true;
          this.cdr.detectChanges();
          this.cargarSucursalesOnDemand(cliente, nodeId);
        }
      }
    } 
    // Si es una sucursal y se abre, cargar impresoras on-demand
    // Formato: sucursal_{clientCode}_{sucursalId}
    else if (nodeId.startsWith('sucursal_')) {
      const parts = nodeId.split('_');
      // parts = ['sucursal', clientCode, sucursalId]
      if (parts.length >= 3) {
        const clientCode = parts[1];
        const sucursalIdStr = parts[parts.length - 1];
        
        const cliente = this.clientes.find(c => c.code === clientCode || c.rut === clientCode);
        if (cliente && cliente.sucursales && this.expandedNodes[nodeId]) {
          const sucursal = cliente.sucursales.find(s => String(s.id) === sucursalIdStr);
          if (sucursal) {
            // Si ya tiene impresoras, solo actualizar UI
            if (sucursal.impresoras && sucursal.impresoras.length > 0) {
              if (this.loadingNodes[nodeId]) {
                delete this.loadingNodes[nodeId];
                this.cdr.detectChanges();
              }
              return;
            }
            // Si no tiene impresoras, cargar
            if (!this.loadingNodes[nodeId]) {
              const idx = cliente.sucursales.indexOf(sucursal);
              if (idx >= 0) {
                this.loadingNodes[nodeId] = true;
                this.cdr.detectChanges();
                this.cargarImpresiorasDelaSucursal(cliente, idx, nodeId);
              }
            }
            return;
          }
        }
      }
    }
  }

  private async cargarSucursalesOnDemand(cliente: Cliente, nodeId: string): Promise<void> {
    const loadingKey = `cliente_${cliente.rut}`;
    if (this.loadingSuccursales.has(loadingKey)) return;
    
    this.loadingSuccursales.add(loadingKey);
    
    try {
      // Validar que la sesión en IndexedDB sea la actual
      const isValidSession = await this.validarIndexedDbSession();
      
      // Intentar desde IndexedDB primero (solo si la sesión es válida)
      if (isValidSession) {
        const sucursalesIndexedDb = await this.indexedDbService.obtenerSucursalesDelCliente(cliente.rut);
        
        if (sucursalesIndexedDb?.length > 0) {
          cliente.sucursales = sucursalesIndexedDb as unknown as Sucursal[];
          (cliente.sucursales ?? []).forEach(s => { if (!s.impresoras) s.impresoras = undefined; });
          this.saveClientesWithDataToSession();
          this.loadingNodes[nodeId] = false;
          this.cdr.detectChanges();
          return;
        }
      }
      
      // Si no está en IndexedDB o sesión inválida, obtener del servidor
      const sucursales = await this.clienteService.getSucursales(cliente.code).toPromise();
      
      if (sucursales && sucursales.length > 0) {
        cliente.sucursales = sucursales;
        (cliente.sucursales ?? []).forEach(s => { if (!s.impresoras) s.impresoras = undefined; });
        
        // Guardar en IndexedDB para próximas veces
        await this.indexedDbService.guardarSucursales(cliente.rut, sucursales as any[]);
        
        this.saveClientesWithDataToSession();
        this.loadingNodes[nodeId] = false;
        this.cdr.detectChanges();
      } else {
        cliente.sucursales = [];
        this.loadingNodes[nodeId] = false;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error(`Error loading sucursales for ${cliente.rut}:`, error);
      this.loadingNodes[nodeId] = false;
      this.cdr.detectChanges();
    } finally {
      this.loadingSuccursales.delete(loadingKey);
    }
  }
  
  onBuscarRealtime(): void {
    clearTimeout(this.buscarTimeout);
    this.currentPage = 1;
    this.buscarTimeout = setTimeout(() => {
      const termino = this.busqueda.trim().toLowerCase();
      if (!termino) {
        this.isSearching = false;
        this.loadClientes();
        return;
      }
      
      this.isSearching = true;
      this.loading = true;
      
      // Usar búsqueda unificada
      const searchTerm = this.busqueda.trim();
      
      this.clienteService.searchClientes(searchTerm, this.currentPage, this.clientesPerPage).subscribe({
        next: (response) => {
          if (response.data) {
            this.clientes = response.data;
            // Leer de pagination si existe
            this.totalClientes = response.pagination?.total || response.total || response.data.length;
            this.totalPages = response.pagination?.last_page || response.last_page || 
              Math.ceil(this.totalClientes / this.clientesPerPage);
            this.cdr.markForCheck();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Search error:', error);
          this.loading = false;
        }
      });
    }, 350);
  }

  onLimpiarBusqueda(): void {
    this.busqueda = '';
    this.isSearching = false;
    this.isLoadingData = false;
    this.currentPage = 1;
    this.loadClientes();
  }

  forzarRecarga(): void {
    // Limpiar caché localStorage
    this.clearCache();
    // Limpiar estado expandido
    this.expandedNodes = {};
    this.clearExpandedNodesSession();
    // Resetear paginación y búsqueda
    this.currentPage = 1;
    this.isSearching = false;
    this.busqueda = '';
    
    // Limpiar IndexedDB en background
    this.indexedDbService.limpiarBaseDatos().catch(err => {
      console.warn('IndexedDB clear failed:', err);
    });
    
    this.loading = true;
    this.cdr.markForCheck();
    this.loadClientes();
  }

  // Navegar a página anterior
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.expandedNodes = {};
      this.clearExpandedNodesSession();
      this.isSearching && this.busqueda ? this.onBuscarRealtime() : this.loadClientes();
    }
  }

  // Navegar a página siguiente
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.expandedNodes = {};
      this.clearExpandedNodesSession();
      this.isSearching && this.busqueda ? this.onBuscarRealtime() : this.loadClientes();
    }
  }

  // Ir a página específica
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.expandedNodes = {};
      this.clearExpandedNodesSession();
      this.isSearching && this.busqueda ? this.onBuscarRealtime() : this.loadClientes();
    }
  }

  getRandomProgress(): number {
    return Math.floor(Math.random() * 100);
  }

  // Abrir modal de especificaciones de impresora
  openPrinterModal(impresora: any, event: Event): void {
    event.stopPropagation();
    alert(`🖨️ PRINTER: ${impresora.nombre || 'N/A'}\n🌐 IP: ${impresora.ip || 'N/A'}`);
  }

  onTableScroll(event: Event): void {
    // Scroll handler - browser handles natively
  }

  onTopScroll(event: Event): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollLeft = (event.target as HTMLElement).scrollLeft;
    }
  }

  private saveExpandedNodesToSession(): void {
    // Throttle para evitar guardados repetidos
    clearTimeout(this.sessionStorageSaveTimeout);
    this.sessionStorageSaveTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(this.EXPANDED_NODES_SESSION_KEY, JSON.stringify(this.expandedNodes));
        this.saveClientesWithDataToSession();
      } catch (error) {
        console.warn('SessionStorage save failed:', error);
      }
    }, this.SESSION_SAVE_THROTTLE_MS);
  }

  private saveClientesWithDataToSession(): void {
    // Guardar clientes que tienen sucursales cargadas
    try {
      const clientesConDatos = this.clientes.filter(c => c.sucursales?.length);
      sessionStorage.setItem(this.CLIENTES_WITH_DATA_SESSION_KEY, JSON.stringify(clientesConDatos));
    } catch (error) {
      console.warn('Save clientes to session failed:', error);
    }
  }

  private restoreExpandedNodesFromSession(): void {
    // Restaurar estado de expansión desde sesión anterior
    try {
      const savedState = sessionStorage.getItem(this.EXPANDED_NODES_SESSION_KEY);
      if (savedState) {
        this.expandedNodes = JSON.parse(savedState);
      }
    } catch (error) {
      console.warn('Restore from session failed:', error);
      this.expandedNodes = {};
    }
  }

  private restoreClientesWithDataFromSession(): void {
    // Fusionar datos de clientes con sucursales desde sesión anterior
    try {
      const savedClientesWithData = sessionStorage.getItem(this.CLIENTES_WITH_DATA_SESSION_KEY);
      if (savedClientesWithData) {
        const clientesConDatos: Cliente[] = JSON.parse(savedClientesWithData);
        clientesConDatos.forEach(clienteConDatos => {
          const cliente = this.clientes.find(c => c.rut === clienteConDatos.rut);
          if (cliente && clienteConDatos.sucursales) {
            cliente.sucursales = clienteConDatos.sucursales;
          }
        });
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.warn('Restore clientes from session failed:', error);
    }
  }

  private clearExpandedNodesSession(): void {
    sessionStorage.removeItem(this.EXPANDED_NODES_SESSION_KEY);
  }

  trackByClienteRut(index: number, cliente: Cliente): string | null {
    return cliente.rut || null;
  }

  trackBySucursalId(index: number, sucursal: Sucursal): string | number | null {
    return sucursal.id || null;
  }

  trackByImpresoraId(index: number, impresora: Impresora): number | string | null {
    return impresora.id || impresora.serie || null;
  }

  abrirDetalles(impresora: Impresora): void {
    this.impresora_seleccionada = impresora;
    this.mostrar_modal_detalles = true;
  }

  cerrarDetalles(): void {
    this.mostrar_modal_detalles = false;
    this.impresora_seleccionada = null;
  }
}