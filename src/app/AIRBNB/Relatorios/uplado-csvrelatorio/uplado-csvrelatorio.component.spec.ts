import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpladoCSVRelatorioComponent } from './uplado-csvrelatorio.component';

describe('UpladoCSVRelatorioComponent', () => {
  let component: UpladoCSVRelatorioComponent;
  let fixture: ComponentFixture<UpladoCSVRelatorioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UpladoCSVRelatorioComponent]
    });
    fixture = TestBed.createComponent(UpladoCSVRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
