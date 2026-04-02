import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { ClienteService } from '../../../../../core/services/cliente.service';
import { ImpresoraService } from '../../../../../core/services/impresora.service';
import { SucursalService } from '../../../../../core/services/sucursal.service';
import { ClienteSelectorComponent, ClienteOption } from '../../../../../shared/equipos/cliente-selector/cliente-selector.component';
import { ImpresoraFormInlineComponent, ImpresoraCreatePayload } from '../../../../../shared/equipos/impresora-form-inline/impresora-form-inline.component';

interface ImpresoraRow {
  id: number;
  clientCode: string;
  clientName: string;
  ip: string;
  serie: string;
  modelo: string;
  sucursal_nombre: string;
  estadoConexion: 'online' | 'warning' | 'offline';
  estado: number;
  last_seen_at: string | null;
  togglingEstado: boolean;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-impresoras-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ClienteSelectorComponent, ImpresoraFormInlineComponent],
  templateUrl: './impresoras-config.component.html',
  styleUrls: ['./impresoras-config.component.scss']
})
export class ImpresorasConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(ImpresoraFormInlineComponent) formInline!: ImpresoraFormInlineComponent;

  clientes: ClienteOption[] = [];
  impresorasRaw: ImpresoraRow[] = [];
  impresorasFiltradas: ImpresoraRow[] = [];
  impresorasPaginadas: ImpresoraRow[] = [];

  filterClientCode = '';
  searchQuery = '';
  loading = true;
  creating = false;

  vistaActual: 'tabla' | 'crear' = 'tabla';

  formSucursales: any[] = [];
  formError = '';
  formSuccess = false;

  toast: Toast | null = null;

  currentPage = 1;
  pageSize = 15;
  totalImpresoras = 0;

  constructor(
    private clienteService: ClienteService,
    private impresoraService: ImpresoraService,
    private sucursalService: SucursalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.loading = true;
    forkJoin({
      clientes: this.clienteService.getClientes(1, 200),
      impresoras: this.impresoraService.getAll()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ clientes, impresoras }) => {
        const clientList = (clientes as any)?.data ?? (clientes as any)?.clients ?? [];
        this.clientes = clientList.map((c: any) => ({
          code: c.code || c.rut,
          nombre: c.nombre || c.razon_social || c.rut,
          rut: c.rut,
          razon_social: c.razon_social
        }));

        this.impresorasRaw = (impresoras as any[]).map((imp: any) => ({
          id: imp.id,
          clientCode: imp.cod_clie || '',
          clientName: this.clientes.find(c => c.code === imp.cod_clie)?.nombre || imp.cod_clie || '—',
          ip: imp.ip || '—',
          serie: imp.serie || '',
          modelo: imp.modelo || '—',
          sucursal_nombre: imp.sucursal_nombre || '—',
          estadoConexion: imp.estadoConexion || this.calcularEstadoConexion(imp.last_seen_at),
          estado: imp.estado ?? 1,
          last_seen_at: imp.last_seen_at || null,
          togglingEstado: false
        }));

        this.aplicarFiltros();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private calcularEstadoConexion(lastSeen: string | null): 'online' | 'warning' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60000;
    if (diffMin < 10) return 'online';
    if (diffMin < 60) return 'warning';
    return 'offline';
  }

  onFilterClientChange(code: string): void {
    this.filterClientCode = code;
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let rows = [...this.impresorasRaw];

    if (this.filterClientCode) {
      rows = rows.filter(r => r.clientCode === this.filterClientCode);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      rows = rows.filter(r =>
        r.ip.toLowerCase().includes(q) ||
        r.serie.toLowerCase().includes(q) ||
        r.modelo.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.clientCode.toLowerCase().includes(q) ||
        r.sucursal_nombre.toLowerCase().includes(q)
      );
    }

    this.totalImpresoras = rows.length;
    this.impresorasFiltradas = rows;
    this.actualizarPaginacion();
  }

  private actualizarPaginacion(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.impresorasPaginadas = this.impresorasFiltradas.slice(start, start + this.pageSize);
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPaginas) return;
    this.currentPage = page;
    this.actualizarPaginacion();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalImpresoras / this.pageSize));
  }

  get paginas(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPaginas; i++) pages.push(i);
    return pages;
  }

  get paginaInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalImpresoras);
    return `${start} - ${end} de ${this.totalImpresoras}`;
  }

  irACrear(): void {
    this.vistaActual = 'crear';
    this.formError = '';
    this.formSuccess = false;
    this.formSucursales = [];
    if (this.formInline) {
      this.formInline.reset();
    }
  }

  irATabla(): void {
    this.vistaActual = 'tabla';
    this.formError = '';
    this.formSuccess = false;
  }

  onFormClientSelected(code: string): void {
    this.formSucursales = [];
    this.sucursalService.getByClientCode(code).pipe(takeUntil(this.destroy$)).subscribe({
      next: (sucursales) => {
        this.formSucursales = sucursales;
        this.cdr.markForCheck();
      },
      error: () => {
        this.formSucursales = [];
        this.cdr.markForCheck();
      }
    });
  }

  onFormSubmit(payload: ImpresoraCreatePayload): void {
    this.creating = true;
    this.formError = '';

    const body = {
      ip: payload.ip,
      serie: payload.serie,
      modelo: payload.modelo,
      nombre: payload.nombre,
      monitoreada: true,
      estado_conexion: 'offline'
    };

    this.impresoraService.crearManual(payload.clientCode, payload.sucursalId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.creating = false;
          this.formSuccess = true;
          this.cargarDatos();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.creating = false;
          this.formError = err.error?.message || err.error?.error || 'Error al agregar la impresora.';
          this.cdr.markForCheck();
        }
      });
  }

  onFormCancel(): void {
    this.irATabla();
  }

  onToggleMonitoreo(row: ImpresoraRow, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const newEstado = checked ? 1 : 0;

    if (!row.serie) {
      (event.target as HTMLInputElement).checked = !checked;
      this.showToast('No se puede cambiar el estado: esta impresora no tiene serie registrada.', 'error');
      return;
    }

    row.togglingEstado = true;
    this.impresoraService.updateEstado(row.clientCode, row.serie, newEstado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          row.estado = newEstado;
          row.togglingEstado = false;
          this.showToast(
            checked ? 'Monitoreo activado correctamente.' : 'Monitoreo desactivado.',
            'success'
          );
          this.cdr.markForCheck();
        },
        error: () => {
          row.togglingEstado = false;
          (event.target as HTMLInputElement).checked = !checked;
          this.showToast('Error al actualizar el estado de monitoreo.', 'error');
          this.cdr.markForCheck();
        }
      });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => {
      this.toast = null;
      this.cdr.markForCheck();
    }, 3500);
  }

  getEstadoRedClass(row: ImpresoraRow): string {
    switch (row.estadoConexion) {
      case 'online': return 'bg-success-subtle text-success border border-success';
      case 'warning': return 'bg-warning-subtle text-warning border border-warning';
      default: return 'bg-secondary-subtle text-secondary';
    }
  }

  getEstadoRedLabel(row: ImpresoraRow): string {
    switch (row.estadoConexion) {
      case 'online': return 'Online';
      case 'warning': return 'Warning';
      default: return 'Offline';
    }
  }

  getEstadoRedIcon(row: ImpresoraRow): string {
    switch (row.estadoConexion) {
      case 'online': return 'fa-circle text-success';
      case 'warning': return 'fa-exclamation-circle';
      default: return 'fa-circle text-secondary';
    }
  }
}
