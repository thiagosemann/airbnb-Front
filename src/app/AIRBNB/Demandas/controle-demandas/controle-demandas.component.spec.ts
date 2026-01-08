import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControleDemandasComponent } from './controle-demandas.component';

describe('ControleDemandasComponent', () => {
  let component: ControleDemandasComponent;
  let fixture: ComponentFixture<ControleDemandasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ControleDemandasComponent]
    });
    fixture = TestBed.createComponent(ControleDemandasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
