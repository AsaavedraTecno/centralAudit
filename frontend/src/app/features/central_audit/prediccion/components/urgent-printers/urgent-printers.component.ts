import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictivePrinter } from '../../../../../models/prediction';

@Component({
  selector: 'app-urgent-printers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './urgent-printers.html',
  styleUrl: './urgent-printers.scss',
})
export class UrgentPrintersComponent {

  @Input() printers: PredictivePrinter[] = [];

  @Output() printerClicked = new EventEmitter<any>();

  onPrinterClick(printer: any) {
    this.printerClicked.emit(printer);
  }

  getRiskClass(score?: number | string): string {
    // Si viene vacío o nulo
    if (score === null || score === undefined) return 'risk-critical';

    //xConvertimos a número de forma segura (funciona con strings "75" o números 75)
    const numericScore = Number(score);

    // Validamos que la conversión haya sido un número válido
    if (isNaN(numericScore)) return 'risk-critical';

    if (numericScore >= 70) return 'risk-high';
    if (numericScore >= 40) return 'risk-medium';

    return 'risk-low';
  }
}
