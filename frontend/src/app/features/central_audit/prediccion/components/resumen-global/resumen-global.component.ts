import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PredictionService,
  PredictionSummaryDetailed,
  LocationSummary,
  CriticalPrinter,
  TrendData
} from '../../../../../../app/core/services/predictions/prediction.service';
import { SummaryCardsComponent } from '../summary-cards/summary-cards.component';
import { UrgentPrintersComponent } from '../urgent-printers/urgent-printers.component';
import { RiskLocationsComponent } from '../risk-locations/risk-locations.component';
import { TrendChartComponent } from '../trend-chart/trend-chart.component';

@Component({
  selector: 'app-resumen-global',
  standalone: true,
  imports: [CommonModule,
    SummaryCardsComponent,
    UrgentPrintersComponent,
    RiskLocationsComponent,
    TrendChartComponent
  ],
  templateUrl: './resumen-global.html',
  styleUrl: './resumen-global.scss'
})
export class ResumenGlobalComponent implements OnInit, OnDestroy {

  summary: PredictionSummaryDetailed | null = null;
  locations: LocationSummary[] = [];
  urgentPrinters: CriticalPrinter[] = [];
  trend: TrendData[] = [];

  loading = true;
  lastUpdate: string | null = null;

  private refreshInterval: any;

  constructor(private predictionService: PredictionService) {}

  ngOnInit(): void {
    this.loadAll();

    this.refreshInterval = setInterval(() => {
      this.loadAll();
    }, 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadAll(): void {

    this.loading = true;

    this.predictionService.getGlobalSummaryDetailed().subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      }
    });

    this.predictionService.getSummaryByLocation().subscribe({
      next: (data) => {
        this.locations = data.slice(0, 5);
      }
    });

    this.predictionService.getUrgent().subscribe({
      next: (data) => {
        this.urgentPrinters = data;
      }
    });

    this.predictionService.getTrendData().subscribe({
      next: (data) => {
        this.trend = data;
      }
    });

    this.predictionService.getLastUpdate().subscribe({
      next: (data) => {
        this.lastUpdate = data.last_update;
      }
    });

  }
}