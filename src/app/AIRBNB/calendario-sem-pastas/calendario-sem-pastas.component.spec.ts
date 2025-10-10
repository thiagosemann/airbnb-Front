import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioSemPastasComponent } from './calendario-sem-pastas.component';

describe('CalendarioSemPastasComponent', () => {
  let component: CalendarioSemPastasComponent;
  let fixture: ComponentFixture<CalendarioSemPastasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalendarioSemPastasComponent]
    });
    fixture = TestBed.createComponent(CalendarioSemPastasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
