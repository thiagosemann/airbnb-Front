import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisponibilidadeTercerizadoComponent } from './disponibilidade-tercerizado.component';

describe('DisponibilidadeTercerizadoComponent', () => {
  let component: DisponibilidadeTercerizadoComponent;
  let fixture: ComponentFixture<DisponibilidadeTercerizadoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DisponibilidadeTercerizadoComponent]
    });
    fixture = TestBed.createComponent(DisponibilidadeTercerizadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
