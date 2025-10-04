import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NpsLimpezaComponent } from './nps-limpeza.component';

describe('NpsLimpezaComponent', () => {
  let component: NpsLimpezaComponent;
  let fixture: ComponentFixture<NpsLimpezaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NpsLimpezaComponent]
    });
    fixture = TestBed.createComponent(NpsLimpezaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
