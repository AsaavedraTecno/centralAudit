import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PredictionService } from '../../../../../core/services/predictions/prediction.service';
import { PredictivePrinter } from '../../../../../models/prediction';

@Component({
  selector: 'app-prediccion-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prediccion-detalle.html',
  styleUrl: './prediccion-detalle.scss'
})
export class PrediccionDetalleComponent implements OnInit {

  tenantCode: string = '';
  locationId: number = 0;
  printerId: number = 0;

  cargando: boolean = true;
  errorCarga: boolean = false;
  impresoraSeleccionada: PredictivePrinter | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private predictionService: PredictionService
  ) { }

  ngOnInit(): void {
    // leer parametros de la url
    this.route.paramMap.subscribe(params => {
      this.tenantCode = params.get('tenantCode') || '';
      this.locationId = Number(params.get('locationId')) || 0;
      this.printerId = Number(params.get('printerId')) || 0;

      if (this.tenantCode && this.locationId && this.printerId) {
        this.cargarDatosImpresora();
      } else {
        this.errorCarga = true;
        this.cargando = false;
      }
    });
  }

  // pedir datos al backend
  cargarDatosImpresora(): void {
    this.cargando = true;
    this.errorCarga = false;

    // Aquí usamos tu endpoint existente de la sucursal
    // Lo ideal a futuro sería un endpoint que traiga SOLO la data de 1 impresora para no traer toda la lista
    this.predictionService.getLocationPredictions(this.tenantCode, this.locationId).subscribe({
      next: (data: any) => {
        // Buscamos a nuestra impresora protagonista en la lista que devuelve el backend
        const target = data.printers.find((p: any) => p.printer_id == this.printerId || p.id == this.printerId);
        
        if (target) {
          // Mapeamos los datos al formato limpio que usa tu UI
          let status: 'critical' | 'risk' | 'ok' = 'ok';
          if (target.risk_score >= 70) status = 'critical';
          else if (target.risk_score >= 30) status = 'risk';

          this.impresoraSeleccionada = {
            id: target.printer_id || target.id,
            nombre: target.printer_name,
            modelo: target.model,
            serie: target.serial_number || 'N/A',
            internal_id: target.internal_id || 'N/A',
            ip: target.ip || 'Sin IP',
            estado: 1,
            predictionStatus: status,
            daysRemaining: target.days_remaining,
            predictedIssue: status === 'ok' ? 'Ninguno' : target.most_critical_supply,
            recommendedAction: status === 'critical' ? 'Atención urgente' : (status === 'risk' ? 'Monitorear' : 'Todo en orden'),
            tonerBlack: target.toner_black || 0,
            tonerCyan: target.toner_cyan || 0,
            tonerMagenta: target.toner_magenta || 0,
            tonerYellow: target.toner_yellow || 0
          };
        } else {
          this.errorCarga = true;
        }
        
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = true;
        this.cargando = false;
      }
    });
  }

  volverASucursal(): void {
    // volver a la lista de la sucursal de donde vinimos
    this.router.navigate(['/monitoreo/prediccion/sucursal', this.tenantCode, this.locationId]);
  }

}