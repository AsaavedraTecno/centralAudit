import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../../../../core/services/cliente.service';
import { CHILE_DATA } from '../../../../../../app/data/chile-data';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-listar-agentes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgSelectModule],
  templateUrl: './listar-agentes.html',
  styleUrls: ['./listar-agentes.scss']
})
export class ListarAgentesComponent implements OnInit {

  clientCode = '';
  agentes: any[] = [];
  locations: any[] = [];
  loading = true;

  // Regiones y comunas de chile-data
  regionesChile: any[] = [];
  comunasDisponibles: string[] = [];

  // --- Modal Crear Agente ---
  showCreateModal = false;
  creatingKey = false;
  intentoGuardar = false;

  // Modo sucursal: 'existing' | 'new'
  sucursalMode: 'existing' | 'new' = 'existing';

  form = {
    // Identidad
    name: '',

    // Sucursal existente
    location_id: null as number | null,

    // Nueva sucursal
    sucursal_nombre: '',
    sucursal_region: '',
    sucursal_comuna: '',
    sucursal_direccion: '',
    sucursal_nombre_contacto: '',
    sucursal_email_contacto: '',
    sucursal_telefono_contacto: '',

    // Red
    snmp_community: 'public',
    ip_from: '',
    ip_to: '',
    subnet_mask: '255.255.255.0',
  };

  formError = '';

  // --- Modal Key generada (solo una vez) ---
  showNewKeyModal = false;
  newKeyPlaintext = '';
  newKeyCopied = false;

  // --- Modal Revocar ---
  showRevokeModal = false;
  revokeTarget: any = null;
  revokingKey = false;

  constructor(
    private route: ActivatedRoute,
    private clienteService: ClienteService
  ) {
    // Cargar regiones de chile-data
    this.regionesChile = CHILE_DATA.regiones;
  }

  ngOnInit() {
    this.clientCode = this.route.snapshot.paramMap.get('code')!;
    this.cargarAgentes();
    this.cargarLocations();
  }

  cargarAgentes() {
    this.loading = true;
    this.clienteService.getAgentKeys(this.clientCode).subscribe({
      next: (data: any) => {
        console.log('Respuesta de getAgentKeys:', data);
        this.agentes = data.agent_keys ?? data.data ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar agentes:', err);
        this.loading = false;
      }
    });
  }

  cargarLocations() {
    this.clienteService.getLocations(this.clientCode).subscribe({
      next: (data: any) => {
        console.log('Respuesta de getLocations (RAW):', data);
        
        // Intentar extraer locations de diferentes formatos posibles
        if (Array.isArray(data)) {
          this.locations = data;
        } else if (data.locations && Array.isArray(data.locations)) {
          this.locations = data.locations;
        } else if (data.data && Array.isArray(data.data)) {
          this.locations = data.data;
        } else if (data.sucursales && Array.isArray(data.sucursales)) {
          this.locations = data.sucursales;
        } else {
          this.locations = [];
        }
        
        console.log('Ubicaciones cargadas:', this.locations);
        console.log('Total de ubicaciones:', this.locations.length);
      },
      error: (err) => {
        console.error('Error al cargar ubicaciones:', err);
        this.locations = [];
      }
    });
  }

  // ============ CREAR AGENTE ============

  openCreateModal() {
    this.form = {
      name: '',
      location_id: null,
      sucursal_nombre: '',
      sucursal_region: '',
      sucursal_comuna: '',
      sucursal_direccion: '',
      sucursal_nombre_contacto: '',
      sucursal_email_contacto: '',
      sucursal_telefono_contacto: '',
      snmp_community: 'public',
      ip_from: '',
      ip_to: '',
      subnet_mask: '255.255.255.0',
    };
    this.sucursalMode = this.locations.length > 0 ? 'existing' : 'new';
    this.formError = '';
    this.intentoGuardar = false;
    this.comunasDisponibles = [];
    this.showCreateModal = true;
  }

  // ============ VALIDACIONES ============

