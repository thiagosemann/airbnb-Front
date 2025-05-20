import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControleVistoriaComponent } from './controle-vistoria.component';

describe('ControleVistoriaComponent', () => {
  let component: ControleVistoriaComponent;
  let fixture: ComponentFixture<ControleVistoriaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ControleVistoriaComponent]
    });
    fixture = TestBed.createComponent(ControleVistoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
