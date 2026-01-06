import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Impresora } from '../../models/impresora';
import { ImpresoraService } from '../../services/impresora.service';
import { ClienteService } from '../../services/cliente.service';

interface ImpresoraConCliente extends Impresora {
  cliente_nombre?: string;
  cliente_rut?: string;
  sucursal_nombre?: string;
  sucursal_id?: string | number;
}

interface GrupoCliente {
  cliente_rut: string;
  cliente_nombre: string;
  impresoras: ImpresoraConCliente[];
}

@Component({
  selector: 'app-impresoras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './impresoras.html',
  styleUrl: './impresoras.scss'
})
export class ImpresoresComponent implements OnInit {

  impresoras: ImpresoraConCliente[] = [];
  impressorasDisponibles: ImpresoraConCliente[] = [];
  gruposClientes: Map<string, GrupoCliente> = new Map();
  seccionesExpandidas: Map<string, boolean> = new Map();
  
  cargando: boolean = false;
  clientes: any[] = [];
  asignacionesPorSerie: Map<string, { sucursal_id: string | number; sucursal_nombre: string; cliente_rut: string; cliente_nombre: string }> = new Map();
  
  impresora_seleccionada: ImpresoraConCliente | null = null;
  mostrar_modal_detalles: boolean = false;

  constructor(
    private impresoraService: ImpresoraService,
    private clienteService: ClienteService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    
    this.clienteService.getClientes().subscribe({
      next: (data: any) => {
        this.clientes = data.data || data;
        
        this.impresoraService.getSeriesSucursales().subscribe({
          next: (asignacionesSeries: any[]) => {
            this.asignacionesPorSerie.clear();
            
            for (const asignacion of asignacionesSeries) {
              const serie = asignacion.serie;
              const sucursalId = asignacion.fk_sucursal_id;
              const clienteRut = asignacion.rut;
              
              const cliente = this.clientes.find((c: any) => c.rut === clienteRut);
              const nombreCliente = cliente ? (cliente.nombre1 || cliente.cliente || clienteRut) : clienteRut;
              
              this.asignacionesPorSerie.set(serie, {
                sucursal_id: sucursalId,
                sucursal_nombre: asignacion.sucursal_nombre || `Sucursal ${sucursalId}`,
                cliente_rut: clienteRut,
                cliente_nombre: nombreCliente
              });
            }
            
            this.impresoraService.getAll().subscribe({
              next: (impresoras: ImpresoraConCliente[]) => {
                this.impresoras = impresoras;
                this.separarImpresoras();
                this.cargando = false;
              },
              error: () => {
                this.cargando = false;
              }
            });
          },
          error: () => {
            this.impresoraService.getAll().subscribe({
              next: (impresoras: ImpresoraConCliente[]) => {
                this.impresoras = impresoras;
                this.separarImpresoras();
                this.cargando = false;
              },
              error: () => {
                this.cargando = false;
              }
            });
          }
        });
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  separarImpresoras(): void {
    this.impressorasDisponibles = [];
    this.gruposClientes.clear();

    for (const impresora of this.impresoras) {
      const asignacion = this.asignacionesPorSerie.get(impresora.serie || '');

      if (asignacion) {
        const clienteRut = asignacion.cliente_rut;

        if (!this.gruposClientes.has(clienteRut)) {
          this.gruposClientes.set(clienteRut, {
            cliente_rut: clienteRut,
            cliente_nombre: asignacion.cliente_nombre,
            impresoras: []
          });
        }

        const grupo = this.gruposClientes.get(clienteRut);
        if (grupo) {
          grupo.impresoras.push({
            ...impresora,
            cliente_nombre: asignacion.cliente_nombre,
            cliente_rut: clienteRut,
            sucursal_nombre: asignacion.sucursal_nombre,
            sucursal_id: asignacion.sucursal_id
          });
        }
      } else {
        this.impressorasDisponibles.push(impresora);
      }
    }
  }

  getClientesAsignados(): string[] {
    return Array.from(this.gruposClientes.keys()).sort();
  }

  getGrupoCliente(rutCliente: string): GrupoCliente | undefined {
    return this.gruposClientes.get(rutCliente);
  }

  toggleSeccion(rutCliente: string): void {
    const estaExpandida = this.seccionesExpandidas.get(rutCliente) ?? true;
    this.seccionesExpandidas.set(rutCliente, !estaExpandida);
  }

  estaExpandida(rutCliente: string): boolean {
    return this.seccionesExpandidas.get(rutCliente) ?? true;
  }

  abrirDetalles(impresora: ImpresoraConCliente): void {
    this.impresora_seleccionada = impresora;
    this.mostrar_modal_detalles = true;
  }

  cerrarDetalles(): void {
    this.mostrar_modal_detalles = false;
    this.impresora_seleccionada = null;
  }
}
