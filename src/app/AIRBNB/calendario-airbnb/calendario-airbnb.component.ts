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
  styleUrls: ['./calendario-airbnb.component.css','./calendario-airbnb2.component.css','./calendario-airbnb3.component.css']
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
  carregandoImagem: boolean = false; // Para controlar o carregamento da imagem
  // Objeto para controlar a visibilidade de cada seção
  sections: { [key in SectionKey]: boolean } = {
    hoje: true,
    andamento: false,
    proximas: false,
    finalizadas: false,
    bloqueadas: false
  };
  // Adicione estas novas propriedades para controle de carregamento
  loadedSections: { [key in SectionKey]: boolean } = {
    hoje: false,
    andamento: false,
    proximas: false,
    finalizadas: false,
    bloqueadas: false
  };

  loadingSections: { [key in SectionKey]: boolean } = {
    hoje: false,
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
    
    // Carrega a seção 'hoje' automaticamente
    this.sections.hoje = true; // Garante que a seção está visível
    this.loadSectionData('hoje'); // Força o carregamento dos dados
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
    const wasOpen = this.sections[section];
    this.sections[section] = !wasOpen;

    if (!wasOpen && !this.loadedSections[section]) {
      this.loadSectionData(section);
    }
  }

  private loadSectionData(section: SectionKey): void {
    this.loadingSections[section] = true;

    switch(section) {
      case 'hoje':
        this.reservasAirbnbService.getReservasHoje().subscribe({
          next: (reservas) => {
            this.reservasHoje = reservas.filter(reserva => !this.isBloqueado(reserva));
            this.credenciaisFetias = reservas.filter(r => r.credencial_made).length;

            this.loadedSections.hoje = true;
            this.loadingSections.hoje = false;
          },
          error: (error) => {
            console.error('Erro ao carregar reservas de hoje:', error);
            this.loadingSections.hoje = false;
          }
        });
        break;

      case 'proximas':
        this.reservasAirbnbService.getProximasReservas().subscribe({
          next: (reservas) => {
            this.proximasReservas = reservas.filter(reserva => !this.isBloqueado(reserva));

            this.loadedSections.proximas = true;
            this.loadingSections.proximas = false;
          },
          error: (error) => {
            console.error('Erro ao carregar próximas reservas:', error);
            this.loadingSections.proximas = false;
          }
        });
        break;

      case 'finalizadas':
        this.reservasAirbnbService.getReservasFinalizadas().subscribe({
          next: (reservas) => {
            this.reservasFinalizadas = reservas.filter(reserva => !this.isBloqueado(reserva));
            this.loadedSections.finalizadas = true;
            this.loadingSections.finalizadas = false;
          },
          error: (error) => {
            console.error('Erro ao carregar reservas finalizadas:', error);
            this.loadingSections.finalizadas = false;
          }
        });
        break;

      case 'andamento':
        this.reservasAirbnbService.getReservasEmAndamento().subscribe({
          next: (reservas) => {
            this.reservasAndamento = reservas.filter(reserva => !this.isBloqueado(reserva));
            this.loadedSections.andamento = true;
            this.loadingSections.andamento = false;
          },
          error: (error) => {
            console.error('Erro ao carregar reservas em andamento:', error);
            this.loadingSections.andamento = false;
          }
        });
        break;

      case 'bloqueadas':
        // Implemente similarmente se tiver um endpoint específico
        break;
    }
  }
  // Ao abrir o modal, chama a função do service para buscar o apartamento pelo id
  openModal(event: ReservaAirbnb): void {
    this.selectedReservation = event;
    this.carregandoImagem = true; // Reset do estado

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
    this.hospedesReserva = [];
    this.checkinFormService.getCheckinByReservaIdOrCodReserva(reserva_id.toString(), cod_reserva)
      .subscribe({
        next: (resposta) => {
          console.log(resposta)
          this.hospedesReserva = resposta;
          this.carregandoImagem = false; // Reset do estado

          console.log('Resposta do Check-in:', resposta);
        },
        error: (error) => {
          console.error('Erro ao obter o check-in:', error);
          this.carregandoImagem = false; // Reset do estado

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

  // Adicione no componente TS
downloadImage(base64: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = 'data:image/png;base64,' + base64;
  link.download = `${fileName}.png`;
  link.click();
}

downloadDocument(base64: string, fileName: string): void {
  const mimeType = this.isPDF(base64) ? 'application/pdf' : 'image/png';
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${fileName}.${mimeType.split('/')[1]}`;
  link.click();
}

exportData(): void {
  this.hospedesReserva.forEach((reserva) => {
    console.log(reserva)
    let count=0;
      if (reserva.documentBase64) {
        this.downloadDocument(reserva.documentBase64, reserva.CPF+"-documento");
        count++;
      } 
      if (reserva.imagemBase64) {
        this.downloadImage(reserva.imagemBase64, reserva.CPF+"-selfie");
        count++;
      }
       if(count!==0){
        console.error('Nenhum documento ou imagem disponível para download.');
      }
   })
}
formatarDataparaTable(dataISO:string):string {
  const data = new Date(dataISO);
  
  // Extrai componentes da data UTC (para manter fiel ao horário original)
  const horas = data.getUTCHours().toString().padStart(2, '0');
  const minutos = data.getUTCMinutes().toString().padStart(2, '0');
  const dia = data.getUTCDate().toString().padStart(2, '0');
  const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
  const ano = data.getUTCFullYear();

  return `${horas}:${minutos} - ${dia}/${mes}/${ano}`;
}



}
