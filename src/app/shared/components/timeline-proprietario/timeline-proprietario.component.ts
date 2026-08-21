import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ObservacoesProprietarioService } from '../../service/Banco_de_Dados/AIRBNB/observacoesProprietario_service';
import { ObservacaoProprietario, ProprietarioResumo } from '../../utilitarios/observacaoProprietario';
import { AuthenticationService } from '../../service/Banco_de_Dados/authentication';

/**
 * Timeline de observações do proprietário, compartilhada entre o cadastro de
 * proprietários e o cadastro de apartamentos.
 *
 * - Recebendo `proprietarioId`, mostra a timeline daquele proprietário.
 * - Recebendo apenas `apartamentoId`, resolve os proprietários vinculados ao
 *   apartamento e mostra a timeline deles: o apartamento pertence ao
 *   proprietário, então a timeline é a mesma nas duas telas.
 */
@Component({
  selector: 'app-timeline-proprietario',
  templateUrl: './timeline-proprietario.component.html',
  styleUrls: ['./timeline-proprietario.component.css']
})
export class TimelineProprietarioComponent implements OnChanges {
  @Input() proprietarioId?: number | null;
  @Input() apartamentoId?: number | null;

  observacoes: ObservacaoProprietario[] = [];
  proprietariosDoApartamento: ProprietarioResumo[] = [];
  /** Proprietário que receberá a próxima nota (relevante quando o apto tem mais de um) */
  proprietarioAlvoId: number | null = null;

  novaObservacao: string = '';
  carregando: boolean = false;
  salvando: boolean = false;
  editandoId: number | null = null;
  editandoTexto: string = '';

  constructor(
    private observacoesService: ObservacoesProprietarioService,
    private authService: AuthenticationService,
    private toastr: ToastrService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proprietarioId'] || changes['apartamentoId']) {
      this.resetEstado();
      this.carregar();
    }
  }

  private resetEstado(): void {
    this.observacoes = [];
    this.proprietariosDoApartamento = [];
    this.proprietarioAlvoId = null;
    this.novaObservacao = '';
    this.cancelarEdicao();
  }

  /** Modo apartamento: precisamos descobrir a quem atribuir a nova nota */
  get modoApartamento(): boolean {
    return !this.proprietarioId && !!this.apartamentoId;
  }

  get semProprietarioVinculado(): boolean {
    return this.modoApartamento && !this.carregando && this.proprietariosDoApartamento.length === 0;
  }

  get precisaEscolherProprietario(): boolean {
    return this.modoApartamento && this.proprietariosDoApartamento.length > 1;
  }

  carregar(): void {
    // Tela de proprietários: a timeline é a dele, direto
    if (this.proprietarioId) {
      this.proprietarioAlvoId = this.proprietarioId;
      this.carregando = true;
      this.observacoesService.getByProprietarioId(this.proprietarioId).subscribe({
        next: (obs) => {
          this.observacoes = obs || [];
          this.carregando = false;
        },
        error: (err) => {
          console.error('Erro ao carregar observações do proprietário:', err);
          this.observacoes = [];
          this.carregando = false;
          this.toastr.error('Erro ao carregar observações do proprietário');
        }
      });
      return;
    }

    if (!this.apartamentoId) return;

    // Tela de apartamentos: descobre os proprietários vinculados...
    this.carregando = true;
    this.observacoesService.getProprietariosDoApartamento(this.apartamentoId).subscribe({
      next: (proprietarios) => {
        this.proprietariosDoApartamento = proprietarios || [];
        // Com um único proprietário não faz sentido perguntar a quem atribuir
        this.proprietarioAlvoId = this.proprietariosDoApartamento.length === 1
          ? this.proprietariosDoApartamento[0].id
          : null;
      },
      error: (err) => {
        console.error('Erro ao carregar proprietários do apartamento:', err);
        this.proprietariosDoApartamento = [];
      }
    });

    // ...e mostra a timeline deles
    this.observacoesService.getByApartamentoId(this.apartamentoId).subscribe({
      next: (obs) => {
        this.observacoes = obs || [];
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar observações do apartamento:', err);
        this.observacoes = [];
        this.carregando = false;
        this.toastr.error('Erro ao carregar observações do proprietário');
      }
    });
  }

  adicionar(): void {
    const texto = this.novaObservacao.trim();
    if (!texto) {
      this.toastr.warning('Escreva uma observação antes de salvar.');
      return;
    }
    if (!this.proprietarioAlvoId) {
      this.toastr.warning(this.semProprietarioVinculado
        ? 'Este apartamento não tem proprietário vinculado.'
        : 'Selecione o proprietário que receberá a observação.');
      return;
    }

    this.salvando = true;
    this.observacoesService.create({
      proprietario_id: this.proprietarioAlvoId,
      apartamento_id: this.apartamentoId || null,
      texto
    }).subscribe({
      next: (criada) => {
        this.observacoes = [criada, ...this.observacoes];
        this.novaObservacao = '';
        this.salvando = false;
        this.toastr.success('Observação registrada!');
      },
      error: (err) => {
        console.error('Erro ao registrar observação:', err);
        this.salvando = false;
        this.toastr.error('Erro ao registrar observação');
      }
    });
  }

  /**
   * Só o autor pode editar/remover o próprio registro (regra também validada no
   * backend). Registros sem autor ficam liberados.
   */
  podeEditar(obs: ObservacaoProprietario): boolean {
    if (obs.user_id === null) return true;
    const user = this.authService.getUser();
    return !!user && !!user.id && obs.user_id === user.id;
  }

  iniciarEdicao(obs: ObservacaoProprietario): void {
    this.editandoId = obs.id;
    this.editandoTexto = obs.texto;
  }

  cancelarEdicao(): void {
    this.editandoId = null;
    this.editandoTexto = '';
  }

  salvarEdicao(): void {
    if (this.editandoId === null) return;

    const texto = this.editandoTexto.trim();
    if (!texto) {
      this.toastr.warning('A observação não pode ficar vazia.');
      return;
    }

    const id = this.editandoId;
    this.salvando = true;
    this.observacoesService.update(id, texto).subscribe({
      next: (atualizada) => {
        this.observacoes = this.observacoes.map(o => o.id === id ? atualizada : o);
        this.salvando = false;
        this.cancelarEdicao();
        this.toastr.success('Observação atualizada!');
      },
      error: (err) => {
        console.error('Erro ao atualizar observação:', err);
        this.salvando = false;
        this.toastr.error(err?.error?.error || 'Erro ao atualizar observação');
      }
    });
  }

  remover(obs: ObservacaoProprietario): void {
    if (!confirm('Remover esta observação da timeline?')) return;

    this.observacoesService.delete(obs.id).subscribe({
      next: () => {
        this.observacoes = this.observacoes.filter(o => o.id !== obs.id);
        this.toastr.success('Observação removida!');
      },
      error: (err) => {
        console.error('Erro ao remover observação:', err);
        this.toastr.error(err?.error?.error || 'Erro ao remover observação');
      }
    });
  }

  /**
   * O backend grava created_at/updated_at em UTC (servidor de produção roda em
   * UTC), então o horário precisa ser convertido para America/Sao_Paulo.
   */
  formatarDataHora(dataISO: string): string {
    if (!dataISO) return '';
    const semFuso = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(dataISO);
    const data = new Date(semFuso ? `${dataISO.replace(' ', 'T')}Z` : dataISO);
    if (isNaN(data.getTime())) return '';
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(data).reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);
    return `${partes['hour']}:${partes['minute']} - ${partes['day']}/${partes['month']}/${partes['year']}`;
  }
}
