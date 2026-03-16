import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CriticalPrinter } from '../../../../../../app/core/services/predictions/prediction.service';


@Component({
  selector: 'app-urgent-printers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './urgent-printers.html',
  styleUrl: './urgent-printers.scss',
})
export class UrgentPrintersComponent {

  @Input() printers: CriticalPrinter[] = [];

  getRiskClass(score:number){

    if(score >= 70) return 'risk-high'

    if(score >= 40) return 'risk-medium'

    return 'risk-low'

  }

}
