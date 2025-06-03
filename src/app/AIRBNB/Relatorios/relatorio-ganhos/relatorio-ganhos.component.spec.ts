import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioGanhosComponent } from './relatorio-ganhos.component';

describe('RelatorioGanhosComponent', () => {
  let component: RelatorioGanhosComponent;
  let fixture: ComponentFixture<RelatorioGanhosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RelatorioGanhosComponent]
    });
    fixture = TestBed.createComponent(RelatorioGanhosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
