import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FechamentoReembolsoComponent } from './fechamento-reembolso.component';

describe('FechamentoReembolsoComponent', () => {
  let component: FechamentoReembolsoComponent;
  let fixture: ComponentFixture<FechamentoReembolsoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FechamentoReembolsoComponent]
    });
    fixture = TestBed.createComponent(FechamentoReembolsoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
