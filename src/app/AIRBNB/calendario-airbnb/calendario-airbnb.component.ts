import { Component, OnInit } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
type SectionKey = 'hoje' | 'andamento' | 'proximas' | 'finalizadas';

@Component({
  selector: 'app-calendario-airbnb',
  templateUrl: './calendario-airbnb.component.html',
  styleUrls: ['./calendario-airbnb.component.css']
})
export class CalendarioAirbnbComponent implements OnInit {
  reservasAndamento: ReservaAirbnb[] = [];
  reservasHoje: ReservaAirbnb[] = [];
  proximasReservas: ReservaAirbnb[] = [];
  reservasFinalizadas: ReservaAirbnb[] = [];
  carregando: boolean = true;
  showModal: boolean = false;
  selectedReservation: ReservaAirbnb | undefined ;
  credenciaisFetias:number=0;
  // Objeto para controlar a visibilidade de cada seção
  sections: { [key in SectionKey]: boolean } = {
    hoje: true,
    andamento: false,
    proximas: false,
    finalizadas: false
  };
  constructor(private reservasAirbnbService: ReservasAirbnbService) { }

  ngOnInit(): void {
    this.reservasAirbnbService.getAllReservas().subscribe(
      data => {
        const eventosOrdenados = this.ordenarEventosPorData(data);
        this.categorizarReservas(eventosOrdenados);
        this.carregando = false;
      },
      error => {
        console.error('Erro ao obter os eventos do calendário', error);
        this.carregando = false;
      }
    );
  }

  private ordenarEventosPorData(eventos: ReservaAirbnb[]): ReservaAirbnb[] {
    return eventos.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }

  private categorizarReservas(eventos: ReservaAirbnb[]): void {
    const hojeUTC = new Date();
    hojeUTC.setUTCHours(0, 0, 0, 0);
    const hojeTime = hojeUTC.getTime();

    for (const evento of eventos) {
      const startDate = new Date(evento.start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      const startTime = startDate.getTime();

      const endDate = new Date(evento.end_data);
      endDate.setUTCHours(0, 0, 0, 0);
      const endTime = endDate.getTime();

      if (hojeTime > startTime && hojeTime < endTime) {
        this.reservasAndamento.push(evento);
      } else if (hojeTime === startTime) {
        this.reservasHoje.push(evento);
        if(evento.credencial_made){
          this.credenciaisFetias++;
        }
      } else if (startTime > hojeTime) {
        this.proximasReservas.push(evento);
      } else if (endTime < hojeTime) {
        this.reservasFinalizadas.push(evento);
      }
    }
  }

  formatarData(dataString: string): string {
    const data = new Date(dataString);
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  formatarDataBanco(dataString: string): string {
    const data = new Date(dataString);
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();
    return `${ano}-${mes}-${dia}`;
  }
  // Método para alternar a visibilidade das seções
  toggleSection(section: SectionKey): void {
    this.sections[section] = !this.sections[section];
  }
  openModal(event:ReservaAirbnb): void {
    this.selectedReservation = event;
    this.showModal = true;
  }
  closeModal(): void {
    this.showModal = false;
  }
  updateStatus(reserva: any, field: string, event: Event,type:string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;
    if(type == "reservasHoje"){
      if(reserva.credencial_made){
        this.credenciaisFetias++;
      }else{
        this.credenciaisFetias--;
      }
    }
    reserva.start_date = this.formatarDataBanco(reserva.start_date);
    reserva.end_data = this.formatarDataBanco(reserva.end_data);
    
    console.log(reserva)
    this.reservasAirbnbService.updateReserva(reserva).subscribe(
      data => {
      },
      error => {
        console.error('Erro ao obter os eventos do calendário', error);
     
      }
    );
  }

  updateTime(): void {
  if(this.selectedReservation){
    console.log(this.selectedReservation)
      // Atualiza a reserva no banco de dados
      this.reservasAirbnbService.updateReserva(this.selectedReservation).subscribe(
        data => {
          console.log('Horário atualizado com sucesso', data);
        },
        error => {
          console.error('Erro ao atualizar o horário', error);
        }
      );
    }
  }

}

