import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltrosImpresoraComponent } from './filtros-impresora.component';

describe('FiltrosImpresoraComponent', () => {
  let component: FiltrosImpresoraComponent;
  let fixture: ComponentFixture<FiltrosImpresoraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltrosImpresoraComponent]
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
