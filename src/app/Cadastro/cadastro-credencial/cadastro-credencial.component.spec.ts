import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroCredencialComponent } from './cadastro-credencial.component';

describe('CadastroCredencialComponent', () => {
  let component: CadastroCredencialComponent;
  let fixture: ComponentFixture<CadastroCredencialComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroCredencialComponent]
    });
    fixture = TestBed.createComponent(CadastroCredencialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
