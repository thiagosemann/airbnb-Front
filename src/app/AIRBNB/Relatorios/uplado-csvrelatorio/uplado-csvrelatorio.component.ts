import { Component } from '@angular/core';
import { PagamentoReserva } from 'src/app/shared/utilitarios/pagamentoReserva';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PagamentoReservaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/pagamento_por_reserva_service';

@Component({
  selector: 'app-uplado-csvrelatorio',
  templateUrl: './uplado-csvrelatorio.component.html',
  styleUrls: ['./uplado-csvrelatorio.component.css']
})
export class UpladoCSVRelatorioComponent {
  dataInicio: string = '';
  dataFim: string = '';
  reservasCSV: PagamentoReserva[] = [];
  carregando = false;
  enviando = false;     // indicador de envio
  fileInput: any;

  constructor(private pagamentoService: PagamentoReservaService) {}

  // Getters para calcular os totais dinamicamente
  get totalValorReservas(): number {
    return this.reservasCSV
      .reduce((acc, r) => acc + (r.valor_reserva || 0), 0);
  }

  get totalTaxas(): number {
    return this.reservasCSV
      .reduce((acc, r) => acc + (r.taxas || 0), 0);
  }

  get totalGeral(): number {
    return this.totalValorReservas + this.totalTaxas;
  }

  processarCSV(event: any) {
    this.carregando = true;
    const file = event.target.files[0];
    if (!file) {
      this.carregando = false;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csvData = e.target.result as string;
      this.parseCSV(csvData);
      this.carregando = false;
    };
    reader.readAsText(file);
  }

  private parseCSV(csv: string) {
    // Divide em linhas e descarta linhas em branco
    const linhas = csv.split('\n').filter(linha => linha.trim() !== '');
    if (linhas.length < 2) {
      this.reservasCSV = [];
      return;
    }

    // Cabeçalhos para sabermos quantas colunas esperar
    const cabecalhos = this.splitCSVLine(linhas[0]);
    const totalColunas = cabecalhos.length;
    this.reservasCSV = [];

    for (let i = 1; i < linhas.length; i++) {
      // Divide a linha em campos, respeitando aspas
      const valores = this.splitCSVLine(linhas[i]);

      // Pula se não houver “Tipo” (índice 2) ou se for “PAYOUT”
      if (!valores[2] || valores[2].toUpperCase() === 'PAYOUT') {
        continue;
      }

      // Garante que cada linha tenha exatamente totalColunas campos
      while (valores.length < totalColunas) {
        valores.push('');
      }

      const codigo = valores[3].trim();
      const dataReserva = valores[0].trim();
      const noites  = Number(valores[7].trim());
      const rawValorReserva = valores[13].trim();
      const rawTaxaLimpeza = valores[17].trim().replace(',', '.');
      const rawTaxaRoupaCama = valores[18].trim().replace(',', '.');
      const rawTaxaPet = valores[19].trim().replace(',', '.');

      // Converte strings vazias em 0
      const valorReservaNum = rawValorReserva
        ? Number(rawValorReserva.replace(',', '.'))
        : 0;
      const taxaLimpezaNum = rawTaxaLimpeza ? Number(rawTaxaLimpeza) : 0;
      const taxaRoupaNum = rawTaxaRoupaCama ? Number(rawTaxaRoupaCama) : 0;
      const taxaPetNum = rawTaxaPet ? Number(rawTaxaPet) : 0;
      const taxaTotal = taxaLimpezaNum + taxaRoupaNum + taxaPetNum;

      // Verifica se já existe uma entrada para esse cod_reserva dentro do array temporário
      const reservaExistente = this.reservasCSV.find(r => r.cod_reserva === codigo && r.dataReserva === dataReserva && r.valor_reserva === valorReservaNum);

      if (reservaExistente) {
        // Caso já exista LOCALMENTE, soma apenas o valor_reserva (mantendo antigas taxas)
        reservaExistente.valor_reserva = (reservaExistente.valor_reserva || 0) + valorReservaNum;
        reservaExistente.taxas = (reservaExistente.taxas || 0) + taxaTotal;
      } else {
        // Cria um novo objeto caso não exista localmente
        const reservaCSV: PagamentoReserva = {
          cod_reserva: codigo,
          dataReserva: dataReserva,
          noites:noites,
          valor_reserva: valorReservaNum,
          taxas: taxaTotal
        };
        this.reservasCSV.push(reservaCSV);
      }
    }
  }

