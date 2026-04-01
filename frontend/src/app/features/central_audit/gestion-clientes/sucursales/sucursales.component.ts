import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

// Modelos y Servicios
import { Sucursal } from '../../../../models/sucursal';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteIndexedDbService } from '../../../../core/services/cliente-indexed-db.service';
import { AsignarImpresoras } from '../../asignar-impresoras/asignar-impresoras';

// Data Geográfica
import { CHILE_DATA } from '../../../../data/chile-data'; 

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, AsignarImpresoras, NgSelectModule],
  templateUrl: './sucursales.html',
  styleUrls: ['./sucursales.scss']
})
export class SucursalesComponent implements OnInit {

  sucursales: Sucursal[] = [];
  clientes: any[] = [];
  codigoCliente: string | null = null;
  
  // Variables del Formulario
  nombre: string = '';
  clienteSeleccionado: string = '';
  
  // Ubicación
  direccion: string = '';
  comuna: string = '';
  region: string = '';
  
  // Data para Selects
  regionesList = CHILE_DATA.regiones;
  comunasDisponibles: string[] = [];

  // Contacto
  nombreContacto: string = '';
  emailContacto: string = '';
  telefonoContacto: string = '+56 ';
  telefonoAlternativo: string = '+56 ';
  comentarios: string = '';
  
  // Estado
  cargando: boolean = false;
  guardando: boolean = false;
  editando: boolean = false;
  sucursalEditId: number | null = null;
  intentoGuardar: boolean = false;
  
  // Modal Impresoras
  mostrarModalImpresoras: boolean = false;
  sucursalSeleccionada: Sucursal | null = null;
  
  // Mensajes
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'warning' | '' = '';

  constructor(
    private sucursalService: SucursalService,
    private clienteService: ClienteService,
    private indexedDbService: ClienteIndexedDbService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe(params => {
      this.codigoCliente = params.get('code');
      if (this.codigoCliente) {
        this.clienteSeleccionado = this.codigoCliente;
        this.loadSucursalesDelCliente(this.codigoCliente);
      } else {
        this.loadSucursales();
      }
    });
    
    this.loadClientes();
  }

  // ============ TELÉFONO CON FORMATO AUTOMÁTICO ============

  formatearTelefono(field: 'telefonoContacto' | 'telefonoAlternativo'): void {
    let valor = this[field];
    
    // Eliminar todo menos números
    let soloNumeros = valor.replace(/\D/g, '');
    
    // Si empieza con 56, quitamos el 56 inicial
    if (soloNumeros.startsWith('56')) {
      soloNumeros = soloNumeros.substring(2);
    }
    
    // Solo permitimos 9 dígitos
    soloNumeros = soloNumeros.substring(0, 9);
    
    // Formatear: +56 9 8232 2323
    if (soloNumeros.length === 0) {
      this[field] = '+56 ';
    } else if (soloNumeros.length <= 1) {
      this[field] = '+56 ' + soloNumeros;
    } else if (soloNumeros.length <= 4) {
      this[field] = '+56 ' + soloNumeros.substring(0, 1) + ' ' + soloNumeros.substring(1);
    } else {
      this[field] = '+56 ' + soloNumeros.substring(0, 1) + ' ' + 
                    soloNumeros.substring(1, 5) + ' ' + 
                    soloNumeros.substring(5);
    }
  }

  // ============ VALIDACIONES ============

  esEmailValido(email: string): boolean {
    if (!email) return true; // Opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  esTelefonoValido(telefono: string): boolean {
    if (!telefono || telefono === '+56 ') return true; // Opcional
    // Debe tener formato +56 9 XXXX XXXX (exactamente 9 dígitos después del +56)
    const soloNumeros = telefono.replace(/\D/g, '');
    return soloNumeros.length === 11 && soloNumeros.startsWith('56'); // 56 + 9 dígitos
  }

  // ============ LÓGICA DE REGIONES Y COMUNAS ============

  onRegionChange(): void {
    const regionFound = this.regionesList.find(r => r.NombreRegion === this.region);
    this.comunasDisponibles = regionFound ? regionFound.comunas : [];

    if (this.comuna && !this.comunasDisponibles.includes(this.comuna)) {
      this.comuna = '';
    }
  }

  // ============ CARGA DE DATOS ============

  loadSucursalesDelCliente(clientCode: string): void {
    this.cargando = true;
    this.sucursalService.getByClientCode(clientCode).subscribe({
      next: (response: any) => {
        this.sucursales = response.sucursales || response.data || response;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.mostrarMensaje('Error al cargar sucursales', 'error');
        this.cargando = false;
      }
    });
  }

  loadSucursales(): void {
    this.cargando = true;
    this.sucursalService.getAll().subscribe({
      next: (data: any) => {
        this.sucursales = data.data || data;
        this.cargando = false;
      },
      error: (error) => {
        console.error(error);
        this.cargando = false;
      }
    });
  }

  loadClientes(): void {
    this.clienteService.getClientes().subscribe({
      next: (data: any) => this.clientes = data?.data || data || [],
      error: (error) => {
        console.error('Error loading clientes:', error);
        this.clientes = [];
      }
    });
  }

  // ============ VALIDACIÓN DEL FORMULARIO ============

