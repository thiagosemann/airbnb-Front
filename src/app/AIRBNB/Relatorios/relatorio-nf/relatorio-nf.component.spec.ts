import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioNFComponent } from './relatorio-nf.component';

describe('RelatorioNFComponent', () => {
  let component: RelatorioNFComponent;
  let fixture: ComponentFixture<RelatorioNFComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RelatorioNFComponent]
    });
    fixture = TestBed.createComponent(RelatorioNFComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
