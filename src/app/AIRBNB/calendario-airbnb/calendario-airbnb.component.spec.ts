import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioAirbnbComponent } from './calendario-airbnb.component';

describe('CalendarioAirbnbComponent', () => {
  let component: CalendarioAirbnbComponent;
  let fixture: ComponentFixture<CalendarioAirbnbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarioAirbnbComponent]
    });
    fixture = TestBed.createComponent(CalendarioAirbnbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
