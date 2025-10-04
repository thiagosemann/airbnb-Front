import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NpsLimpezaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/nps_limpeza_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { NpsLimpeza } from 'src/app/shared/utilitarios/npsLimpeza';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-nps-limpeza',
  templateUrl: './nps-limpeza.component.html',
  styleUrls: ['./nps-limpeza.component.css']
})
export class NpsLimpezaComponent implements OnInit {
  npsList: NpsLimpeza[] = [];
  npsFiltrados: NpsLimpeza[] = [];
  apartamentos: Apartamento[] = [];
  terceirizados: User[] = [];

  filterApartamentoId: number | null = null;
  filterUserId: number | null = null;
  searchTerm: string = '';

  form!: FormGroup;
  editingId: number | null = null;
  currentUser: User | null = null;
  showModal: boolean = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private npsSrv: NpsLimpezaService,
    private aptoSrv: ApartamentoService,
    private userSrv: UserService,
    private authSrv: AuthenticationService
  ) {}

  private calcNotaMedia(): number | null {
    const vals = [
      this.form.get('limpeza_quarto')?.value,
      this.form.get('limpeza_banheiros')?.value,
      this.form.get('limpeza_cozinha')?.value,
    ]
      .map(v => (v === '' || v === null || v === undefined ? null : Number(v)))
      .filter(v => Number.isFinite(v)) as number[];

    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }

  private wireNotaAuto(): void {
    ['limpeza_quarto', 'limpeza_banheiros', 'limpeza_cozinha'].forEach(ctrl => {
      this.form.get(ctrl)?.valueChanges.subscribe(() => {
        const media = this.calcNotaMedia();
        this.form.get('nota_geral')?.setValue(media, { emitEvent: false });
      });
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authSrv.getUser();
    this.buildForm();
    this.wireNotaAuto();
    this.loadBaseData();
    this.loadNps();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      apartamento_id: [null, Validators.required],
      user_id: [null],
      nota_geral: [{ value: null, disabled: true }],
      comentario: [''],
      limpeza_quarto: [null, [Validators.min(0), Validators.max(10)]],
      limpeza_banheiros: [null, [Validators.min(0), Validators.max(10)]],
      limpeza_cozinha: [null, [Validators.min(0), Validators.max(10)]]
    });
  }

  private loadBaseData(): void {
    this.aptoSrv.getAllApartamentos().subscribe({
      next: as => (this.apartamentos = as || []),
      error: () => this.toastr.error('Falha ao carregar apartamentos')
    });
    this.userSrv.getUsersByRole('terceirizado').subscribe({
      next: us => (this.terceirizados = us || []),
      error: () => this.toastr.error('Falha ao carregar terceirizados')
    });
  }

  loadNps(): void {
    const handle = (list: NpsLimpeza[]) => {
      this.npsList = list || [];
      this.filtrarNps();
    };

    if (this.filterApartamentoId && this.filterUserId) {
      this.npsSrv.getByApartamentoId(this.filterApartamentoId).subscribe({
        next: list => handle((list || []).filter(n => n.user_id === this.filterUserId)),
        error: () => this.toastr.error('Falha ao carregar NPS')
      });
      return;
    }

    if (this.filterApartamentoId) {
      this.npsSrv.getByApartamentoId(this.filterApartamentoId).subscribe({
        next: list => handle(list || []),
        error: () => this.toastr.error('Falha ao carregar NPS por apartamento')
      });
      return;
    }

    if (this.filterUserId) {
      this.npsSrv.getByUserId(this.filterUserId).subscribe({
        next: list => handle(list || []),
        error: () => this.toastr.error('Falha ao carregar NPS por usuário')
      });
      return;
    }

    this.npsSrv.getAll().subscribe({
      next: list => handle(list || []),
      error: () => this.toastr.error('Falha ao carregar NPS')
    });
  }

  filtrarNps(): void {
    const termo = (this.searchTerm || '').toLowerCase().trim();
    if (!termo) {
      this.npsFiltrados = [...this.npsList];
      return;
    }
    this.npsFiltrados = this.npsList.filter(n => {
      const apt = (n.apartamento_nome || this.getApartamentoNome(n.apartamento_id)).toLowerCase();
      const terce = (this.getUserNome(n.user_id, n.terceirizado_nome) || '').toLowerCase();
      const comm = (n.comentario || '').toLowerCase();
      const nota = String(n.nota_geral || '');
      return apt.includes(termo) || terce.includes(termo) || comm.includes(termo) || nota.includes(termo);
    });
  }

  resetFilters(): void {
    this.filterApartamentoId = null;
    this.filterUserId = null;
    this.searchTerm = '';
    this.loadNps();
  }

  redirectToNovoNps(): void {
    this.editingId = null;
    this.form.reset();
    this.form.get('nota_geral')?.disable({ emitEvent: false });
    this.showModal = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const media = this.calcNotaMedia();
      this.form.get('nota_geral')?.setValue(media, { emitEvent: false });
      return;
    }

    const formValue = this.form.getRawValue();
    const media = this.calcNotaMedia();

    if (media === null || !Number.isFinite(media) || media < 0 || media > 10) {
      this.toastr.error('Informe ao menos uma subnota válida (0 a 10).');
      return;
    }

    const payload: any = {
      ...formValue,
      nota_geral: media,
      empresa_id: this.currentUser?.empresa_id
    };

    if (payload.user_id === null || payload.user_id === undefined || payload.user_id === '') {
      payload.user_id = null;
    }

    if (this.editingId) {
      this.npsSrv.update(this.editingId, payload).subscribe({
        next: () => {
          this.toastr.success('NPS atualizado com sucesso');
          this.cancelEdit();
          this.loadNps();
        },
        error: () => this.toastr.error('Falha ao atualizar NPS')
      });
    } else {
      if (!payload.empresa_id) {
        this.toastr.error('Empresa não encontrada para o usuário logado.');
        return;
      }
      this.npsSrv.create(payload).subscribe({
        next: () => {
          this.toastr.success('NPS criado com sucesso');
          this.showModal = false;
          this.form.reset();
          this.loadNps();
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Falha ao criar NPS');
        }
      });
    }
  }

  edit(item: NpsLimpeza): void {
    this.editingId = item.id || null;
    this.form.patchValue({
      apartamento_id: item.apartamento_id,
      user_id: item.user_id ?? null,
      comentario: item.comentario || '',
      limpeza_quarto: item.limpeza_quarto ?? null,
      limpeza_banheiros: item.limpeza_banheiros ?? null,
      limpeza_cozinha: item.limpeza_cozinha ?? null
    });

    const media = this.calcNotaMedia();
    this.form.get('nota_geral')?.setValue(media ?? item.nota_geral ?? null, { emitEvent: false });

    this.showModal = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showModal = false;
    this.form.reset();
  }

  delete(item: NpsLimpeza): void {
    if (!item.id) return;
    const ok = confirm('Deseja realmente excluir este NPS?');
    if (!ok) return;

    this.npsSrv.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('NPS excluído');
        this.loadNps();
      },
      error: () => this.toastr.error('Falha ao excluir NPS')
    });
  }

  getApartamentoNome(id: number): string {
    return this.apartamentos.find(a => a.id === id)?.nome || '—';
  }

  getUserNome(userId?: number | null, terceirizado_nome?: string): string {
    if (terceirizado_nome) return terceirizado_nome;
    if (!userId) return '—';
    const u = this.terceirizados.find(t => t.id === userId);
    return u ? `${u.first_name} ${u.last_name || ''}`.trim() : '—';
  }

  formatDate(date?: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch {
      return date;
    }
  }

  calcularDiasDesde(dateStr?: string): number | null {
    if (!dateStr) return null;
    const start = new Date(dateStr).getTime();
    const diff = Date.now() - start;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  getNotaBadgeClass(nota: number | undefined): string {
    if (nota === undefined || nota === null) return 'low';
    if (nota >= 9) return 'high';
    if (nota >= 7) return 'medium';
    return 'low';
  }
}
