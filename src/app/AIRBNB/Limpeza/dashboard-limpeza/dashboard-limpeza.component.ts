import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { LimpezaExtra } from 'src/app/shared/utilitarios/limpezaextra';
import { User } from 'src/app/shared/utilitarios/user';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard-limpeza',
  templateUrl: './dashboard-limpeza.component.html',
  styleUrls: ['./dashboard-limpeza.component.css']
})
export class DashboardLimpezaComponent implements OnInit {
  todasFaxinas: any[] = [];
  faxinasFiltradas: any[] = [];
  users: User[] = [];
  apartamentos: { id: number; nome: string }[] = [];

  statsHoje = {
    total: 0,
    prioridade: 0,
    concluidas: 0,
    emAndamento: 0,
    pendentes: 0,
    atrasadas: 0,
    sos: 0
  };
  percentualConcluidas = 0;

  searchTerm = '';
  statusFiltro = 'todos';

  showModal = false;
  limpezaExtra: LimpezaExtra = { apartamento_id: 0, end_data: '' };

  carregando = true;
  hoje = '';
  dataInicio = '';
  dataFim = '';
  periodoAtivo: 'hoje' | 'amanha' | '7dias' | 'custom' = 'hoje';

  constructor(
    private reservasService: ReservasAirbnbService,
    private limpezaExtraService: LimpezaExtraService,
    private userService: UserService,
    private apartamentoService: ApartamentoService,
    private toastr: ToastrService
  ) {
    this.hoje = this.toISODate(new Date());
    this.dataInicio = this.hoje;
    this.dataFim = this.hoje;
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  setPeriodoHoje(): void {
    this.dataInicio = this.hoje;
    this.dataFim = this.hoje;
    this.periodoAtivo = 'hoje';
    this.carregarDados();
  }

  setPeriodoAmanha(): void {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const iso = this.toISODate(amanha);
    this.dataInicio = iso;
    this.dataFim = iso;
    this.periodoAtivo = 'amanha';
    this.carregarDados();
  }

  setPeriodo7Dias(): void {
    const fim = new Date();
    fim.setDate(fim.getDate() + 7);
    this.dataInicio = this.hoje;
    this.dataFim = this.toISODate(fim);
    this.periodoAtivo = '7dias';
    this.carregarDados();
  }

  onDateChange(): void {
    this.periodoAtivo = 'custom';
  }

  private toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  carregarDados(): void {
    if (!this.dataInicio || !this.dataFim) return;
    this.carregando = true;

    // Busca lookback de 30 dias para capturar pendentes anteriores
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 30);
    const fetchInicio = this.dataInicio <= this.hoje
      ? this.toISODate(lookback)
      : this.dataInicio;

    forkJoin({
      reservas: this.reservasService.getFaxinasPorPeriodo(fetchInicio, this.dataFim),
      limpezas: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(fetchInicio, this.dataFim),
      users: this.userService.getUsersByRole('terceirizado'),
      apartamentos: this.apartamentoService.getAllApartamentos()
    }).subscribe({
      next: ({ reservas, limpezas, users, apartamentos }) => {
        this.users = users;
        this.apartamentos = apartamentos
          .map(a => ({ id: a.id, nome: a.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome));

        const normExtras = limpezas.map(e => ({
          ...e,
          description: 'LIMPEZA',
          check_out: '11:00',
          check_in_mesmo_dia: false,
          origem: null
        }));

        let todas = [...reservas, ...normExtras];
        todas = todas.filter(f => {
          const iso = this.extrairISO(f.end_data);
          const noPeriodo = iso >= this.dataInicio && iso <= this.dataFim;
          const isPastPending = iso < this.dataInicio && !f.limpeza_realizada && this.dataInicio <= this.hoje;
          return noPeriodo || isPastPending;
        });

        todas.sort((a, b) => {
          const aISO = this.extrairISO(a.end_data);
          const bISO = this.extrairISO(b.end_data);
          if (aISO !== bISO) return bISO.localeCompare(aISO);
          if (a.check_in_mesmo_dia && !b.check_in_mesmo_dia) return -1;
          if (b.check_in_mesmo_dia && !a.check_in_mesmo_dia) return 1;
          return 0;
        });

        this.todasFaxinas = todas;
        this.calcularStats();
        this.aplicarFiltros();
        this.carregando = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar dados');
        this.carregando = false;
      }
    });
  }

  private extrairISO(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
    }
    return dateStr.split('T')[0];
  }

