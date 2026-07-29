import { Component, HostListener, LOCALE_ID, OnInit } from '@angular/core';
// O app não registra locale, então os pipes caem em en-US e imprimem "16,400.00".
// Numa folha de pagamento em reais isso é leitura errada, não só estilo.
// A variante global/ se auto-registra: import só por efeito colateral, sem tipagem.
import '@angular/common/locales/global/pt';
import * as XLSX from 'xlsx';
import { User } from 'src/app/shared/utilitarios/user';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';

@Component({
  selector: 'app-controle-faxina',
  templateUrl: './controle-faxina.component.html',
  styleUrls: ['./controle-faxina.component.css','./controle-faxina.component2.css','./controle-faxina.component3.css'],
  // 'pt' no CLDR é o português do Brasil (pt-PT é que é a variante), e é
  // exatamente o locale que o import acima registra — sem depender de fallback.
  providers: [{ provide: LOCALE_ID, useValue: 'pt' }]
})
export class ControleFaxinaComponent implements OnInit {
  users: User[] = [];
  selectedMonth: string = '';
  monthOptions: any[] = [];
  pagamentos: any[] = [];
  totalMes: number = 0;
  totalFaxinas: number = 0;
  valorPorFaxina: number = 0;
  maxFaxinas: number = 0;
  carregando: boolean = false;
  erro: string = '';

