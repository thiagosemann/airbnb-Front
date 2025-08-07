import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AceiteTicketReembolsoProprietarioComponent } from './aceite-ticket-reembolso-proprietario.component';

describe('AceiteTicketReembolsoProprietarioComponent', () => {
  let component: AceiteTicketReembolsoProprietarioComponent;
  let fixture: ComponentFixture<AceiteTicketReembolsoProprietarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AceiteTicketReembolsoProprietarioComponent]
    });
    fixture = TestBed.createComponent(AceiteTicketReembolsoProprietarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
