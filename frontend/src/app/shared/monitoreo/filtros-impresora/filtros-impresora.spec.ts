import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltrosImpresora } from './filtros-impresora.component';

describe('FiltrosImpresora', () => {
  let component: FiltrosImpresora;
  let fixture: ComponentFixture<FiltrosImpresora>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltrosImpresora]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiltrosImpresora);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
