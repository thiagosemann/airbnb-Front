import { Component, OnInit } from '@angular/core';
import { DemandasService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/demandas_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { ToastrService } from 'ngx-toastr';
import { Demanda } from 'src/app/shared/utilitarios/demanda';
import { User } from 'src/app/shared/utilitarios/user';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';

@Component({
  selector: 'app-suas-demandas',
  templateUrl: './suas-demandas.component.html',
  styleUrls: ['./suas-demandas.component.css']
})
export class SuasDemandasComponent implements OnInit {
  // Listas
  demandasHoje: Demanda[] = [];
  demandasFuturas: Demanda[] = [];

  // Abas e estado
  tabs = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'futuras', label: 'Outras Datas' },
  ];
  activeTab: 'hoje' | 'futuras' = 'hoje';
  carregando = true;
  carregandoFuturas = false;

  // Usuário e período
  user: User | null = null;
  dataInicio = '';
  dataFim = '';
  // Modal
  modalAberto = false;
  demandaSelecionada: (Demanda & { endereco?: string }) | null = null;

  constructor(
    private demandasSrv: DemandasService,
    private authSrv: AuthenticationService,
    private toastr: ToastrService,
    private apartamentosService: ApartamentoService
  ) {}

  ngOnInit(): void {
    this.user = this.authSrv.getUser();
    const hoje = new Date();
    const futuro = new Date();
    futuro.setDate(hoje.getDate() + 30);
    this.dataInicio = this.formatarDataParaInput(hoje);
    this.dataFim = this.formatarDataParaInput(futuro);
    this.carregarHoje();
  }

  selectTab(id: 'hoje' | 'futuras' | string): void {
    this.activeTab = (id === 'hoje' ? 'hoje' : 'futuras');
  }

  private carregarHoje(): void {
    if (!this.user?.id) return;
    this.carregando = true;
    const hojeStr = this.formatarDataParaInput(new Date());
    this.demandasSrv.getDemandasByResponsavel(this.user.id).subscribe({
      next: (ds) => {
        const todas = this.formatDates(ds);
        this.demandasHoje = this.ordenarPorStatus(
          todas.filter(d => this.isSameDateISO(d.prazo, hojeStr))
        );
        this.carregando = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar suas demandas');
        this.carregando = false;
      }
    });
  }

  pesquisarPeriodo(): void {
    if (!this.user?.id) return;
    if (!this.dataInicio || !this.dataFim) {
      this.toastr.warning('Selecione ambas as datas');
      return;
    }
    this.carregandoFuturas = true;
    this.demandasSrv.getDemandasByResponsavel(this.user.id).subscribe({
      next: (ds) => {
        const todas = this.formatDates(ds);
        this.demandasFuturas = this.ordenarPorStatus(
          todas.filter(d => this.isBetweenISO(d.prazo, this.dataInicio, this.dataFim) && !this.isSameDateISO(d.prazo, this.formatarDataParaInput(new Date())))
        );
        this.carregandoFuturas = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar demandas do período');
        this.carregandoFuturas = false;
      }
    });
  }

  updateStatus(d: Demanda, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const novoStatus = checked ? 'Concluída' : 'Pendente';
    if (!d.id) return;
    this.demandasSrv.updateDemanda(d.id, { status: novoStatus }).subscribe({
      next: () => {
        d.status = novoStatus;
        this.toastr.success(checked ? 'Demanda concluída!' : 'Demanda marcada como pendente.');
      },
      error: () => {
        this.toastr.error('Erro ao atualizar status da demanda');
      }
    });
  }

  // Modal
  abrirModal(d: Demanda): void {
    this.demandaSelecionada = { ...d };
    const aptoId = d.apartamento_id;
    if (aptoId) {
      this.apartamentosService.getApartamentoById(aptoId).subscribe({
        next: (apt: any) => {
          const endereco = (apt?.endereco ? apt.endereco + (apt?.bairro ? ', ' + apt.bairro : '') : 'Sem endereço cadastrado.');
          this.demandaSelecionada = { ...d, endereco };
          this.modalAberto = true;
        },
        error: () => {
          this.toastr.error('Não foi possível carregar informações do apartamento.');
          this.modalAberto = true;
        }
      });
    } else {
      this.modalAberto = true;
    }
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.demandaSelecionada = null;
  }

  abrirGoogleMaps(endereco: string): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  }

  // ===== Helpers =====
  private formatarDataParaInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toBrDate(dateStr: any): any {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    if (dateStr.includes('/')) return dateStr;
    const onlyDate = dateStr.split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mm, dd] = m;
      return `${dd}/${mm}/${y}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yy = d.getUTCFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    return dateStr;
  }

  private formatDates(lista: Demanda[]): Demanda[] {
    return lista.map(d => ({
      ...d,
      prazo: this.toBrDate(String(d.prazo || '')),
      created_at: this.toBrDate(String(d.created_at || '')),
      updated_at: this.toBrDate(String(d.updated_at || '')),
    }));
  }

  private parseISO(dateStr: string): string {
    // aceita dd/MM/yyyy e retorna yyyy-MM-dd
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [dd, mm, yyyy] = dateStr.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return dateStr.split('T')[0];
  }

  private isSameDateISO(dateStr: any, iso: string): boolean {
    const a = this.parseISO(String(dateStr || ''));
    const b = iso.split('T')[0];
    return a === b;
  }

  private isBetweenISO(dateStr: any, startISO: string, endISO: string): boolean {
    const d = this.parseISO(String(dateStr || ''));
    return d >= startISO && d <= endISO;
  }

  getDiaDaSemana(dataStr: string | undefined): string {
    const raw = String(dataStr || '');
    const partes = raw.split('/');
    if (partes.length !== 3) return '';
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const ano = parseInt(partes[2], 10);
    const data = new Date(ano, mes, dia);
    const nomes = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    return nomes[data.getDay()] || '';
  }

  private removerAcentos(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private getStatusRank(status?: string | null): number {
    const s = this.removerAcentos(String(status || '')).toLowerCase();
    if (s === 'em andamento' || s === 'andamento') return 0;
    if (s === 'pendente') return 1;
    if (s === 'concluida' || s === 'concluída') return 2;
    return 3;
  }

  private ordenarPorStatus(arr: Demanda[]): Demanda[] {
    return [...arr].sort((a, b) => {
      const ra = this.getStatusRank(a.status);
      const rb = this.getStatusRank(b.status);
      if (ra !== rb) return ra - rb;
      const ad = (a.created_at || '').toString();
      const bd = (b.created_at || '').toString();
      return bd.localeCompare(ad);
    });
  }

  displayPeriodo(value?: string | null): string {
    if (!value) return '-';
    const v = String(value).toLowerCase();
    if (v === 'manha') return 'Manhã';
    if (v === 'tarde') return 'Tarde';
    if (v === 'noite') return 'Noite';
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  displayTipo(value?: string | null): string {
    if (!value) return '-';
    const v = this.removerAcentos(String(value)).toLowerCase();
    if (v === 'escritorio') return 'Escritório';
    if (v === 'rua') return 'Rua';
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
}
