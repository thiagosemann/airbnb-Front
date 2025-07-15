import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioPorApartamentoComponent } from './calendario-por-apartamento.component';

describe('CalendarioPorApartamentoComponent', () => {
  let component: CalendarioPorApartamentoComponent;
  let fixture: ComponentFixture<CalendarioPorApartamentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarioPorApartamentoComponent]
    });
    fixture = TestBed.createComponent(CalendarioPorApartamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
