import { TestBed } from '@angular/core/testing';

class Sucursales {}

describe('Sucursales', () => {
  let service: Sucursales;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sucursales);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
