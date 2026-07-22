import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';
import {
  AgrupamentoReembolsoFiltro,
  PeriodoReembolsoFiltro,
  ResumoReembolsoRow,
  TicketReembolso,
} from 'src/app/shared/utilitarios/ticketReembolso';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface ApartamentoResumo {
  apartamento_id: number;
  apartamento_nome: string;
  porStatus: { [status: string]: { quantidade: number; total: number } };
  quantidadeGeral: number;
  totalGeral: number;
}

interface ProprietarioResumo {
  proprietario_id: number | null;
  proprietario_nome: string;
  apartamentos: ApartamentoResumo[];
  quantidadeGeral: number;
  totalGeral: number;
}

@Component({
  selector: 'app-fechamento-reembolso',
  templateUrl: './fechamento-reembolso.component.html',
  styleUrls: ['./fechamento-reembolso.component.css'],
})
export class FechamentoReembolsoComponent implements OnInit {
  agrupamento: AgrupamentoReembolsoFiltro = 'apartamento';
  periodo: PeriodoReembolsoFiltro = 'mes';
  mesSelecionado = '';
  mesesDisponiveis: { value: string; label: string }[] = [];

  filtroPendente = true;
  filtroPago = true;

  loading = false;
  erro: string | null = null;

  resumoBruto: ResumoReembolsoRow[] = [];
  linhasApartamento: ApartamentoResumo[] = [];
  linhasProprietario: ProprietarioResumo[] = [];

  todosTickets: TicketReembolso[] = [];
  expandidoApartamentoId: number | null = null;

  constructor(private service: TicketReembolsoService) {}

  ngOnInit(): void {
    this.carregarTodosTickets();
    this.carregarPeriodoDisponivel();
  }

  get statusAtivos(): string[] {
    const status: string[] = [];
    if (this.filtroPendente) status.push('PENDENTE');
    if (this.filtroPago) status.push('PAGO');
    return status;
  }

  get totalPendente(): number {
    return this.resumoBruto
      .filter(r => r.status === 'PENDENTE')
      .reduce((soma, r) => soma + Number(r.total), 0);
  }

  get totalPago(): number {
    return this.resumoBruto
      .filter(r => r.status === 'PAGO')
      .reduce((soma, r) => soma + Number(r.total), 0);
  }

  get totalGeral(): number {
    return this.totalPendente + this.totalPago;
  }

  get quantidadeGeral(): number {
    return this.resumoBruto.reduce((soma, r) => soma + Number(r.quantidade), 0);
  }

  carregarTodosTickets(): void {
    this.service.getAllReembolsos().subscribe(list => {
      this.todosTickets = list;
    });
  }

  carregarPeriodoDisponivel(): void {
    this.service.getPeriodoDisponivelReembolso().subscribe({
      next: resp => {
        this.gerarMesesDisponiveis(resp?.primeiroMes ?? null);
        this.carregarResumo();
      },
      error: () => {
        this.gerarMesesDisponiveis(null);
        this.carregarResumo();
      },
    });
  }

