import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionSummary, PredictionSummaryDetailed } from '../../../../../../app//models/prediction';

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
})
export class SummaryCardsComponent {

  @Input() summary: PredictionSummaryDetailed | PredictionSummary | null = null;

  get ok(): number {
    // Si el summary aún no ha cargado, devolvemos 0 para que no se rompa la vista
    if (!this.summary) {
      return 0;
    }
    
    // Si ya cargó, hacemos la matemática normal
    return this.summary.total - this.summary.critical - this.summary.warning;
  }

}
