import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TenantPanelService } from '../services/tenant-panel.service';

@Injectable({
  providedIn: 'root'
})
export class CentralOnlyGuard {
  constructor(
    private tenantService: TenantPanelService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.tenantService.isTenant()) {
      this.router.navigate(['/view/monitoreo/panel']);
      return false;
    }
    return true;
  }
}