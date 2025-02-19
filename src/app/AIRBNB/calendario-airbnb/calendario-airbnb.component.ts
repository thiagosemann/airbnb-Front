import { Component, OnInit } from '@angular/core';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento'; // caso precise usar os dados do apartamento
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { Router } from '@angular/router';

type SectionKey = 'hoje' | 'andamento' | 'proximas' | 'finalizadas' | 'bloqueadas';

@Component({
  selector: 'app-calendario-airbnb',
  templateUrl: './calendario-airbnb.component.html',
  styleUrls: ['./calendario-airbnb.component.css','./calendario-airbnb2.component.css']
})
export class CalendarioAirbnbComponent implements OnInit {
  reservasAndamento: ReservaAirbnb[] = [];
  reservasHoje: ReservaAirbnb[] = [];
  proximasReservas: ReservaAirbnb[] = [];
  reservasFinalizadas: ReservaAirbnb[] = [];
  carregando: boolean = true;
  showModal: boolean = false;
  selectedReservation: ReservaAirbnb | undefined;
  selectedApartment: Apartamento | undefined; // para armazenar os dados do apartamento retornado
  credenciaisFetias: number = 0;
  hospedesReserva:any[] =[];
  reservasBloqueadas: ReservaAirbnb[] = [];

  // Objeto para controlar a visibilidade de cada seção
  sections: { [key in SectionKey]: boolean } = {
    hoje: true,
    andamento: false,
    proximas: false,
    finalizadas: false,
    bloqueadas: false
  };

  constructor(
    private reservasAirbnbService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService,
    private checkinFormService: CheckInFormService,
    private sanitizer: DomSanitizer,
    private authService: AuthenticationService,
    private router: Router 
    
  ) { }

  ngOnInit(): void {
    let user = this.authService.getUser();
    if(user && user.role!="admin"){
      this.router.navigate(['/login']);

    }
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
      // Verificar se é bloqueado primeiro
      if (this.isBloqueado(evento)) {
        this.reservasBloqueadas.push(evento);
        continue; // Pula para próxima iteração
      }
  
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
        if (evento.credencial_made) {
          this.credenciaisFetias++;
        }
      } else if (startTime > hojeTime) {
        this.proximasReservas.push(evento);
      } else {
        this.reservasFinalizadas.push(evento);
      }
    }
  }
  
  private isBloqueado(evento: ReservaAirbnb): boolean {
    return evento.cod_reserva.includes(evento.apartamento_nome);
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

  // Ao abrir o modal, chama a função do service para buscar o apartamento pelo id
  openModal(event: ReservaAirbnb): void {
    this.selectedReservation = event;
    // Supondo que 'apartamento_id' é a propriedade que contém o id do apartamento na reserva
    this.apartamentoService.getApartamentoById(event.apartamento_id).subscribe(
      (apartamento) => {
        console.log("Apartamento retornado:", apartamento);
        this.selectedApartment = apartamento; // armazena os dados para uso no modal, se necessário
        this.showModal = true;
      },
      (error) => {
        console.error("Erro ao buscar apartamento:", error);
        // Mesmo em caso de erro, pode abrir o modal ou tratar a falha de forma adequada
        this.showModal = true;
      }
    );
    if(this.selectedReservation.id){
      this.getRespostasByReservaId(this.selectedReservation.id.toString(),this.selectedReservation.cod_reserva)
    }
  }

  closeModal(): void {
    this.showModal = false;
  }

  updateStatus(reserva: any, field: string, event: Event, type: string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;
    if (type == "reservasHoje") {
      if (reserva.credencial_made) {
        this.credenciaisFetias++;
      } else {
        this.credenciaisFetias--;
      }
    }
    reserva.start_date = this.formatarDataBanco(reserva.start_date);
    reserva.end_data = this.formatarDataBanco(reserva.end_data);

    this.reservasAirbnbService.updateReserva(reserva).subscribe(
      data => {
        // ação após atualizar a reserva, se necessário
      },
      error => {
        console.error('Erro ao atualizar reserva', error);
      }
    );
  }

  updateTime(): void {
    if (this.selectedReservation) {
      console.log(this.selectedReservation);
      this.selectedReservation.start_date = this.formatarDataBanco(this.selectedReservation.start_date);
      this.selectedReservation.end_data = this.formatarDataBanco(this.selectedReservation.end_data);
  
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

  getRespostasByReservaId(reserva_id:string,cod_reserva:string): void {
  
    this.checkinFormService.getCheckinByReservaIdOrCodReserva(reserva_id.toString(), cod_reserva)
      .subscribe({
        next: (resposta) => {
          console.log(resposta)
          this.hospedesReserva = resposta;
          console.log('Resposta do Check-in:', resposta);
        },
        error: (error) => {
          console.error('Erro ao obter o check-in:', error);
        }
      });
  }

  isPDF(base64: string): boolean {
    // Verifica se o base64 começa com o cabeçalho de um PDF
    return base64.startsWith('JVBERi0'); // Assinatura de um arquivo PDF em base64
  }
  
  // Função para criar uma URL segura para exibição do PDF
  getSafeUrl(base64: string): SafeResourceUrl {
    const pdfSrc = `data:application/pdf;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfSrc);
  }
  findIfBloqued(event: any): string {
    return event.cod_reserva;
  }
}
