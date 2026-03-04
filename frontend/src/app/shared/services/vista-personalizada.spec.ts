import { TestBed } from '@angular/core/testing';

import { VistaPersonalizadaService } from './vista-personalizada.service';

describe('VistaPersonalizada', () => {
  let service: VistaPersonalizadaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VistaPersonalizadaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
