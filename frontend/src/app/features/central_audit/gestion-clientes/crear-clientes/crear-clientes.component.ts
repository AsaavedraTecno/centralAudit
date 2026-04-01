import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

// Modelos y Servicios
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import { AgentService } from '../../../../core/services/agent.service';
import { CHILE_DATA, Region } from '../../../../data/chile-data';
import { AgentConfig } from '../../../../models/agent-config';

// Componente Compartido
import { AgentConfigFormComponent } from '../../../../shared/agent-config-form/agent-config-form.component';

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NgSelectModule, 
    AgentConfigFormComponent 
  ],
  templateUrl: './crear-clientes.html',
  styleUrls: ['./crear-clientes.scss']
})
export class CrearClientesComponent implements OnInit {

  // --- Datos Maestros ---
  regionesChile: Region[] = CHILE_DATA.regiones;
  comunasDisponibles: string[] = [];
  comunasSucursalDisponibles: string[] = []; // Nueva lista para la sucursal
  clientes: Cliente[] = [];
  
  // --- Estados de la Interfaz ---
  loading = false;
  guardando = false;
  guardandoConfig = false;
  error = '';
  success = '';
  pasoActual = 1; 
  usarDireccionLegal = false;
  
  // Control de contacto en Paso 2: 'nuevo' o el índice del contacto
  contactoSeleccionadoIndex: number | string = 'nuevo';

