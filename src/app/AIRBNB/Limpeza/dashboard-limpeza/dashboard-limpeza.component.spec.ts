import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardLimpezaComponent } from './dashboard-limpeza.component';

describe('DashboardLimpezaComponent', () => {
  let component: DashboardLimpezaComponent;
  let fixture: ComponentFixture<DashboardLimpezaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardLimpezaComponent]
    });
    fixture = TestBed.createComponent(DashboardLimpezaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