  /**
   * Divide a linha em campos, respeitando vírgulas dentro de aspas.
   * Garante que campos vazios entre vírgulas sejam retornados como string ''.
   */
  private splitCSVLine(line: string): string[] {
    const campos: string[] = [];
    let atual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Se vier aspas duplas dentro de aspas, consome-as como uma única "
        if (dentroDeAspas && i + 1 < line.length && line[i + 1] === '"') {
          atual += '"';
          i++; // pula a aspas escapada
        } else {
          dentroDeAspas = !dentroDeAspas;
        }
      } else if (char === ',' && !dentroDeAspas) {
        // Se for vírgula fora de aspas, fecha o campo atual
        campos.push(atual);
        atual = '';
      } else {
        atual += char;
      }
    }

    campos.push(atual);
    // Remove eventuais espaços ao redor de cada campo
    return campos.map(f => f.trim());
  }

  excluirReserva(index: number) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      this.reservasCSV.splice(index, 1);
    }
  }

  // Chamado ao clicar no botão “Enviar Pagamentos” (por exemplo)
  enviarPagamentos() {
    if (this.reservasCSV.length === 0) {
      alert('Não há pagamentos para enviar.');
      return;
    }

    this.enviando = true;

    // 1) Extrai todos os cod_reserva únicos do CSV
    const listaCods: string[] = Array.from(
      new Set(this.reservasCSV.map(r => r.cod_reserva))
    );

    // 2) Consulta todos os pagamentos existentes para essa lista
    this.pagamentoService.getByCodReservaList(listaCods)
      .pipe(
        switchMap((pagamentosExistentes: PagamentoReserva[]) => {
          // 3) Monta um Set de chaves (cod_reserva + dataReserva + valor_reserva) para comparar
          const chavesExistentes = new Set<string>(
            pagamentosExistentes.map(pe =>
              `${pe.cod_reserva}___${pe.dataReserva}___${Number(pe.valor_reserva)}`
            )
          );
          // 4) Filtra somente os que NÃO existem no backend
          const pagamentosNovos = this.reservasCSV.filter(r => {
            const chave = `${r.cod_reserva}___${r.dataReserva}___${Number(r.valor_reserva)}`;
            return !chavesExistentes.has(chave);
          });

          if (pagamentosNovos.length === 0) {
            alert('Todos os registros do CSV já estão cadastrados.');
            this.enviando = false;
            return of([]); // retorna um Observable vazio para não continuar no forkJoin
          }

          // 5) Para cada pagamentoNovo, chama createPagamento
          
          const requests = pagamentosNovos.map(r =>
            this.pagamentoService.createPagamento(r)
          );

          // 6) Executa todas as chamadas simultaneamente
          return forkJoin(requests);
        })
      )
      .subscribe({
        next: (respostasCriacao) => {
          if (Array.isArray(respostasCriacao) && respostasCriacao.length > 0) {
            alert(`${respostasCriacao.length} pagamento(s) criado(s) com sucesso.`);
          }
          this.enviando = false;
          this.reservasCSV = [];
          
          // Opcional: aqui você pode recarregar a lista ou limpar this.reservasCSV
        },
        error: (err) => {
          console.error(err);
          alert('Ocorreu um erro ao enviar os pagamentos.');
          this.enviando = false;
        }
      });
  }
}
