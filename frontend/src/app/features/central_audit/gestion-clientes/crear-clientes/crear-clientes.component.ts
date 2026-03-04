import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

// Modelos y Servicios
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import { AgentService } from '../../../../core/services/agent.service';
import { CHILE_DATA, Region } from '../../../../data/chile-data';
import { AgentConfig, CreateClientResponse } from '../../../../models/agent-config';

// Componente Compartido (Asegúrate que la ruta sea correcta según tu estructura)
import { AgentConfigFormComponent } from '../../../../shared/agent-config-form/agent-config-form.component';

@Component({
  selector: 'app-crear-clientes',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NgSelectModule, 
    AgentConfigFormComponent // Importamos el componente hijo
  ],
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

  // NOTA: Se eliminó 'configAgente' porque ahora lo maneja el componente hijo.

  constructor(
    private clienteService: ClienteService,
    private agentService: AgentService,
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

  prepararTelefono(campo: string, index?: number) {
    const valorActual = index !== undefined 
      ? this.clienteForm.contactos[index][campo] 
      : this.clienteForm[campo];

    if (!valorActual || valorActual === '') {
      const inicio = '+56 ';
      if (index !== undefined) {
        this.clienteForm.contactos[index][campo] = inicio;
      } else {
        this.clienteForm[campo] = inicio;
      }
    }
  }

  validarEntradaRut(event: any) {
    const regex = /[^0-9kK]/g;
    event.target.value = event.target.value.replace(regex, '');
    this.formatearRut(event);
  }

  validarTelefono(event: any, campo: string, index?: number) {
    let value = event.target.value.replace(/\D/g, '');

    if (!value.startsWith('56')) {
      value = '56' + value;
    }

    value = value.substring(0, 11);

    let formatted = '';
    if (value.length > 0) formatted = '+' + value.substring(0, 2); 
    if (value.length > 2) formatted += ' ' + value.substring(2, 3); 
    if (value.length > 3) formatted += ' ' + value.substring(3, 7); 
    if (value.length > 7) formatted += ' ' + value.substring(7, 11); 

    if (index !== undefined) {
      this.clienteForm.contactos[index][campo] = formatted;
    } else {
      this.clienteForm[campo] = formatted;
    }
  }

  formatearRut(event: any) {
    let value = event.target.value.replace(/\./g, '').replace(/-/g, '');
    if (value.length <= 1) return;

    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();
    let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    this.clienteForm.rut = cuerpoFormateado + "-" + dv;
  }

  // --- NAVEGACIÓN DEL WIZARD ---
  intentoSiguiente = false;

  esEmailValido(email: string): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  siguientePaso() {
    this.intentoSiguiente = true;
    this.error = '';

    if (this.pasoActual === 1) {
      const empresaValida = this.clienteForm.nombre && this.clienteForm.rut && 
                            this.clienteForm.region && this.clienteForm.comuna && 
                            this.clienteForm.direccion;

      const contactosValidos = this.clienteForm.contactos.every((c: any) => 
        c.nombre && c.email && this.esEmailValido(c.email) && c.telefono
      );

      if (!empresaValida || !contactosValidos) {
          this.error = "Complete los datos obligatorios, dirección y asegúrese de que el Email de cada contacto sea válido.";
        setTimeout(() => { this.error = '';}, 5000);
        return;
      }
      this.pasoActual = 2;
      this.intentoSiguiente = false;
    } 
    else if (this.pasoActual === 2) {
      if(!this.clienteForm.sucursal_nombre || !this.clienteForm.sucursal_direccion) {
        this.error = "Debe indicar el nombre y dirección de la sucursal.";
        return;
      }

      const mensaje = `¿Está seguro de los datos ingresados?\n\nAl continuar, se creará la infraestructura en el servidor y no podrá volver atrás para editar estos campos básicos.`;
      if (confirm(mensaje)) {
        this.enviarInfraestructura();
      }  
    }
  }

  enviarInfraestructura() {
    this.guardando = true;
    const payload = { ...this.clienteForm };   
    
    if (payload.rut) {
      payload.rut = payload.rut.replace(/\./g, '');
    }
    
    payload.contactos.forEach((contacto: any) => {
      if (contacto.telefono) {
        contacto.telefono = contacto.telefono.replace(/\D/g, ''); 
      }
      if (contacto.telefono_alternativo) {
        contacto.telefono_alternativo = contacto.telefono_alternativo.replace(/\D/g, '');
      }
    });

    if (payload.sucursal_telefono_contacto) {
      payload.sucursal_telefono_contacto = payload.sucursal_telefono_contacto.replace(/\D/g, '');
    }
    
    this.clienteService.create(payload).subscribe({
      next: (res: any) => {
          console.log('✅ RESPUESTA SERVIDOR:', res);        

        this.generatedData = {
          agent_key: res.agent_key,          
          agent_id:  res.agent_id,   // Directo          
          domain: res.domain,
          client_code: res.client_code
        };
        console.log('✅ DATOS GUARDADOS EN MEMORIA:', this.generatedData);
        this.success = "Infraestructura creada con éxito.";
        this.guardando = false;
        this.pasoActual = 3;
        this.intentoSiguiente = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.message || "Error al crear la infraestructura del cliente.";
        this.guardando = false;
      }
    });
  }

  /**
   * ESTE ES EL MÉTODO MODIFICADO (PASO 3)
   * Recibe los datos validados desde el componente hijo.
   */
  finalizarOnboarding(datosFormulario: AgentConfig) {
    this.intentoSiguiente = true;
    this.error = '';

    // 1. Confirmación de seguridad
    const mensajeConfirmacion = `¿Está seguro de finalizar la configuración?\n\nSe establecerá el rango de red: ${datosFormulario.ip_from} hasta ${datosFormulario.ip_to}.\n\nUna vez guardado, el agente comenzará el escaneo con estos parámetros.`;

    if (!confirm(mensajeConfirmacion)) {
      return; 
    }

    // 2. Proceso de Guardado
    this.guardandoConfig = true;

    // 3. Unimos los datos del formulario con el ID generado previamente
    const payloadTecnico: AgentConfig = {
      ...datosFormulario,
      agent_key_id: this.generatedData.agent_id
    };

    this.agentService.saveConfig(
      this.generatedData.client_code, 
      payloadTecnico
    ).subscribe({
      next: () => {
        this.success = "Cliente configurado y listo para monitoreo.";
        this.guardandoConfig = false;
        this.intentoSiguiente = false;
        
        // Navegación tras éxito
        setTimeout(() => this.router.navigate(['/gestion-clientes/listar-clientes']), 2500);
      },
      error: (err) => {
        this.error = err.error?.message || "Error al guardar la configuración técnica de red.";
        this.guardandoConfig = false;
        
        setTimeout(() => { this.error = ''; }, 5000);
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

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    // Solo activar si el usuario ya empezó a escribir algo
    if (this.pasoActual > 1 || this.clienteForm.nombre) {
      $event.returnValue = true;
    }
  }
}