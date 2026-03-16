import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImpresoraService } from '../../../core/services/impresora.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { PredictionService } from '../../../core/services/predictions/prediction.service';
import { ResumenGlobalComponent } from './components/resumen-global/resumen-global.component';

import {
  PredictionDashboard,
  PrinterPrediction
} from '../../../models/prediction';

interface ImpresoraVista {
  id: number; nombre: string; modelo: string; serie: string; ip: string;
  internal_id: string;
  brand?: string;
  estado: number; cliente_nombre: string; cliente_rut: string;
  sucursal_nombre: string; sucursal_id: number | string;
  tonerBlack?: number; tonerCyan?: number; tonerMagenta?: number; tonerYellow?: number;
  ubicacion?: string;
  custom_location?: string;
  impresoHoy?: number;
  impresoMes?: number;
}

@Component({
  selector: 'app-prediccion',
  standalone: true,
  imports: [CommonModule, ResumenGlobalComponent],
  templateUrl: './prediccion.html',
  styleUrl: './prediccion.scss',
})
export class PrediccionComponent implements OnInit {

  clientes: any[] = [];
  
  clienteSeleccionado: any = null;
  sucursalSeleccionada: any = null;
  impresorasExhibidas: ImpresoraVista[] = [];

  impresorasMaestra: ImpresoraVista[] = [];
  cargando: boolean = false;
  impresora_seleccionada: ImpresoraVista | null = null;

  cargandoArbol: boolean = false;

  seccionesExpandidas = new Map<string | number, boolean>();
  marcasDisponibles: string[] = [];

  dashboard: PredictionDashboard | null = null;

  impresorasCriticas: PrinterPrediction[] = [];

  consumiblesRiesgo: any = {};

  prediccionesSucursal: PredictionDashboard | null = null;

  constructor(
    private impresoraService: ImpresoraService,
    private clienteService: ClienteService,
    private sucursalService: SucursalService,
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void { 
    this.cargarArbol();
  }

  cargarArbol(): void {
    this.cargandoArbol = true;
    this.clienteService.getClientes().subscribe({
      next: (resp: any) => {
        this.clientes = Array.isArray(resp) ? resp : (resp.data || []);
        
        if (this.clientes.length === 0) {
          this.cargandoArbol = false;
          this.cdr.detectChanges();
          return;
        }

        let sucursalesCargadas = 0;
        this.clientes.forEach((c, index) => {
          const code = c.code || c.id;
          this.sucursalService.getByClientCode(code).subscribe({
            next: (sucResp: any) => {
              this.clientes[index].sucursales = Array.isArray(sucResp) ? sucResp : (sucResp.data || []);
              sucursalesCargadas++;
              
              if (sucursalesCargadas === this.clientes.length) {
                this.cargandoArbol = false;
              }
              this.cdr.detectChanges();
            },
            error: () => {
              sucursalesCargadas++;
              if (sucursalesCargadas === this.clientes.length) this.cargandoArbol = false;
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        this.cargandoArbol = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarSucursal(cliente: any, sucursal: any): void {
    this.clienteSeleccionado = cliente;
    this.sucursalSeleccionada = sucursal;
    this.cargando = true;

    const clientCode = cliente.code || cliente.id;

    this.impresoraService.getImpresoras(clientCode, sucursal.id).subscribe({
      next: (resp: any) => {
        const impresoras = resp?.data || resp?.impresoras || resp || [];

        this.impresorasMaestra = impresoras.map((imp: any) => ({
          ...imp,
          cliente_rut: clientCode,
          cliente_nombre: cliente.razon_social || cliente.nombre,
          sucursal_nombre: sucursal.nombre,
          sucursal_id: sucursal.id
        }));

        this.impresorasExhibidas = this.impresorasMaestra;
        this.cargarPrediccionesSucursal(clientCode, sucursal.id);

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleCliente(rut: string): void { 
    this.seccionesExpandidas.set(rut, !this.seccionesExpandidas.get(rut));
  }

  cargarPrediccionesGlobales(clientCode: string): void {
    this.predictionService.getGlobalPredictions(clientCode).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.impresorasCriticas = this.predictionService.getCriticalPrinters(data.printers);
        this.consumiblesRiesgo = this.predictionService.getConsumablesRisk(data.printers);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarPrediccionesSucursal(clientCode: string, locationId: number): void {
    this.predictionService.getLocationPredictions(clientCode, locationId).subscribe({
      next: (data) => {
        this.prediccionesSucursal = data;
        this.impresorasCriticas = this.predictionService.getCriticalPrinters(data.printers);
        this.consumiblesRiesgo = this.predictionService.getConsumablesRisk(data.printers);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }
}
