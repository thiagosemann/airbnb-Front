import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutsDiariosComponent } from './checkouts-diarios.component';

describe('CheckoutsDiariosComponent', () => {
  let component: CheckoutsDiariosComponent;
  let fixture: ComponentFixture<CheckoutsDiariosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CheckoutsDiariosComponent]
    });
    fixture = TestBed.createComponent(CheckoutsDiariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
