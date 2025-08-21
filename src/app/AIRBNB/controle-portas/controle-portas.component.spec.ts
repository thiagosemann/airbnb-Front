import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlePortasComponent } from './controle-portas.component';

describe('ControlePortasComponent', () => {
  let component: ControlePortasComponent;
  let fixture: ComponentFixture<ControlePortasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ControlePortasComponent]
    });
    fixture = TestBed.createComponent(ControlePortasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
