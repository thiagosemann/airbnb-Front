import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProvisionamentosComponent } from './provisionamentos.component';

describe('ProvisionamentosComponent', () => {
  let component: ProvisionamentosComponent;
  let fixture: ComponentFixture<ProvisionamentosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProvisionamentosComponent]
    });
    fixture = TestBed.createComponent(ProvisionamentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
