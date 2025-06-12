import { Component, OnInit } from '@angular/core';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento'; // caso precise usar os dados do apartamento
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

type SectionKey = 'hoje' | 'amanha' |'andamento' | 'proximas' | 'finalizadas' | 'bloqueadas';

@Component({
  selector: 'app-calendario-airbnb',
  templateUrl: './calendario-airbnb.component.html',
  styleUrls: ['./calendario-airbnb.component.css','./calendario-airbnb2.component.css','./calendario-airbnb3.component.css']
})
export class CalendarioAirbnbComponent implements OnInit {
  reservasAndamento: ReservaAirbnb[] = [];
  reservasHoje: ReservaAirbnb[] = [];
  reservasAmanha: ReservaAirbnb[] = [];
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
  whatsLoading: boolean = false; // Para controlar o carregamento da imagem
  
  // Objeto para controlar a visibilidade de cada seção
  sections: { [key in SectionKey]: boolean } = {
    hoje: true,
    amanha: false,
    andamento: false,
    proximas: false,
    finalizadas: false,
    bloqueadas: false
  };
  // Adicione estas novas propriedades para controle de carregamento
  loadedSections: { [key in SectionKey]: boolean } = {
    hoje: false,
    amanha:false,
    andamento: false,
    proximas: false,
    finalizadas: false,
    bloqueadas: false
  };

  loadingSections: { [key in SectionKey]: boolean } = {
    hoje: false,
    amanha:false,
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
    private toastr: ToastrService

    
  ) { }

  ngOnInit(): void {
 
    
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
            console.log(reservas)
            this.reservasHoje      = this.tratarReservas(reservas);
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
      case 'amanha':
        this.reservasAirbnbService.getReservasAmanha().subscribe({
          next: (reservas) => {
            this.reservasAmanha      = this.tratarReservas(reservas);
            // Corrigindo aqui: contar apenas onde credencial_made é true      
            this.loadedSections.amanha = true;
            this.loadingSections.amanha = false;
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
            this.proximasReservas  = this.tratarReservas(reservas);
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
            this.reservasFinalizadas  = this.tratarReservas(reservas);
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
            this.reservasAndamento  = this.tratarReservas(reservas);
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
  
    // Modificação aqui: só atualiza o contador se for o campo credencial_made
    if (field === 'credencial_made') {
      if (type === "reservasHoje") {
        if (checked) {
          this.credenciaisFetias++;
        } else {
          this.credenciaisFetias--;
        }
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

enviarCredenciaisPorCheckins(): void {
  const ids = this.hospedesReserva.map(h => h.id);
  if (!ids.length) {
    console.warn('Nenhum hóspede para enviar.');
    return;
  }
  this.whatsLoading = true;
  this.checkinFormService.envioPorCheckins(ids)
    .subscribe({
      next: () => {
        this.toastr.success("Mensagem enviada com sucesso!")
        // Aqui você pode exibir toast ou modal de sucesso
        this.whatsLoading = false;
      },
      error: (error) => {
        console.error('Falha ao solicitar envio:', error);
        // E exibir mensagem de erro ao usuário
        this.whatsLoading = false;
        this.toastr.error("Erro ao enviar mensagem!")
      }
    });
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

formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 11) {
    // Formato celular: 2 + 5 + 4
    return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (digitos.length === 10) {
    // Formato fixo: 2 + 4 + 4
    return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  // Caso não corresponda aos formatos acima, retorna original
  return telefone;
}

  /**
   * Formata um CPF para o padrão brasileiro: XXX.XXX.XXX-XX
   */
  formatarCPF(cpf: string): string {
    const digitos = cpf.replace(/\D/g, '');
    if (digitos.length === 11) {
      return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    // Caso não seja um CPF válido de 11 dígitos, retorna original
    return cpf;
  }
  getMenorHorarioPrevistoChegada(horarios: (string | null | undefined)[]): string {
    // 1) Filtra apenas strings não vazias e no formato HH:MM
    const validos = (<string[]>horarios.filter(h => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h)));

    if (validos.length === 0) {
      return '15:00';
    }

    // 2) Converte para objeto com minutos totais
    const tempos = validos.map(h => {
      if (typeof h === 'string') {
        const [hh, mm] = h.split(':').map(Number);
        return {
          original: h,
          totalMin: hh * 60 + mm
        };
      }
      // fallback, should not happen due to filter
      return { original: '', totalMin: Number.MAX_SAFE_INTEGER };
    });

    // 3) Encontra o objeto com menor totalMin
    const menor = tempos.reduce((prev, curr) =>
      curr.totalMin < prev.totalMin ? curr : prev
    );

    // 4) Retorna a string no formato HH:MM
    return typeof menor.original === 'string' ? menor.original : '';
  }

  private ordenarCanceladas(reservas: ReservaAirbnb[]): ReservaAirbnb[] {
    const naoCanceladas = reservas.filter(r => r.description !== 'CANCELADA');
    const canceladas    = reservas.filter(r => r.description === 'CANCELADA');
    return [...naoCanceladas, ...canceladas];
  }

    private ordenarAlfabetica(reservas: ReservaAirbnb[], campo: keyof Pick<ReservaAirbnb, 'apartamento_nome' | 'cod_reserva' | 'description'>): ReservaAirbnb[] {
    return reservas.slice().sort((a, b) => {
      const va = (a[campo] ?? '').toString().toLowerCase();
      const vb = (b[campo] ?? '').toString().toLowerCase();
      return va.localeCompare(vb);
    });
  }

  private tratarReservas(reservas: ReservaAirbnb[]): ReservaAirbnb[] {
    // 1) remove bloqueadas
    const semBloqueio = reservas.filter(r => !this.isBloqueado(r));

    // 2) separa canceladas
    const naoCanceladas = semBloqueio.filter(r => r.description !== 'CANCELADA');
    const canceladas    = semBloqueio.filter(r => r.description === 'CANCELADA');

    // 3) ordena alfabeticamente cada grupo
    const naoCancelAlfa = this.ordenarAlfabetica(naoCanceladas, 'apartamento_nome');
    const cancelAlfa    = this.ordenarAlfabetica(canceladas,    'apartamento_nome');

    // 4) retorna não-canceladas primeiro, depois canceladas
    return [...naoCancelAlfa, ...cancelAlfa];
  }
}
