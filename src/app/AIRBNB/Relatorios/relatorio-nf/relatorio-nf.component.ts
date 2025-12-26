import { Component } from '@angular/core';
import { PagamentoReserva } from 'src/app/shared/utilitarios/pagamentoReserva';
import * as XLSX from 'xlsx';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ApartamentosProprietarioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamentos_proprietario_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-relatorio-nf',
  templateUrl: './relatorio-nf.component.html',
  styleUrls: ['./relatorio-nf.component.css']
})
export class RelatorioNFComponent {
  dataInicio: string = '';
  dataFim: string = '';
  reservasCSV: PagamentoReserva[] = [];
  carregando = false;
  enviando = false;
  fileInput: any;
  carregandoDados = false; // loading para requisições de enriquecimento
  aptosTotal = 0;          // total de registros para enriquecer
  aptosProcessados = 0;    // quantidade já processada
  progressPercent = 0;     // progresso visual de carregamento de apartamentos
  private apartamentosMap: Map<number, Apartamento> = new Map<number, Apartamento>();

  activeTab: 'erros' | 'reservas' | 'apartamentos' | 'proprietarios' = 'reservas';
  private proprietariosPorApartamentoId: Map<number, any[]> = new Map<number, any[]>();

  constructor(
    private reservasService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService,
    private aptoProprietarioService: ApartamentosProprietarioService
  ) {}

  setTab(tab: 'erros' | 'reservas' | 'apartamentos' | 'proprietarios') {
    this.activeTab = tab;
  }

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
    this.proprietariosPorApartamentoId.clear();
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
      this.enriquecerReservasComApartamento();
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

