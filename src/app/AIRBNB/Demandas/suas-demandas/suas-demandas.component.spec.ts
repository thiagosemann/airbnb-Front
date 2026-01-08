import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuasDemandasComponent } from './suas-demandas.component';

describe('SuasDemandasComponent', () => {
  let component: SuasDemandasComponent;
  let fixture: ComponentFixture<SuasDemandasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SuasDemandasComponent]
    });
    fixture = TestBed.createComponent(SuasDemandasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
