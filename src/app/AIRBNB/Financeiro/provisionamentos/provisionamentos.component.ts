import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProvisionamentoService, ProvisionamentoFiltro } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/provisionamento_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import {
  Provisionamento,
  StatusEfetivo,
  TransacaoTipo,
  VinculoTipo,
} from 'src/app/shared/utilitarios/provisionamento';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { User } from 'src/app/shared/utilitarios/user';

interface ResumoCelula {
  entrada: number;
  saida: number;
  quantidade: number;
}

@Component({
  selector: 'app-provisionamentos',
  templateUrl: './provisionamentos.component.html',
  styleUrls: ['./provisionamentos.component.css'],
})
export class ProvisionamentosComponent implements OnInit {
  // Dados
  itens: Provisionamento[] = [];          // dataset do período (vindo do backend)
  itensFiltrados: Provisionamento[] = []; // após filtros de status/tipo (cliente)
  apartamentos: Apartamento[] = [];
  proprietarios: User[] = [];
  carregando = false;

  // Filtros
  dataInicio = '';
  dataFim = '';
  statusSelecionados: Record<StatusEfetivo, boolean> = {
    PREVISTO: true,
    PENDENTE: true,
    ATRASADO: true,
    REALIZADO: true,
  };
  tipoFiltro: '' | TransacaoTipo = '';

  // Resumo por status efetivo
  ordemStatus: StatusEfetivo[] = ['PREVISTO', 'PENDENTE', 'ATRASADO', 'REALIZADO'];
  rotuloStatus: Record<StatusEfetivo, string> = {
    PREVISTO: 'Previsto',
    PENDENTE: 'Pendente',
    ATRASADO: 'Atrasado',
    REALIZADO: 'Realizado',
  };
  resumo: Record<StatusEfetivo, ResumoCelula> = this.resumoZerado();

  // Detalhe expandido (observações)
  expandidoId: number | null = null;

  // Modal
  modalAberto = false;
  editandoId: number | null = null;
  statusOriginal: Provisionamento['status'] | null = null;
  form!: FormGroup;

  // Modal de confirmação de exclusão
  confirmExcluirAberto = false;
  itemExcluir: Provisionamento | null = null;

  constructor(
    private fb: FormBuilder,
    private provSrv: ProvisionamentoService,
    private aptoSrv: ApartamentoService,
    private userSrv: UserService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.aplicarAtalhoMes(); // período inicial = mês corrente
    this.aptoSrv.getAllApartamentos().subscribe((a) => {
      this.apartamentos = [...(a || [])].sort((x, y) =>
        String(x?.nome || '').localeCompare(String(y?.nome || ''), 'pt-BR')
      );
    });
    this.userSrv.getProprietarios().subscribe((u) => {
      this.proprietarios = [...(u || [])].sort((x, y) =>
        this.nomeUser(x).localeCompare(this.nomeUser(y), 'pt-BR')
      );
    });
  }

  // ---------- Carregamento / filtros ----------
  carregar(): void {
    this.carregando = true;
    const filtro: ProvisionamentoFiltro = {
      dataInicio: this.dataInicio || undefined,
      dataFim: this.dataFim || undefined,
    };
    this.provSrv.getAll(filtro).subscribe({
      next: (rows) => {
        this.itens = rows || [];
        this.recalcular();
        this.carregando = false;
      },
      error: (err) => {
        console.error(err);
        this.carregando = false;
        alert('Erro ao carregar provisionamentos.');
      },
    });
  }

  // Recalcula resumo (sobre o período completo) e lista filtrada (status/tipo)
  recalcular(): void {
    this.resumo = this.resumoZerado();
    for (const it of this.itens) {
      const st = this.statusDe(it);
      const cel = this.resumo[st];
      cel.quantidade++;
      if (it.tipo === 'entrada') cel.entrada += Number(it.valor) || 0;
      else cel.saida += Number(it.valor) || 0;
    }
    this.itensFiltrados = this.itens.filter((it) => {
      const st = this.statusDe(it);
      if (!this.statusSelecionados[st]) return false;
      if (this.tipoFiltro && it.tipo !== this.tipoFiltro) return false;
      return true;
    });
  }

