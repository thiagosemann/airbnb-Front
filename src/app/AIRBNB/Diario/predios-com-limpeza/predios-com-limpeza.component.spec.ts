import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { PrediosComLimpezaComponent } from './predios-com-limpeza.component';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ToastrService } from 'ngx-toastr';

describe('PrediosComLimpezaComponent', () => {
  let component: PrediosComLimpezaComponent;
  let fixture: ComponentFixture<PrediosComLimpezaComponent>;

  beforeEach(() => {
    const reservasAirbnbServiceMock = {
      getFaxinasPorPeriodo: jasmine.createSpy().and.returnValue(of([]))
    } as unknown as ReservasAirbnbService;

    const apartamentoServiceMock = {
      getAllApartamentos: jasmine.createSpy().and.returnValue(of([]))
    } as unknown as ApartamentoService;

    const predioServiceMock = {
      getAllPredios: jasmine.createSpy().and.returnValue(of([]))
    } as unknown as PredioService;

    const userServiceMock = {
      getUsersByRole: jasmine.createSpy().and.returnValue(of([]))
    } as unknown as UserService;

    const toastrServiceMock = {
      error: jasmine.createSpy('error')
    } as unknown as ToastrService;

    TestBed.configureTestingModule({
      declarations: [PrediosComLimpezaComponent],
      imports: [FormsModule],
      providers: [
        { provide: ReservasAirbnbService, useValue: reservasAirbnbServiceMock },
        { provide: ApartamentoService, useValue: apartamentoServiceMock },
        { provide: PredioService, useValue: predioServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ToastrService, useValue: toastrServiceMock }
      ]
    });
    fixture = TestBed.createComponent(PrediosComLimpezaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