    // Detecta delimitador (vírgula, ponto-e-vírgula ou tab) a partir do cabeçalho e primeira linha
    const delimitador = this.detectDelimiter(linhas[0], linhas[1]);
    // Cabeçalhos para sabermos quantas colunas esperar
    const cabecalhos = this.splitCSVLine(linhas[0], delimitador);
    const totalColunas = cabecalhos.length;
    const normalize = (s: string) => s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    const hdrsNorm = cabecalhos.map(h => normalize(h));
    const findIdx = (names: string[]): number => {
      for (const n of names) {
        const idx = hdrsNorm.indexOf(n);
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const idxTipo = findIdx(['TIPO']);
    const idxCodigo = findIdx(['CODIGO DE CONFIRMACAO','CODIGO DE REFERENCIA']);
    const idxNoites = findIdx(['NOITES']);
    const idxAnuncio = findIdx(['ANUNCIO']);
    const idxValor = findIdx(['VALOR']);
    const idxPago = findIdx(['PAGO']);
    if (idxCodigo < 0) {
      alert('CSV não reconhecido: coluna de código da reserva ausente.');
      this.reservasCSV = [];
      return;
    }
    if (idxValor < 0 && idxPago < 0) {
      alert('CSV não reconhecido: coluna "Valor" ausente.');
      this.reservasCSV = [];
      return;
    }
    this.reservasCSV = [];
    const agregados = new Map<string, any>();

    for (let i = 1; i < linhas.length; i++) {
      // Divide a linha em campos, respeitando aspas e delimitador detectado
      const valores = this.splitCSVLine(linhas[i], delimitador);

      // Pula se for “PAYOUT”; se não houver coluna Tipo, assume RESERVA
      const tipoRaw = idxTipo >= 0 ? (valores[idxTipo] || '').trim() : 'Reserva';
      const tipoNorm = this.normalizeTipo(tipoRaw);
      if (!tipoRaw || tipoNorm === 'PAYOUT') {
        continue;
      }

      // Garante que cada linha tenha exatamente totalColunas campos
      while (valores.length < totalColunas) {
        valores.push('');
      }

      const codigo = (valores[idxCodigo] || '').trim();
      const dataReserva = (valores[0] || '').trim();
      const noites  = idxNoites >= 0 ? Number(((valores[idxNoites] || '').trim()) || '0') : 0;
      const anuncio = idxAnuncio >= 0 ? (valores[idxAnuncio] || '').trim() : '';
      const rawValor = idxValor >= 0 ? (valores[idxValor] || '').trim() : '';
      const rawPago = idxPago >= 0 ? (valores[idxPago] || '').trim() : '';

      // Valor para tipos "Recebimento do coanfitrião" e "Reserva" vem em coluna 13
      // Para Payout seria coluna 14 (mas já ignoramos Payout)
      const valorNum = this.parseMoney(rawValor);
      // Agrega por código (único) e mantém somas separadas por tipo
      const existente = agregados.get(codigo);
      if (existente) {
        existente.noites = (existente.noites || 0) + noites;
        if (!existente._anuncio && anuncio) existente._anuncio = anuncio;
        if (tipoNorm === 'RESERVA') {
          existente._sumReserva = (existente._sumReserva || 0) + valorNum;
        } else {
          // Qualquer tipo diferente de RESERVA (e já não é PAYOUT), soma como recebimento
          existente._sumRecebimento = (existente._sumRecebimento || 0) + valorNum;
        }
      } else {
        const novo: any = {
          cod_reserva: codigo,
          dataReserva: dataReserva,
          noites: noites,
          _anuncio: anuncio,
          _sumReserva: 0,
          _sumRecebimento: 0,
          _tipo: tipoRaw,
          _tipoNorm: tipoNorm
        };
        if (tipoNorm === 'RESERVA') {
          novo._sumReserva = valorNum;
        } else {
          // Qualquer tipo diferente de RESERVA (e já não é PAYOUT), soma como recebimento
          novo._sumRecebimento = valorNum;
        }
        agregados.set(codigo, novo);
      }
    }

    // Converte para estrutura PagamentoReserva, mantendo somas em campos auxiliares
    this.reservasCSV = Array.from(agregados.values()).map((e: any) => {
      const pr: PagamentoReserva = {
        cod_reserva: e.cod_reserva,
        dataReserva: e.dataReserva,
        noites: e.noites,
        valor_reserva: (e._sumReserva || 0) + (e._sumRecebimento || 0),
        taxas: 0
      };
      (pr as any)._sumReserva = e._sumReserva || 0;
      (pr as any)._sumRecebimento = e._sumRecebimento || 0;
      (pr as any)._tipo = e._tipo;
      (pr as any)._tipoNorm = e._tipoNorm;
      (pr as any)._anuncio = e._anuncio || '';
      return pr;
    });
  }

  private normalizeTipo(t: string): string {
    if (!t) return '';
    return t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private async carregarApartamentosMap(): Promise<void> {
    try {
      const todos = await firstValueFrom(this.apartamentoService.getAllApartamentos());
      this.apartamentosMap.clear();
      for (const a of todos) {
        this.apartamentosMap.set(a.id, a);
      }
    } catch (e) {
      // mantém mapa vazio em erro
    }
  }

  private async enriquecerReservasComApartamento(): Promise<void> {
    if (!this.reservasCSV || this.reservasCSV.length === 0) return;
    this.carregandoDados = true;
    this.aptosTotal = this.reservasCSV.length;
    this.aptosProcessados = 0;
    this.progressPercent = this.aptosTotal ? 0 : 100;
    try {
      await this.carregarApartamentosMap();
      for (const r of this.reservasCSV) {
        const erros: string[] = [];
        (r as any)._erros = erros;
        try {
          const reservas = await firstValueFrom(this.reservasService.getReservaByCodReserva(r.cod_reserva));
          if (!reservas || !reservas.length) {
            erros.push('Reserva não encontrada');
          }
          const aptoId = reservas && reservas.length ? reservas[0].apartamento_id : undefined;
          if (aptoId) {
            r.apartamento_id = aptoId;
            const apto = this.apartamentosMap.get(aptoId);
            if (apto) {
              r.apartamento_nome = apto.nome;
              // Guardamos valores para uso na exportação
              (r as any)._valor_enxoval_ap = apto.valor_enxoval ?? 0;
              (r as any)._valor_limpeza_ap = apto.valor_limpeza ?? 0;
              const pctRaw = apto.porcentagem_cobrada ?? 0;
              (r as any)._porcentagem_cobrada_ap = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
            } else {
              erros.push('Apartamento não encontrado');
            }

			// Carrega proprietários do apartamento (cache por apartamento_id)
			if (!this.proprietariosPorApartamentoId.has(aptoId)) {
				try {
					const props = await firstValueFrom(this.aptoProprietarioService.getProprietariosByApartamento(aptoId));
					this.proprietariosPorApartamentoId.set(aptoId, Array.isArray(props) ? props : []);
				} catch (e) {
					this.proprietariosPorApartamentoId.set(aptoId, []);
				}
			}
			(r as any)._proprietarios = this.proprietariosPorApartamentoId.get(aptoId) || [];
			if (!((r as any)._proprietarios || []).length) {
				erros.push('Proprietário não encontrado');
			}
          } else {
            erros.push('Apartamento não vinculado');
          }
        } catch (e) {
          erros.push('Erro ao buscar reserva/apartamento');
        }
          // Atualiza progresso após cada reserva processada
          this.aptosProcessados += 1;
          this.progressPercent = Math.round((this.aptosProcessados / (this.aptosTotal || 1)) * 100);
      }
    } finally {
      this.carregandoDados = false;
    }
      if (this.aptosTotal > 0) this.progressPercent = 100;
  }

  // Linhas com erro de vinculação/enriquecimento (para a aba Erros)
  get nfRowsErros(): any[] {
    const byCodigo = new Map<string, any>();
    for (const r of this.nfRows) {
      byCodigo.set(String(r.cod_reserva || '').trim(), r);
    }

    const out: any[] = [];
    for (const r of this.reservasCSV) {
      const errs: string[] = (r as any)._erros || [];
      if (!errs.length) continue;
      const codigo = String(r.cod_reserva || '').trim();
      const row = byCodigo.get(codigo);
      out.push({
        cod_reserva: codigo,
        apartamento: r.apartamento_nome || (r as any)._anuncio || '—',
        valor_total: Number(row?.valor_total ?? r.valor_reserva ?? 0),
        valor_nota_fiscal: Number(row?.valor_nota_fiscal ?? 0),
        erros: errs
      });
    }

    out.sort((a, b) => String(a.cod_reserva).localeCompare(String(b.cod_reserva), 'pt-BR'));
    return out;
  }

  get totalErros(): number {
    return this.nfRowsErros.length;
  }

  /**
   * Detecta o delimitador provável entre vírgula, ponto-e-vírgula ou tab.
   */
  private detectDelimiter(headerLine: string, sampleLine?: string): string {
    const count = (s: string, ch: string) => {
      let c = 0; let inQuotes = false;
      for (let i = 0; i < s.length; i++) {
        const x = s[i];
        if (x === '"') {
          if (inQuotes && i + 1 < s.length && s[i + 1] === '"') { i++; }
          else { inQuotes = !inQuotes; }
        } else if (!inQuotes && x === ch) { c++; }
      }
      return c;
    };
    const commas = count(headerLine, ',') + (sampleLine ? count(sampleLine, ',') : 0);
    const semicolons = count(headerLine, ';') + (sampleLine ? count(sampleLine, ';') : 0);
    const tabs = count(headerLine, '\t') + (sampleLine ? count(sampleLine, '\t') : 0);
    if (semicolons > 0 && semicolons >= commas && semicolons >= tabs) return ';';
    if (tabs > 0 && tabs >= commas) return '\t';
    return ',';
  }

  /**
   * Divide a linha em campos, respeitando delimitador e aspas. Mantém campos vazios.
   */
  private splitCSVLine(line: string, delimiter: string): string[] {
    const campos: string[] = [];
    let atual = '';
    let dentroDeAspas = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (dentroDeAspas && i + 1 < line.length && line[i + 1] === '"') {
          atual += '"';
          i++;
        } else {
          dentroDeAspas = !dentroDeAspas;
        }
      } else if (char === delimiter && !dentroDeAspas) {
        campos.push(atual);
        atual = '';
      } else {
        atual += char;
      }
    }
    campos.push(atual);
    return campos.map(f => f.trim());
  }

