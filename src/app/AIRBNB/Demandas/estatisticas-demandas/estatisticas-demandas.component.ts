import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DemandasService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/demandas_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { Demanda } from 'src/app/shared/utilitarios/demanda';
import { User } from 'src/app/shared/utilitarios/user';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { Router } from '@angular/router';

interface UserStats {
  userId: number;
  nome: string;
  total: number;
  pendentes: number;
  finalizadas: number;
  canceladas: number;
  atrasadas: number;
  taxaConclusao: number;
}

@Component({
  selector: 'app-estatisticas-demandas',
  templateUrl: './estatisticas-demandas.component.html',
  styleUrls: ['./estatisticas-demandas.component.css']
})
export class EstatisticasDemandasComponent implements OnInit {
  // Data
  demandas: Demanda[] = [];
  demandasFiltradas: Demanda[] = [];
  usuarios: User[] = [];
  loading = true;

  // Filtros
  dataInicio = '';
  dataFim = '';
  filtroUsuarioId: number | null = null;

  // KPIs
  totalDemandas = 0;
  totalPendentes = 0;
  totalFinalizadas = 0;
  totalCanceladas = 0;
  totalAtrasadas = 0;
  taxaConclusaoGeral = 0;

  // Distribuição
  porTipo: { label: string; count: number; percent: number; color: string }[] = [];
  porPeriodo: { label: string; count: number; percent: number; color: string }[] = [];

  // Performance individual
  userStats: UserStats[] = [];
  maxDemandasUser = 1;

  // Demandas atrasadas
  demandasAtrasadas: Demanda[] = [];

  // Expand
  showAtrasadas = false;

  // Drawer de demandas do funcionário
  drawerAberto = false;
  drawerUsuario: UserStats | null = null;
  drawerDemandas: Demanda[] = [];
  drawerFiltroStatus: string = 'todas';

  constructor(
    private demandasSrv: DemandasService,
    private userSrv: UserService,
    private toastr: ToastrService,
    private authSrv: AuthenticationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authSrv.getUser();
    const userId = user?.id;
    if (!userId || ![1, 4].includes(userId)) {
      this.toastr.error('Você não tem permissão para acessar esta página.');
      this.router.navigate(['/login']);
      return;
    }

    // Default: último mês
    const hoje = new Date();
    const inicio = new Date();
    inicio.setMonth(hoje.getMonth() - 1);
    this.dataInicio = this.toISODate(inicio);
    this.dataFim = this.toISODate(hoje);
    this.carregarDados();
  }

