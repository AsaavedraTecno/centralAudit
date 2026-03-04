import { TestBed } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });

  it('debería emitir un nuevo toast al llamar a show()', (done) => {
    const mensajePrueba = 'Test Message';
    
    service.toast$.subscribe(toast => {
      if (toast) {
        expect(toast.message).toBe(mensajePrueba);
        expect(toast.type).toBe('success');
        done();
      }
    });

    service.show(mensajePrueba, 'success');
  });
});