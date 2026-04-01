import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios
import { ClienteService } from '../../../core/services/cliente.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { PredictionService } from '../../../core/services/predictions/prediction.service';

// Modelos y Componentes
import { ResumenGlobalComponent } from './components/resumen-global/resumen-global.component';
import { PredictivePrinterTableComponent } from './components/predictive-printer-table/predictive-printer-table.component';
import { PrediccionDetalleComponent } from './components/prediccion-detalle/prediccion-detalle.component';

import { 
  PredictionDashboard, 
  PredictivePrinter,
  PredictionSummaryDetailed,
  LocationSummary,
  CriticalPrinter,
  TrendData 
} from '../../../models/prediction';

interface GlobalDashboardData {
  summary: PredictionSummaryDetailed | null;
  locations: LocationSummary[];
  urgent: CriticalPrinter[];
  trend: TrendData[];
  lastUpdate: string | null;
}

@Component({
  selector: 'app-prediccion',
  standalone: true,
  imports: [CommonModule, ResumenGlobalComponent, PredictivePrinterTableComponent, PrediccionDetalleComponent],
  templateUrl: './prediccion.html',
  styleUrl: './prediccion.scss',
})
export class PrediccionComponent implements OnInit {
  // Control de Navegación
  vistaActiva: 'global' | 'sucursal' | 'detalle' = 'global';
  
  globalData: GlobalDashboardData = {
    summary: null,
    locations: [],
    urgent: [],
    trend: [],
    lastUpdate: null
  };

  clientes: any[] = [];
  clienteSeleccionado: any = null;
  sucursalSeleccionada: any = null;

  cargando: boolean = false;
  cargandoArbol: boolean = false;
  seccionesExpandidas = new Map<string | number, boolean>();

  impresorasCriticas: PredictivePrinter[] = [];
  prediccionesSucursal: PredictionDashboard | null = null;

  constructor(
    private clienteService: ClienteService,
    private sucursalService: SucursalService,
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef,
    private router: Router,             
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargarArbol();

  this.route.paramMap.subscribe(params => {
      const tenantCodeUrl = params.get('tenantCode');
      const locationIdUrl = Number(params.get('locationId'));
      const printerIdUrl = Number(params.get('printerId'));

      if (printerIdUrl && tenantCodeUrl && locationIdUrl) {
        // VISTA 3: URL de Impresora
        this.vistaActiva = 'detalle';
        this.sincronizarSidebarConUrl(tenantCodeUrl, locationIdUrl);

      } else if (tenantCodeUrl && locationIdUrl) {
        // VISTA 2: URL de Sucursal
        this.vistaActiva = 'sucursal';
        this.cargando = true;
        this.sincronizarSidebarConUrl(tenantCodeUrl, locationIdUrl);
        this.cargarPrediccionesSucursal(tenantCodeUrl, locationIdUrl);

      } else {
        // VISTA 1: URL Global (Limpia)
        this.vistaActiva = 'global';
        this.cargarDashboardGlobal();
      }
    });
  }

  // Pequeña función auxiliar para que el árbol visual concuerde con la URL al recargar
  private sincronizarSidebarConUrl(tenantCode: string, locationId: number) {
     this.seccionesExpandidas.set(tenantCode, true);
     const cliente = this.clientes.find(c => (c.code || c.id) == tenantCode);
     if(cliente) {
        this.clienteSeleccionado = cliente;
        this.sucursalSeleccionada = cliente.sucursales?.find((s:any) => s.id == locationId);
     }
  }

  // --- NAVEGACIÓN ---

  irADetalleUrgente(printerUrgente: any): void {

    const tenantCode = printerUrgente.tenant_code;
    const locationId = printerUrgente.location_id;
    const printerId  = printerUrgente.printer_id;
    
    this.router.navigate(['/monitoreo/prediccion/impresora', tenantCode, locationId, printerId]);
  }

  verFichaImpresora(printer: PredictivePrinter): void {
    const tenantCode = this.clienteSeleccionado?.code || this.clienteSeleccionado?.id;
    const locationId = this.sucursalSeleccionada?.id;
    
    // Navegamos a la URL de la ficha técnica
    this.router.navigate(['/monitoreo/prediccion/impresora', tenantCode, locationId, printer.id]);
  }

