import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sucursal } from '../../models/sucursal';
import { SucursalService } from '../../services/sucursal.service';
import { ClienteService } from '../../services/cliente.service';
import { ClienteIndexedDbService } from '../../services/cliente-indexed-db.service';
import { AsignarImpresoras } from '../asignar-impresoras/asignar-impresoras';

@Component({
  selector: 'app-sucursales',
  imports: [CommonModule, FormsModule, AsignarImpresoras],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.scss'
})
export class Sucursales implements OnInit {

  sucursales: Sucursal[] = [];
  clientes: any[] = [];
  
  // Propiedades del formulario
  nombreSucursal: string = '';
  clienteSeleccionado: string = '';
  ciudad: string = '';
  direccion: string = '';
  telefono: string = '';
  email: string = '';
  observaciones: string = '';
  
  // Control de estado
  cargando: boolean = false;
  guardando: boolean = false;
  editando: boolean = false;
  sucursalEditId: string | number | null = null;
  
  // Modal de impresoras
  mostrarModalImpresoras: boolean = false;
  sucursalSeleccionada: Sucursal | null = null;
  
  // Mensajes
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'warning' | '' = '';

  constructor(
    private sucursalService: SucursalService,
    private clienteService: ClienteService,
    private indexedDbService: ClienteIndexedDbService
  ) { }

  ngOnInit(): void {
    this.loadSucursales();
    this.loadClientes();
  }

  loadSucursales(): void {
    this.cargando = true;
    this.sucursalService.getAll().subscribe({
      next: (data: Sucursal[]) => {
        this.sucursales = data;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar sucursales:', error);
        this.mostrarMensaje('Error al cargar las sucursales', 'error');
        this.cargando = false;
      }
    });
  }

  loadClientes(): void {
    this.clienteService.getClientes().subscribe({
      next: (data: any) => {
        this.clientes = data.data || data;
      },
      error: (error: any) => {
        console.error('Error al cargar clientes:', error);
      }
    });
  }

  crearSucursal(formulario: any): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.guardando = true;
    const dataSucursal: Partial<Sucursal> = {
      name: this.nombreSucursal,
      address: this.direccion,
      contact_name: this.email,
      contact_phone: this.telefono,
      glosa: this.observaciones,
      rut: this.clienteSeleccionado
    };

    const metodo = this.editando 
      ? this.sucursalService.update(this.sucursalEditId!, dataSucursal)
      : this.sucursalService.create(dataSucursal);

    metodo.subscribe({
      next: (respuesta) => {
        this.mostrarMensaje(
          this.editando ? 'Sucursal actualizada correctamente' : 'Sucursal creada correctamente',
          'success'
        );
        this.limpiarFormulario();
        this.loadSucursales();
        this.guardando = false;
        if (formulario) {
          formulario.resetForm();
        }
      },
      error: (error) => {
        console.error('Error al guardar sucursal:', error);
        this.mostrarMensaje('Error al guardar la sucursal', 'error');
        this.guardando = false;
      }
    });
  }

  editarSucursal(sucursal: Sucursal): void {
    this.editando = true;
    this.sucursalEditId = sucursal.id || null;
    this.nombreSucursal = sucursal.name || '';
    this.clienteSeleccionado = sucursal.rut || '';
    this.ciudad = sucursal.city || '';
    this.direccion = sucursal.address || '';
    this.telefono = sucursal.contact_phone || '';
    this.email = sucursal.contact_name || '';
    this.observaciones = sucursal.glosa || '';
    
    // Scroll al formulario
    setTimeout(() => {
      const formulario = document.querySelector('.card-body');
      if (formulario) {
        formulario.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  deleteSucursal(id: string | number | undefined): void {
    if (!id) return;
    
    if (confirm('¿Está seguro de que desea eliminar esta sucursal? Esta acción no se puede deshacer.')) {
      this.sucursalService.delete(id).subscribe({
        next: () => {
          this.mostrarMensaje('Sucursal eliminada correctamente', 'success');
          this.loadSucursales();
        },
        error: (error) => {
          console.error('Error al eliminar sucursal:', error);
          this.mostrarMensaje('Error al eliminar la sucursal', 'error');
        }
      });
    }
  }

  private validarFormulario(): boolean {
    if (!this.nombreSucursal.trim()) {
      this.mostrarMensaje('El nombre de la sucursal es obligatorio', 'warning');
      return false;
    }
    if (!this.clienteSeleccionado) {
      this.mostrarMensaje('Debe seleccionar un cliente', 'warning');
      return false;
    }
    if (!this.direccion.trim()) {
      this.mostrarMensaje('La dirección es obligatoria', 'warning');
      return false;
    }
    return true;
  }

  private limpiarFormulario(): void {
    this.nombreSucursal = '';
    this.clienteSeleccionado = '';
    this.ciudad = '';
    this.direccion = '';
    this.telefono = '';
    this.email = '';
    this.observaciones = '';
    this.editando = false;
    this.sucursalEditId = null;
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | ''): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    
    setTimeout(() => {
      this.mensaje = '';
      this.tipoMensaje = '';
    }, 4000);
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }

  // Métodos para gestionar impresoras
  abrirModalImpresoras(sucursal: Sucursal): void {
    this.sucursalSeleccionada = sucursal;
    this.mostrarModalImpresoras = true;
  }

  cerrarModalImpresoras(): void {
    this.mostrarModalImpresoras = false;
    
    // Limpiar caché de IndexedDB para forzar que se recarguen las impresoras
    if (this.sucursalSeleccionada?.id) {
      this.indexedDbService.limpiarBaseDatos().catch((err: any) => {
        console.warn('Error limpiando caché:', err);
      });
    }
    
    this.sucursalSeleccionada = null;
    
    // Refrescar sucursales cuando se cierra el modal
    this.loadSucursales();
  }

  onActualizadoImpresoras(): void {
    // Cuando se actualiza una impresora (asigna/desasigna)
    // Limpiar SessionStorage para forzar recarga en cliente-tree
    sessionStorage.removeItem('clienteTreeExpandedNodes');
    sessionStorage.removeItem('clienteTreeClientesWithData');
    
    // Limpiar IndexedDB
    this.indexedDbService.limpiarBaseDatos().then(() => {
      // Refrescar sucursales
      this.loadSucursales();
    });
  }
  
}


