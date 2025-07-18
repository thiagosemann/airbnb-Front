import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketReembolsoComponent } from './ticket-reembolso.component';

describe('TicketReembolsoComponent', () => {
  let component: TicketReembolsoComponent;
  let fixture: ComponentFixture<TicketReembolsoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TicketReembolsoComponent]
    });
    fixture = TestBed.createComponent(TicketReembolsoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
