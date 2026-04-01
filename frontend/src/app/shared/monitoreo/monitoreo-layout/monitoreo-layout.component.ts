import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantPanelService } from '../../../core/services/tenant-panel.service';

@Component({
  selector: 'app-monitoreo-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './monitoreo-layout.component.html',
  styleUrl: './monitoreo-layout.component.scss',
})
export class MonitoreoLayoutComponent {
  constructor(private tenantService: TenantPanelService) {    console.log('isTenant():', this.isTenant());}

    isTenant(): boolean {
      return this.tenantService.isTenant();
    }
}
