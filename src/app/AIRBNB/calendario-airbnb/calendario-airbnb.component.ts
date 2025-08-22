import { Component, OnInit } from '@angular/core';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { MercadoPagoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/mercadoPago_service';

@Component({
  selector: 'app-calendario-airbnb',
  templateUrl: './calendario-airbnb.component.html',
  styleUrls: [
    './calendario-airbnb.component.css',
    './calendario-airbnb2.component.css',
    './calendario-airbnb3.component.css'
  ]
})
export class CalendarioAirbnbComponent implements OnInit {
  todasReservas: ReservaAirbnb[] = [];
  reservasFiltradas: ReservaAirbnb[] = [];
  carregando: boolean = true;
  showModal: boolean = false;
  selectedReservation: ReservaAirbnb | undefined;
  hospedesReserva: any[] = [];
  carregandoImagem: boolean = false;
  whatsLoading: boolean = false;
  linkPagamento: string = '';
  credenciaisFetias: number = 0;
  earlyLoading: boolean = false;
  // Datas para filtro
  dataInicio: string;
  dataFim: string;
  searchTerm: string = '';
  reservasExibidas: ReservaAirbnb[] = [];

  constructor(
    private reservasAirbnbService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService,
    private checkinFormService: CheckInFormService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private mercadoPagoService: MercadoPagoService
  ) {
    // Definir datas padrão (últimos 30 dias e próximos 30 dias)
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    const trintaDiasAFrente = new Date();
    trintaDiasAFrente.setDate(hoje.getDate() + 30);

    this.dataInicio = this.formatarDataParaInput(hoje);
    this.dataFim = this.formatarDataParaInput(hoje);
  }

  ngOnInit(): void {
    this.carregarReservasPorPeriodo();
  }

  private formatarDataParaInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  carregarReservasPorPeriodo(): void {
    this.carregando = true;
    
    // Chamar o serviço com as datas atuais
    this.reservasAirbnbService.getReservasPorPeriodo(this.dataInicio, this.dataFim)
      .subscribe({
        next: (reservas) => {
          this.todasReservas = this.tratarReservas(reservas);
          this.reservasFiltradas = [...this.todasReservas];
          this.credenciaisFetias = this.reservasFiltradas.filter(r => r.credencial_made).length;
          // aplica busca inicial (vazia)
          this.aplicarSearch();
          this.carregando = false;
        },
        error: (error) => {
          console.error('Erro ao carregar reservas:', error);
          this.carregando = false;
          this.toastr.error('Erro ao carregar reservas');
        }
      });
  }
  aplicarSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.reservasExibidas = [...this.reservasFiltradas];
    } else {
      this.reservasExibidas = this.reservasFiltradas.filter(r =>
        (r.apartamento_nome  ?? '').toLowerCase().includes(term)
        || (r.cod_reserva     ?? '').toLowerCase().includes(term)
      );
    }
  }

  private isBloqueado(evento: ReservaAirbnb): boolean {
    return evento.description !== 'Reserved';
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

  openModal(event: ReservaAirbnb): void {
    this.selectedReservation = event;
    this.carregandoImagem = true;
    this.hospedesReserva = [];
    this.showModal = true;

    console.log('Reserva selecionada:', this.selectedReservation);
    if (this.selectedReservation.id) {
      this.getRespostasByReservaId(
        this.selectedReservation.id.toString(),
        this.selectedReservation.cod_reserva
      );
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.linkPagamento = "";
  }

  updateStatus(reserva: any, field: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;

    if (field === 'credencial_made') {
      if (checked) {
        this.credenciaisFetias++;
      } else {
        this.credenciaisFetias--;
      }
    }

    reserva.start_date = this.formatarDataBanco(reserva.start_date);
    reserva.end_data = this.formatarDataBanco(reserva.end_data);

    this.reservasAirbnbService.updateReserva(reserva).subscribe(
      () => {
        // Ação opcional após sucesso
      },
      error => {
        console.error('Erro ao atualizar reserva', error);
      }
    );
  }

  updateTime(): void {
    if (this.selectedReservation) {
      this.selectedReservation.start_date = this.formatarDataBanco(this.selectedReservation.start_date);
      this.selectedReservation.end_data = this.formatarDataBanco(this.selectedReservation.end_data);

      this.reservasAirbnbService.updateReserva(this.selectedReservation).subscribe(
        () => {
          console.log('Horário atualizado com sucesso');
        },
        error => {
          console.error('Erro ao atualizar o horário', error);
        }
      );
    }
  }

  getRespostasByReservaId(reserva_id: string, cod_reserva: string): void {
    this.checkinFormService.getCheckinByReservaIdOrCodReserva(reserva_id, cod_reserva)
      .subscribe({
        next: (resposta) => {
          this.hospedesReserva = resposta;
          this.carregandoImagem = false;
        },
        error: (error) => {
          console.error('Erro ao obter o check-in:', error);
          this.carregandoImagem = false;
        }
      });
  }

  isPDF(base64: string): boolean {
    return base64.startsWith('JVBERi0');
  }

  getSafeUrl(base64: string): SafeResourceUrl {
    const pdfSrc = `data:application/pdf;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfSrc);
  }

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
      let count = 0;
      if (reserva.documentBase64) {
        this.downloadDocument(reserva.documentBase64, reserva.CPF + "-documento");
        count++;
      }
      if (reserva.imagemBase64) {
        this.downloadImage(reserva.imagemBase64, reserva.CPF + "-selfie");
        count++;
      }
      if (count === 0) {
        console.error('Nenhum documento ou imagem disponível para download.');
      }
    });
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
          this.toastr.success("Mensagem enviada com sucesso!");
          this.whatsLoading = false;
        },
        error: (error) => {
          console.error('Falha ao solicitar envio:', error);
          this.whatsLoading = false;
          this.toastr.error("Erro ao enviar mensagem!");
        }
      });
  }

  formatarDataparaTable(dataISO: string): string {
    const data = new Date(dataISO);
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
      return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (digitos.length === 10) {
      return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
  }

  formatarCPF(cpf: string): string {
    const digitos = cpf.replace(/\D/g, '');
    if (digitos.length === 11) {
      return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  }

  getMenorHorarioPrevistoChegada(horarios: (string | null | undefined)[]): string {
    const validos = (<string[]>horarios.filter(h => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h)));
    if (validos.length === 0) {
      return '15:00';
    }
    const tempos = validos.map(h => {
      const [hh, mm] = h.split(':').map(Number);
      return {
        original: h,
        totalMin: hh * 60 + mm
      };
    });
    const menor = tempos.reduce((prev, curr) =>
      curr.totalMin < prev.totalMin ? curr : prev
    );
    return menor.original;
  }

  private ordenarCanceladas(reservas: ReservaAirbnb[]): ReservaAirbnb[] {
    const naoCanceladas = reservas.filter(r => r.description !== 'CANCELADA');
    const canceladas = reservas.filter(r => r.description === 'CANCELADA');
    return [...naoCanceladas, ...canceladas];
  }

  private ordenarAlfabetica(
    reservas: ReservaAirbnb[],
    campo: keyof Pick<ReservaAirbnb, 'apartamento_nome' | 'cod_reserva' | 'description'>
  ): ReservaAirbnb[] {
    return reservas.slice().sort((a, b) => {
      const va = (a[campo] ?? '').toString().toLowerCase();
      const vb = (b[campo] ?? '').toString().toLowerCase();
      return va.localeCompare(vb);
    });
  }

  private tratarReservas(reservas: ReservaAirbnb[]): ReservaAirbnb[] {
    const semBloqueio = reservas.filter(r => !this.isBloqueado(r));
    const naoCanceladas = semBloqueio.filter(r => r.description !== 'CANCELADA');
    const canceladas = semBloqueio.filter(r => r.description === 'CANCELADA');
    const naoCancelAlfa = this.ordenarAlfabetica(naoCanceladas, 'apartamento_nome');
    const cancelAlfa = this.ordenarAlfabetica(canceladas, 'apartamento_nome');
    return [...naoCancelAlfa, ...cancelAlfa];
  }

  sendEarlyPayment(hospede: any): void {
    if (!this.selectedReservation) {
      this.toastr.warning('Selecione uma reserva antes de enviar o pagamento.');
      return;
    }
    this.earlyLoading = true;
    const payload: any = {
      user_id: hospede?.user_id,
      apartamento_id: this.selectedReservation.apartamento_id,
      cod_reserva: this.selectedReservation.cod_reserva,
      valorReais: 30,
      tipo: 'early',
      metadata: {
        hospede_id: hospede?.id,
        hospede_nome: hospede?.first_name
      }
    };

    this.mercadoPagoService.createPayment(payload)
      .subscribe({
        next: (resp: any) => {
          this.linkPagamento = resp.redirectUrl;
           this.earlyLoading = false;
        },
        error: (err) => {
          console.error('Erro ao criar pagamento early:', err);
          this.toastr.error('Não foi possível gerar o link de pagamento.');
        }
      });
  }
  /** Retorna true se existir algum pagamento do tipo especificado */
  hasPaymentType(type: string, reserva: ReservaAirbnb | undefined): boolean {
    return !!reserva
      && Array.isArray(reserva.pagamentos)
      && reserva.pagamentos.some(p => p.tipo === type);
  }
  setPeriodoHoje(): void {
    const hoje = new Date();
    const iso = this.formatarDataParaInput(hoje);
    this.dataInicio = iso;
    this.dataFim = iso;
    this.carregarReservasPorPeriodo();
  }

  setPeriodoAmanha(): void {
    const manha = new Date();
    manha.setDate(manha.getDate() + 1);
    const iso = this.formatarDataParaInput(manha);
    this.dataInicio = iso;
    this.dataFim = iso;
    this.carregarReservasPorPeriodo();
  }

  typeReserva(link: string | undefined | null): string {
    if (!link) {
      return 'Desconhecido';
    }
    if (link.toLowerCase().includes('airbnb')) {
      return 'AIRBNB';
    } else  if (link.toLowerCase().includes('booking')) {
      return 'BOOKING';
    } else {
      return 'STAYS';
    }
  }
}