  validarFormulario(): boolean {
    // Nombre
    if (!this.nombre || !this.nombre.trim()) {
      this.mostrarMensaje('Nombre es obligatorio', 'warning');
      return false;
    }

    // Cliente
    if (!this.clienteSeleccionado) {
      this.mostrarMensaje('Seleccione un cliente', 'warning');
      return false;
    }

    // Email (si está presente)
    if (this.emailContacto && !this.esEmailValido(this.emailContacto)) {
      this.mostrarMensaje('Email no válido', 'warning');
      return false;
    }

    // Teléfonos (si están presentes)
    if (this.telefonoContacto && this.telefonoContacto !== '+56 ' && !this.esTelefonoValido(this.telefonoContacto)) {
      this.mostrarMensaje('Teléfono principal debe tener 9 dígitos (ej: +56 9 8232 2323)', 'warning');
      return false;
    }

    if (this.telefonoAlternativo && this.telefonoAlternativo !== '+56 ' && !this.esTelefonoValido(this.telefonoAlternativo)) {
      this.mostrarMensaje('Teléfono alternativo debe tener 9 dígitos (ej: +56 9 8232 2323)', 'warning');
      return false;
    }

    return true;
  }

  // ============ CRUD ============

  crearSucursal(formulario: NgForm): void {
    this.intentoGuardar = true;

    if (!this.validarFormulario()) {
      return;
    }

    this.guardando = true;

    const payload = {
      nombre: this.nombre,
      direccion: this.direccion,
      comuna: this.comuna,
      region: this.region,
      nombre_contacto: this.nombreContacto,
      email_contacto: this.emailContacto,
      telefono_contacto: this.telefonoContacto === '+56 ' ? undefined : this.telefonoContacto,
      telefono_alternativo: this.telefonoAlternativo === '+56 ' ? undefined : this.telefonoAlternativo,
      comentarios: this.comentarios,
      activo: true
    };

    let peticion;
    if (this.editando && this.sucursalEditId) {
      peticion = this.sucursalService.update(this.sucursalEditId, payload, this.clienteSeleccionado);
    } else {
      peticion = this.sucursalService.create(payload, this.clienteSeleccionado);
    }

    peticion.subscribe({
      next: () => {
        this.mostrarMensaje(this.editando ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
        this.limpiarFormulario();
        
        if (this.codigoCliente) this.loadSucursalesDelCliente(this.codigoCliente);
        else if (this.clienteSeleccionado) this.loadSucursalesDelCliente(this.clienteSeleccionado);
        else this.loadSucursales();

        this.guardando = false;
        this.intentoGuardar = false;
        if (formulario) formulario.resetForm();
      },
      error: (error) => {
        console.error('Error guardando:', error);
        this.mostrarMensaje('Error al guardar', 'error');
        this.guardando = false;
      }
    });
  }

  editarSucursal(sucursal: Sucursal): void {
    this.editando = true;
    this.sucursalEditId = sucursal.id;
    this.intentoGuardar = false;
    
    this.nombre = sucursal.nombre;
    this.clienteSeleccionado = this.codigoCliente || this.clienteSeleccionado;
    this.direccion = sucursal.direccion || '';
    
    // Región
    this.region = sucursal.region || '';
    if (this.region) {
      const regionFound = this.regionesList.find(r => r.NombreRegion === this.region);
      this.comunasDisponibles = regionFound ? regionFound.comunas : [];
    } else {
      this.comunasDisponibles = [];
    }
    
    this.comuna = sucursal.comuna || '';

    this.nombreContacto = sucursal.nombre_contacto || '';
    this.emailContacto = sucursal.email_contacto || '';
    this.telefonoContacto = sucursal.telefono_contacto || '+56 ';
    this.telefonoAlternativo = sucursal.telefono_alternativo || '+56 ';
    this.comentarios = sucursal.comentarios || '';
    
    setTimeout(() => {
      document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  deleteSucursal(id: number): void {
    if (!confirm('¿Eliminar sucursal?')) return;
    
    const code = this.codigoCliente || this.clienteSeleccionado;
    if (!code) {
      this.mostrarMensaje('No se puede determinar el cliente', 'error');
      return;
    }

    this.sucursalService.delete(id, code).subscribe({
      next: () => {
        this.mostrarMensaje('Eliminada correctamente', 'success');
        if (this.codigoCliente) this.loadSucursalesDelCliente(this.codigoCliente);
        else this.loadSucursales();
      },
      error: () => this.mostrarMensaje('Error al eliminar', 'error')
    });
  }

  // ============ UTILS ============

  private limpiarFormulario(): void {
    this.nombre = '';
    if (!this.codigoCliente) this.clienteSeleccionado = '';
    
    this.direccion = '';
    this.region = '';
    this.comuna = '';
    this.comunasDisponibles = [];
    
    this.nombreContacto = '';
    this.emailContacto = '';
    this.telefonoContacto = '+56 ';
    this.telefonoAlternativo = '+56 ';
    this.comentarios = '';
    
    this.editando = false;
    this.sucursalEditId = null;
    this.intentoGuardar = false;
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | ''): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 4000);
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }

  // ============ MODAL IMPRESORAS ============

  abrirModalImpresoras(sucursal: Sucursal): void {
    this.sucursalSeleccionada = sucursal;
    this.mostrarModalImpresoras = true;
  }

  cerrarModalImpresoras(): void {
    this.mostrarModalImpresoras = false;
    if (this.sucursalSeleccionada?.id) {
      this.indexedDbService.limpiarBaseDatos().catch(console.warn);
    }
    this.sucursalSeleccionada = null;
    if (this.codigoCliente) this.loadSucursalesDelCliente(this.codigoCliente);
  }

  onActualizadoImpresoras(): void {
    sessionStorage.removeItem('clienteTreeExpandedNodes');
    sessionStorage.removeItem('clienteTreeClientesWithData');
    this.indexedDbService.limpiarBaseDatos();
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}