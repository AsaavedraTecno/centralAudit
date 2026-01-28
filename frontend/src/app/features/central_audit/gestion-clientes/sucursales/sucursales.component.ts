import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select'; // <--- Importante

// Modelos y Servicios
import { Sucursal } from '../../../../models/sucursal';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteIndexedDbService } from '../../../../core/services/cliente-indexed-db.service';
import { AsignarImpresoras } from '../../asignar-impresoras/asignar-impresoras';

// Data Geográfica (Ajusta la ruta si es necesario)
import { CHILE_DATA } from '../../../../data/chile-data'; 

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, AsignarImpresoras, NgSelectModule], // <--- Agregar NgSelectModule
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
  regionesList = CHILE_DATA.regiones; // Cargamos la data importada
  comunasDisponibles: string[] = [];

  // Contacto
  nombreContacto: string = '';
  emailContacto: string = '';
  telefonoContacto: string = '';
  telefonoAlternativo: string = '';
  comentarios: string = '';
  
  // Estado
  cargando: boolean = false;
  guardando: boolean = false;
  editando: boolean = false;
  sucursalEditId: number | null = null;
  
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

  // --- LÓGICA DE REGIONES Y COMUNAS ---

  onRegionChange(): void {
    // 1. Buscamos el objeto región en la data
    const regionFound = this.regionesList.find(r => r.NombreRegion === this.region);
    
    // 2. Actualizamos las comunas disponibles
    this.comunasDisponibles = regionFound ? regionFound.comunas : [];

    // 3. Si la comuna seleccionada ya no pertenece a la nueva región, la limpiamos
    if (this.comuna && !this.comunasDisponibles.includes(this.comuna)) {
      this.comuna = '';
    }
  }

  // --- CARGA DE DATOS ---

  loadSucursalesDelCliente(clientCode: string): void {
    this.cargando = true;
    this.sucursalService.getByClientCode(clientCode).subscribe({
      next: (response: any) => {
        this.sucursales = response.sucursales || response;
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
      next: (data: any) => this.clientes = data.data || data
    });
  }

  // --- CRUD ---

  crearSucursal(formulario: any): void {
    if (!this.validarFormulario()) return;

    this.guardando = true;

    const payload = {
      nombre: this.nombre,
      direccion: this.direccion,
      comuna: this.comuna,
      region: this.region,
      nombre_contacto: this.nombreContacto,
      email_contacto: this.emailContacto,
      telefono_contacto: this.telefonoContacto,
      telefono_alternativo: this.telefonoAlternativo,
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
    
    this.nombre = sucursal.nombre;
    this.clienteSeleccionado = this.codigoCliente || this.clienteSeleccionado;
    this.direccion = sucursal.direccion || '';
    
    // --- Lógica Especial para Selects en Edición ---
    this.region = sucursal.region || '';
    
    // Al setear la región, debemos cargar manualmente las comunas disponibles para esa región
    // de lo contrario, el select de comunas aparecería vacío aunque tenga valor.
    if (this.region) {
      const regionFound = this.regionesList.find(r => r.NombreRegion === this.region);
      this.comunasDisponibles = regionFound ? regionFound.comunas : [];
    } else {
      this.comunasDisponibles = [];
    }
    
    this.comuna = sucursal.comuna || '';
    // -----------------------------------------------

    this.nombreContacto = sucursal.nombre_contacto || '';
    this.emailContacto = sucursal.email_contacto || '';
    this.telefonoContacto = sucursal.telefono_contacto || '';
    this.telefonoAlternativo = sucursal.telefono_alternativo || '';
    this.comentarios = sucursal.comentarios || '';
    
    setTimeout(() => {
      document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  deleteSucursal(id: number): void {
    if (!confirm('¿Eliminar sucursal?')) return;
    
    const code = this.codigoCliente || this.clienteSeleccionado;
    if(!code) {
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

  // --- UTILS ---

  private validarFormulario(): boolean {
    if (!this.nombre.trim()) {
      this.mostrarMensaje('Nombre es obligatorio', 'warning');
      return false;
    }
    if (!this.clienteSeleccionado) {
      this.mostrarMensaje('Seleccione un cliente', 'warning');
      return false;
    }
    return true;
  }

  private limpiarFormulario(): void {
    this.nombre = '';
    if (!this.codigoCliente) this.clienteSeleccionado = '';
    
    this.direccion = '';
    this.region = '';
    this.comuna = '';
    this.comunasDisponibles = []; // Limpiar lista de comunas
    
    this.nombreContacto = '';
    this.emailContacto = '';
    this.telefonoContacto = '';
    this.telefonoAlternativo = '';
    this.comentarios = '';
    
    this.editando = false;
    this.sucursalEditId = null;
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | ''): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    setTimeout(() => this.mensaje = '', 4000);
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }

  // --- MODAL IMPRESORAS ---

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
    if(this.codigoCliente) this.loadSucursalesDelCliente(this.codigoCliente);
  }

  onActualizadoImpresoras(): void {
    sessionStorage.removeItem('clienteTreeExpandedNodes');
    sessionStorage.removeItem('clienteTreeClientesWithData');
    this.indexedDbService.limpiarBaseDatos();
  }
}