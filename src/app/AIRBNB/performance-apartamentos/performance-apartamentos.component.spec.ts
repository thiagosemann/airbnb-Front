import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerformanceApartamentosComponent } from './performance-apartamentos.component';

describe('PerformanceApartamentosComponent', () => {
  let component: PerformanceApartamentosComponent;
  let fixture: ComponentFixture<PerformanceApartamentosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PerformanceApartamentosComponent]
    });
    fixture = TestBed.createComponent(PerformanceApartamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
