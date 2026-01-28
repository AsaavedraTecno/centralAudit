import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import { CHILE_DATA, Region } from '../../../../data/chile-data'; 
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './crear-clientes.html',
  styleUrls: ['./crear-clientes.scss']
})
export class CrearClientesComponent implements OnInit {

  // --- Datos Maestros ---
  regionesChile: Region[] = CHILE_DATA.regiones;
  comunasDisponibles: string[] = [];
  clientes: Cliente[] = [];
  
  // --- Estados de la Interfaz ---
  loading = false;
  guardando = false;
  guardandoConfig = false;
  error = '';
  success = '';
  pasoActual = 1; 
  usarDireccionLegal = false;
  usarContactoPrincipal = false;

  // --- 1. Formulario Unificado (Paso 1 y 2) ---
  clienteForm: any = { 
    nombre: '',
    rut: '',
    region: null,
    comuna: null,
    direccion: '',
    status: 'active',
    contactos: [{ 
      nombre: '', email: '', telefono: '', telefono_alternativo: '', comentarios: '' 
    }],
    
    // Paso 2: Datos de la Sucursal
    sucursal_nombre: 'Casa Matriz',
    sucursal_codigo: '',
    sucursal_direccion: '',
    sucursal_nombre_contacto: '',
    sucursal_email_contacto: '',
    sucursal_telefono_contacto: '',
    sucursal_telefono_alternativo: '',
    sucursal_comentarios: ''
  };

  // --- 2. Datos Generados (Respuesta de Laravel tras Paso 2) ---
  generatedData = {
    agent_key: '',
    domain: '',
    agent_id: 0,
    client_code: ''
  };

  // --- 3. Formulario Técnico (Paso 3) ---
  configAgente = {
    snmp_community: 'public',
    ip_from: '',
    ip_to: '',
    subnet_mask: '255.255.255.0',
    scan_interval: 60
  };

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  // --- LÓGICA DE CLONACIÓN ---

  clonarDireccion(): void {
    if (this.usarDireccionLegal) {
      this.clienteForm.sucursal_direccion = this.clienteForm.direccion;
    }
  }

  clonarContacto(): void {
    if (this.usarContactoPrincipal && this.clienteForm.contactos.length > 0) {
      const principal = this.clienteForm.contactos[0];
      this.clienteForm.sucursal_nombre_contacto = principal.nombre; 
      this.clienteForm.sucursal_email_contacto = principal.email;
      this.clienteForm.sucursal_telefono_contacto = principal.telefono;
      this.clienteForm.sucursal_telefono_alternativo = principal.telefono_alternativo;
      this.clienteForm.sucursal_comentarios = principal.comentarios;
    }
  }

  // --- NAVEGACIÓN DEL WIZARD ---

  siguientePaso() {
    this.error = '';

    if (this.pasoActual === 1) {
      if (!this.clienteForm.nombre || !this.clienteForm.rut) {
        this.error = "Nombre y RUT son obligatorios.";
        return;
      }
      this.pasoActual = 2;
    } 
    else if (this.pasoActual === 2) {
      this.enviarInfraestructura();
    }
  }

  enviarInfraestructura() {
    this.guardando = true;

    // Enviamos el objeto clienteForm completo a Laravel
    this.clienteService.create(this.clienteForm).subscribe({
      next: (res) => {
        this.generatedData = {
          agent_key: res.agent_key,
          domain: res.domain,
          agent_id: res.agent_id,
          client_code: res.client_code
        };
        this.success = "Infraestructura creada con éxito.";
        this.guardando = false;
        this.pasoActual = 3;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || "Error al crear la infraestructura del cliente.";
        this.guardando = false;
      }
    });
  }

  finalizarOnboarding() {
    this.guardandoConfig = true;

    // IMPORTANTE: Aquí usamos configAgente, que es lo que está en el HTML del Paso 3
    const payloadTecnico = {
      snmp_community: this.configAgente.snmp_community,
      ip_from: this.configAgente.ip_from,
      ip_to: this.configAgente.ip_to,
      subnet_mask: this.configAgente.subnet_mask,
      scan_interval: this.configAgente.scan_interval 
    };

    this.clienteService.setupAgent(
      this.generatedData.client_code, 
      this.generatedData.agent_id, 
      payloadTecnico
    ).subscribe({
      next: () => {
        this.success = "Cliente configurado y listo para monitoreo.";
        this.guardandoConfig = false;
        setTimeout(() => this.router.navigate(['/gestion-clientes/listar-clientes']), 2500);
      },
      error: (err) => {
        this.error = "Error al guardar la configuración técnica de red.";
        this.guardandoConfig = false;
      }
    });
  }

  // --- UTILIDADES ---

  copiarKey(): void {
    if (this.generatedData.agent_key) {
      this.copiarTexto(this.generatedData.agent_key);
      this.success = '¡Llave copiada con éxito!';
      setTimeout(() => this.success = '', 2000);
    }
  }

  copiarTexto(texto: string) {
    navigator.clipboard.writeText(texto);
    this.success = '¡Copiado al portapapeles!';
    setTimeout(() => this.success = '', 2000);
  }

  // --- RESTO DE MÉTODOS ---

  loadClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(1, 100).subscribe({
      next: (res) => { 
        this.clientes = res.clients || []; 
        this.loading = false; 
      },
      error: () => this.loading = false
    });
  }

  onRegionChange(): void {
    const region = this.regionesChile.find(r => r.NombreRegion === this.clienteForm.region);
    this.comunasDisponibles = region ? region.comunas : [];
    this.clienteForm.comuna = null;
  }

  agregarContacto(): void {
    this.clienteForm.contactos.push({
      nombre: '', email: '', telefono: '', telefono_alternativo: '', comentarios: ''
    });
  }

  eliminarContacto(index: number): void {
    if (this.clienteForm.contactos.length > 1) {
      this.clienteForm.contactos.splice(index, 1);
    }
  }

  anteriorPaso(): void {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  cancelarAccion(): void {
    if(confirm('¿Desea cancelar?')) {
      window.location.reload();
    }
  }
}