  carregarDados(): void {
    this.loading = true;
    this.userSrv.getUsersByRole('admin').subscribe({
      next: u => {
        this.usuarios = u;
        this.demandasSrv.getAllDemandas().subscribe({
          next: ds => {
            this.demandas = ds;
            this.aplicarFiltros();
            this.loading = false;
          },
          error: () => {
            this.toastr.error('Erro ao carregar demandas');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.toastr.error('Erro ao carregar usuários');
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let filtradas = [...this.demandas];

    // Filtro período
    if (this.dataInicio) {
      filtradas = filtradas.filter(d => {
        const created = this.extractISODate(d.created_at);
        return created >= this.dataInicio;
      });
    }
    if (this.dataFim) {
      filtradas = filtradas.filter(d => {
        const created = this.extractISODate(d.created_at);
        return created <= this.dataFim;
      });
    }

    // Filtro por usuário
    if (this.filtroUsuarioId) {
      filtradas = filtradas.filter(d => d.user_id_responsavel === this.filtroUsuarioId);
    }

    this.demandasFiltradas = filtradas;
    this.computarKPIs();
    this.computarDistribuicao();
    this.computarPerformanceIndividual();
    this.computarAtrasadas();
  }

  filtrar(): void {
    this.aplicarFiltros();
  }

  limparFiltros(): void {
    const hoje = new Date();
    const inicio = new Date();
    inicio.setMonth(hoje.getMonth() - 1);
    this.dataInicio = this.toISODate(inicio);
    this.dataFim = this.toISODate(hoje);
    this.filtroUsuarioId = null;
    this.aplicarFiltros();
  }

  // ==================== KPIs ====================
  private computarKPIs(): void {
    const ds = this.demandasFiltradas;
    this.totalDemandas = ds.length;
    this.totalPendentes = ds.filter(d => this.isPendente(d.status)).length;
    this.totalFinalizadas = ds.filter(d => this.isFinalizada(d.status)).length;
    this.totalCanceladas = ds.filter(d => this.isCancelada(d.status)).length;

    const naoCancel = this.totalDemandas - this.totalCanceladas;
    this.taxaConclusaoGeral = naoCancel > 0
      ? Math.round((this.totalFinalizadas / naoCancel) * 100)
      : 0;
  }

  // ==================== Distribuição ====================
  private computarDistribuicao(): void {
    const ds = this.demandasFiltradas;
    const total = ds.length || 1;

    // Por tipo
    const rua = ds.filter(d => this.normalizeTipo(d.type) === 'rua').length;
    const escritorio = ds.filter(d => this.normalizeTipo(d.type) === 'escritorio').length;
    const semTipo = ds.filter(d => !d.type || d.type.trim() === '').length;
    this.porTipo = [
      { label: 'Rua', count: rua, percent: Math.round((rua / total) * 100), color: '#e65100' },
      { label: 'Escritório', count: escritorio, percent: Math.round((escritorio / total) * 100), color: '#5e35b1' },
      { label: 'Sem tipo', count: semTipo, percent: Math.round((semTipo / total) * 100), color: '#90a4ae' },
    ];

    // Por período
    const manha = ds.filter(d => this.normalizePeriodo(d.periodo) === 'manha').length;
    const tarde = ds.filter(d => this.normalizePeriodo(d.periodo) === 'tarde').length;
    const noite = ds.filter(d => this.normalizePeriodo(d.periodo) === 'noite').length;
    const semPeriodo = ds.filter(d => !d.periodo || d.periodo.trim() === '').length;
    this.porPeriodo = [
      { label: 'Manhã', count: manha, percent: Math.round((manha / total) * 100), color: '#f9a825' },
      { label: 'Tarde', count: tarde, percent: Math.round((tarde / total) * 100), color: '#ef6c00' },
      { label: 'Noite', count: noite, percent: Math.round((noite / total) * 100), color: '#283593' },
      { label: 'Sem período', count: semPeriodo, percent: Math.round((semPeriodo / total) * 100), color: '#90a4ae' },
    ];
  }

  // ==================== Performance Individual ====================
  private computarPerformanceIndividual(): void {
    const ds = this.demandasFiltradas;
    const hojeStr = this.toISODate(new Date());

    const statsMap = new Map<number, UserStats>();

    for (const d of ds) {
      const uid = d.user_id_responsavel;
      if (!uid) continue;

      if (!statsMap.has(uid)) {
        statsMap.set(uid, {
          userId: uid,
          nome: this.getUserName(uid),
          total: 0,
          pendentes: 0,
          finalizadas: 0,
          canceladas: 0,
          atrasadas: 0,
          taxaConclusao: 0
        });
      }

      const s = statsMap.get(uid)!;
      s.total++;

      if (this.isFinalizada(d.status)) {
        s.finalizadas++;
      } else if (this.isCancelada(d.status)) {
        s.canceladas++;
      } else {
        s.pendentes++;
        // Demandas atrasadas: pendente com prazo antes de hoje
        const prazoISO = this.extractISODate(d.prazo);
        if (prazoISO && prazoISO < hojeStr) {
          s.atrasadas++;
        }
      }
    }

    // Calcular taxa de conclusão
    statsMap.forEach(s => {
      const naoCancel = s.total - s.canceladas;
      s.taxaConclusao = naoCancel > 0
        ? Math.round((s.finalizadas / naoCancel) * 100)
        : 0;
    });

    this.userStats = Array.from(statsMap.values())
      .sort((a, b) => b.total - a.total);

    this.maxDemandasUser = Math.max(1, ...this.userStats.map(s => s.total));
  }

  // ==================== Atrasadas ====================
  private computarAtrasadas(): void {
    const hojeStr = this.toISODate(new Date());
    this.demandasAtrasadas = this.demandasFiltradas.filter(d => {
      if (!this.isPendente(d.status)) return false;
      const prazoISO = this.extractISODate(d.prazo);
      return prazoISO ? prazoISO < hojeStr : false;
    }).sort((a, b) => {
      const pa = this.extractISODate(a.prazo) || '';
      const pb = this.extractISODate(b.prazo) || '';
      return pa.localeCompare(pb); // mais atrasada primeiro
    });

    this.totalAtrasadas = this.demandasAtrasadas.length;
  }

  // ==================== Helpers ====================
  getUserName(id: number | undefined): string {
    if (!id) return '-';
    const u = this.usuarios.find(x => x.id === id);
    if (!u) return `#${id}`;
    const raw = String(u.first_name || '').trim();
    if (!raw) return `#${id}`;
    const first = raw.split(/\s+/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  private removerAcentos(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeStatus(status?: string | null): string {
    const s = this.removerAcentos(String(status || '')).toLowerCase();
    if (s === 'finalizada' || s === 'concluida' || s === 'concluída') return 'finalizada';
    if (s === 'cancelada' || s === 'cancelado') return 'cancelada';
    if (s === 'em andamento' || s === 'andamento') return 'pendente';
    return 'pendente';
  }

  isPendente(status?: string | null): boolean {
    return this.normalizeStatus(status) === 'pendente';
  }

  isFinalizada(status?: string | null): boolean {
    return this.normalizeStatus(status) === 'finalizada';
  }

  isCancelada(status?: string | null): boolean {
    return this.normalizeStatus(status) === 'cancelada';
  }

  private normalizeTipo(type?: string | null): string {
    if (!type) return '';
    return this.removerAcentos(String(type)).toLowerCase().trim();
  }

  private normalizePeriodo(periodo?: string | null): string {
    if (!periodo) return '';
    return this.removerAcentos(String(periodo)).toLowerCase().trim();
  }

  private toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private extractISODate(value?: string | Date | null): string {
    if (!value) return '';
    const s = String(value);
    // dd/MM/yyyy => yyyy-MM-dd
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    // yyyy-MM-ddT...
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return '';
  }

  formatDateBr(value?: string | Date | null): string {
    if (!value) return '-';
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
    if (s.includes('/')) return s;
    return '-';
  }

  diasAtraso(prazo?: string | null): number {
    if (!prazo) return 0;
    const iso = this.extractISODate(prazo);
    if (!iso) return 0;
    const prazoDate = new Date(iso + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = hoje.getTime() - prazoDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  getBarWidth(value: number, max: number): string {
    if (!max) return '0%';
    return Math.round((value / max) * 100) + '%';
  }

  getTaxaColor(taxa: number): string {
    if (taxa >= 80) return '#2e7d32';
    if (taxa >= 50) return '#f57f17';
    return '#c62828';
  }

  toggleAtrasadas(): void {
    this.showAtrasadas = !this.showAtrasadas;
  }

  // ==================== Drawer de Funcionário ====================
  abrirDrawer(s: UserStats): void {
    this.drawerUsuario = s;
    this.drawerFiltroStatus = 'todas';
    this.drawerDemandas = this.demandasFiltradas
      .filter(d => d.user_id_responsavel === s.userId)
      .sort((a, b) => {
        // Pendentes primeiro, depois finalizadas, depois canceladas
        const ra = this.getStatusRankLocal(a.status);
        const rb = this.getStatusRankLocal(b.status);
        if (ra !== rb) return ra - rb;
        const pa = this.extractISODate(a.prazo) || '';
        const pb = this.extractISODate(b.prazo) || '';
        return pa.localeCompare(pb);
      });
    this.drawerAberto = true;
  }

  fecharDrawer(): void {
    this.drawerAberto = false;
    this.drawerUsuario = null;
  }

  get drawerDemandasFiltradas(): Demanda[] {
    if (this.drawerFiltroStatus === 'todas') return this.drawerDemandas;
    return this.drawerDemandas.filter(d =>
      this.normalizeStatus(d.status) === this.drawerFiltroStatus
    );
  }

  private getStatusRankLocal(status?: string | null): number {
    const s = this.normalizeStatus(status);
    if (s === 'pendente') return 0;
    if (s === 'finalizada') return 1;
    if (s === 'cancelada') return 2;
    return 3;
  }

  getStatusClass(status?: string | null): string {
    const s = this.normalizeStatus(status);
    if (s === 'pendente') return 'status-pendente';
    if (s === 'finalizada') return 'status-finalizada';
    if (s === 'cancelada') return 'status-cancelada';
    return '';
  }

  getStatusLabel(status?: string | null): string {
    const s = this.normalizeStatus(status);
    if (s === 'finalizada') return 'Finalizada';
    if (s === 'cancelada') return 'Cancelada';
    return 'Pendente';
  }

  isDemandasAtrasada(d: Demanda): boolean {
    if (!this.isPendente(d.status)) return false;
    const prazoISO = this.extractISODate(d.prazo);
    return prazoISO ? prazoISO < this.toISODate(new Date()) : false;
  }
}
