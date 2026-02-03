import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForestLandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: ForestLandingComponent;
  let fixture: ComponentFixture<ForestLandingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ForestLandingComponent]
    });
    fixture = TestBed.createComponent(ForestLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