  private calcularStats(): void {
    // Stats baseados nas faxinas do período selecionado
    const faxinasPeriodo = this.todasFaxinas.filter(f => {
      const iso = this.extrairISO(f.end_data);
      return iso >= this.dataInicio && iso <= this.dataFim;
    });
    this.statsHoje.total = faxinasPeriodo.length;
    this.statsHoje.prioridade = faxinasPeriodo.filter(f => f.check_in_mesmo_dia).length;
    this.statsHoje.concluidas = faxinasPeriodo.filter(f => f.limpeza_realizada).length;
    this.statsHoje.emAndamento = faxinasPeriodo.filter(
      f => f.faxina_userId && !f.limpeza_realizada
    ).length;
    this.statsHoje.pendentes = faxinasPeriodo.filter(
      f => !f.faxina_userId && !f.limpeza_realizada
    ).length;
    // Atrasadas: contagem global de pendentes anteriores ao período
    this.statsHoje.atrasadas = this.todasFaxinas.filter(
      f => this.extrairISO(f.end_data) < this.dataInicio && !f.limpeza_realizada
    ).length;
    this.statsHoje.sos = 0;
    this.percentualConcluidas =
      this.statsHoje.total > 0
        ? Math.round((this.statsHoje.concluidas / this.statsHoje.total) * 100)
        : 0;
  }

  aplicarFiltros(): void {
    let res = [...this.todasFaxinas];
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      res = res.filter(
        f =>
          f.apartamento_nome?.toLowerCase().includes(t) ||
          this.getColaboradorNome(f.faxina_userId)?.toLowerCase().includes(t)
      );
    }
    if (this.statusFiltro !== 'todos') {
      res = res.filter(f => this.getStatus(f) === this.statusFiltro);
    }
    this.faxinasFiltradas = res;
  }

  getStatus(f: any): string {
    if (f.limpeza_realizada) return 'concluida';
    if (this.extrairISO(f.end_data) < this.hoje) return 'atrasada';
    if (f.faxina_userId) return 'em-andamento';
    return 'pendente';
  }

  getStatusLabel(f: any): string {
    const map: Record<string, string> = {
      concluida: 'Concluída',
      'em-andamento': 'Em Andamento',
      pendente: 'Pendente',
      atrasada: 'Atrasada'
    };
    return map[this.getStatus(f)] || 'Pendente';
  }

  getColaboradorNome(userId?: number | null): string {
    if (!userId) return '';
    const u = this.users.find(u => u.id === Number(userId));
    return u ? u.first_name : '';
  }

  getParceiro(f: any): string {
    if (f.description === 'LIMPEZA') return 'Manual';
    if (f.origem) {
      return f.origem.charAt(0).toUpperCase() + f.origem.slice(1).toLowerCase();
    }
    return 'N/D';
  }

  getHorario(f: any): string {
    return f.check_out || '11:00';
  }

  getDataFormatada(f: any): string {
    const iso = this.extrairISO(f.end_data);
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  isAtrasada(f: any): boolean {
    return this.extrairISO(f.end_data) < this.hoje;
  }

  getTotalOrdensLabel(): string {
    const n = this.faxinasFiltradas.length;
    return `${n} ORDEM${n !== 1 ? 'S' : ''} ENCONTRADA${n !== 1 ? 'S' : ''}`;
  }

  getDataAtualFormatada(): string {
    const d = new Date();
    const dias = [
      'Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira',
      'Quinta-Feira', 'Sexta-Feira', 'Sábado'
    ];
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${dias[d.getDay()]}, ${d.getDate()} De ${meses[d.getMonth()]}`;
  }

  abrirModal(): void {
    this.limpezaExtra = { apartamento_id: 0, end_data: this.hoje };
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  salvarLimpeza(): void {
    if (!this.limpezaExtra.apartamento_id || !this.limpezaExtra.end_data) {
      this.toastr.warning('Preencha todos os campos obrigatórios');
      return;
    }
    this.limpezaExtraService.createLimpezaExtra(this.limpezaExtra).subscribe({
      next: () => {
        this.toastr.success('Limpeza criada com sucesso');
        this.fecharModal();
        this.carregarDados();
      },
      error: () => this.toastr.error('Erro ao criar limpeza')
    });
  }
}
