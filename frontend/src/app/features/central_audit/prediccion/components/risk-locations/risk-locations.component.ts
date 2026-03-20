import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationSummary } from '../../../../../models/prediction';

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
