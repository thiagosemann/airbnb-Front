import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { MercadoPagoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/mercadoPago_service';
import { CadastroMensagemViaLinkService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/mensagemCadastroViaLink_service';
import { DemandasService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/demandas_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { Demanda } from 'src/app/shared/utilitarios/demanda';

@Component({
  selector: 'app-calendario-airbnb',
  templateUrl: './calendario-airbnb.component.html',
  styleUrls: [
    './calendario-airbnb.component.css',
    './calendario-airbnb2.component.css',
    './calendario-airbnb3.component.css'
  ]
})
export class CalendarioAirbnbComponent implements OnInit, OnDestroy {
  todasReservas: ReservaAirbnb[] = [];
  reservasFiltradas: ReservaAirbnb[] = [];
  carregando: boolean = true;
  showModal: boolean = false;
  selectedReservation: ReservaAirbnb | undefined;
  hospedesReserva: any[] = [];
  carregandoImagem: boolean = false;
  whatsLoading: boolean = false;
  linkPagamento: string = '';
  textoEarlyGerado: string = '';
  valorEarly: number = 30; // default value
  credenciaisFetias: number = 0;
  earlyLoading: boolean = false;
  // estado de envio do link de formulário de check-in
  sendLinkLoading: boolean = false;
  // controla exibição da sanfona para cadastro rápido pelo gestor
  showCadastroAccordion: boolean = false;
  // Datas para filtro
  dataInicio: string;
  dataFim: string;
  searchTerm: string = '';
  reservasExibidas: ReservaAirbnb[] = [];

  // Armazena URLs temporárias criadas para preview de PDFs
  private pdfObjectUrls: string[] = [];

  // Popover de observações expandidas
  showObsPopover: boolean = false;
  selectedObsText: string = '';
  obsPopoverPosition: { top: number; left: number } = { top: 0, left: 0 };

  constructor(
    private reservasAirbnbService: ReservasAirbnbService,
    private checkinFormService: CheckInFormService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService,
    private mercadoPagoService: MercadoPagoService,
    private cadastroMensagemViaLinkService: CadastroMensagemViaLinkService,
    private demandasService: DemandasService,
    private authService: AuthenticationService
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
    this.carregarPeriodo();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrls();
  }

  private formatarDataParaInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Converte 'yyyy-MM-dd' (ou 'yyyy-MM-ddTHH:mm') para 'dd/MM/yyyy' sem criar Date
  private toBrDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    const onlyDate = String(dateStr).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return dateStr;
  }
  // Converte 'dd/MM/yyyy' para 'yyyy-MM-dd' (ou retorna já ISO se vier assim)
  private toIsoDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    const onlyDate = String(dateStr).split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;
    const m = onlyDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return dateStr;
  }

  carregarReservasPorPeriodo(): void {
    this.carregando = true;

    // Chamar o serviço com as datas atuais
    this.reservasAirbnbService.getReservasPorPeriodo(this.dataInicio, this.dataFim)
      .subscribe({
        next: (reservas) => {
          console.log('Reservas carregadas:', reservas);
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

  carregarPeriodo(): void {
    this.carregarReservasPorPeriodo();
  }
  aplicarSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.reservasExibidas = [...this.reservasFiltradas];
    } else {
      this.reservasExibidas = this.reservasFiltradas.filter(r =>
        (r.apartamento_nome ?? '').toLowerCase().includes(term)
        || (r.cod_reserva ?? '').toLowerCase().includes(term)
      );
    }
  }

  private isBloqueado(evento: ReservaAirbnb): boolean {
    return evento.description !== 'Reserved';
  }

  formatarData(dataString: string): string {
    return this.toBrDate(dataString);
  }

  formatarDataBanco(dataString: string): string {
    return this.toIsoDate(dataString);
  }

  openModal(event: ReservaAirbnb): void {
    this.selectedReservation = event;
    this.carregandoImagem = true;
    this.hospedesReserva = [];
    this.showModal = true;
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
    this.revokeObjectUrls();
  }

  updateStatus(reserva: any, field: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;

    if (field === 'credencial_made') {
      if (checked) {
        this.credenciaisFetias++;
        // Criar demanda de credencial concluída
        const user = this.authService.getUser();
        if (user && user.id) {
          const horaAtual = new Date().getHours();
          let periodoStr = 'tarde';
          if (horaAtual >= 18 || horaAtual < 6) {
            periodoStr = 'noite';
          } else if (horaAtual >= 6 && horaAtual < 12) {
            periodoStr = 'manha';
          }

          const novaDemanda: Partial<Demanda> = {
            apartamento_id: reserva.apartamento_id,
            user_id_responsavel: user.id, // Atribui ao próprio usuário atual para não ficar sem responsável
            user_id_created: user.id,
            reserva_id: reserva.id,
            demanda: `Credencial para a reserva ${reserva.cod_reserva}`,
            prazo: reserva.start_date,
            periodo: periodoStr,
            type: 'escritorio',
            status: 'Finalizada'
          };
          this.demandasService.createDemanda(novaDemanda).subscribe({
            next: () => this.toastr.success('Demanda de credencial criada com sucesso!'),
            error: (err) => console.error('Erro ao criar demanda de credencial', err)
          });
        }
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
          this.toastr.success('Horário atualizado com sucesso');
        },
        error => {
          this.toastr.error('Erro ao atualizar o horário', error);
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

  // Normaliza base64 removendo prefixos data:*;base64, espaços e quebras de linha
  private normalizeBase64(b64: string | null | undefined): string {
    if (!b64) return '';
    return String(b64).replace(/^data:.*;base64,/, '').replace(/\s/g, '').trim();
  }

  isPDF(base64: string): boolean {
    try {
      const clean = this.normalizeBase64(base64);
      if (!clean) return false;
      const header = atob(clean).slice(0, 5);
      return header === '%PDF-';
    } catch {
      return false;
    }
  }

  getSafeUrl(base64: string): SafeResourceUrl {
    const clean = this.normalizeBase64(base64);
    const byteChars = atob(clean);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    this.pdfObjectUrls.push(url);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  downloadImage(base64: string, fileName: string): void {
    const clean = this.normalizeBase64(base64);
    const byteChars = atob(clean);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${fileName}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  downloadDocument(base64: string, fileName: string): void {
    const clean = this.normalizeBase64(base64);
    const mimeType = this.isPDF(clean) ? 'application/pdf' : 'image/png';
    const byteCharacters = atob(clean);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const link = document.createElement('a');
    const objectUrl = window.URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `${fileName}.${mimeType.split('/')[1]}`;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  }

  private revokeObjectUrls(): void {
    if (this.pdfObjectUrls && this.pdfObjectUrls.length) {
      this.pdfObjectUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch { }
      });
      this.pdfObjectUrls = [];
    }
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

  sendEarlyPayment(): void {
    if (!this.selectedReservation) {
      this.toastr.warning('Selecione uma reserva antes de gerar o pagamento.');
      return;
    }

    // Pega o primeiro hóspede como referência, se houver
    const hospedeRef = this.hospedesReserva && this.hospedesReserva.length > 0 ? this.hospedesReserva[0] : null;

    this.earlyLoading = true;
    const payload: any = {
      user_id: hospedeRef?.user_id || null,
      apartamento_id: this.selectedReservation.apartamento_id,
      cod_reserva: this.selectedReservation.cod_reserva,
      valorReais: this.valorEarly,
      tipo: 'early',
      metadata: {
        hospede_id: hospedeRef?.id || null,
        hospede_nome: hospedeRef?.first_name || 'Desconhecido'
      }
    };

    this.mercadoPagoService.createPayment(payload)
      .subscribe({
        next: (resp: any) => {
          this.linkPagamento = resp.redirectUrl;
          this.gerarTextoEarly();
          this.earlyLoading = false;
        },
        error: (err) => {
          console.error('Erro ao criar pagamento early:', err);
          this.toastr.error('Não foi possível gerar o link de pagamento.');
          this.earlyLoading = false;
        }
      });
  }

  gerarTextoEarly(): void {
    const valor = this.valorEarly;
    const hospedeRef = this.hospedesReserva && this.hospedesReserva.length > 0 ? this.hospedesReserva[0] : null;
    const nome = hospedeRef?.first_name || 'Hóspede';
    const apartamento = this.selectedReservation?.apartamento_nome || '';
    const cod_reserva = this.selectedReservation?.cod_reserva || '';

    this.textoEarlyGerado = `*TAXA OPCIONAL*\n\n🔔 *Você gostaria de entrar antes no apartamento?* 🔔\n\nOlá ${nome}\nEste apartamento já está limpo e pronto para recebe-los.\nSe desejar antecipar sua entrada no apartamento *${apartamento}* (reserva: *${cod_reserva}*),\nbasta clicar no link abaixo e efetuar o pagamento de *R$ ${valor.toFixed(2)}*:\n\n\n${this.linkPagamento}\n\nApós a confirmação, enviaremos instruções de acesso.\n\nQualquer dúvida, estamos à disposição!`;
  }

  copiarTextoEarly(): void {
    if (!this.textoEarlyGerado) {
      this.toastr.warning('Texto não gerado.');
      return;
    }

    navigator.clipboard.writeText(this.textoEarlyGerado).then(() => {
      this.toastr.success('Texto copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar texto early: ', err);
      this.toastr.error('Erro ao copiar o texto.');
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
    this.carregarPeriodo();
  }

  setPeriodoAmanha(): void {
    const manha = new Date();
    manha.setDate(manha.getDate() + 1);
    const iso = this.formatarDataParaInput(manha);
    this.dataInicio = iso;
    this.dataFim = iso;
    this.carregarPeriodo();
  }

  setPeriodoUmaSemana(): void {
    const umaSemana = new Date();
    umaSemana.setDate(umaSemana.getDate() + 7);
    const iso = this.formatarDataParaInput(umaSemana);
    this.dataFim = iso;
    this.carregarPeriodo();
  }
  typeReserva(cod_reserva: string | undefined | null): string {
    if (!cod_reserva) {
      return 'Desconhecido';
    }
    if (cod_reserva.toLowerCase().includes('b-')) {
      return 'BOOKING';
    } else if (cod_reserva.toLowerCase().includes('stays')) {
      return 'STAYS';
    } else {
      return 'AIRBNB';
    }
  }
  updateTelefone(): void {
    if (!this.selectedReservation) {
      return
    }
    if (!this.selectedReservation.telefone_principal) {
      return
    }
    if (this.selectedReservation.telefone_principal.length !== 11) {
      return;
    }
    this.selectedReservation.start_date = this.formatarDataBanco(this.selectedReservation.start_date);
    this.selectedReservation.end_data = this.formatarDataBanco(this.selectedReservation.end_data);

    if (this.selectedReservation) {
      this.reservasAirbnbService.updateReserva(this.selectedReservation).subscribe(
        () => {
          this.toastr.success('Telefone atualizado com sucesso');
        },
        error => {
          this.toastr.error('Erro ao atualizar o telefone', error);
        }
      );
    }
  }

  /**
   * Salva (temporariamente apenas loga) as observações da reserva.
   * Chamado quando o textarea perde o foco.
   */
  saveObservacoes(): void {
    if (!this.selectedReservation) return;

    // Preparar dados: garantir datas no formato do backend
    try {
      this.selectedReservation.start_date = this.formatarDataBanco(this.selectedReservation.start_date);
      this.selectedReservation.end_data = this.formatarDataBanco(this.selectedReservation.end_data);
    } catch (e) {
      // se algo der errado na conversão, ainda tentamos enviar
    }

    // Chamar service para atualizar a reserva com as observações
    this.reservasAirbnbService.updateReserva(this.selectedReservation)
      .subscribe({
        next: () => {
        },
        error: (err) => {
          console.error('Erro ao salvar observações:', err);
          this.toastr.error('Erro ao salvar observações');
        }
      });
  }

  sendMensagemCadastroViaLink(): void {
    if (!this.selectedReservation) {
      return;
    }
    if (!this.selectedReservation.id) {
      return;
    }
    this.sendLinkLoading = true;
    this.cadastroMensagemViaLinkService.enviarMensagemCadastro(this.selectedReservation.id).subscribe({
      next: () => {
        this.toastr.success("Mensagem enviada com sucesso!");
        this.sendLinkLoading = false;
      },
      error: (error) => {
        console.error('Falha ao solicitar envio:', error);
        this.toastr.error("Erro ao enviar mensagem!");
        this.sendLinkLoading = false;
      }
    });
  }

  copiarTextoCheckin(): void {
    if (!this.selectedReservation) {
      this.toastr.warning('Selecione uma reserva primeiro.');
      return;
    }

    const obj = {
      tipoSite: this.typeReserva(this.selectedReservation.cod_reserva),
      dataEntrada: this.selectedReservation.start_date,
      dataSaida: this.selectedReservation.end_data
    };

    let text = `Forest:\nObrigado por escolher nossa acomodação!\nPara acessar o condomínio, é necessário que todos os hóspedes realizem o cadastro no link abaixo.\nEssas informações serão utilizadas exclusivamente para controle de acesso ao condomínio.\n`;
    text += `${obj.tipoSite}:\n`;
    text += `Início:  ${this.formatarData(obj.dataEntrada)}\n`;
    text += `Término:  ${this.formatarData(obj.dataSaida)}\n`;
    text += `https://www.apartamentosforest.com.br/reserva/${this.selectedReservation.cod_reserva}\n`;

    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Texto copiado com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
      this.toastr.error('Erro ao copiar o texto.');
    });
  }

  copiarInstrucoesEntrada(): void {
    if (!this.hospedesReserva || this.hospedesReserva.length === 0) {
      this.toastr.warning('Nenhum hóspede cadastrado nesta reserva.');
      return;
    }

    let text = '';
    this.hospedesReserva.forEach(hospede => {
      text += `Nome: ${hospede.first_name || ''}\n`;
      text += `CPF: ${this.formatarCPF(hospede.CPF || '')}\n`;
      text += `Telefone: ${this.formatarTelefone(hospede.Telefone || '')}\n`;
      text += `Horário previsto de chegada: ${hospede.horarioPrevistoChegada || 'Não informado'}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Instruções em texto copiadas com sucesso!');
    }).catch(err => {
      console.error('Erro ao copiar instruções: ', err);
      this.toastr.error('Erro ao copiar as instruções.');
    });
  }

  get telefoneValido(): boolean {
    if (!this.selectedReservation?.telefone_principal) return false;
    const digits = this.selectedReservation.telefone_principal.replace(/\D/g, '');
    return digits.length === 11;
  }

  /** Handler chamado quando o componente de cadastro emite closed */
  onCadastroClosed(success: boolean): void {
    // sempre fechar a sanfona
    this.showCadastroAccordion = false;
    if (success && this.selectedReservation && this.selectedReservation.id) {
      // recarregar hóspedes para a reserva (buscar novamente)
      this.carregandoImagem = true;
      this.getRespostasByReservaId(this.selectedReservation.id.toString(), this.selectedReservation.cod_reserva);
    }
  }

  /** Abre o popover para exibir observação completa */
  openObsPopover(event: any, mouseEvent: MouseEvent): void {
    mouseEvent.stopPropagation();
    this.selectedObsText = event.Observacoes || '';

    // Posicionar o popover centralizado na tela
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = Math.min(400, viewportWidth - 40);

    this.obsPopoverPosition = {
      top: viewportHeight / 2 - 100,
      left: (viewportWidth - popoverWidth) / 2
    };

    this.showObsPopover = true;
  }

  /** Fecha o popover de observação */
  closeObsPopover(): void {
    this.showObsPopover = false;
    this.selectedObsText = '';
  }

}