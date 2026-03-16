import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationSummary  } from '../../../../../../app/core/services/predictions/prediction.service';


@Component({
  selector: 'app-risk-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './risk-locations.html',
  styleUrl: './risk-locations.scss',
})
export class RiskLocationsComponent {

    @Input() locations: LocationSummary[] = [];

}
