import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraAppComponent } from './camera-app.component';

describe('CameraAppComponent', () => {
  let component: CameraAppComponent;
  let fixture: ComponentFixture<CameraAppComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CameraAppComponent]
    });
    fixture = TestBed.createComponent(CameraAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