  // --- Formulario Unificado ---
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
    sucursal_direccion: '',
    sucursal_region: null,
    sucursal_comuna: null,
    sucursal_nombre_contacto: '',
    sucursal_email_contacto: '',
    sucursal_telefono_contacto: '',
    sucursal_telefono_alternativo: '',
    sucursal_comentarios: ''
  };

  generatedData = {
    agent_key: '',
    domain: '',
    agent_id: 0,
    client_code: ''
  };

  intentoSiguiente = false;
  animarErrores = false;
  mostrarModalConfirmacion = false;
  mostrarModalLimpiar = false;

  mostrarModalError = false;
  mensajeErrorModal = '';
  mostrarModalExitoFinal = false;
  forzarRecarga = false;

  constructor(
    private clienteService: ClienteService,
    private agentService: AgentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  // --- LÓGICA DE CLONACIÓN Y GEOGRAFÍA ---

  onRegionChange(): void {
    const region = this.regionesChile.find(r => r.NombreRegion === this.clienteForm.region);
    this.comunasDisponibles = region ? region.comunas : [];
    this.clienteForm.comuna = null;
  }

  onSucursalRegionChange(): void {
    const region = this.regionesChile.find(r => r.NombreRegion === this.clienteForm.sucursal_region);
    this.comunasSucursalDisponibles = region ? region.comunas : [];
    this.clienteForm.sucursal_comuna = null;
  }

  clonarDireccion(): void {
    if (this.usarDireccionLegal) {
      this.clienteForm.sucursal_direccion = this.clienteForm.direccion;
      this.clienteForm.sucursal_region = this.clienteForm.region;
      // Forzamos actualización de lista de comunas de sucursal
      const regionObj = this.regionesChile.find(r => r.NombreRegion === this.clienteForm.sucursal_region);
      this.comunasSucursalDisponibles = regionObj ? regionObj.comunas : [];
      this.clienteForm.sucursal_comuna = this.clienteForm.comuna;
    }
  }

  onResponsableChange(event: any): void {
    if (event === 'nuevo') {
      this.clienteForm.sucursal_nombre_contacto = '';
      this.clienteForm.sucursal_email_contacto = '';
      this.clienteForm.sucursal_telefono_contacto = '';
      this.clienteForm.sucursal_telefono_alternativo = '';
      this.clienteForm.sucursal_comentarios = '';
    } else {
      const contacto = this.clienteForm.contactos[event];
      this.clienteForm.sucursal_nombre_contacto = contacto.nombre; 
      this.clienteForm.sucursal_email_contacto = contacto.email;
      this.clienteForm.sucursal_telefono_contacto = contacto.telefono;
      this.clienteForm.sucursal_telefono_alternativo = contacto.telefono_alternativo;
      this.clienteForm.sucursal_comentarios = contacto.comentarios;
    }
  }

  // --- NAVEGACIÓN Y VALIDACIÓN ---

  esEmailValido(email: string): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  confirmarYCrear() {
    this.mostrarModalConfirmacion = false;
    this.enviarInfraestructura();
  }

  siguientePaso() {
    this.intentoSiguiente = true;
    
    // Reiniciamos la animación para que "tirite" cada vez que presione el botón
    this.animarErrores = false;
    setTimeout(() => this.animarErrores = true, 10); 

    if (this.pasoActual === 1) {
      const empresaValida = this.clienteForm.nombre?.trim() && this.clienteForm.rut && 
                            this.clienteForm.region && this.clienteForm.comuna && this.clienteForm.direccion;

      const contactosValidos = this.clienteForm.contactos.every((c: any) => 
        c.nombre?.trim() && c.email && this.esEmailValido(c.email) && c.telefono?.length >= 15
      );

      // Si falta algo, simplemente retornamos. La interfaz se pondrá roja y tiritará sola.
      if (!empresaValida || !contactosValidos) return;

      this.pasoActual = 2;
      this.intentoSiguiente = false;
    } 
    else if (this.pasoActual === 2) {
      const sucursalValida = 
        this.clienteForm.sucursal_nombre?.trim() && 
        this.clienteForm.sucursal_direccion?.trim() &&
        this.clienteForm.sucursal_region &&
        this.clienteForm.sucursal_comuna &&
        this.clienteForm.sucursal_nombre_contacto?.trim() &&
        this.esEmailValido(this.clienteForm.sucursal_email_contacto);

      if (!sucursalValida) return;

      this.mostrarModalConfirmacion = true;
    }
  }

  // --- API Y HELPER METHODS ---

  enviarInfraestructura() {
    this.guardando = true;
    const payload = JSON.parse(JSON.stringify(this.clienteForm)); 
    
    if (payload.rut) payload.rut = payload.rut.replace(/\./g, '');
    
    payload.contactos.forEach((contacto: any) => {
      if (contacto.telefono) contacto.telefono = contacto.telefono.replace(/\D/g, '');
      if (contacto.telefono_alternativo) contacto.telefono_alternativo = contacto.telefono_alternativo.replace(/\D/g, '');
    });

    if (payload.sucursal_telefono_contacto) payload.sucursal_telefono_contacto = payload.sucursal_telefono_contacto.replace(/\D/g, '');
    
    this.clienteService.create(payload).subscribe({
      next: (res: any) => {
        this.generatedData = {
          agent_key: res.agent_key,
          agent_id: res.agent_id,
          domain: res.domain,
          client_code: res.client_code
        };
        this.success = "Infraestructura creada con éxito.";
        this.guardando = false;
        this.pasoActual = 3;
        this.intentoSiguiente = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || "Error al crear la infraestructura.";
        this.guardando = false;
      }
    });
  }

  prepararTelefono(campo: string, index?: number) {
    const valorActual = index !== undefined ? this.clienteForm.contactos[index][campo] : this.clienteForm[campo];
    if (!valorActual || valorActual === '') {
      const inicio = '+56 ';
      if (index !== undefined) this.clienteForm.contactos[index][campo] = inicio;
      else this.clienteForm[campo] = inicio;
    }
  }

  validarTelefono(event: any, campo: string, index?: number) {
    let value = event.target.value.replace(/\D/g, '');
    if (!value.startsWith('56')) value = '56' + value;
    value = value.substring(0, 11);
    let formatted = '';
    if (value.length > 0) formatted = '+' + value.substring(0, 2); 
    if (value.length > 2) formatted += ' ' + value.substring(2, 3); 
    if (value.length > 3) formatted += ' ' + value.substring(3, 7); 
    if (value.length > 7) formatted += ' ' + value.substring(7, 11); 

    if (index !== undefined) this.clienteForm.contactos[index][campo] = formatted;
    else this.clienteForm[campo] = formatted;
  }

  validarEntradaRut(event: any) {
    event.target.value = event.target.value.replace(/[^0-9kK]/g, '');
    this.formatearRut(event);
  }

  formatearRut(event: any) {
    let value = event.target.value.replace(/\./g, '').replace(/-/g, '');
    if (value.length <= 1) return;
    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();
    let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    this.clienteForm.rut = cuerpoFormateado + "-" + dv;
  }

  finalizarOnboarding(datosFormulario: AgentConfig) {
    this.guardandoConfig = true;
    this.error = ''; 

    const payloadTecnico: AgentConfig = { ...datosFormulario, agent_key_id: this.generatedData.agent_id };

    this.agentService.saveConfig(this.generatedData.client_code, payloadTecnico).subscribe({
      next: () => {
        this.guardandoConfig = false;
        this.mostrarModalExitoFinal = true;
        setTimeout(() => { if (this.mostrarModalExitoFinal) this.irAListado(); }, 3500);
      },
      error: (err) => {
        this.guardandoConfig = false;
        this.error = err.error?.message || "Error al guardar configuración en el servidor."; // Alerta top
      }
    });
  }

  irAListado() {
    this.mostrarModalExitoFinal = false;
    this.router.navigate(['/gestion-clientes/listar-clientes']);
  }


  loadClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(1, 100).subscribe({
      next: (res) => { this.clientes = res.data || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  agregarContacto(): void {
    this.clienteForm.contactos.push({ nombre: '', email: '', telefono: '', telefono_alternativo: '', comentarios: '' });
  }

  eliminarContacto(index: number): void {
    if (this.clienteForm.contactos.length > 1) this.clienteForm.contactos.splice(index, 1);
  }

  anteriorPaso(): void { if (this.pasoActual > 1) this.pasoActual--; }

  mostrarError(mensaje: string) {
    this.mensajeErrorModal = mensaje;
    this.mostrarModalError = true;
  }

  cancelarAccion(): void {
   this.mostrarModalLimpiar = true;
  } 

  ejecutarLimpieza() {
    this.mostrarModalLimpiar = false;
    this.forzarRecarga = true; 
    window.location.reload();
  }

  copiarKey(): void {
    if (this.generatedData.agent_key) {
      navigator.clipboard.writeText(this.generatedData.agent_key);
      this.success = '¡Llave copiada!';
      setTimeout(() => this.success = '', 2000);
    }
  }

  copiarTexto(texto: string) {
    navigator.clipboard.writeText(texto);
    this.success = '¡Copiado!';
    setTimeout(() => this.success = '', 2000);
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (!this.forzarRecarga && (this.pasoActual > 1 || this.clienteForm.nombre)) {
      $event.returnValue = true;
    }
  }
}
