import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControleTicketReembolsoComponent } from './controle-ticket-reembolso.component';

describe('ControleTicketReembolsoComponent', () => {
  let component: ControleTicketReembolsoComponent;
  let fixture: ComponentFixture<ControleTicketReembolsoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ControleTicketReembolsoComponent]
    });
    fixture = TestBed.createComponent(ControleTicketReembolsoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
