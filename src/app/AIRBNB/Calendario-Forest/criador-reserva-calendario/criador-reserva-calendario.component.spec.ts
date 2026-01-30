import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriadorReservaCalendarioComponent } from './criador-reserva-calendario.component';

describe('CriadorReservaCalendarioComponent', () => {
  let component: CriadorReservaCalendarioComponent;
  let fixture: ComponentFixture<CriadorReservaCalendarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CriadorReservaCalendarioComponent]
    });
    fixture = TestBed.createComponent(CriadorReservaCalendarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
