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
    if (!this.summary) {
      return 0;
    }
    
    const total = this.summary.total ?? 0;
    const critical = this.summary.critical ?? 0;
    const warning = this.summary.warning ?? 0;
    
    return Math.max(0, total - critical - warning);
  }

}
