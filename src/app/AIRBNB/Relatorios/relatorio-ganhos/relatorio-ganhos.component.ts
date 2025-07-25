import { Component, OnInit, ViewChild } from '@angular/core';
import { PagamentoReserva } from 'src/app/shared/utilitarios/pagamentoReserva';
import { ChartData, ChartOptions, ChartType, Chart, registerables } from 'chart.js';
import { PagamentoReservaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/pagamento_por_reserva_service';
import { BaseChartDirective } from 'ng2-charts';

// Importação para gerar XLSX
import * as XLSX from 'xlsx';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';

interface LimpezaResumo {
  apartamento_nome: string;
  quantidade: number;
  valorTotalRecebido: number;
  valorTotalLimpeza: number;
}

Chart.register(...registerables);

@Component({
  selector: 'app-relatorio-ganhos',
  templateUrl: './relatorio-ganhos.component.html',
  styleUrls: ['./relatorio-ganhos.component.css']
})
export class RelatorioGanhosComponent implements OnInit {
  @ViewChild('graficoValorProprietario') graficoValorProprietarioRef!: BaseChartDirective;
  @ViewChild('graficoTodosApt') graficoTodosAptRef!: BaseChartDirective;

  carregando = false;
  erroNoCarregamento = false;

  pagamentos: PagamentoReserva[] = [];
  pagamentosFiltrados: PagamentoReserva[] = [];
  resumoLimpezas: LimpezaResumo[] = [];

  apartamentos: Apartamento[] = [];
  listaApartamentos: string[] = [];

  // Flags para saber se já carregou cada dado
  private pagamentosCarregados = false;
  private apartamentosCarregados = false;

  mesFiltro: string | null = null;
  apartamentoFiltro = 'todos';

  graficoRecebidoVisivel = true;
  graficoProprietarioVisivel = true;

  totalGeralRecebido = 0;
  totalPagamentos = 0;
  totalApartamentos = 0;
  totalApartamentosComReserva = 0;
  totalNoites = 0;
  totalLimpezas = 0;
  qtdTotalLimpezas = 0;
  mediaPorReserva = 0;
  mediaPorApartamento  = 0;
  // --- Gráfico “Todos os Apartamentos (Valor Recebido)” ---
  verticalBarChartType: ChartType = 'bar';

  todosValorChartOptions: ChartOptions = {
    indexAxis: 'x', // padrão: eixo X = apartamentos, eixo Y = valores recebidos
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const valor = ctx.raw as number;
            return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (typeof value === 'number') {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return value;
          }
        }
      }
    }
  };

  todosValorChartData: ChartData<'bar'> = {
    labels: [],    // nomes dos apartamentos
    datasets: [{
      data: [],    // valor total recebido por apartamento
      label: 'Total Recebido',
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  // --- Gráfico “Valor Proprietário” ---
  valorProprietarioChartOptions: ChartOptions = {
    indexAxis: 'x',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const valor = ctx.raw as number;
            return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            if (typeof value === 'number') {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return value;
          }
        }
      }
    }
  };

  valorProprietarioChartData: ChartData<'bar'> = {
    labels: [],    // nomes dos apartamentos
    datasets: [{
      data: [],    // valor líquido do proprietário por apartamento
      label: 'Valor Proprietário',
      backgroundColor: 'rgba(75, 192, 192, 0.6)', // cor diferente para distinguir
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  };
  constructor(
    private pagamentoService: PagamentoReservaService,
    private apartamentoService: ApartamentoService
  ) { }

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.carregando = true;
    this.erroNoCarregamento = false;

    // 1) Buscar pagamentos
    this.pagamentoService.getAllPagamentos().subscribe({
      next: (res: PagamentoReserva[]) => {
        this.pagamentos = res || [];
        this.pagamentosCarregados = true;
        this.tentarAtualizarDados();
      },
      error: (err) => {
        console.error('Erro ao carregar pagamentos:', err);
        this.erroNoCarregamento = true;
        this.carregando = false;
      }
    });

    // 2) Buscar lista completa de apartamentos
    this.apartamentoService.getAllApartamentos().subscribe({
      next: (res: Apartamento[]) => {
        this.apartamentos = res || [];
        this.apartamentosCarregados = true;
        this.tentarAtualizarDados();
      },
      error: (err) => {
        console.error('Erro ao carregar apartamentos:', err);
        this.erroNoCarregamento = true;
        this.carregando = false;
      }
    });
  }

  /** Só chama aplicarFiltros() após ambos (pagamentos e apartamentos) estarem carregados */
  private tentarAtualizarDados(): void {
    if (this.pagamentosCarregados && this.apartamentosCarregados) {
      this.aplicarFiltros();
      this.carregando = false;
    }
  }

aplicarFiltros(): void {
  // 1) Filtrar pagamentos
  this.pagamentosFiltrados = this.pagamentos.filter(p => {
    const atendeMes = !this.mesFiltro ||
      (p.dataReserva && (() => {
        const d = new Date(p.dataReserva);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}` === this.mesFiltro;
      })());
    const atendeApt = this.apartamentoFiltro === 'todos' ||
      p.apartamento_nome === this.apartamentoFiltro;
    return atendeMes && atendeApt;
  });

  // 2) **Atualiza imediatamente o resumo de limpezas**
  this.prepararDadosLimpeza();

  // 3) Calcular totais financeiros
  this.totalPagamentos = this.pagamentosFiltrados.length;
  this.totalGeralRecebido = this.pagamentosFiltrados
    .reduce((acc, p) => acc + this.toNumber(p.valor_reserva) + this.toNumber(p.taxas), 0);
  this.totalNoites = this.pagamentosFiltrados
    .reduce((acc, p) => acc + (Number(p.noites) || 0), 0);
  this.mediaPorReserva = this.totalPagamentos > 0
    ? this.totalGeralRecebido / this.totalPagamentos
    : 0;

  // 4) Atualiza lista de apartamentos
  this.listaApartamentos = this.apartamentos.map(a => a.nome).sort();
  this.totalApartamentos = this.listaApartamentos.length;

  // 5) Atualiza gráficos
  this.prepararGraficoTodosValor();
  this.prepararGraficoValorProprietario();
}

private prepararDadosLimpeza(): void {
  // 1) mapas auxiliares
  const reservasPorApt: Record<string, Set<string>> = {};
  const agrupamento: Record<string, LimpezaResumo> = {};

  // 2) inicializa só com os apartamentos "oficiais"
  this.apartamentos.forEach(a => {
    reservasPorApt[a.nome] = new Set<string>();
    agrupamento[a.nome] = {
      apartamento_nome: a.nome,
      quantidade: 0,
      valorTotalRecebido: 0,
      valorTotalLimpeza: 0
    };
  });

  // 3) percorre cada pagamento filtrado
  this.pagamentosFiltrados.forEach(p => {
    // identifica apartamento e reserva
    const apt = p.apartamento_nome || 'Desconhecido';
    const codigo = p.cod_reserva ?? String(p.reserva_id ?? '');

    // se for um "apt" que não tinha sido inicializado, faz aqui
    if (!agrupamento[apt]) {
      agrupamento[apt] = {
        apartamento_nome: apt,
        quantidade: 0,
        valorTotalRecebido: 0,
        valorTotalLimpeza: 0
      };
      reservasPorApt[apt] = new Set<string>();
    }

    // 3.1) soma sempre o valor recebido
    agrupamento[apt].valorTotalRecebido +=
      this.toNumber(p.valor_reserva) +
      this.toNumber(p.taxas);

    // 3.2) só conta a limpeza se ainda não tiver contado esta reserva
    if (codigo && !reservasPorApt[apt].has(codigo)) {
      reservasPorApt[apt].add(codigo);
      agrupamento[apt].quantidade += 1;
    }

    // 3.3) recalcula valorTotalLimpeza usando o valor_unitário correto
    const aptInfo = this.apartamentos.find(a => a.nome === apt);
    const valorUnitario = aptInfo?.valor_limpeza ?? 0;
    agrupamento[apt].valorTotalLimpeza =
      agrupamento[apt].quantidade * valorUnitario;
  });

  // 4) transforma em array e filtra só quem teve limpeza
  this.resumoLimpezas = Object.values(agrupamento)
    .filter(r => r.quantidade > 0);

  // 5) atualiza totais para exibir nos cards
  this.qtdTotalLimpezas = this.resumoLimpezas
    .reduce((sum, r) => sum + r.quantidade, 0);
  this.totalLimpezas = this.resumoLimpezas
    .reduce((sum, r) => sum + r.valorTotalLimpeza, 0);
}



  /** Prepara o gráfico “Todos os Apartamentos” sem corte (sem slice) */
  private prepararGraficoTodosValor(): void {
    const agrup: Record<string, number> = {};

    // Inicializar todos os apartamentos com zero
    this.apartamentos.forEach(a => {
      agrup[a.nome] = 0;
    });

    // Somar o valor de cada pagamento para o respectivo apartamento
    this.pagamentosFiltrados.forEach(p => {
      const apt = p.apartamento_nome || 'Desconhecido';
      const valor = this.toNumber(p.valor_reserva) + this.toNumber(p.taxas);
      agrup[apt] = (agrup[apt] || 0) + valor;
    });

    // 3) Converter em array e ordenar decrescente (quem recebeu mais fica em cima)
    const arrayOrdenado = Object.entries(agrup)
      .map(([apt, total]) => ({ apt, total }))
      .sort((a, b) => b.total - a.total);

    // 3.1) Agora conta quantos apartamentos têm valor > 0
    this.totalApartamentosComReserva = arrayOrdenado.filter(item => item.total > 0).length;
    this.mediaPorApartamento = (this.totalGeralRecebido - this.totalLimpezas) / this.totalApartamentosComReserva || 0;

    // 4) Popular dados do chart
    this.todosValorChartData = {
      labels: arrayOrdenado.map(item => item.apt),
      datasets: [{
        ...this.todosValorChartData.datasets[0],
        data: arrayOrdenado.map(item => item.total)
      }]
    };


  }

   /** Gráfico “Valor Proprietário” */
  private prepararGraficoValorProprietario(): void {
    // Fórmula: Y = (valor_reserva + taxas) - 140
    //           X = (100/12) * Y * 0.97

    const agrupProp: Record<string, number> = {};

    // Inicializar todos os apartamentos com zero
    this.apartamentos.forEach(a => {
      agrupProp[a.nome] = 0;
    });

    // Para cada pagamento filtrado, calcular X e agregar
    this.pagamentosFiltrados.forEach(p => {
      const apt = p.apartamento_nome || 'Desconhecido';
      const totalBruto = this.toNumber(p.valor_reserva) + this.toNumber(p.taxas);
      const Y = totalBruto - 140;
      // Aplicar fórmula (se quiser ignorar valores negativos, coloque um if Y>0)
      const X = (100 / 12) * Y * 0.97;
      agrupProp[apt] = (agrupProp[apt] || 0) + X;
    });

    // Converter em array e ordenar decrescente (quem gera mais para o proprietário fica primeiro)
    const arrayProp = Object.entries(agrupProp)
      .map(([apt, totalProp]) => ({ apt, totalProp }))
      .sort((a, b) => b.totalProp - a.totalProp);

    // Popular dados do chart de valor proprietário
    this.valorProprietarioChartData = {
      labels: arrayProp.map(item => item.apt),
      datasets: [{
        ...this.valorProprietarioChartData.datasets[0],
        data: arrayProp.map(item => item.totalProp)
      }]
    };

    // Atualizar o gráfico via ViewChild
    if (this.graficoValorProprietarioRef) {
      this.graficoValorProprietarioRef.update();
    }
  }

 /** Exportar XLSX contendo valor proprietário por apartamento */
  exportarXLSXValorProprietario(): void {
    const agrupProp: Record<string, number> = {};
    this.apartamentos.forEach(a => {
      agrupProp[a.nome] = 0;
    });
    this.pagamentosFiltrados.forEach(p => {
      const apt = p.apartamento_nome || 'Desconhecido';
      const totalBruto = this.toNumber(p.valor_reserva) + this.toNumber(p.taxas);
      const Y = totalBruto - 140;
      const X = (100 / 12) * Y * 0.97;
      agrupProp[apt] = (agrupProp[apt] || 0) + X;
    });

    const dadosParaXLSX = Object.entries(agrupProp)
      .map(([apartamento_nome, totalProp]) => ({
        Apartamento: apartamento_nome,
        ValorProprietario: totalProp
      }))
      .sort((a, b) => b.ValorProprietario - a.ValorProprietario);

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dadosParaXLSX, {
      header: ['Apartamento', 'ValorProprietario']
    });
    XLSX.utils.sheet_add_aoa(ws, [['Apartamento', 'Valor Proprietário (R$)']], { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, dadosParaXLSX, { origin: 'A2', skipHeader: true });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Valor_Proprietario');

    const nomeArquivo = `valor_proprietario_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  /** Exportar XLSX contendo todos os apartamentos e seus valores totais */
exportarXLSXTodosValor(): void {
  // 1) Reconstrói o agrupamento de valores
  const valoresPorApt: Record<string, number> = {};
  this.apartamentos.forEach(a => valoresPorApt[a.nome] = 0);
  this.pagamentosFiltrados.forEach(p => {
    const apt = p.apartamento_nome || 'Desconhecido';
    valoresPorApt[apt] = (valoresPorApt[apt] || 0)
      + this.toNumber(p.valor_reserva)
      + this.toNumber(p.taxas);
  });

  // 2) Monta um mapa do valor total de limpeza por apartamento
  const valorLimpezasPorApt: Record<string, number> = {};
  this.resumoLimpezas.forEach(r => {
    valorLimpezasPorApt[r.apartamento_nome] = r.valorTotalLimpeza;
  });

  // 3) Prepara o array com as colunas: Apartamento, TotalRecebido, ValorLimpezas e ValorLiquido
  const dadosParaXLSX = Object.entries(valoresPorApt)
    .map(([apartamento, totalRecebido]) => {
      const valorLimpezas = valorLimpezasPorApt[apartamento] || 0;
      const valorLiquido = totalRecebido - valorLimpezas;
      return {
        Apartamento: apartamento,
        TotalRecebido: totalRecebido,
        ValorLimpezas: valorLimpezas,
        ValorLiquido: valorLiquido
      };
    })
    .sort((a, b) => b.TotalRecebido - a.TotalRecebido);

  // 4) Cria a planilha com o header adequado
  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dadosParaXLSX, {
    header: ['Apartamento', 'TotalRecebido', 'ValorLimpezas', 'ValorLiquido']
  });
  XLSX.utils.sheet_add_aoa(ws, [[
    'Apartamento',
    'Total Recebido (R$)',
    'Valor Limpezas (R$)',
    'Valor Líquido (R$)'
  ]], { origin: 'A1' });
  XLSX.utils.sheet_add_json(ws, dadosParaXLSX, { origin: 'A2', skipHeader: true });

  // 5) Monta o workbook e dispara o download
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Todos_Apt_Valor');

  const nomeArquivo = `apartamentos_valor_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}

  /** Exportar CSV para Limpezas (mantido como antes) */
  exportarCSVLimpezas(): void {
    if (this.resumoLimpezas.length === 0) return;

    let csvContent = 'Apartamento,Qtd Limpezas,Valor Total Recebido,Valor Total Limpeza\n';
    this.resumoLimpezas.forEach(r => {
      const linha = [
        r.apartamento_nome,
        r.quantidade.toString(),
        r.valorTotalRecebido.toFixed(2),
        r.valorTotalLimpeza.toFixed(2)
      ].join(',');
      csvContent += linha + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `limpezas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Exportar CSV para Reservas (mantido como antes) */
  exportarCSVReservas(): void {
    if (this.pagamentosFiltrados.length === 0) return;

    let csvContent = 'Código Reserva,Data,Apartamento,Noites,Valor Reserva,Taxas,Total\n';
    this.pagamentosFiltrados.forEach(p => {
      const total = this.toNumber(p.valor_reserva) + this.toNumber(p.taxas);
      const linha = [
        p.cod_reserva || '',
        new Date(p.dataReserva!).toLocaleDateString('pt-BR'),
        p.apartamento_nome || '',
        (p.noites || 0).toString(),
        this.toNumber(p.valor_reserva).toFixed(2),
        this.toNumber(p.taxas).toFixed(2),
        total.toFixed(2),
      ].join(',');
      csvContent += linha + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Exportar XLSX para Limpezas (mantido como antes) */
  exportarXLSXLimpezas(): void {
    if (this.resumoLimpezas.length === 0) return;

    const dados = this.resumoLimpezas.map(r => ({
      Apartamento: r.apartamento_nome,
      QtdLimpezas: r.quantidade,
      ValorTotalRecebido: r.valorTotalRecebido,
      ValorTotalLimpeza: r.valorTotalLimpeza
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dados, {
      header: ['Apartamento', 'QtdLimpezas', 'ValorTotalRecebido', 'ValorTotalLimpeza']
    });
    XLSX.utils.sheet_add_aoa(ws, [['Apartamento', 'Qtd. Limpezas', 'Recebido (R$)', 'Limpeza (R$)']], { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, dados, { origin: 'A2', skipHeader: true });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo_Limpezas');

    const nomeArquivo = `detalhes_limpezas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  /** Exportar XLSX para Reservas (mantido como antes) */
  exportarXLSXReservas(): void {
    if (this.pagamentosFiltrados.length === 0) return;

    const dados = this.pagamentosFiltrados.map(p => {
      const total = this.toNumber(p.valor_reserva) + this.toNumber(p.taxas);
      return {
        CodigoReserva: p.cod_reserva || '',
        Data: new Date(p.dataReserva!).toLocaleDateString('pt-BR'),
        Apartamento: p.apartamento_nome || '',
        Noites: p.noites || 0,
        ValorReserva: this.toNumber(p.valor_reserva),
        Taxas: this.toNumber(p.taxas),
        Total: total
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dados, {
      header: ['CodigoReserva', 'Data', 'Apartamento', 'Noites', 'ValorReserva', 'Taxas', 'Total']
    });
    XLSX.utils.sheet_add_aoa(ws, [[
      'Código Reserva', 'Data', 'Apartamento', 'Noites',
      'Valor Reserva (R$)', 'Taxas (R$)', 'Total (R$)'
    ]], { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, dados, { origin: 'A2', skipHeader: true });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhes_Reservas');

    const nomeArquivo = `detalhes_reservas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  }

  /** Converte string/number em number (utilitário) */
  private toNumber(valor: string | number | undefined): number {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const parsed = parseFloat(valor.toString().replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }

  /** Formata para moeda PT-BR */
  formatarPTBR(numero: number): string {
    const valor = parseFloat(numero.toString());
    if (isNaN(valor)) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
