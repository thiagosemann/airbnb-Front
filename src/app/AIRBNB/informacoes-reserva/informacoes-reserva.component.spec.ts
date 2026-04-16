import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformacoesReservaComponent } from './informacoes-reserva.component';

describe('InformacoesReservaComponent', () => {
  let component: InformacoesReservaComponent;
  let fixture: ComponentFixture<InformacoesReservaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InformacoesReservaComponent]
    });
    fixture = TestBed.createComponent(InformacoesReservaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