  // Filtro por situação da limpeza. Governa a tela inteira — totais, linhas,
  // detalhe e planilhas — para que o que se vê seja exatamente o que se exporta.
  filtroStatus: 'todas' | 'concluidas' | 'pendentes' = 'todas';
  readonly opcoesFiltro: { valor: 'todas' | 'concluidas' | 'pendentes'; rotulo: string }[] = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'concluidas', rotulo: 'Concluídas' },
    { valor: 'pendentes', rotulo: 'Pendentes' }
  ];

  // Serviços crus do mês. Trocar o filtro é recorte de dado já carregado,
  // não motivo para uma nova ida ao servidor.
  private servicosDoMes: any[] = [];

  // Variáveis para detalhamento
  showModal: boolean = false;
  selectedterceirizado: any = null;
  faxinasDetalhadas: any[] = [];

  constructor(
    private userService: UserService,
    private reservasService: ReservasAirbnbService,
    private limpezaExtraService: LimpezaExtraService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.generateMonthOptions();
  }

  generateMonthOptions() {
    const months = [];
    const hoje = new Date();
    // Ancora o cursor no dia 1: setMonth em um dia 29/30/31 transborda para o mês
    // seguinte (ex.: 31/03 -> setMonth(fevereiro) vira 03/03), duplicando meses na lista.
    const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const month = cursor.getMonth();
      const year = cursor.getFullYear();
      const nome = cursor.toLocaleString('pt-BR', { month: 'long' });
      months.push({
        label: `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${year}`,
        value: `${year}-${(month + 1).toString().padStart(2, '0')}`
      });
      cursor.setMonth(month - 1);
    }
    this.monthOptions = months;
  }

  get mesSelecionadoLabel(): string {
    const opcao = this.monthOptions.find(m => m.value === this.selectedMonth);
    return opcao ? opcao.label : '';
  }

  getUsers(): void {
    this.userService.getUsersByRole('terceirizado').subscribe(users => {
      this.users = users;
    });
  }

  async loadPayments() {
    if (!this.selectedMonth) {
      this.servicosDoMes = [];
      this.recalcular();
      return;
    }

    this.carregando = true;
    this.erro = '';
    try {
      const [startDate, endDate] = this.getMonthDateRange();
      const reservas = await this.reservasService.getFaxinasPorPeriodo(startDate, endDate).toPromise();
      const limpezasExtras = await this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise();

      // Guarda concluídas e pendentes: o filtro é aplicado depois, sem novo request.
      this.servicosDoMes = [...(reservas || []), ...(limpezasExtras || [])]
        .filter(servico => servico.faxina_userId && this.pertenceAoMesSelecionado(servico.end_data));

      this.recalcular();
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      this.servicosDoMes = [];
      this.recalcular();
      this.erro = 'Não foi possível carregar as limpezas deste mês. Tente de novo.';
    } finally {
      this.carregando = false;
    }
  }

  aplicarFiltro(valor: 'todas' | 'concluidas' | 'pendentes'): void {
    if (this.filtroStatus === valor) return;
    this.filtroStatus = valor;
    this.recalcular();
    if (this.showModal && this.selectedterceirizado) {
      this.montarDetalhes(this.selectedterceirizado);
    }
  }

  private passaNoFiltro(servico: any): boolean {
    if (this.filtroStatus === 'concluidas') return !!servico.limpeza_realizada;
    if (this.filtroStatus === 'pendentes') return !servico.limpeza_realizada;
    return true;
  }

  private servicosFiltrados(): any[] {
    return this.servicosDoMes.filter(servico => this.passaNoFiltro(servico));
  }

  private recalcular(): void {
    const pagamentosMap = new Map<number, any>();
    this.maxFaxinas = 0;

    this.servicosFiltrados().forEach(servico => {
      const userId = servico.faxina_userId;
      if (!pagamentosMap.has(userId)) {
        pagamentosMap.set(userId, {
          user: this.users.find(u => u.id === userId),
          totalFaxinas: 0,
          valorTotal: 0
        });
      }

      const entry = pagamentosMap.get(userId);
      entry.totalFaxinas++;
      entry.valorTotal += servico.valor_limpeza ? Number(servico.valor_limpeza) : 0;

      if (entry.totalFaxinas > this.maxFaxinas) {
        this.maxFaxinas = entry.totalFaxinas;
      }
    });

    // Maior valor primeiro: a folha é lida de cima para baixo por quanto se paga.
    this.pagamentos = Array.from(pagamentosMap.values())
      .sort((a, b) => b.valorTotal - a.valorTotal);

    this.calcularTotais();
    this.valorPorFaxina = this.totalFaxinas > 0 ? (this.totalMes / this.totalFaxinas) : 0;
  }

  // --- Rótulos que mudam com o filtro -------------------------------------
  // "A pagar" só é verdade para faxinas concluídas; chamar pendente de a pagar
  // numa tela de pagamento é afirmação errada, não sinônimo.

  get rotuloTotal(): string {
    if (this.filtroStatus === 'pendentes') return 'Total pendente em';
    if (this.filtroStatus === 'todas') return 'Total previsto em';
    return 'Total a pagar em';
  }

  get rotuloTotalCurto(): string {
    if (this.filtroStatus === 'pendentes') return 'Pendente';
    if (this.filtroStatus === 'todas') return 'Previsto';
    return 'A pagar';
  }

  get rotuloFaxinas(): string {
    if (this.filtroStatus === 'pendentes') return 'Limpezas pendentes';
    if (this.filtroStatus === 'todas') return 'Limpezas no mês';
    return 'Limpezas concluídas';
  }

  get mensagemVazio(): string {
    if (this.filtroStatus === 'pendentes') return `Nenhuma limpeza pendente em ${this.mesSelecionadoLabel}.`;
    if (this.filtroStatus === 'todas') return `Nenhuma limpeza em ${this.mesSelecionadoLabel}.`;
    return `Nenhuma limpeza concluída em ${this.mesSelecionadoLabel}.`;
  }

  get ajudaVazio(): string {
    if (this.filtroStatus === 'pendentes') return 'Tudo que foi atribuído neste mês já está concluído.';
    return 'Limpezas aparecem aqui depois de atribuídas a uma terceirizada na escala.';
  }

  getMonthDateRange(): [string, string] {
    const { year, monthIndex } = this.parseSelectedYearMonth();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return [formatDate(start), formatDate(end)];
  }

  // Extrai ano/mês/dia direto da string, sem passar por Date/Intl.
  // end_data é uma data de calendário pura (sem hora); convertê-la via Date com fuso
  // aplicaria um deslocamento (a string "YYYY-MM-DD" é interpretada como meia-noite UTC),
  // fazendo o dia "voltar" quando reformatada para o fuso de SP. Parsing textual evita isso.
  private getSPDateParts(dateString: string): { year: number; month: number; day: number } {
    if (dateString) {
      const onlyDate = dateString.split('T')[0];
      const isoMatch = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [, y, mo, d] = isoMatch;
        return { year: Number(y), month: Number(mo) - 1, day: Number(d) };
      }
      const brMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brMatch) {
        const [, d, mo, y] = brMatch;
        return { year: Number(y), month: Number(mo) - 1, day: Number(d) };
      }
    }
    const date = new Date(dateString);
    return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
  }

  private formatDateSP(dateString: string): string {
    if (!dateString) return '';
    const { year, month, day } = this.getSPDateParts(dateString);
    return `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
  }

  private parseSelectedYearMonth(): { year: number; monthIndex: number } {
    // Expecting format YYYY-MM
    const parts = this.selectedMonth.split('-');
    if (parts.length !== 2) {
      throw new Error(`selectedMonth inválido: ${this.selectedMonth}`);
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new Error(`selectedMonth fora do padrão YYYY-MM: ${this.selectedMonth}`);
    }
    return { year, monthIndex: month - 1 };
  }

  // Um serviço pertence ao mês selecionado pela data de calendário da faxina (end_data),
  // comparada textualmente — nunca por Date, que deslocaria o dia pelo fuso.
  private pertenceAoMesSelecionado(endData: string): boolean {
    if (!endData) return false;
    const { year, month } = this.getSPDateParts(endData);
    const { year: selYear, monthIndex: selMonthIndex } = this.parseSelectedYearMonth();
    return year === selYear && month === selMonthIndex;
  }

  calcularTotais() {
    this.totalFaxinas = this.pagamentos.reduce((sum, p) => sum + p.totalFaxinas, 0);
    this.totalMes = this.pagamentos.reduce((sum, p) => sum + p.valorTotal, 0);
  }

  // Sufixo do nome do arquivo, para que a planilha diga qual recorte ela contém.
  private get sufixoArquivo(): string {
    return `${this.selectedMonth}_${this.filtroStatus}`;
  }

  // Limpeza extra não nasce de reserva e não tem cod_reserva. Em vez de deixar
  // vazio, identifica pela origem — planilha e modal continuam rastreáveis.
  codigoServico(servico: any): string {
    return servico?.cod_reserva || `Limpeza extra #${servico?.id}`;
  }

  private linhaPlanilha(servico: any) {
    return {
      'Cód. Reserva': this.codigoServico(servico),
      'Apartamento': servico.apartamento_nome,
      'Data Fim': this.formatDateSP(servico.end_data),
      'Limpeza Realizada': servico.limpeza_realizada ? 'Sim' : 'Não',
      'Valor': servico.valor_limpeza ? Number(servico.valor_limpeza) : 0
    };
  }

  downloadXls(pagamento: any): void {
    const servicos = this.servicosFiltrados()
      .filter(s => s.faxina_userId === pagamento?.user?.id)
      .sort((a, b) => this.chaveData(a.end_data) - this.chaveData(b.end_data));

    if (servicos.length === 0) {
      alert('Nenhuma limpeza neste recorte para esta terceirizada.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(servicos.map(s => this.linhaPlanilha(s)));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Limpezas');
    XLSX.writeFile(workbook, `limpezas_${pagamento.user.first_name}_${this.sufixoArquivo}.xlsx`);
  }

  downloadResumoGeralXls(): void {
    const servicos = this.servicosFiltrados();
    if (servicos.length === 0) {
      alert('Nenhuma limpeza neste recorte para exportar.');
      return;
    }

    // Resumo espelha exatamente as linhas da tela, na mesma ordem.
    const resumoSheet = XLSX.utils.json_to_sheet(this.pagamentos.map(p => ({
      'Terceirizada': p.user?.first_name || 'Terceirizada removida',
      'Limpezas': p.totalFaxinas,
      'Valor Total': p.valorTotal
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

    this.pagamentos.forEach(pagamento => {
      const nome = pagamento.user?.first_name;
      if (!nome) return;
      const doUsuario = servicos
        .filter(s => s.faxina_userId === pagamento.user.id)
        .sort((a, b) => this.chaveData(a.end_data) - this.chaveData(b.end_data));
      if (doUsuario.length === 0) return;
      // Nome de aba no Excel: máximo 31 caracteres e sem os caracteres reservados.
      const aba = nome.replace(/[\\/?*\[\]:]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(doUsuario.map(s => this.linhaPlanilha(s))),
        aba
      );
    });

    XLSX.writeFile(workbook, `resumo_terceirizadas_${this.sufixoArquivo}.xlsx`);
  }

  getInitials(name: string): string {
    if (!name) return '';
    const partes = name.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '';
    // Sem sobrenome, duas letras do próprio nome: "Zilda" e "Tacyane" viravam
    // ambas "T"/"Z" isolados e colidiam na lista.
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  // Teto visual de 88%: no 100% o filete encosta nas duas bordas e passa a ler como
  // divisor de seção em vez de barra. Parando antes, a linha continua sendo medida.
  getProgressWidth(count: number): number {
    if (this.maxFaxinas === 0) return 0;
    return (count / this.maxFaxinas) * 88;
  }
  
  // Detalhamento: lê do mesmo cache da folha, então abre sem request e não pode
  // divergir do que está na linha.
  openDetails(pagamento: any): void {
    this.selectedterceirizado = pagamento;
    this.montarDetalhes(pagamento);
    this.showModal = true;
  }

  private montarDetalhes(pagamento: any): void {
    this.faxinasDetalhadas = this.servicosFiltrados()
      .filter(servico => servico.faxina_userId === pagamento?.user?.id)
      .sort((a, b) => this.chaveData(a.end_data) - this.chaveData(b.end_data));
  }

  @HostListener('document:keydown.escape')
  closeModal() {
    this.showModal = false;
    this.selectedterceirizado = null;
    this.faxinasDetalhadas = [];
  }

  formatDate(dateString: string): string {
    return this.formatDateSP(dateString);
  }

  // Chave numérica AAAAMMDD para ordenar sem construir Date (que deslocaria o dia pelo fuso).
  private chaveData(dateString: string): number {
    const { year, month, day } = this.getSPDateParts(dateString);
    return year * 10000 + month * 100 + day;
  }

  // Valor médio efetivamente pago a esta terceirizada no mês.
  getAverageValue(): number {
    const t = this.selectedterceirizado;
    if (!t || !t.totalFaxinas) return 0;
    return t.valorTotal / t.totalFaxinas;
  }

  // Primeira e última faxina do mês, para dar contexto ao período trabalhado.
  getPeriodoCoberto(): string {
    if (!this.faxinasDetalhadas.length) return '—';
    const ordenadas = [...this.faxinasDetalhadas].sort(
      (a, b) => this.chaveData(a.end_data) - this.chaveData(b.end_data)
    );
    const primeira = this.formatDateSP(ordenadas[0].end_data);
    const ultima = this.formatDateSP(ordenadas[ordenadas.length - 1].end_data);
    return primeira === ultima ? primeira : `${primeira} a ${ultima}`;
  }

  // Quantos apartamentos distintos esta terceirizada atendeu no mês.
  getApartamentosAtendidos(): number {
    return new Set(this.faxinasDetalhadas.map(f => f.apartamento_nome)).size;
  }

  trackByPagamento(_: number, pagamento: any): number {
    return pagamento?.user?.id;
  }

  trackByFaxina(index: number, faxina: any): string {
    return `${faxina?.id}-${faxina?.end_data}-${index}`;
  }

  // Função para obter o dia da data
  getDay(dateString: string): string {
    if (!dateString) return '--';
    const { day } = this.getSPDateParts(dateString);
    return day.toString().padStart(2, '0');
  }

  private readonly MESES_ABREV = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

  // Função para obter o mês abreviado
  getMonth(dateString: string): string {
    if (!dateString) return '--';
    const { month } = this.getSPDateParts(dateString);
    return this.MESES_ABREV[month];
  }

}