  toggleStatus(st: StatusEfetivo): void {
    this.statusSelecionados[st] = !this.statusSelecionados[st];
    this.recalcular();
  }

  setTipoFiltro(tipo: '' | TransacaoTipo): void {
    this.tipoFiltro = tipo;
    this.recalcular();
  }

  // ---------- Atalhos de período ----------
  private toISO(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  aplicarAtalhoDia(): void {
    const hoje = new Date();
    this.dataInicio = this.toISO(hoje);
    this.dataFim = this.toISO(hoje);
    this.carregar();
  }

  aplicarAtalho7Dias(): void {
    const hoje = new Date();
    const fim = new Date();
    fim.setDate(hoje.getDate() + 6);
    this.dataInicio = this.toISO(hoje);
    this.dataFim = this.toISO(fim);
    this.carregar();
  }

  aplicarAtalhoMes(): void {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    this.dataInicio = this.toISO(inicio);
    this.dataFim = this.toISO(fim);
    this.carregar();
  }

  // ---------- Modal ----------
  initForm(): void {
    this.form = this.fb.group({
      vinculo_tipo: ['texto' as VinculoTipo, Validators.required],
      vinculo_id: [null],
      vinculo_label: [''],
      apartamento_id: [null],
      tipo: ['saida' as TransacaoTipo, Validators.required],
      valor: [null, [Validators.required, Validators.min(0)]],
      descricao: [''],
      data_prevista: [null],
      data_realizada: [null],
      status: ['PREVISTO' as Provisionamento['status'], Validators.required],
    });
  }

  abrirNovo(): void {
    this.editandoId = null;
    this.statusOriginal = null;
    this.form.reset({
      vinculo_tipo: 'texto',
      vinculo_id: null,
      vinculo_label: '',
      apartamento_id: null,
      tipo: 'saida',
      valor: null,
      descricao: '',
      data_prevista: null,
      data_realizada: null,
      status: 'PREVISTO',
    });
    this.modalAberto = true;
  }

  abrirEdicao(item: Provisionamento): void {
    this.editandoId = item.id ?? null;
    this.statusOriginal = item.status;
    this.form.reset({
      vinculo_tipo: item.vinculo_tipo,
      vinculo_id: item.vinculo_id ?? null,
      vinculo_label: item.vinculo_label ?? '',
      apartamento_id: item.apartamento_id ?? null,
      tipo: item.tipo,
      valor: item.valor,
      descricao: item.descricao ?? '',
      data_prevista: this.paraInputData(item.data_prevista),
      data_realizada: this.paraInputData(item.data_realizada),
      status: item.status,
    });
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  // Gatilho: preencher data realizada => status REALIZADO
  onDataRealizadaChange(): void {
    const val = this.form.get('data_realizada')?.value;
    if (val) {
      this.form.get('status')?.setValue('REALIZADO');
    }
  }

  // Ao mudar o vínculo, limpa o campo que não se aplica
  onVinculoTipoChange(): void {
    const tipo = this.form.get('vinculo_tipo')?.value as VinculoTipo;
    if (tipo !== 'proprietario') this.form.get('vinculo_id')?.setValue(null);
    if (tipo === 'forest') this.form.get('vinculo_label')?.setValue('');
  }

  // Sair de REALIZADO exige confirmação; e limpa data realizada
  onStatusChange(): void {
    const novo = this.form.get('status')?.value;
    if (this.statusOriginal === 'REALIZADO' && novo !== 'REALIZADO') {
      const ok = confirm('Este lançamento está marcado como REALIZADO. Deseja realmente alterar o status? A data realizada será removida.');
      if (!ok) {
        this.form.get('status')?.setValue('REALIZADO');
        return;
      }
      this.form.get('data_realizada')?.setValue(null);
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    const payload: Partial<Provisionamento> = {
      vinculo_tipo: raw.vinculo_tipo,
      vinculo_id: raw.vinculo_tipo === 'proprietario' ? raw.vinculo_id || null : null,
      vinculo_label: raw.vinculo_label || null,
      apartamento_id: raw.apartamento_id || null,
      tipo: raw.tipo,
      valor: raw.valor,
      descricao: raw.descricao || null,
      data_prevista: raw.data_prevista || null,
      data_realizada: raw.data_realizada || null,
      status: raw.status,
    };

    const done = () => {
      this.fecharModal();
      this.carregar();
    };
    const fail = (err: any) => {
      console.error(err);
      alert(err?.error?.error || 'Erro ao salvar provisionamento.');
    };

    if (this.editandoId) {
      this.provSrv.update(this.editandoId, payload).subscribe({ next: done, error: fail });
    } else {
      this.provSrv.create(payload).subscribe({ next: done, error: fail });
    }
  }

  // Abre o modal de confirmação de exclusão
  pedirExclusao(item: Provisionamento): void {
    this.itemExcluir = item;
    this.confirmExcluirAberto = true;
  }

  cancelarExclusao(): void {
    this.confirmExcluirAberto = false;
    this.itemExcluir = null;
  }

  confirmarExclusao(): void {
    const item = this.itemExcluir;
    if (!item?.id) {
      this.cancelarExclusao();
      return;
    }
    this.provSrv.delete(item.id).subscribe({
      next: () => {
        this.cancelarExclusao();
        this.carregar();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao excluir provisionamento.');
      },
    });
  }

  toggleDetalhe(item: Provisionamento): void {
    this.expandidoId = this.expandidoId === item.id ? null : (item.id ?? null);
  }

  // ---------- Helpers de exibição ----------
  private resumoZerado(): Record<StatusEfetivo, ResumoCelula> {
    return {
      PREVISTO: { entrada: 0, saida: 0, quantidade: 0 },
      PENDENTE: { entrada: 0, saida: 0, quantidade: 0 },
      ATRASADO: { entrada: 0, saida: 0, quantidade: 0 },
      REALIZADO: { entrada: 0, saida: 0, quantidade: 0 },
    };
  }

  // status efetivo (deriva ATRASADO caso backend não tenha enviado)
  statusDe(item: Provisionamento): StatusEfetivo {
    if (item.status_efetivo) return item.status_efetivo;
    if (item.status === 'PENDENTE' && item.data_prevista && item.data_prevista < this.toISO(new Date())) {
      return 'ATRASADO';
    }
    return item.status as StatusEfetivo;
  }

  classeStatus(item: Provisionamento): string {
    return 'st-' + this.statusDe(item).toLowerCase();
  }

  nomeUser(u: User): string {
    return `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
  }

  vinculoDisplay(item: Provisionamento): string {
    switch (item.vinculo_tipo) {
      case 'forest':
        return 'Forest';
      case 'proprietario':
        return item.proprietario_nome || item.vinculo_label || 'Proprietário';
      case 'fornecedor':
        return item.vinculo_label || 'Fornecedor';
      default:
        return item.vinculo_label || '—';
    }
  }

  aptoNome(item: Provisionamento): string {
    return item.apartamento_nome || '';
  }

  // Normaliza data vinda do backend (Date/ISO) para 'YYYY-MM-DD' do input type=date
  paraInputData(value: string | null | undefined): string | null {
    if (!value) return null;
    return String(value).slice(0, 10);
  }

  moeda(v: number | null | undefined): string {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Saldo (entrada - saída) de uma célula do resumo
  saldo(cel: ResumoCelula): number {
    return cel.entrada - cel.saida;
  }
}
