import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavBarAirbnbComponent } from './nav-bar-airbnb.component';

describe('NavBarAirbnbComponent', () => {
  let component: NavBarAirbnbComponent;
  let fixture: ComponentFixture<NavBarAirbnbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NavBarAirbnbComponent]
    });
    fixture = TestBed.createComponent(NavBarAirbnbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