  esIPValida(ip: string): boolean {
    if (!ip) return false;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const partes = ip.split('.');
    return partes.every(parte => {
      const num = parseInt(parte, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Validar si los campos de nueva sucursal están completos (no vacíos)
  sucursalLlenada(): boolean {
    return !!(
      this.form.sucursal_nombre?.trim() &&
      this.form.sucursal_region &&
      this.form.sucursal_comuna &&
      this.form.sucursal_direccion?.trim()
    );
  }

  validarForm(): string {
    // Validar nombre
    if (!this.form.name || this.form.name.trim().length === 0) {
      return 'El nombre del agente es obligatorio.';
    }

    // Validar sucursal
    if (this.sucursalMode === 'existing') {
      if (!this.form.location_id) {
        return 'Debe seleccionar una sucursal existente.';
      }
    } else {
      if (!this.form.sucursal_nombre || this.form.sucursal_nombre.trim().length === 0) {
        return 'El nombre de la sucursal es obligatorio.';
      }
      if (!this.form.sucursal_region) {
        return 'La región es obligatoria.';
      }
      if (!this.form.sucursal_comuna) {
        return 'La comuna es obligatoria.';
      }
      if (!this.form.sucursal_direccion || this.form.sucursal_direccion.trim().length === 0) {
        return 'La dirección es obligatoria.';
      }
    }

    // Validar SNMP
    if (!this.form.snmp_community || this.form.snmp_community.trim().length === 0) {
      return 'Community SNMP es obligatorio.';
    }

    // Validar IPs
    if (!this.esIPValida(this.form.ip_from)) {
      return 'IP "Desde" no es válida (Ej: 192.168.1.1).';
    }
    if (!this.esIPValida(this.form.ip_to)) {
      return 'IP "Hasta" no es válida (Ej: 192.168.1.254).';
    }

    return '';
  }

  crearAgente() {
    this.intentoGuardar = true;
    this.formError = this.validarForm();
    
    if (this.formError) {
      return;
    }

    this.creatingKey = true;

    const payload: any = {
      name: this.form.name,
      snmp_community: this.form.snmp_community,
      ip_from: this.form.ip_from,
      ip_to: this.form.ip_to,
      subnet_mask: this.form.subnet_mask,
    };

    if (this.sucursalMode === 'existing') {
      payload.location_id = this.form.location_id;
    } else {
      payload.sucursal_nombre = this.form.sucursal_nombre;
      payload.sucursal_region = this.form.sucursal_region;
      payload.sucursal_comuna = this.form.sucursal_comuna;
      payload.sucursal_direccion = this.form.sucursal_direccion;
      payload.sucursal_nombre_contacto = this.form.sucursal_nombre_contacto;
      payload.sucursal_email_contacto = this.form.sucursal_email_contacto;
      payload.sucursal_telefono_contacto = this.form.sucursal_telefono_contacto;
    }

    this.clienteService.createAgentKey(this.clientCode, payload).subscribe({
      next: (res: any) => {
        this.creatingKey = false;
        this.showCreateModal = false;
        this.newKeyPlaintext = res.agent_key?.key ?? res.key ?? '';
        this.newKeyCopied = false;
        this.showNewKeyModal = true;
        this.cargarAgentes();
        this.cargarLocations();
      },
      error: (err) => {
        this.formError = err.error?.message || err.error?.error || 'Error al crear el agente.';
        this.creatingKey = false;
      }
    });
  }

  // ============ REGIONES Y COMUNAS ============

  onSucursalRegionChange(): void {
    this.form.sucursal_comuna = '';
    const region = this.regionesChile.find(r => r.NombreRegion === this.form.sucursal_region);
    this.comunasDisponibles = region ? region.comunas : [];
  }

  // ============ COPIAR KEY ============

  copyKey() {
    navigator.clipboard.writeText(this.newKeyPlaintext).then(() => {
      this.newKeyCopied = true;
      setTimeout(() => this.newKeyCopied = false, 2000);
    });
  }

  closeNewKeyModal() {
    this.newKeyPlaintext = '';
    this.showNewKeyModal = false;
  }

  // ============ REVOCAR AGENTE ============

  openRevokeModal(agente: any) {
    this.revokeTarget = agente;
    this.showRevokeModal = true;
  }

  confirmarRevocar() {
    if (!this.revokeTarget) return;
    this.revokingKey = true;

    this.clienteService.revokeAgentKey(this.clientCode, this.revokeTarget.id).subscribe({
      next: () => {
        this.revokingKey = false;
        this.showRevokeModal = false;
        this.revokeTarget = null;
        this.cargarAgentes();
      },
      error: (err) => {
        console.error('Error al revocar agente:', err);
        this.revokingKey = false;
        this.formError = err.error?.message || 'Error al revocar el agente.';
      }
    });
  }

  // ============ UTILIDADES ============

  getEstadoLabel(agente: any): string {
    if (!agente.active) return 'REVOCADO';
    if (!agente.last_seen_at) return 'PENDIENTE';

    const lastSeen = new Date(agente.last_seen_at).getTime();
    const now = new Date().getTime();
    const diffMinutos = (now - lastSeen) / (1000 * 60);

    return diffMinutos < 10 ? 'CONECTADO' : 'OFFLINE';
  }

  getEstadoClass(agente: any): string {
    const estado = this.getEstadoLabel(agente);

    switch (estado) {
      case 'CONECTADO':
        return 'bg-success-subtle text-success border border-success';
      case 'OFFLINE':
        return 'bg-secondary-subtle text-secondary';
      case 'PENDIENTE':
        return 'bg-warning-subtle text-warning border border-warning';
      case 'REVOCADO':
        return 'bg-danger-subtle text-danger';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }
}