import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictivePrinter } from '../../../../../models/prediction';

@Component({
  selector: 'app-predictive-printer-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictive-printer-table.html',
  styleUrls: ['./predictive-printer-table.scss']
})
export class PredictivePrinterTableComponent {

  @Input() printers: PredictivePrinter[] = [];
  @Input() ordenarPor: string = 'predictionStatus';
  @Input() direccionOrden: 'asc' | 'desc' = 'asc';

  @Output() ordenar = new EventEmitter<string>();
  @Output() verDetalles = new EventEmitter<PredictivePrinter>();

  ordenarColumna(campo: string) {
    this.ordenar.emit(campo);
  }
  
  getStatusClass(status?: string): string {
    switch (status) {
      case 'critical': return 'bg-danger';
      case 'risk': return 'bg-warning text-dark';
      case 'ok': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'critical': return 'Crítico';
      case 'risk': return 'Riesgo';
      case 'ok': return 'OK';
      default: return 'Desconocido';
    }
  }
}