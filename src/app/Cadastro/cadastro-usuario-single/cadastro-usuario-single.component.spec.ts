import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroUsuarioSingleComponent } from './cadastro-usuario-single.component';

describe('CadastroUsuarioSingleComponent', () => {
  let component: CadastroUsuarioSingleComponent;
  let fixture: ComponentFixture<CadastroUsuarioSingleComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroUsuarioSingleComponent]
    });
    fixture = TestBed.createComponent(CadastroUsuarioSingleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
