import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroApartamentosComponent } from './cadastro-apartamentos.component';

describe('CadastroApartamentosComponent', () => {
  let component: CadastroApartamentosComponent;
  let fixture: ComponentFixture<CadastroApartamentosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroApartamentosComponent]
    });
    fixture = TestBed.createComponent(CadastroApartamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
