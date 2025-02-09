import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroPredioComponent } from './cadastro-predio.component';

describe('CadastroPredioComponent', () => {
  let component: CadastroPredioComponent;
  let fixture: ComponentFixture<CadastroPredioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CadastroPredioComponent]
    });
    fixture = TestBed.createComponent(CadastroPredioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