  seleccionarSucursal(cliente: any, sucursal: any): void {
    // Al hacer clic en el árbol, cambiamos la URL
    const tenantCode = cliente.code || cliente.id;
    this.router.navigate(['/monitoreo/prediccion/sucursal', tenantCode, sucursal.id]);
  }

  volverGlobal(): void {
    this.router.navigate(['/monitoreo/prediccion']);
  }

  // --- CARGA DE DATOS ---

  cargarDashboardGlobal(): void {
    this.cargando = true;
    forkJoin({
      summary: this.predictionService.getGlobalSummaryDetailed(),
      locations: this.predictionService.getSummaryByLocation(),
      urgent: this.predictionService.getUrgent(),
      trend: this.predictionService.getTrendData(),
      lastUpdate: this.predictionService.getLastUpdate()
    }).subscribe({
      next: (res) => {
        this.globalData = {
          summary: res.summary,
          locations: (res.locations || []).slice(0, 5),
          urgent: res.urgent,
          trend: res.trend,
          lastUpdate: res.lastUpdate?.last_update || null
        };
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  cargarArbol(): void {
    this.cargandoArbol = true;
    this.clienteService.getClientes().subscribe({
      next: (resp: any) => {
        this.clientes = Array.isArray(resp) ? resp : (resp?.data || []);
        let cargadas = 0;
        const totalClientes = this.clientes.length;
        if (totalClientes === 0) {
          this.cargandoArbol = false;
          return;
        }
        this.clientes.forEach((c, index) => {
          this.sucursalService.getByClientCode(c.code || c.id).subscribe({
            next: (sucResp: any) => {
              if (this.clientes[index]) {
                this.clientes[index].sucursales = Array.isArray(sucResp) ? sucResp : (sucResp?.data || []);
              }
              cargadas++;
              if (cargadas === totalClientes) {
                this.cargandoArbol = false;
                if((this.vistaActiva === 'sucursal' || this.vistaActiva === 'detalle') && !this.sucursalSeleccionada) {
                  const tenantCodeUrl = this.route.snapshot.paramMap.get('tenantCode');
                  const locationIdUrl = Number(this.route.snapshot.paramMap.get('locationId'));
                  if(tenantCodeUrl && locationIdUrl) {
                    this.sincronizarSidebarConUrl(tenantCodeUrl, locationIdUrl);
                  }
                }
              }
              this.cdr.detectChanges();
            },
            error: () => {
              cargadas++;
              if (cargadas === totalClientes) this.cargandoArbol = false;
            }
          });
        });
      },
      error: () => {
        this.cargandoArbol = false;
      }
    });
  }

  cargarPrediccionesSucursal(clientCode: string, locationId: number): void {
    this.predictionService.getLocationPredictions(clientCode, locationId).subscribe({
      next: (data: any) => { 
        const impresorasMapeadas: PredictivePrinter[] = data.printers.map((p: any): PredictivePrinter => {
          let status: 'critical' | 'risk' | 'ok' = 'ok';
          if (p.risk_score >= 70) status = 'critical';
          else if (p.risk_score >= 30) status = 'risk';

          return {
            id: p.printer_id || 0,
            nombre: p.printer_name,
            modelo: p.model,
            serie: p.serial_number || '', 
            internal_id: p.internal_id || 'N/A',
            ip: p.ip || 'Sin IP',
            estado: 1,
            predictionStatus: status,
            daysRemaining: p.days_remaining,
            predictedIssue: status === 'ok' ? 'Ninguno' : p.most_critical_supply,
            recommendedAction: status === 'critical' ? 'Atención urgente' : (status === 'risk' ? 'Monitorear' : 'Todo en orden'),
            tonerBlack: p.toner_black, tonerCyan: p.toner_cyan, tonerMagenta: p.toner_magenta, tonerYellow: p.toner_yellow
          };
        });

        this.prediccionesSucursal = {
          summary: data.summary,
          trend: data.trend || [],
          printers: impresorasMapeadas
        };

        this.impresorasCriticas = impresorasMapeadas.filter(imp => imp.predictionStatus === 'critical');

        // Como ya no cargamos la vista de impresora aquí, eliminamos la lógica de printerPendingId
        
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => this.cargando = false
    });
  }

  toggleCliente(rut: string): void {
    this.seccionesExpandidas.set(rut, !this.seccionesExpandidas.get(rut));
  }
}