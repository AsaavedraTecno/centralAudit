import { TestBed } from '@angular/core/testing';

import { VistaStateService } from '../../shared/services/vista-state.service';

describe('VistaStateService', () => {
  let service: VistaStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VistaStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
