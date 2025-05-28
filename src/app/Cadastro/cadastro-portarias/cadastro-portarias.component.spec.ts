import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroPortariasComponent } from './cadastro-portarias.component';

describe('CadastroPortariasComponent', () => {
  let component: CadastroPortariasComponent;
  let fixture: ComponentFixture<CadastroPortariasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroPortariasComponent]
    });
    fixture = TestBed.createComponent(CadastroPortariasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
