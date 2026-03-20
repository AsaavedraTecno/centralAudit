import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  PredictionSummaryDetailed, 
  PredictionSummary,
  LocationSummary,
  PredictivePrinter,
  TrendData
 } from '../../../../../models/prediction';

import { SummaryCardsComponent } from '../summary-cards/summary-cards.component';
import { UrgentPrintersComponent } from '../urgent-printers/urgent-printers.component';
import { RiskLocationsComponent } from '../risk-locations/risk-locations.component';
import { TrendChartComponent } from '../trend-chart/trend-chart.component';

@Component({
  selector: 'app-resumen-global',
  standalone: true,
  imports: [
    CommonModule,
    SummaryCardsComponent,
    UrgentPrintersComponent,
    RiskLocationsComponent,
    TrendChartComponent
  ],
  templateUrl: './resumen-global.html',
  styleUrl: './resumen-global.scss'
})
export class ResumenGlobalComponent {

  @Output() printerClicked = new EventEmitter<any>();
  @Input() titulo: string = 'Resumen Predictivo Global de Impresoras';
  @Input() summary: PredictionSummary | PredictionSummaryDetailed | null = null;
  @Input() locations: LocationSummary[] = [];
  @Input() urgentPrinters: PredictivePrinter[] = [];
  @Input() trend: TrendData[] = [];
  @Input() lastUpdate: string | null = null;
  @Input() loading: boolean = false;


  onPrinterSelected(printer: any) {
    this.printerClicked.emit(printer);
  }
}