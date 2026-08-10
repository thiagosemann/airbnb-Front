import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ApartamentoEmpresaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamentoEmpresa_service';
import { Empresa, EmpresaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/empresa_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';

/** Colunas pelas quais a tabela pode ser ordenada */
type ColunaOrdenacao = 'apartamento' | 'predio' | 'dona' | 'acessos';

/** Um apartamento visível com a lista de empresas que atuam nele */
interface LinhaAcesso {
  apartamento: Apartamento;
  empresaDonaId: number | null;
  empresaDonaNome: string;
  /** Empresas com acesso concedido, sem contar a dona */
  convidadas: Empresa[];
  /** Só a empresa dona concede e revoga acesso */
  souDona: boolean;
}

@Component({
  selector: 'app-controle-acesso-apartamentos',
  templateUrl: './controle-acesso-apartamentos.component.html',
  styleUrls: ['./controle-acesso-apartamentos.component.css']
})
export class ControleAcessoApartamentosComponent implements OnInit {
  linhas: LinhaAcesso[] = [];
  linhasFiltradas: LinhaAcesso[] = [];
  empresas: Empresa[] = [];

  minhaEmpresaId: number | null = null;
  loading = false;

  termoBusca = '';
  apenasCompartilhados = false;

  ordenarPorColuna: ColunaOrdenacao = 'apartamento';
  ordemAscendente = true;

  // Modal de concessão de acesso
  showModal = false;
  linhaSelecionada: LinhaAcesso | null = null;
  empresaSelecionadaId: number | null = null;
  salvando = false;

  constructor(
    private apartamentoService: ApartamentoService,
    private apartamentoEmpresaService: ApartamentoEmpresaService,
    private empresaService: EmpresaService,
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    const user = this.authService.getUser();
    this.minhaEmpresaId = user?.empresa_id != null ? Number(user.empresa_id) : null;
  }

  ngOnInit(): void {
    this.carregar();
  }

  /** Carrega apartamentos, vínculos e empresas de uma vez e monta as linhas */
  private carregar(): void {
    this.loading = true;
    forkJoin({
      apartamentos: this.apartamentoService.getAllApartamentos(),
      vinculos: this.apartamentoEmpresaService.getVinculos(),
      empresas: this.empresaService.getEmpresas()
    }).subscribe({
      next: ({ apartamentos, vinculos, empresas }) => {
        this.empresas = empresas;

        // Nomes das empresas: a lista de vínculos já traz empresa_nome, o que
        // cobre empresas que não apareçam em /empresas (ex.: inativadas)
        const nomePorEmpresa = new Map<number, string>();
        empresas.forEach(e => nomePorEmpresa.set(Number(e.id), e.nome));
        vinculos.forEach(v => nomePorEmpresa.set(Number(v.empresa_id), v.empresa_nome));

        const empresasPorApartamento = new Map<number, number[]>();
        vinculos.forEach(v => {
          const aptId = Number(v.apartamento_id);
          const lista = empresasPorApartamento.get(aptId) || [];
          lista.push(Number(v.empresa_id));
          empresasPorApartamento.set(aptId, lista);
        });

        this.linhas = apartamentos
          .map(apt => {
            const donaId = apt.empresa_id != null ? Number(apt.empresa_id) : null;
            const vinculadas = empresasPorApartamento.get(Number(apt.id)) || [];
            const convidadas = vinculadas
              .filter(id => id !== donaId)
              .map(id => ({ id, nome: nomePorEmpresa.get(id) || `Empresa ${id}` }))
              .sort((a, b) => a.nome.localeCompare(b.nome));

            return {
              apartamento: apt,
              empresaDonaId: donaId,
              empresaDonaNome: donaId != null ? (nomePorEmpresa.get(donaId) || `Empresa ${donaId}`) : '-',
              convidadas,
              souDona: donaId != null && donaId === this.minhaEmpresaId
            } as LinhaAcesso;
          });

        this.aplicarFiltroInicialPorRota();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: err => {
        console.error('Erro ao carregar acessos dos apartamentos:', err);
        this.toastr.error('Erro ao carregar os acessos dos apartamentos.');
        this.loading = false;
      }
    });
  }

  /** Atalho vindo do cadastro de apartamentos: ?apartamento=<id> */
  private aplicarFiltroInicialPorRota(): void {
    const aptId = Number(this.route.snapshot.queryParamMap.get('apartamento'));
    if (!aptId) return;
    const linha = this.linhas.find(l => Number(l.apartamento.id) === aptId);
    if (linha) this.termoBusca = linha.apartamento.nome;
  }

  filtrar(event: Event): void {
    this.termoBusca = (event.target as HTMLInputElement).value;
    this.aplicarFiltros();
  }

  toggleApenasCompartilhados(): void {
    this.apenasCompartilhados = !this.apenasCompartilhados;
    this.aplicarFiltros();
  }

  /** Clique no cabeçalho: alterna a direção quando a coluna já está ativa */
  ordenar(coluna: ColunaOrdenacao): void {
    if (this.ordenarPorColuna === coluna) {
      this.ordemAscendente = !this.ordemAscendente;
    } else {
      this.ordenarPorColuna = coluna;
      this.ordemAscendente = true;
    }
    this.aplicarFiltros();
  }

  /** Ícone do cabeçalho: seta da direção na coluna ativa, neutro nas demais */
  iconeOrdenacao(coluna: ColunaOrdenacao): string {
    if (this.ordenarPorColuna !== coluna) return 'bi-arrow-down-up inativo';
    return this.ordemAscendente ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
  }

  private compararPorColuna(a: LinhaAcesso, b: LinhaAcesso): number {
    switch (this.ordenarPorColuna) {
      case 'predio':
        return (a.apartamento.predio_name || '').localeCompare(b.apartamento.predio_name || '');
      case 'dona':
        return a.empresaDonaNome.localeCompare(b.empresaDonaNome);
      case 'acessos':
        return a.convidadas.length - b.convidadas.length;
      default:
        return a.apartamento.nome.localeCompare(b.apartamento.nome);
    }
  }

  private aplicarFiltros(): void {
    const termo = this.termoBusca.trim().toLowerCase();
    this.linhasFiltradas = this.linhas
      .filter(l => {
        if (this.apenasCompartilhados && !l.convidadas.length) return false;
        if (!termo) return true;
        const alvo = [
          l.apartamento.nome,
          l.apartamento.predio_name || '',
          l.empresaDonaNome,
          ...l.convidadas.map(c => c.nome)
        ].join(' ').toLowerCase();
        return alvo.includes(termo);
      })
      .sort((a, b) => {
        const resultado = this.compararPorColuna(a, b);
        // Empates caem sempre no nome do apartamento, para a ordem não oscilar
        if (resultado === 0) return a.apartamento.nome.localeCompare(b.apartamento.nome);
        return this.ordemAscendente ? resultado : -resultado;
      });
  }

  get totalCompartilhados(): number {
    return this.linhas.filter(l => l.convidadas.length > 0).length;
  }

  // ===== Concessão de acesso =====

  abrirModal(linha: LinhaAcesso): void {
    this.linhaSelecionada = linha;
    this.empresaSelecionadaId = null;
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
    this.linhaSelecionada = null;
    this.empresaSelecionadaId = null;
  }

  /** Empresas que ainda podem receber acesso: exclui a dona e as já vinculadas */
  get empresasDisponiveis(): Empresa[] {
    if (!this.linhaSelecionada) return [];
    const jaVinculadas = new Set(this.linhaSelecionada.convidadas.map(c => c.id));
    return this.empresas.filter(e =>
      Number(e.id) !== this.linhaSelecionada!.empresaDonaId && !jaVinculadas.has(Number(e.id))
    );
  }

  conceder(): void {
    if (!this.linhaSelecionada || !this.empresaSelecionadaId) return;

    const linha = this.linhaSelecionada;
    const empresaId = Number(this.empresaSelecionadaId);
    const empresa = this.empresas.find(e => Number(e.id) === empresaId);

    this.salvando = true;
    this.apartamentoEmpresaService.vincularEmpresa(Number(linha.apartamento.id), empresaId).subscribe({
      next: () => {
        linha.convidadas = [...linha.convidadas, { id: empresaId, nome: empresa?.nome || `Empresa ${empresaId}` }]
          .sort((a, b) => a.nome.localeCompare(b.nome));
        this.salvando = false;
        this.aplicarFiltros();
        this.toastr.success(`${empresa?.nome || 'Empresa'} agora tem acesso a ${linha.apartamento.nome}.`);
        this.fecharModal();
      },
      error: err => {
        console.error('Erro ao conceder acesso:', err);
        this.salvando = false;
        this.toastr.error(err?.error?.error || 'Erro ao conceder acesso.');
      }
    });
  }

  revogar(linha: LinhaAcesso, empresa: Empresa): void {
    const msg = `Remover o acesso de ${empresa.nome} ao apartamento ${linha.apartamento.nome}?\n\n` +
      'A empresa deixa de ver reservas, limpezas e tickets deste apartamento.';
    if (!confirm(msg)) return;

    this.apartamentoEmpresaService.desvincularEmpresa(Number(linha.apartamento.id), Number(empresa.id)).subscribe({
      next: () => {
        linha.convidadas = linha.convidadas.filter(c => c.id !== empresa.id);
        this.aplicarFiltros();
        this.toastr.success(`Acesso de ${empresa.nome} removido.`);
      },
      error: err => {
        console.error('Erro ao revogar acesso:', err);
        this.toastr.error(err?.error?.error || 'Erro ao remover o acesso.');
      }
    });
  }
}
