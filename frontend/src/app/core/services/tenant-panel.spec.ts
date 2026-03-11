import { TestBed } from '@angular/core/testing';

import { TenantPanelService } from './tenant-panel.service';

describe('TenantPanelService', () => {
  let service: TenantPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantPanelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
