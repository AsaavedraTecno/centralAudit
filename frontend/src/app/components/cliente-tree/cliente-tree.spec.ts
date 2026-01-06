import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTreeComponent } from './cliente-tree';

describe('ClienteTree', () => {
  let component: ClienteTreeComponent;
  let fixture: ComponentFixture<ClienteTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClienteTreeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
