import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioMobileComponent } from './calendario-mobile.component';

describe('CalendarioMobileComponent', () => {
  let component: CalendarioMobileComponent;
  let fixture: ComponentFixture<CalendarioMobileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarioMobileComponent]
    });
    fixture = TestBed.createComponent(CalendarioMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
