import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersControlComponent } from './users-control.component';

describe('UsersControlComponent', () => {
  let component: UsersControlComponent;
  let fixture: ComponentFixture<UsersControlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UsersControlComponent]
    });
    fixture = TestBed.createComponent(UsersControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
