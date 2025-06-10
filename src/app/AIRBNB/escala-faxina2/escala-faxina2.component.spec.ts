import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalaFaxina2Component } from './escala-faxina2.component';

describe('EscalaFaxina2Component', () => {
  let component: EscalaFaxina2Component;
  let fixture: ComponentFixture<EscalaFaxina2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EscalaFaxina2Component]
    });
    fixture = TestBed.createComponent(EscalaFaxina2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
