import { TestBed } from '@angular/core/testing';

import { DetalleImpresoraService } from './detalle-impresora.service';

describe('DetalleImpresora', () => {
  let service: DetalleImpresoraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleImpresoraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
