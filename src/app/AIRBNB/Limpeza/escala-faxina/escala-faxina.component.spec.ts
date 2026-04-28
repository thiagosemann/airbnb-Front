import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscalaFaxinaComponent } from './escala-faxina.component';

describe('EscalaFaxinaComponent', () => {
  let component: EscalaFaxinaComponent;
  let fixture: ComponentFixture<EscalaFaxinaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EscalaFaxinaComponent]
    });
    fixture = TestBed.createComponent(EscalaFaxinaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
