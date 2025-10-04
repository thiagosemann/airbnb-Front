import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NpsLimpezaHospedeComponent } from './nps-limpeza-hospede.component';

describe('NpsLimpezaHospedeComponent', () => {
  let component: NpsLimpezaHospedeComponent;
  let fixture: ComponentFixture<NpsLimpezaHospedeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NpsLimpezaHospedeComponent]
    });
    fixture = TestBed.createComponent(NpsLimpezaHospedeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
