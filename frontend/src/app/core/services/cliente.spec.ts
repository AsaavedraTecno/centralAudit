import { TestBed } from '@angular/core/testing';

class Cliente {}

describe('Cliente', () => {
  let service: Cliente;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Cliente]
    });
    service = TestBed.inject(Cliente);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