  gerarMesesDisponiveis(primeiroMes: string | null): void {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    let anoInicio = anoAtual;
    let mesInicio = mesAtual;
    if (primeiroMes) {
      const [ano, mes] = primeiroMes.split('-').map(Number);
      anoInicio = ano;
      mesInicio = mes;
    }

    const lista: { value: string; label: string }[] = [];
    let ano = anoAtual;
    let mes = mesAtual;
    while (ano > anoInicio || (ano === anoInicio && mes >= mesInicio)) {
      lista.push({
        value: `${ano}-${String(mes).padStart(2, '0')}`,
        label: `${MESES[mes - 1]}/${ano}`,
      });
      mes--;
      if (mes === 0) {
        mes = 12;
        ano--;
      }
    }

    this.mesesDisponiveis = lista;
    this.mesSelecionado = lista[0]?.value || `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
  }

  setAgrupamento(valor: AgrupamentoReembolsoFiltro): void {
    if (this.agrupamento === valor) return;
    this.agrupamento = valor;
    this.carregarResumo();
  }

  setPeriodo(valor: PeriodoReembolsoFiltro): void {
    if (this.periodo === valor) return;
    this.periodo = valor;
    this.carregarResumo();
  }

  onMesChange(): void {
    this.carregarResumo();
  }

  toggleStatus(status: 'PENDENTE' | 'PAGO'): void {
    if (status === 'PENDENTE') this.filtroPendente = !this.filtroPendente;
    if (status === 'PAGO') this.filtroPago = !this.filtroPago;
    if (!this.filtroPendente && !this.filtroPago) {
      // mantém ao menos um status marcado
      if (status === 'PENDENTE') this.filtroPago = true;
      else this.filtroPendente = true;
      return;
    }
    this.carregarResumo();
  }

  carregarResumo(): void {
    if (this.periodo === 'mes' && !this.mesSelecionado) return;

    this.loading = true;
    this.erro = null;
    this.service
      .getResumoReembolsos({
        periodo: this.periodo,
        mes: this.periodo === 'mes' ? this.mesSelecionado : undefined,
        status: this.statusAtivos,
        agrupamento: this.agrupamento,
      })
      .subscribe({
        next: rows => {
          this.resumoBruto = rows || [];
          this.computeLinhas();
          this.loading = false;
        },
        error: () => {
          this.resumoBruto = [];
          this.computeLinhas();
          this.loading = false;
          this.erro = 'Não foi possível carregar o resumo de reembolsos.';
        },
      });
  }

  private computeLinhas(): void {
    this.linhasApartamento = this.computeLinhasApartamento(this.resumoBruto);
    this.linhasProprietario = this.computeLinhasProprietario(this.resumoBruto);
  }

  private computeLinhasApartamento(rows: ResumoReembolsoRow[]): ApartamentoResumo[] {
    const mapa = new Map<number, ApartamentoResumo>();
    rows.forEach(r => {
      if (!mapa.has(r.apartamento_id)) {
        mapa.set(r.apartamento_id, {
          apartamento_id: r.apartamento_id,
          apartamento_nome: r.apartamento_nome,
          porStatus: {},
          quantidadeGeral: 0,
          totalGeral: 0,
        });
      }
      const item = mapa.get(r.apartamento_id)!;
      item.porStatus[r.status] = { quantidade: Number(r.quantidade), total: Number(r.total) };
      item.quantidadeGeral += Number(r.quantidade);
      item.totalGeral += Number(r.total);
    });
    return Array.from(mapa.values()).sort((a, b) => a.apartamento_nome.localeCompare(b.apartamento_nome));
  }

  private computeLinhasProprietario(rows: ResumoReembolsoRow[]): ProprietarioResumo[] {
    const mapaProp = new Map<string, ProprietarioResumo>();
    const mapaApt = new Map<string, Map<number, ApartamentoResumo>>();

    rows.forEach(r => {
      const propKey = r.proprietario_id != null ? String(r.proprietario_id) : 'sem';
      if (!mapaProp.has(propKey)) {
        mapaProp.set(propKey, {
          proprietario_id: r.proprietario_id ?? null,
          proprietario_nome: r.proprietario_nome || 'Sem proprietário vinculado',
          apartamentos: [],
          quantidadeGeral: 0,
          totalGeral: 0,
        });
        mapaApt.set(propKey, new Map());
      }
      const prop = mapaProp.get(propKey)!;
      const aptMap = mapaApt.get(propKey)!;
      if (!aptMap.has(r.apartamento_id)) {
        aptMap.set(r.apartamento_id, {
          apartamento_id: r.apartamento_id,
          apartamento_nome: r.apartamento_nome,
          porStatus: {},
          quantidadeGeral: 0,
          totalGeral: 0,
        });
      }
      const apt = aptMap.get(r.apartamento_id)!;
      apt.porStatus[r.status] = { quantidade: Number(r.quantidade), total: Number(r.total) };
      apt.quantidadeGeral += Number(r.quantidade);
      apt.totalGeral += Number(r.total);
      prop.quantidadeGeral += Number(r.quantidade);
      prop.totalGeral += Number(r.total);
    });

    return Array.from(mapaProp.entries())
      .map(([key, prop]) => ({
        ...prop,
        apartamentos: Array.from(mapaApt.get(key)!.values()).sort((a, b) =>
          a.apartamento_nome.localeCompare(b.apartamento_nome)
        ),
      }))
      .sort((a, b) => a.proprietario_nome.localeCompare(b.proprietario_nome));
  }

  private getIntervaloAtivo(): { inicio: Date; fim: Date } {
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);

    if (this.periodo === '15d') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 15);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim };
    }
    if (this.periodo === '30d') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 30);
      inicio.setHours(0, 0, 0, 0);
      return { inicio, fim };
    }

    const [ano, mes] = this.mesSelecionado.split('-').map(Number);
    const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    return { inicio, fim: fimMes };
  }

  toggleExpandirApartamento(apartamentoId: number): void {
    this.expandidoApartamentoId = this.expandidoApartamentoId === apartamentoId ? null : apartamentoId;
  }

  detalheApartamento(apartamentoId: number): TicketReembolso[] {
    const { inicio, fim } = this.getIntervaloAtivo();
    const statusAtivos = this.statusAtivos;
    return this.todosTickets
      .filter(t => {
        if (t.apartamento_id !== apartamentoId) return false;
        if (!statusAtivos.includes(t.status)) return false;
        if (!t.created_at) return false;
        const data = new Date(t.created_at);
        return data >= inicio && data <= fim;
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDENTE':
        return 'status-pendente';
      case 'PAGO':
        return 'status-pago';
      default:
        return '';
    }
  }

  /** Exporta o relatório total (resumo agregado, respeitando agrupamento/período/status ativos) */
  exportarRelatorioTotal(): void {
    if (this.agrupamento === 'apartamento') {
      const dados = this.linhasApartamento.map(apt => this.linhaResumoParaXls(apt));
      this.gerarXls(dados, 'Fechamento por Apartamento', this.nomeArquivo('fechamento_apartamentos'));
    } else {
      this.exportarRelatorioProprietariosPorAbas();
    }
  }

  /** Workbook com uma aba de resumo geral + uma aba por proprietário (evita repetir linhas de "Total X" numa única planilha) */
  private exportarRelatorioProprietariosPorAbas(): void {
    const workbook = XLSX.utils.book_new();

    const resumoGeral = this.linhasProprietario.map(prop => ({
      'Proprietário': prop.proprietario_nome,
      'Qtd Apartamentos': prop.apartamentos.length,
      'Qtd Pendente': prop.apartamentos.reduce((s, a) => s + (a.porStatus['PENDENTE']?.quantidade || 0), 0),
      'Total Pendente (R$)': prop.apartamentos.reduce((s, a) => s + (a.porStatus['PENDENTE']?.total || 0), 0),
      'Qtd Pago': prop.apartamentos.reduce((s, a) => s + (a.porStatus['PAGO']?.quantidade || 0), 0),
      'Total Pago (R$)': prop.apartamentos.reduce((s, a) => s + (a.porStatus['PAGO']?.total || 0), 0),
      'Total Geral (R$)': prop.totalGeral,
    }));
    const wsResumo = XLSX.utils.json_to_sheet(
      resumoGeral.length ? resumoGeral : [{ Aviso: 'Nenhum dado encontrado para este filtro' }]
    );
    XLSX.utils.book_append_sheet(workbook, wsResumo, 'Resumo Geral');

    const nomesUsados = new Set<string>(['Resumo Geral']);
    this.linhasProprietario.forEach(prop => {
      const dadosProp = prop.apartamentos.map(apt => this.linhaResumoParaXls(apt));
      dadosProp.push({
        'Apartamento': 'TOTAL',
        'Qtd Pendente': '',
        'Total Pendente (R$)': '',
        'Qtd Pago': '',
        'Total Pago (R$)': '',
        'Total Geral (R$)': prop.totalGeral,
      });
      const ws = XLSX.utils.json_to_sheet(dadosProp);
      const nomeAba = this.nomeAbaUnico(prop.proprietario_nome, nomesUsados);
      XLSX.utils.book_append_sheet(workbook, ws, nomeAba);
    });

    XLSX.writeFile(workbook, this.nomeArquivo('fechamento_proprietarios'));
  }

  /** Gera um nome de aba único (limite de 31 caracteres do Excel, sem duplicar entre proprietários homônimos) */
  private nomeAbaUnico(nome: string, usados: Set<string>): string {
    const base = this.sanitizeSheetName(nome || 'Proprietario');
    let candidato = base;
    let i = 2;
    while (usados.has(candidato)) {
      const sufixo = ` (${i})`;
      candidato = base.substring(0, 31 - sufixo.length) + sufixo;
      i++;
    }
    usados.add(candidato);
    return candidato;
  }

  /** Exporta o detalhamento (ticket a ticket) de um apartamento específico */
  exportarApartamentoXls(apt: ApartamentoResumo, event?: Event): void {
    event?.stopPropagation();
    const dados = this.detalheApartamento(apt.apartamento_id).map(t => this.ticketParaXls(t));
    this.gerarXls(dados, apt.apartamento_nome, this.nomeArquivo(`fechamento_${this.slug(apt.apartamento_nome)}`));
  }

  /** Exporta o detalhamento (ticket a ticket) de todos os apartamentos de um proprietário */
  exportarProprietarioXls(prop: ProprietarioResumo, event?: Event): void {
    event?.stopPropagation();
    const dados: Record<string, any>[] = [];
    prop.apartamentos.forEach(apt => {
      this.detalheApartamento(apt.apartamento_id).forEach(t => {
        dados.push({ 'Apartamento': apt.apartamento_nome, ...this.ticketParaXls(t) });
      });
    });
    this.gerarXls(dados, prop.proprietario_nome, this.nomeArquivo(`fechamento_${this.slug(prop.proprietario_nome)}`));
  }

  private linhaResumoParaXls(apt: ApartamentoResumo): Record<string, any> {
    return {
      'Apartamento': apt.apartamento_nome,
      'Qtd Pendente': apt.porStatus['PENDENTE']?.quantidade || 0,
      'Total Pendente (R$)': apt.porStatus['PENDENTE']?.total || 0,
      'Qtd Pago': apt.porStatus['PAGO']?.quantidade || 0,
      'Total Pago (R$)': apt.porStatus['PAGO']?.total || 0,
      'Total Geral (R$)': apt.totalGeral,
    };
  }

  private ticketParaXls(t: TicketReembolso): Record<string, any> {
    return {
      'Item': t.item_problema,
      'Status': t.status,
      'Criado em': t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '',
      'Valor Material (R$)': t.valor_material || 0,
      'Valor Mão de Obra (R$)': t.valor_mao_obra || 0,
      'Valor Total (R$)': t.valor_total || 0,
    };
  }

  private gerarXls(dados: Record<string, any>[], sheetName: string, fileName: string): void {
    const linhas = dados.length ? dados : [{ Aviso: 'Nenhum dado encontrado para este filtro' }];
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, this.sanitizeSheetName(sheetName));
    XLSX.writeFile(workbook, fileName);
  }

  private nomeArquivo(prefixo: string): string {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const periodo = this.periodo === 'mes' ? this.mesSelecionado : this.periodo;
    return `${prefixo}_${periodo}_${dataHoje}.xlsx`;
  }

  private sanitizeSheetName(nome: string): string {
    return (nome || 'Sheet').replace(/[\\/*?:[\]]/g, '').substring(0, 31) || 'Sheet';
  }

  private slug(nome: string): string {
    return (nome || 'arquivo')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'arquivo';
  }
}
