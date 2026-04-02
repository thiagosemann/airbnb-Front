import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrapperAirbnbComponent } from './scrapper-airbnb.component';

describe('ScrapperAirbnbComponent', () => {
  let component: ScrapperAirbnbComponent;
  let fixture: ComponentFixture<ScrapperAirbnbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScrapperAirbnbComponent]
    });
    fixture = TestBed.createComponent(ScrapperAirbnbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
