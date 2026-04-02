import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';

import { ClienteService } from '../../../../../core/services/cliente.service';
import { ClienteSelectorComponent, ClienteOption } from '../../../../../shared/equipos/cliente-selector/cliente-selector.component';
import { AgenteFormInlineComponent, AgenteCreatePayload } from '../../../../../shared/equipos/agente-form-inline/agente-form-inline.component';
import { AgentConfigFormComponent } from '../../../../../shared/agent-config-form/agent-config-form.component';
import { AgentConfig } from '../../../../../models/agent-config';
import { AgentService } from '../../../../../core/services/agent.service';

interface AgenteRow {
  id: number;
  name: string;
  clientCode: string;
  clientName: string;
  sucursal: { nombre: string; comuna: string; region: string } | null;
  masked_key: string;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-agentes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, ClienteSelectorComponent, AgenteFormInlineComponent, AgentConfigFormComponent],
  templateUrl: './agentes.component.html',
  styleUrls: ['./agentes.component.scss']
})
export class AgentesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(AgenteFormInlineComponent) formInline!: AgenteFormInlineComponent;

  clientes: ClienteOption[] = [];
  listaClientes: ClienteOption[] = [];
  agentesRaw: { clientCode: string; agentes: any[] }[] = [];
  agentesFiltrados: AgenteRow[] = [];
  agentesPaginados: AgenteRow[] = [];

  filterClientCode = '';
  searchQuery = '';
  loading = true;
  creating = false;

  vistaActual: 'tabla' | 'crear' | 'configurar' = 'tabla';
  agenteSeleccionado: AgenteRow | null = null;

  modalLocations: any[] = [];
  configData: AgentConfig | null = null;
  configLoading = false;
  configSaving = false;
  configMessage = '';
  configMessageType: 'success' | 'error' | '' = '';

  successKey: string | null = null;
  formError = '';

  // --- Modal de confirmación ---
  modalVisible = false;
  modalAccion: 'revocar' | 'reactivar' = 'revocar';
  modalAgenteTarget: AgenteRow | null = null;
  modalCheckboxTarget: HTMLInputElement | null = null;
  modalProcessing = false;

  currentPage = 1;
  pageSize = 15;
  totalAgentes = 0;

  constructor(
    private clienteService: ClienteService,
    private agentService: AgentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(1, 200).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const clients = res?.data ?? res?.clients ?? [];
        this.listaClientes = clients.map((c: any) => ({
          code: c.code || c.rut,
          nombre: c.nombre || c.razon_social || c.rut,
          rut: c.rut,
          razon_social: c.razon_social
        }));
        this.clientes = [...this.listaClientes];
        this.cargarTodosLosAgentes();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  cargarTodosLosAgentes(): void {
    if (this.clientes.length === 0) {
      this.loading = false;
      return;
    }

    const requests = this.clientes.map(c => this.clienteService.getAgentKeys(c.code));

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe({
      next: (responses) => {
        this.agentesRaw = [];
        responses.forEach((resp: any, i) => {
          const agentes = resp?.agent_keys ?? resp?.data ?? [];
          if (agentes.length > 0) {
            this.agentesRaw.push({ clientCode: this.clientes[i].code, agentes });
          }
        });
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onFilterClientChange(code: string): void {
    this.filterClientCode = code;
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  cargarLocationsParaCliente(code: string): void {
    if (!code) {
      this.modalLocations = [];
      return;
    }
    this.modalLocations = [];
    this.clienteService.getLocations(code).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.modalLocations = [...data];
        } else if (data?.locations && Array.isArray(data.locations)) {
          this.modalLocations = [...data.locations];
        } else if (data?.data && Array.isArray(data.data)) {
          this.modalLocations = [...data.data];
        } else if (data?.sucursales && Array.isArray(data.sucursales)) {
          this.modalLocations = [...data.sucursales];
        } else {
          this.modalLocations = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLocations = [];
        this.cdr.markForCheck();
      }
    });
  }

  private aplicarFiltros(): void {
    let rows: AgenteRow[] = [];

    this.agentesRaw.forEach(group => {
      if (this.filterClientCode && group.clientCode !== this.filterClientCode) return;
      group.agentes.forEach(a => {
        rows.push({
          id: a.id,
          name: a.name,
          clientCode: group.clientCode,
          clientName: this.clientes.find(c => c.code === group.clientCode)?.nombre || group.clientCode,
          sucursal: a.sucursal || null,
          masked_key: a.masked_key || '•••••••••••••••',
          active: a.active,
          last_seen_at: a.last_seen_at || null,
          created_at: a.created_at
        });
      });
    });

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      rows = rows.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.clientCode.toLowerCase().includes(q) ||
        a.masked_key.toLowerCase().includes(q) ||
        (a.sucursal?.nombre && a.sucursal.nombre.toLowerCase().includes(q))
      );
    }

    this.totalAgentes = rows.length;
    this.agentesFiltrados = rows;
    this.actualizarPaginacion();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  private actualizarPaginacion(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.agentesPaginados = this.agentesFiltrados.slice(start, start + this.pageSize);
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPaginas) return;
    this.currentPage = page;
    this.actualizarPaginacion();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalAgentes / this.pageSize));
  }

  get paginas(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPaginas; i++) pages.push(i);
    return pages;
  }

  get paginaInfo(): string {
    const end = Math.min(this.currentPage * this.pageSize, this.totalAgentes);
    return `${(this.currentPage - 1) * this.pageSize + 1} - ${end} de ${this.totalAgentes}`;
  }

  irACrear(): void {
    this.vistaActual = 'crear';
    this.successKey = null;
    this.formError = '';
    if (this.formInline) this.formInline.reset();
  }

  irATabla(): void {
    this.vistaActual = 'tabla';
    this.agenteSeleccionado = null;
    this.successKey = null;
    this.formError = '';
  }

  irAConfigurar(agente: AgenteRow): void {
    this.agenteSeleccionado = agente;
    this.vistaActual = 'configurar';
    this.configMessage = '';
    this.configMessageType = '';
    this.cargarConfiguracion(agente.clientCode, agente.id);
  }

  cargarConfiguracion(clientCode: string, agentKeyId: number): void {
    this.configLoading = true;
    this.agentService.getConfig(clientCode, agentKeyId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.configData = data;
        this.configLoading = false;
      },
      error: (err) => {
        this.configMessage = err.error?.message || 'Error al cargar la configuración.';
        this.configMessageType = 'error';
        this.configLoading = false;
      }
    });
  }

  onFormSubmit(payload: AgenteCreatePayload): void {
    this.creating = true;
    this.formError = '';
    this.successKey = null;
    this.clienteService.createAgentKey(payload.clientCode, payload as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.creating = false;
        this.successKey = res.agent_key?.key ?? res.key ?? '';
        this.cargarTodosLosAgentes();
        if (this.formInline) this.formInline.reset();
      },
      error: (err) => {
        this.creating = false;
        this.formError = err.error?.message || err.error?.error || 'Error al crear el agente.';
      }
    });
  }

  onFormCancel(): void {
    this.irATabla();
  }

  onFormClientSelected(code: string): void {
    this.cargarLocationsParaCliente(code);
  }

  onSaveConfig(datos: AgentConfig): void {
    if (!this.agenteSeleccionado) return;
    this.configSaving = true;
    this.configMessage = '';
    this.configMessageType = '';

    const payload: AgentConfig = { ...datos, agent_key_id: this.agenteSeleccionado.id };

    this.agentService.saveConfig(this.agenteSeleccionado.clientCode, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.configMessage = 'Configuración actualizada correctamente.';
        this.configMessageType = 'success';
        this.configSaving = false;
        setTimeout(() => { this.configMessage = ''; this.configMessageType = ''; }, 3000);
      },
      error: (err) => {
        this.configMessage = err.error?.message || 'Error al guardar los cambios.';
        this.configMessageType = 'error';
        this.configSaving = false;
      }
    });
  }

  onToggleActive(agente: AgenteRow, event: Event): void {
    event.preventDefault();
    const checkbox = event.target as HTMLInputElement;
    if (!checkbox.checked) {
      this.modalAccion = 'revocar';
      this.modalAgenteTarget = agente;
      this.modalCheckboxTarget = checkbox;
      this.modalVisible = true;
    } else {
      this.modalAccion = 'reactivar';
      this.modalAgenteTarget = agente;
      this.modalCheckboxTarget = checkbox;
      this.modalVisible = true;
    }
  }

  onRevokeAgente(agente: AgenteRow): void {
    this.modalAccion = 'revocar';
    this.modalAgenteTarget = agente;
    this.modalCheckboxTarget = null;
    this.modalVisible = true;
  }

  confirmarAccion(): void {
    if (!this.modalAgenteTarget) return;
    this.modalProcessing = true;

    const agente = this.modalAgenteTarget;

    if (this.modalAccion === 'reactivar') {
      this.clienteService.reactivateAgentKey(agente.clientCode, agente.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            agente.active = true;
            this.cerrarModal();
          },
          error: () => {
            if (this.modalCheckboxTarget) {
              this.modalCheckboxTarget.checked = false;
            }
            this.cerrarModal();
          }
        });
    } else {
      this.clienteService.revokeAgentKey(agente.clientCode, agente.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            agente.active = false;
            this.cerrarModal();
          },
          error: () => {
            if (this.modalCheckboxTarget) {
              this.modalCheckboxTarget.checked = true;
            }
            this.cerrarModal();
          }
        });
    }
  }

  cancelarAccion(): void {
    if (this.modalCheckboxTarget && this.modalAgenteTarget) {
      this.modalCheckboxTarget.checked = this.modalAgenteTarget.active;
    }
    this.cerrarModal();
  }

  private cerrarModal(): void {
    this.modalVisible = false;
    this.modalProcessing = false;
    this.modalAgenteTarget = null;
    this.modalCheckboxTarget = null;
  }

  getEstadoLabel(agente: AgenteRow): string {
    if (!agente.active) return 'INACTIVO';
    if (!agente.last_seen_at) return 'PENDIENTE';
    const diffMinutos = (Date.now() - new Date(agente.last_seen_at).getTime()) / 60000;
    return diffMinutos < 10 ? 'CONECTADO' : 'OFFLINE';
  }

  getEstadoClass(agente: AgenteRow): string {
    switch (this.getEstadoLabel(agente)) {
      case 'CONECTADO': return 'bg-success-subtle text-success border border-success fw-bold';
      case 'OFFLINE':   return 'bg-secondary-subtle text-secondary';
      case 'PENDIENTE': return 'bg-warning-subtle text-warning border border-warning';
      case 'INACTIVO':  return 'bg-danger-subtle text-danger border border-danger';
      default:          return 'bg-secondary-subtle text-secondary';
    }
  }
}
