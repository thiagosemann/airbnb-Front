import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControleFaxinaComponent } from './controle-faxina.component';

describe('ControleFaxinaComponent', () => {
  let component: ControleFaxinaComponent;
  let fixture: ComponentFixture<ControleFaxinaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ControleFaxinaComponent]
    });
    fixture = TestBed.createComponent(ControleFaxinaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
