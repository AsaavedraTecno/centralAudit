import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionSummaryDetailed } from '../../../../../../app/core/services/predictions/prediction.service';

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.scss',
})
export class SummaryCardsComponent {

  @Input() summary!: PredictionSummaryDetailed;

  get ok(): number {
    return this.summary.total - this.summary.critical - this.summary.warning;
  }

}
