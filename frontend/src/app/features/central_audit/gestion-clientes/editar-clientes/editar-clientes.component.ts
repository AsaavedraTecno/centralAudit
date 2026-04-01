import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
import { CHILE_DATA, Region } from '../../../../data/chile-data';

@Component({
  selector: 'app-editar-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './editar-clientes.html',
  styleUrls: ['./editar-clientes.scss']
})
export class EditarClientesComponent implements OnInit {
  regionesChile = CHILE_DATA.regiones;
  comunasDisponibles: string[] = [];

  // Cliente a editar
  clienteSeleccionado: Cliente | null = null;
  clienteOriginal: Cliente | null = null; // Para detectar cambios
  codigoCliente: string | null = null;
  
  // Estados
  cargando = false;
  guardando = false;
  error = '';
  success = '';

  constructor(
    private clienteService: ClienteService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe(params => {
      this.codigoCliente = params.get('code');
      if (this.codigoCliente) {
        this.cargarCliente(this.codigoCliente);
      }
    });
  }

  cargarCliente(code: string): void {
    this.cargando = true;
    this.error = '';
    this.clienteService.getClienteByCode(code).subscribe({
      next: (cliente) => {
        this.clienteOriginal = JSON.parse(JSON.stringify(cliente));
        this.clienteSeleccionado = JSON.parse(JSON.stringify(cliente));
        this.actualizarComunas();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar cliente:', err);
        this.error = 'No se pudo cargar el cliente.';
        this.cargando = false;
      }
    });
  }

  actualizarComunas(): void {
    if (this.clienteSeleccionado?.region) {
      const reg = this.regionesChile.find((r: Region) => r.NombreRegion === this.clienteSeleccionado?.region);
      this.comunasDisponibles = reg ? reg.comunas : [];
    }
  }

  agregarContacto(): void {
    if (this.clienteSeleccionado) {
      // Si el array no existe, lo inicializamos
      if (!this.clienteSeleccionado.contactos) {
        this.clienteSeleccionado.contactos = [];
      }
      this.clienteSeleccionado.contactos.push({
        nombre: '',
        email: '',
        telefono: '',
        telefono_alternativo: '',
        comentarios: ''
      });
    }
  }

  eliminarContacto(index: number): void {
    if (this.clienteSeleccionado?.contactos) {
      this.clienteSeleccionado.contactos.splice(index, 1);
    }
  }

  guardarCambios(): void {
    if (!this.clienteSeleccionado || !this.codigoCliente) {
      this.error = 'Error: Cliente no encontrado.';
      return;
    }

    if (!this.clienteSeleccionado.nombre || !this.clienteSeleccionado.rut) {
      this.error = 'Nombre y RUT son obligatorios.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.success = '';

    this.clienteService.updateCliente(this.codigoCliente, this.clienteSeleccionado).subscribe({
      next: () => {
        this.success = 'Cliente actualizado exitosamente.';
        this.guardando = false;
        setTimeout(() => this.router.navigate(['/gestion-clientes/listar-clientes']), 2000);
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        this.error = err.error?.message || 'Error al actualizar el cliente.';
        this.guardando = false;
      }
    });
  }

  volver(): void {
    if (confirm('¿Descartar cambios y volver?')) {
      this.router.navigate(['/gestion-clientes/listar-clientes']);
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}