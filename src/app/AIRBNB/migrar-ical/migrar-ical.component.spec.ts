import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MigrarICALComponent } from './migrar-ical.component';

describe('MigrarICALComponent', () => {
  let component: MigrarICALComponent;
  let fixture: ComponentFixture<MigrarICALComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MigrarICALComponent]
    });
    fixture = TestBed.createComponent(MigrarICALComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
