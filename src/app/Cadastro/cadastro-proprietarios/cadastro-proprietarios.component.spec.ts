import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroProprietariosComponent } from './cadastro-proprietarios.component';

describe('CadastroProprietariosComponent', () => {
  let component: CadastroProprietariosComponent;
  let fixture: ComponentFixture<CadastroProprietariosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroProprietariosComponent]
    });
    fixture = TestBed.createComponent(CadastroProprietariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
