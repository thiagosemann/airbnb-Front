import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DemandasService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/demandas_service';
import { Demanda } from 'src/app/shared/utilitarios/demanda';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { User } from 'src/app/shared/utilitarios/user';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Component({
  selector: 'app-controle-demandas',
  templateUrl: './controle-demandas.component.html',
  styleUrls: ['./controle-demandas.component.css']
})
export class ControleDemandasComponent implements OnInit {
  // Listagem
  demandas: Demanda[] = [];
  demandasFiltradas: Demanda[] = [];
  loading = false;

  // Dados auxiliares
  apartamentos: Apartamento[] = [];
  usuarios: User[] = [];
  currentUser: User | null = null;

  // Formulário/modal
  showModal = false;
  isEditing = false;
  form!: FormGroup;
  demandaSelecionada: Demanda | null = null;

  // Reserva (opcional)
  reservaCodigo = '';
  reservaResultados: ReservaAirbnb[] = [];
  reservaSelecionada: ReservaAirbnb | null = null;
  reservaLoading = false;
  reservaErro: string | null = null;

  // Filtro rápido
  filtroTexto = '';
  filtroStatus = '';
  filtroUsuarioId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private demandasSrv: DemandasService,
    private aptoSrv: ApartamentoService,
    private userSrv: UserService,
    private authSrv: AuthenticationService,
    private toastr: ToastrService,
    private reservasSrv: ReservasAirbnbService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authSrv.getUser();
    this.initForm();
    this.carregarAuxiliares();
    this.carregarDemandas();
  }

  private initForm(): void {
    this.form = this.fb.group({
      id: [null],
      apartamento_id: [null, Validators.required],
      user_id_responsavel: [null, Validators.required],
      reserva_id: [null],
      user_id_created: [null], // setado ao salvar
      demanda: ['', Validators.required],
      prazo: [null],           // YYYY-MM-DD
      periodo: [''],           // manhã/tarde/noite
      status: ['Pendente', Validators.required],
      type: ['']
    });
  }

  private carregarAuxiliares(): void {
    this.aptoSrv.getAllApartamentos().subscribe({
      next: a => (this.apartamentos = a),
      error: () => this.toastr.error('Erro ao carregar apartamentos')
    });
    this.userSrv.getUsersByRole('admin').subscribe({
      next: u => (this.usuarios = u),
      error: () => this.toastr.error('Erro ao carregar usuários')
    });
  }

  carregarDemandas(): void {
    this.loading = true;
    this.demandasSrv.getAllDemandas().subscribe({
      next: ds => {
        this.demandas = ds;
        this.demandasFiltradas = this.ordenarPorStatus([...this.demandas]);
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar demandas');
        this.loading = false;
      }
    });
  }

  filtrar(term: string): void {
    this.filtroTexto = term.toLowerCase();
    this.applyFilters();
  }

  filtrarStatus(status: string): void {
    this.filtroStatus = status;
    this.applyFilters();
  }

  filtrarUsuario(userId: string): void {
    const v = String(userId || '').trim();
    this.filtroUsuarioId = v ? Number(v) : null;
    this.applyFilters();
  }

  getStatusClass(status?: string | null): string {
    const s = String(status || '').toLowerCase();
    if (s === 'pendente') return 'status-pendente';
    if (s === 'em andamento' || s === 'andamento') return 'status-andamento';
    if (s === 'concluída' || s === 'concluida') return 'status-concluida';
    return '';
  }

  private applyFilters(): void {
    const filtered = this.demandas.filter(d => {
      const textoOk = !this.filtroTexto
        || (d.demanda || '').toLowerCase().includes(this.filtroTexto)
        || (d.apartamento_nome || '').toLowerCase().includes(this.filtroTexto);
      const statusOk = !this.filtroStatus || d.status === this.filtroStatus;
      const usuarioOk = !this.filtroUsuarioId || d.user_id_responsavel === this.filtroUsuarioId;
      return textoOk && statusOk && usuarioOk;
    });
    this.demandasFiltradas = this.ordenarPorStatus(filtered);
  }

  abrirModal(): void {
    this.showModal = true;
    this.isEditing = false;
    this.demandaSelecionada = null;
    this.form.reset({
      status: 'Pendente',
      periodo: ''
    });
    this.reservaCodigo = '';
    this.reservaResultados = [];
    this.reservaSelecionada = null;
    this.reservaErro = null;
  }

  editar(d: Demanda): void {
    this.isEditing = true;
    this.showModal = true;
    this.demandaSelecionada = d;
    this.form.patchValue(d);
    // Se a demanda já tiver reserva vinculada, preenche estado visual
    if (d.reserva_id) {
      this.reservaSelecionada = {
        id: d.reserva_id,
        apartamento_id: d.apartamento_id,
        apartamento_nome: this.getAptoNome(d.apartamento_id),
        description: '',
        end_data: '',
        start_date: '',
        Observacoes: '',
        cod_reserva: '',
        link_reserva: '',
        limpeza_realizada: false,
        credencial_made: false,
        informed: false,
        check_in: '',
        check_out: '',
        pagamentos: [],
        horarioPrevistoChegada: []
      } as ReservaAirbnb;
    }
  }

  excluir(d: Demanda): void {
    if (!d?.id) return;
    if (!confirm('Tem certeza que deseja excluir esta demanda?')) return;
    this.demandasSrv.deleteDemanda(d.id).subscribe({
      next: () => {
        this.toastr.success('Demanda excluída com sucesso');
        this.carregarDemandas();
      },
      error: () => this.toastr.error('Erro ao excluir demanda')
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Partial<Demanda> = {
      ...this.form.value,
      user_id_created: this.currentUser?.id
    };

    // Normalizar período sem acentos antes de enviar
    if (payload.periodo) {
      payload.periodo = this.removerAcentos(String(payload.periodo)).toLowerCase();
    }
    // Normalizar tipo para valores aceitos pelo backend: 'rua' | 'escritorio'
    if (payload.type) {
      const t = this.removerAcentos(String(payload.type)).toLowerCase();
      payload.type = t === 'escritorio' ? 'escritorio' : 'rua';
    }

    const req$ = this.isEditing && payload.id
      ? this.demandasSrv.updateDemanda(payload.id, payload)
      : this.demandasSrv.createDemanda(payload);

    req$.subscribe({
      next: () => {
        this.toastr.success(`Demanda ${this.isEditing ? 'atualizada' : 'criada'} com sucesso`);
        this.fecharModal();
        this.carregarDemandas();
      },
      error: () => this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} demanda`)
    });
  }

  fecharModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.demandaSelecionada = null;
    this.reservaSelecionada = null;
    this.reservaResultados = [];
    this.reservaCodigo = '';
    this.reservaErro = null;
  }

  getAptoNome(id: number | undefined): string {
    if (!id) return '';
    const a = this.apartamentos.find(x => x.id === id);
    return a ? a.nome : '';
  }

  formatNomeCurto(nome?: string | null): string {
    const raw = String(nome || '').trim();
    if (!raw) return '';
    const first = raw.split(/\s+/)[0];
    const lower = first.toLocaleLowerCase();
    return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
  }

  getUserName(id: number | undefined): string {
    if (!id) return '';
    const u = this.usuarios.find(x => x.id === id);
    return u ? this.formatNomeCurto(u.first_name) : '';
  }

  // Helpers
  private removerAcentos(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

  getTypeClass(value?: string | null): string {
    const v = this.removerAcentos(String(value || '')).toLowerCase();
    if (v === 'escritorio') return 'type-escritorio';
    if (v === 'rua') return 'type-rua';
    return 'type-default';
  }

  // Datas
  formatDateBr(value?: string | Date | null): string {
    if (!value) return '-';
    const s = String(value);
    // tenta padrão YYYY-MM-DD (com ou sem tempo)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mm, dd] = m;
      return `${dd}/${mm}/${y}`;
    }
    // fallback para Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
    return '-';
  }

  // Reserva (opcional)
  buscarReservaPorCodigo(): void {
    const cod = (this.reservaCodigo || '').trim();
    if (!cod) {
      this.reservaErro = 'Informe um código de reserva.';
      return;
    }
    this.reservaErro = null;
    this.reservaLoading = true;
    this.reservaResultados = [];
    this.reservaSelecionada = null;
    this.reservasSrv.getReservaByCodReserva(cod).subscribe({
      next: (res) => {
        this.reservaResultados = res || [];
        if (this.reservaResultados.length === 1) {
          this.selecionarReserva(this.reservaResultados[0]);
        }
        if (this.reservaResultados.length === 0) {
          this.reservaErro = 'Nenhuma reserva encontrada para este código.';
        }
        this.reservaLoading = false;
      },
      error: () => {
        this.reservaErro = 'Erro ao buscar reserva.';
        this.reservaLoading = false;
      }
    });
  }

  selecionarReserva(r: ReservaAirbnb): void {
    this.reservaSelecionada = r;
    // Vincula automaticamente apartamento e reserva ao form da demanda
    this.form.get('apartamento_id')?.setValue(r.apartamento_id);
    this.form.get('reserva_id')?.setValue(r.id || null);
  }

  limparReserva(): void {
    this.reservaSelecionada = null;
    this.reservaResultados = [];
    this.reservaCodigo = '';
    this.form.get('reserva_id')?.setValue(null);
  }

}
