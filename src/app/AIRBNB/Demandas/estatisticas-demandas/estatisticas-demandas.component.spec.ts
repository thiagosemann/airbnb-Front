import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstatisticasDemandasComponent } from './estatisticas-demandas.component';

describe('EstatisticasDemandasComponent', () => {
  let component: EstatisticasDemandasComponent;
  let fixture: ComponentFixture<EstatisticasDemandasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EstatisticasDemandasComponent]
    });
    fixture = TestBed.createComponent(EstatisticasDemandasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