  excluirReserva(index: number) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      this.reservasCSV.splice(index, 1);
    }
  }

  baixarValoresParaNF() {
    if (this.reservasCSV.length === 0) {
      alert('Nenhum registro carregado para exportar.');
      return;
    }

    const tipoLabelFrom = (r: any): string => {
      const isAnfitriao = !!r?.isAnfitriao;
      const isCoanfitriao = !!r?.isCoanfitriao;
      return isAnfitriao && isCoanfitriao
        ? 'Anfitrião; Coanfitrião'
        : (isAnfitriao ? 'Anfitrião' : (isCoanfitriao ? 'Coanfitrião' : ''));
    };

    // Aba 1: Reservas (detalhado)
    const headerReservas = ['apartamento','tipo','cod_reserva','valor_total','valor_limpeza','valor_proprietario','porc_cobrada','valor_nota_fiscal'];
    const aoaReservas: (string | number)[][] = [headerReservas];
    const rowsReservas = this.nfRows;
    for (const row of rowsReservas) {
      aoaReservas.push([
        row.apartamento,
        row.tipo || tipoLabelFrom(row) || '',
        row.cod_reserva,
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number(row.valor_proprietario),
        Number(row.porc_cobrada),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsReservas = XLSX.utils.aoa_to_sheet(aoaReservas);

    // Aba 2: Apartamentos (agregado)
    const headerAptos = ['apartamento','tipo','valor_total','valor_limpeza','valor_proprietario','porc_cobrada','valor_nota_fiscal'];
    const aoaAptos: (string | number)[][] = [headerAptos];
    const rowsAptos = this.nfRowsPorApartamento;
    for (const row of rowsAptos) {
      aoaAptos.push([
        row.apartamento,
        tipoLabelFrom(row) || '',
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number(row.valor_proprietario),
        Number(row.porc_cobrada),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsAptos = XLSX.utils.aoa_to_sheet(aoaAptos);

    // Aba 3: Proprietários (agregado)
    const headerProps = ['proprietario','aptos','tipo','valor_total','valor_limpeza','valor_proprietario','valor_nota_fiscal'];
    const aoaProps: (string | number)[][] = [headerProps];
    const rowsProps = this.nfRowsPorProprietario;
    for (const row of rowsProps) {
      aoaProps.push([
        row.proprietario,
        Number(row.apartamentosQtd || 0),
        tipoLabelFrom(row) || '',
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number(row.valor_proprietario),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsProps = XLSX.utils.aoa_to_sheet(aoaProps);

    // Aba 4: Erros (linhas que não conseguiram vincular/enriquecer)
    const headerErros = ['cod_reserva','apartamento','valor_total','valor_nota_fiscal','erros'];
    const aoaErros: (string | number)[][] = [headerErros];
    const rowsErros = this.nfRowsErros;
    for (const row of rowsErros) {
      aoaErros.push([
        row.cod_reserva,
        row.apartamento,
        Number(row.valor_total),
        Number(row.valor_nota_fiscal),
        Array.isArray(row.erros) ? row.erros.join('; ') : String(row.erros || '')
      ]);
    }
    const wsErros = XLSX.utils.aoa_to_sheet(aoaErros);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsReservas, 'Reservas');
    XLSX.utils.book_append_sheet(wb, wsAptos, 'Apartamentos');
    XLSX.utils.book_append_sheet(wb, wsProps, 'Proprietarios');
    XLSX.utils.book_append_sheet(wb, wsErros, 'Erros');
    // Exporta como .xls (biff8)
    XLSX.writeFile(wb, 'valores_nf.xls', { bookType: 'biff8' });
  }

  // Gera linhas calculadas para tabela e exportação XLS, garantindo consistência
  get nfRows(): any[] {
    return this.buildNFRows();
  }

  // Linhas agregadas por apartamento (para a aba Apartamentos)
  get nfRowsPorApartamento(): any[] {
    const agrupado = new Map<string, any>();
    for (const r of this.nfRows) {
      const apt = (r?.apartamento || '').trim() || 'Sem apartamento';
      let acc = agrupado.get(apt);
      if (!acc) {
        acc = {
          apartamento: apt,
          isAnfitriao: false,
          isCoanfitriao: false,
          valor_total: 0,
          valor_limpeza: 0,
          valor_proprietario: 0,
          valor_nota_fiscal: 0,
          _pctWeightedSum: 0,
          _pctWeight: 0,
          porc_cobrada: 0
        };
        agrupado.set(apt, acc);
      }

      acc.isAnfitriao = acc.isAnfitriao || !!r.isAnfitriao;
      acc.isCoanfitriao = acc.isCoanfitriao || !!r.isCoanfitriao;

      const vt = Number(r.valor_total || 0);
      const vl = Number(r.valor_limpeza || 0);
      const vp = Number(r.valor_proprietario || 0);
      const vnf = Number(r.valor_nota_fiscal || 0);
      acc.valor_total += vt;
      acc.valor_limpeza += vl;
      acc.valor_proprietario += vp;
      acc.valor_nota_fiscal += vnf;

      // % cobranca: média ponderada pela base (total - limpeza) apenas quando houver %
      const pct = Number(r.porc_cobrada || 0);
      const base = Math.max(0, vt - vl);
      if (pct > 0 && base > 0) {
        acc._pctWeightedSum += pct * base;
        acc._pctWeight += base;
      }
    }

    const out = Array.from(agrupado.values()).map((a: any) => {
      a.porc_cobrada = a._pctWeight > 0 ? (a._pctWeightedSum / a._pctWeight) : 0;
      const isAnfitriao = !!a.isAnfitriao;
      const isCoanfitriao = !!a.isCoanfitriao;
      a.tipo = isAnfitriao && isCoanfitriao
        ? 'Anfitrião; Coanfitrião'
        : (isAnfitriao ? 'Anfitrião' : (isCoanfitriao ? 'Coanfitrião' : ''));
      delete a._pctWeightedSum;
      delete a._pctWeight;
      return a;
    });

    out.sort((a: any, b: any) => String(a.apartamento).localeCompare(String(b.apartamento), 'pt-BR'));
    return out;
  }

  // Linhas agregadas por proprietário (para a aba Proprietários)
  // Observação: quando um apartamento tem múltiplos proprietários, os valores são divididos igualmente entre eles.
  get nfRowsPorProprietario(): any[] {
    const proprietariosPorCodigo = new Map<string, any[]>();
    for (const r of this.reservasCSV) {
      proprietariosPorCodigo.set((r.cod_reserva || '').trim(), (r as any)._proprietarios || []);
    }

    const keyFrom = (p: any): string => {
      const id = p?.id ?? p?.user_id ?? p?.usuario_id;
      if (id != null) return `id:${id}`;
      const email = (p?.email || '').trim();
      if (email) return `email:${email.toLowerCase()}`;
      const nome = ((p?.nome || '') || '').trim();
      if (nome) return `nome:${nome.toLowerCase()}`;
      const fn = (p?.first_name || '').trim();
      const ln = (p?.last_name || '').trim();
      const full = `${fn} ${ln}`.trim();
      return full ? `nome:${full.toLowerCase()}` : 'sem-proprietario';
    };

    const labelFrom = (p: any): string => {
      const nome = (p?.nome || '').trim();
      if (nome) return nome;
      const fn = (p?.first_name || '').trim();
      const ln = (p?.last_name || '').trim();
      const full = `${fn} ${ln}`.trim();
      if (full) return full;
      const email = (p?.email || '').trim();
      if (email) return email;
      const id = p?.id ?? p?.user_id ?? p?.usuario_id;
      return id != null ? `ID ${id}` : 'Sem proprietário';
    };

    const outMap = new Map<string, any>();

    for (const row of this.nfRows) {
      const codigo = String(row.cod_reserva || '').trim();
      const proprietarios = proprietariosPorCodigo.get(codigo) || [];
      const owners = proprietarios.length ? proprietarios : [null];
      const share = proprietarios.length ? (1 / proprietarios.length) : 1;

      for (const p of owners) {
        const key = p ? keyFrom(p) : 'sem-proprietario';
        let acc = outMap.get(key);
        if (!acc) {
          acc = {
            proprietario: p ? labelFrom(p) : 'Sem proprietário',
            apartamentosQtd: 0,
            apartamentos: new Set<string>(),
            isAnfitriao: false,
            isCoanfitriao: false,
            valor_total: 0,
            valor_limpeza: 0,
            valor_proprietario: 0,
            valor_nota_fiscal: 0
          };
          outMap.set(key, acc);
        }

        acc.isAnfitriao = acc.isAnfitriao || !!row.isAnfitriao;
        acc.isCoanfitriao = acc.isCoanfitriao || !!row.isCoanfitriao;

        const apt = (row.apartamento || '').trim() || 'Sem apartamento';
        acc.apartamentos.add(apt);

        acc.valor_total += Number(row.valor_total || 0) * share;
        acc.valor_limpeza += Number(row.valor_limpeza || 0) * share;
        acc.valor_proprietario += Number(row.valor_proprietario || 0) * share;
        acc.valor_nota_fiscal += Number(row.valor_nota_fiscal || 0) * share;
      }
    }

    const out = Array.from(outMap.values()).map((a: any) => {
      a.apartamentosQtd = a.apartamentos.size;
      // Converte Set -> string só para facilitar debug, mas não renderizamos a lista por padrão.
      a._apartamentosList = Array.from(a.apartamentos as Set<string>).sort((x, y) => String(x).localeCompare(String(y), 'pt-BR'));
      delete a.apartamentos;
      return a;
    });

    out.sort((a: any, b: any) => String(a.proprietario).localeCompare(String(b.proprietario), 'pt-BR'));
    return out;
  }

  private buildNFRows(): Array<{apartemento?: string; apartamento: string; tipo?: string; isAnfitriao?: boolean; isCoanfitriao?: boolean; cod_reserva: string; valor_total: number; valor_limpeza: number; valor_proprietario: number; porc_cobrada: number; valor_nota_fiscal: number}> {
    const out: any[] = [];
    for (const r of this.reservasCSV) {
      const somaReserva = Number((r as any)._sumReserva || 0);
      const somaRecebimento = Number((r as any)._sumRecebimento || 0);
      const total = somaReserva + somaRecebimento;
      const valorLimpeza = Number((r as any)._valor_limpeza_ap ?? 0);
      const pct = Number((r as any)._porcentagem_cobrada_ap ?? 0);

      let valorProprietario = 0;
      let valorNotaFiscal = 0;
      let porcCobradaOut = 0;

      if (somaReserva > 0) {
        const baseReserva = somaReserva - valorLimpeza;
        valorProprietario = baseReserva * (1 - pct);
        // NF para Reserva passa a ser o valor que antes era 'Forest'
        valorNotaFiscal += baseReserva * pct;
        porcCobradaOut = pct;
      }

      if (somaRecebimento > 0) {
        // Para tipos diferentes de PAYOUT e de RESERVA, NF = total (recebimento) - limpeza
        valorNotaFiscal += (somaRecebimento - valorLimpeza);
      }

      const nomeApto = (r as any).apartamento_nome || (r as any)._anuncio || '';
      const isAnfitriao = somaReserva > 0;
      const isCoanfitriao = somaRecebimento > 0;
      const tipoLabel = isAnfitriao && isCoanfitriao
        ? 'Anfitrião; Coanfitrião'
        : (isAnfitriao ? 'Anfitrião' : (isCoanfitriao ? 'Coanfitrião' : ''));

      out.push({
        apartamento: nomeApto,
        tipo: tipoLabel,
        isAnfitriao,
        isCoanfitriao,
        cod_reserva: (r as any).cod_reserva || '',
        valor_total: Number(total),
        valor_limpeza: Number(valorLimpeza),
        valor_proprietario: Number(valorProprietario),
        porc_cobrada: Number(porcCobradaOut),
        valor_nota_fiscal: Number(valorNotaFiscal)
      });
    }
    return out;
  }

  // Totais agregados para indicadores
  get totalLimpeza(): number {
    return this.nfRows.reduce((acc, r: any) => acc + (r.valor_limpeza || 0), 0);
  }
  get totalProprietario(): number {
    return this.nfRows.reduce((acc, r: any) => acc + (r.valor_proprietario || 0), 0);
  }
  get totalNotaFiscal(): number {
    return this.nfRows.reduce((acc, r: any) => acc + (r.valor_nota_fiscal || 0), 0);
  }

  private csvEscape(valor: string | undefined): string {
    if (valor == null) return '';
    const needsQuotes = /[",\n\r]/.test(valor);
    let v = String(valor).replace(/"/g, '""');
    return needsQuotes ? `"${v}"` : v;
  }

  // Normaliza valores monetários (pt-BR e en-US), remove símbolos e separadores de milhar
  private parseMoney(input: string): number {
    if (!input) return 0;
    let s = input.trim();
    // Remove possíveis rótulos de moeda e espaços
    s = s.replace(/[A-Za-z$€£R\s]/g, '');
    // Mantém apenas dígitos, vírgula, ponto e sinal
    s = s.replace(/[^0-9,.-]/g, '');
    const hasComma = s.indexOf(',') !== -1;
    const hasDot = s.indexOf('.') !== -1;
    if (hasComma && hasDot) {
      // Formato pt-BR: milhar '.', decimal ','
      s = s.replace(/\./g, '');
      s = s.replace(/,/g, '.');
    } else if (hasComma && !hasDot) {
      // Apenas vírgula: decimal ','
      s = s.replace(/,/g, '.');
    } else {
      // Apenas ponto: já no formato en-US
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }
}
