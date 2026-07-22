import { Component } from '@angular/core';
import { PagamentoReserva } from 'src/app/shared/utilitarios/pagamentoReserva';
import * as XLSX from 'xlsx';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ApartamentosProprietarioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamentos_proprietario_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { firstValueFrom } from 'rxjs';

type BookingLinha = {
  codReserva: string; // preenchido manualmente depois
  nome: string;
  endereco: string;
  hospede: string;
  dataIni: string;
  dataFim: string;
  status: string;
  valor: number;
  taxa: number;
};

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
  private reservasPorCodigo: Map<string, ReservaAirbnb> = new Map<string, ReservaAirbnb>();

  bookingLinhas: BookingLinha[] = [];
  carregandoBooking = false;

  activeTab: 'erros' | 'reservas' | 'apartamentos' | 'proprietarios' = 'reservas';
  private proprietariosPorApartamentoId: Map<number, any[]> = new Map<number, any[]>();

  // Linhas derivadas de reservasCSV, recalculadas apenas quando os dados mudam (recomputeDerivedData)
  // em vez de a cada ciclo de detecção de mudanças do Angular — evita reprocessar o arquivo inteiro
  // a cada interação do usuário (hover, scroll, clique) enquanto a tabela está na tela.
  private nfRowsCache: any[] = [];
  private nfRowsPorApartamentoCache: any[] = [];
  private nfRowsPorProprietarioCache: any[] = [];
  private nfRowsErrosCache: any[] = [];
  private totalLimpezaCache = 0;
  private totalTaxaSiteCache = 0;
  private totalProprietarioCache = 0;
  private totalNotaFiscalCache = 0;

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
      const novas = this.parseCSV(csvData);
      this.reservasCSV = [...this.reservasCSV, ...novas];
      this.carregando = false;
      this.enriquecerReservasComApartamento();
    };
    reader.readAsText(file);
  }

  processarBookingXLS(event: any) {
    this.carregando = true;
    this.carregandoBooking = true;
    this.proprietariosPorApartamentoId.clear();
    const file = event.target.files?.[0];
    if (!file) {
      this.carregando = false;
      this.carregandoBooking = false;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        // raw:true evita que o XLSX converta datas/números do CSV (ex: "2026-05-01") em serial numbers
        // interpretados no fuso horário local, o que causava deslocamento de 1 dia (UTC-3).
        const workbook = XLSX.read(data, { type: 'array', raw: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
        this.bookingLinhas = sheet ? this.parseBookingSheet(sheet) : [];
        const reservasBooking = this.bookingLinhas.map((b) => this.bookingToReserva(b));
        this.reservasCSV = [...this.reservasCSV, ...reservasBooking];
        this.enriquecerReservasComApartamento();
      } catch (err) {
        this.bookingLinhas = [];
        alert('Não foi possível ler o XLS do Booking.');
      } finally {
        this.carregando = false;
        this.carregandoBooking = false;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private parseCSV(csv: string): PagamentoReserva[] {
    // Divide em linhas e descarta linhas em branco
    const linhas = csv.split('\n').filter(linha => linha.trim() !== '');
    if (linhas.length < 2) {
      return [];
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
      return [];
    }
    if (idxValor < 0 && idxPago < 0) {
      alert('CSV não reconhecido: coluna "Valor" ausente.');
      return [];
    }
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
    const parsed: PagamentoReserva[] = Array.from(agregados.values()).map((e: any) => {
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
      (pr as any).taxa_site = 0;
      return pr;
    });

    return parsed;
  }

  private parseBookingSheet(sheet: XLSX.WorkSheet): BookingLinha[] {
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (!aoa.length) return [];

    const normalize = (s: any) => String(s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .trim();

    const headerRow = (aoa[0] || []).map((h: any) => normalize(h));
    const findIdx = (names: string[]): number => {
      for (const n of names) {
        const idx = headerRow.indexOf(n);
        if (idx >= 0) return idx;
      }
      return -1;
    };

    // Novo modelo de exportação do Booking (relatório de payout): colunas identificadas pelo cabeçalho
    const idxTipo = findIdx(['TYPE/TRANSACTION TYPE', 'TYPE', 'TRANSACTION TYPE']);
    const idxCheckIn = findIdx(['CHECK-IN DATE']);
    const idxCheckOut = findIdx(['CHECK-OUT DATE']);
    const idxStatus = findIdx(['RESERVATION STATUS']);
    const idxPropriedade = findIdx(['PROPERTY NAME']);
    // Transaction amount (coluna W): valor já líquido da comissão do Booking.
    // A comissão do próprio Booking é ignorada de propósito — a comissão da Forest
    // é aplicada depois, em cima desse valor líquido, via porcentagem_cobrada do apartamento.
    const idxValor = findIdx(['TRANSACTION AMOUNT']);

    const formatoNovo = idxPropriedade >= 0 && idxCheckIn >= 0 && idxValor >= 0;

    if (formatoNovo) {
      const linhas: BookingLinha[] = [];
      for (let r = 1; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row || !row.length) continue;

        // Pula linhas de resumo "(Payout)"; considera apenas as linhas de reserva
        const tipoRaw = idxTipo >= 0 ? String(row[idxTipo] ?? '').trim() : '';
        if (!tipoRaw || /PAYOUT/i.test(tipoRaw)) continue;

        const nome = String(row[idxPropriedade] ?? '').trim();
        const dataIni = this.normalizeBookingDate(row[idxCheckIn]);
        const dataFim = idxCheckOut >= 0 ? this.normalizeBookingDate(row[idxCheckOut]) : '';
        const status = idxStatus >= 0 ? String(row[idxStatus] ?? '').trim() : '';
        const valor = idxValor >= 0 ? this.parseMoney(String(row[idxValor] ?? '')) : 0;
        const taxa = 0;

        if (!nome && !dataIni && !dataFim && !status && !valor) continue;

        const aptCode = this.extractAptCode(nome);
        const codReserva = aptCode && dataIni ? `B-${aptCode}${dataIni}` : '';

        linhas.push({
          codReserva,
          nome,
          endereco: '',
          hospede: '',
          dataIni,
          dataFim,
          status,
          valor,
          taxa
        });
      }
      return linhas;
    }

    // Fallback: modelo antigo, colunas por posição fixa (C=nome, D=endereço, E=hóspede, F=entrada, G=saída, H=status, I=valor, J=taxa)
    const linhas: BookingLinha[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const nome = this.sheetValueAsString(sheet, 2, r);
      const endereco = this.sheetValueAsString(sheet, 3, r);
      const hospede = this.sheetValueAsString(sheet, 4, r);
      const dataIniRaw = this.sheetRawValue(sheet, 5, r);
      const dataFimRaw = this.sheetRawValue(sheet, 6, r);
      const dataIni = this.normalizeBookingDate(dataIniRaw);
      const dataFim = this.normalizeBookingDate(dataFimRaw);
      const status = this.sheetValueAsString(sheet, 7, r);
      const valor = this.parseMoney(this.sheetValueAsString(sheet, 8, r));
      const taxa = this.parseMoney(this.sheetValueAsString(sheet, 9, r));

      if (!nome && !hospede && !dataIni && !dataFim && !status && !valor && !taxa) {
        continue;
      }

      const aptCode = this.extractAptCode(nome);
      const codReserva = aptCode && dataIni ? `B-${aptCode}${dataIni}` : '';

      linhas.push({
        codReserva,
        nome,
        endereco,
        hospede,
        dataIni,
        dataFim,
        status,
        valor,
        taxa
      });
    }

    return linhas;
  }

  private sheetRawValue(sheet: XLSX.WorkSheet, c: number, r: number): any {
    const ref = XLSX.utils.encode_cell({ c, r });
    return sheet[ref]?.v;
  }

  private extractAptCode(nome: string): string {
    if (!nome) return '';
    const firstPart = nome.split(' ')[0] || '';
    return firstPart.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  private sheetValueAsString(sheet: XLSX.WorkSheet, c: number, r: number): string {
    const raw = this.sheetRawValue(sheet, c, r);
    return raw == null ? '' : String(raw).trim();
  }

  private bookingToReserva(b: BookingLinha): PagamentoReserva {
    const pr: PagamentoReserva = {
      cod_reserva: b.codReserva,
      dataReserva: b.dataIni,
      noites: 0,
      valor_reserva: b.valor || 0,
      taxas: 0
    };
    // Marcamos como Reserva padrão
    (pr as any)._sumReserva = b.valor || 0;
    (pr as any)._sumRecebimento = 0;
    (pr as any)._tipo = 'Reserva';
    (pr as any)._tipoNorm = 'RESERVA';
    (pr as any)._anuncio = b.nome || '';
    (pr as any).taxa_site = b.taxa || 0;
    return pr;
  }

  private normalizeBookingDate(value: any): string {
    if (value == null || value === '') return '';

    // Excel serial date
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return '';
      return this.dateToDDMMYYYY(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
    }

    const asStr = String(value).trim();

    // pt-BR textual format ex: "2 de dez. de 2025"
    const m = asStr.match(/^(\d{1,2})\s+de\s+([A-Za-z\.]+)\s+de\s+(\d{4})/i);
    if (m) {
      const dia = Number(m[1]);
      const mesStr = m[2].toLowerCase().replace('.', '');
      const ano = Number(m[3]);
      const meses: Record<string, number> = {
        jan: 0, janeiro: 0,
        fev: 1, fevereiro: 1,
        mar: 2, março: 2, marco: 2,
        abr: 3, abril: 3,
        mai: 4, maio: 4,
        jun: 5, junho: 5,
        jul: 6, julho: 6,
        ago: 7, agosto: 7,
        set: 8, setembro: 8,
        out: 9, outubro: 9,
        nov: 10, novembro: 10,
        dez: 11, dezembro: 11
      };
      const mes = meses[mesStr];
      if (mes != null) {
        const dt = new Date(Date.UTC(ano, mes, dia));
        return this.dateToDDMMYYYY(dt);
      }
    }

    // ISO-like fallback
    const dt = new Date(asStr);
    return isNaN(dt.getTime()) ? '' : this.dateToDDMMYYYY(dt);
  }

  private dateToDDMMYYYY(dt: Date): string {
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = dt.getUTCFullYear();
    return `${dd}${mm}${yyyy}`;
  }

  private normalizeTipo(t: string): string {
    if (!t) return '';
    return t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  // Guarda o motivo da última falha ao carregar a lista de apartamentos,
  // para explicar por que TODAS as linhas ficaram sem apartamento vinculado.
  private apartamentosCarregamentoErro: string | null = null;
  // Motivo de erro ao buscar proprietários, por apartamento_id (quando a busca falha de verdade,
  // em vez de simplesmente não haver proprietário cadastrado).
  private proprietariosErroPorApartamentoId: Map<number, string> = new Map<number, string>();

  // Extrai uma mensagem legível de um erro de HTTP/JS para exibir ao usuário.
  private formatErro(e: any): string {
    if (!e) return 'erro desconhecido';
    if (typeof e === 'string') return e;
    const status = e.status ?? e?.error?.status;
    const msg = e?.error?.message || e?.error?.error || e?.message || e?.statusText;
    if (status && msg) return `HTTP ${status} - ${msg}`;
    if (status) return `HTTP ${status}`;
    if (msg) return String(msg);
    try { return JSON.stringify(e); } catch { return String(e); }
  }

  // Motivo da última falha ao carregar reservas em massa (mesmo padrão de apartamentosCarregamentoErro).
  private reservasCarregamentoErro: string | null = null;

  // Carrega apartamentos ATIVOS e INATIVOS (reservas antigas podem apontar para
  // apartamentos já desativados, e mesmo assim precisam ser reconhecidas aqui).
  private async carregarApartamentosMap(): Promise<void> {
    this.apartamentosCarregamentoErro = null;
    try {
      const [ativos, inativos] = await Promise.all([
        firstValueFrom(this.apartamentoService.getAllApartamentos()),
        firstValueFrom(this.apartamentoService.getApartamentosInativos()).catch(() => [] as Apartamento[])
      ]);
      this.apartamentosMap.clear();
      for (const a of [...(ativos || []), ...(inativos || [])]) {
        this.apartamentosMap.set(a.id, a);
      }
    } catch (e) {
      // mantém mapa vazio em erro, mas guarda o motivo para explicar nas linhas afetadas
      this.apartamentosCarregamentoErro = this.formatErro(e);
    }
  }

  // Busca TODAS as reservas de uma vez, incluindo as de apartamentos inativos,
  // e indexa por cod_reserva, para resolver cada linha localmente sem 1 requisição por linha.
  private async carregarReservasMap(): Promise<void> {
    this.reservasCarregamentoErro = null;
    try {
      const todas = await firstValueFrom(this.reservasService.getAllReservas(true));
      this.reservasPorCodigo.clear();
      for (const res of todas) {
        const cod = (res.cod_reserva || '').trim();
        if (cod && !this.reservasPorCodigo.has(cod)) {
          this.reservasPorCodigo.set(cod, res);
        }
      }
    } catch (e) {
      this.reservasCarregamentoErro = this.formatErro(e);
    }
  }

  private async enriquecerReservasComApartamento(): Promise<void> {
    if (!this.reservasCSV || this.reservasCSV.length === 0) return;
    this.carregandoDados = true;
    this.aptosTotal = this.reservasCSV.length;
    this.aptosProcessados = 0;
    this.progressPercent = this.aptosTotal ? 0 : 100;
    try {
      // 1) Duas requisições em paralelo (em vez de uma por linha do arquivo importado).
      await Promise.all([this.carregarApartamentosMap(), this.carregarReservasMap()]);

      // 2) Resolve cod_reserva -> apartamento_id localmente e reúne quais apartamentos
      // ainda precisam de busca de proprietário (sem repetir apartamentos já em cache).
      const aptoIdsParaBuscar = new Set<number>();
      for (const r of this.reservasCSV) {
        const codigo = (r.cod_reserva || '').trim();
        const aptoId = codigo ? this.reservasPorCodigo.get(codigo)?.apartamento_id : undefined;
        if (aptoId && !this.proprietariosPorApartamentoId.has(aptoId)) {
          aptoIdsParaBuscar.add(aptoId);
        }
      }

      // 3) Busca os proprietários de todos os apartamentos envolvidos em paralelo.
      await Promise.all(Array.from(aptoIdsParaBuscar).map(async (aptoId) => {
        try {
          const props = await firstValueFrom(this.aptoProprietarioService.getProprietariosByApartamento(aptoId));
          this.proprietariosPorApartamentoId.set(aptoId, Array.isArray(props) ? props : []);
        } catch (e) {
          this.proprietariosPorApartamentoId.set(aptoId, []);
          this.proprietariosErroPorApartamentoId.set(aptoId, this.formatErro(e));
        }
      }));

      // 4) Com tudo já em memória, monta erros/enriquecimento de cada linha sem nenhuma requisição.
      for (const r of this.reservasCSV) {
        const erros: string[] = [];
        (r as any)._erros = erros;
        const codigo = (r.cod_reserva || '').trim();
        const anuncio = (r as any)._anuncio || r.apartamento_nome || '';

        if (!codigo) {
          erros.push(
            anuncio
              ? `Código de reserva não pôde ser gerado a partir do arquivo (anúncio: "${anuncio}")`
              : 'Código de reserva vazio/ausente no arquivo importado'
          );
        } else {
          const reserva = this.reservasPorCodigo.get(codigo);
          if (!reserva) {
            const motivoCarga = this.reservasCarregamentoErro
              ? ` (falha ao carregar reservas: ${this.reservasCarregamentoErro})`
              : '';
            erros.push(`Reserva não encontrada para o código "${codigo}"${anuncio ? ` (anúncio: "${anuncio}")` : ''}${motivoCarga}`);
          } else {
            const aptoId = reserva.apartamento_id;
            if (aptoId) {
              r.apartamento_id = aptoId;
              const apto = this.apartamentosMap.get(aptoId);
              if (apto) {
                const inativo = Number(apto.is_active) === 0;
                r.apartamento_nome = inativo ? `${apto.nome} (inativo)` : apto.nome;
                // Guardamos valores para uso na exportação
                (r as any)._valor_enxoval_ap = apto.valor_enxoval ?? 0;
                (r as any)._valor_limpeza_ap = apto.valor_limpeza ?? 0;
                const pctRaw = apto.porcentagem_cobrada ?? 0;
                (r as any)._porcentagem_cobrada_ap = pctRaw > 1 ? (pctRaw / 100) : pctRaw;
              } else {
                const nomeConhecido = reserva.apartamento_nome ? ` "${reserva.apartamento_nome}"` : '';
                const motivo = this.apartamentosCarregamentoErro
                  ? ` (falha ao carregar lista de apartamentos: ${this.apartamentosCarregamentoErro})`
                  : ' (id não existe na lista de apartamentos carregada)';
                erros.push(`Apartamento${nomeConhecido} (id ${aptoId}) não encontrado${motivo}`);
              }

              (r as any)._proprietarios = this.proprietariosPorApartamentoId.get(aptoId) || [];
              if (!((r as any)._proprietarios || []).length) {
                const erroBusca = this.proprietariosErroPorApartamentoId.get(aptoId);
                const nomeApto = r.apartamento_nome || apto?.nome || `id ${aptoId}`;
                erros.push(
                  erroBusca
                    ? `Erro ao buscar proprietários do apartamento "${nomeApto}": ${erroBusca}`
                    : `Nenhum proprietário cadastrado para o apartamento "${nomeApto}"`
                );
              }
            } else {
              erros.push(`Reserva "${codigo}"${reserva.id ? ` (id ${reserva.id})` : ''} encontrada, mas sem apartamento_id vinculado`);
            }
          }
        }

        this.aptosProcessados += 1;
        this.progressPercent = Math.round((this.aptosProcessados / (this.aptosTotal || 1)) * 100);
      }
      this.recomputeDerivedData();
    } finally {
      this.carregandoDados = false;
    }
    if (this.aptosTotal > 0) this.progressPercent = 100;
  }

  // Linhas com erro de vinculação/enriquecimento (para a aba Erros)
  private buildNfRowsErros(rows: any[]): any[] {
    const byCodigo = new Map<string, any>();
    for (const r of rows) {
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
        valor_limpeza: Number(row?.valor_limpeza ?? (r as any)._valor_limpeza_ap ?? 0),
        taxa_site: Number(row?.taxa_site ?? (r as any).taxa_site ?? 0),
        valor_nota_fiscal: Number(row?.valor_nota_fiscal ?? 0),
        erros: errs
      });
    }

    out.sort((a, b) => String(a.cod_reserva).localeCompare(String(b.cod_reserva), 'pt-BR'));
    return out;
  }

  get nfRowsErros(): any[] {
    return this.nfRowsErrosCache;
  }

  get totalErros(): number {
    return this.nfRowsErrosCache.length;
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
      this.recomputeDerivedData();
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
    const headerReservas = ['apartamento','tipo','cod_reserva','valor_total','valor_limpeza','taxa_site','valor_proprietario','porc_cobrada','valor_nota_fiscal'];
    const aoaReservas: (string | number)[][] = [headerReservas];
    const rowsReservas = this.nfRows;
    for (const row of rowsReservas) {
      aoaReservas.push([
        row.apartamento,
        row.tipo || tipoLabelFrom(row) || '',
        row.cod_reserva,
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number((row as any).taxa_site || 0),
        Number(row.valor_proprietario),
        Number(row.porc_cobrada),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsReservas = XLSX.utils.aoa_to_sheet(aoaReservas);

    // Aba 2: Apartamentos (agregado)
    const headerAptos = ['apartamento','tipo','valor_total','valor_limpeza','taxa_site','valor_proprietario','porc_cobrada','valor_nota_fiscal'];
    const aoaAptos: (string | number)[][] = [headerAptos];
    const rowsAptos = this.nfRowsPorApartamento;
    for (const row of rowsAptos) {
      aoaAptos.push([
        row.apartamento,
        tipoLabelFrom(row) || '',
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number((row as any).taxa_site || 0),
        Number(row.valor_proprietario),
        Number(row.porc_cobrada),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsAptos = XLSX.utils.aoa_to_sheet(aoaAptos);

    // Aba 3: Proprietários (agregado)
    const headerProps = ['proprietario','aptos','tipo','valor_total','valor_limpeza','taxa_site','valor_proprietario','valor_nota_fiscal'];
    const aoaProps: (string | number)[][] = [headerProps];
    const rowsProps = this.nfRowsPorProprietario;
    for (const row of rowsProps) {
      aoaProps.push([
        row.proprietario,
        Number(row.apartamentosQtd || 0),
        tipoLabelFrom(row) || '',
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number((row as any).taxa_site || 0),
        Number(row.valor_proprietario),
        Number(row.valor_nota_fiscal)
      ]);
    }
    const wsProps = XLSX.utils.aoa_to_sheet(aoaProps);

    // Aba 4: Erros (linhas que não conseguiram vincular/enriquecer)
    const headerErros = ['cod_reserva','apartamento','valor_total','valor_limpeza','taxa_site','valor_nota_fiscal','erros'];
    const aoaErros: (string | number)[][] = [headerErros];
    const rowsErros = this.nfRowsErros;
    for (const row of rowsErros) {
      aoaErros.push([
        row.cod_reserva,
        row.apartamento,
        Number(row.valor_total),
        Number(row.valor_limpeza),
        Number((row as any).taxa_site || 0),
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
    return this.nfRowsCache;
  }

  // Recalcula todas as visões derivadas de reservasCSV de uma só vez. Chamado explicitamente
  // após qualquer mutação de dados (import, exclusão), nunca implicitamente pelo template.
  private recomputeDerivedData(): void {
    const rows = this.buildNFRows();
    this.nfRowsCache = rows;
    this.nfRowsPorApartamentoCache = this.buildNfRowsPorApartamento(rows);
    this.nfRowsPorProprietarioCache = this.buildNfRowsPorProprietario(rows);
    this.nfRowsErrosCache = this.buildNfRowsErros(rows);

    let limpeza = 0, taxaSite = 0, proprietario = 0, notaFiscal = 0;
    for (const r of rows) {
      limpeza += Number(r.valor_limpeza) || 0;
      taxaSite += Number((r as any).taxa_site) || 0;
      proprietario += Number(r.valor_proprietario) || 0;
      notaFiscal += Number(r.valor_nota_fiscal) || 0;
    }
    this.totalLimpezaCache = limpeza;
    this.totalTaxaSiteCache = taxaSite;
    this.totalProprietarioCache = proprietario;
    this.totalNotaFiscalCache = notaFiscal;
  }

  // Linhas agregadas por apartamento (para a aba Apartamentos)
  private buildNfRowsPorApartamento(rows: any[]): any[] {
    const agrupado = new Map<string, any>();
    for (const r of rows) {
      const apt = (r?.apartamento || '').trim() || 'Sem apartamento';
      let acc = agrupado.get(apt);
      if (!acc) {
        acc = {
          apartamento: apt,
          isAnfitriao: false,
          isCoanfitriao: false,
          valor_total: 0,
          valor_limpeza: 0,
          taxa_site: 0,
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
      const ts = Number((r as any).taxa_site || 0);
      const vp = Number(r.valor_proprietario || 0);
      const vnf = Number(r.valor_nota_fiscal || 0);
      acc.valor_total += vt;
      acc.valor_limpeza += vl;
      acc.taxa_site += ts;
      acc.valor_proprietario += vp;
      acc.valor_nota_fiscal += vnf;

      // % cobranca: média ponderada pela base (total - limpeza) apenas quando houver %
      const pct = Number(r.porc_cobrada || 0);
      const base = Math.max(0, vt - vl - ts);
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

  get nfRowsPorApartamento(): any[] {
    return this.nfRowsPorApartamentoCache;
  }

  // Linhas agregadas por proprietário (para a aba Proprietários)
  // Observação: quando um apartamento tem múltiplos proprietários, os valores são divididos igualmente entre eles.
  private buildNfRowsPorProprietario(rows: any[]): any[] {
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

    for (const row of rows) {
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
            taxa_site: 0,
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
        acc.taxa_site += Number((row as any).taxa_site || 0) * share;
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

  get nfRowsPorProprietario(): any[] {
    return this.nfRowsPorProprietarioCache;
  }

  private buildNFRows(): Array<{apartemento?: string; apartamento: string; tipo?: string; isAnfitriao?: boolean; isCoanfitriao?: boolean; cod_reserva: string; valor_total: number; valor_limpeza: number; valor_proprietario: number; porc_cobrada: number; valor_nota_fiscal: number}> {
    const out: any[] = [];
    for (const r of this.reservasCSV) {
      const somaReserva = Number((r as any)._sumReserva || 0);
      const somaRecebimento = Number((r as any)._sumRecebimento || 0);
      const total = somaReserva + somaRecebimento;
      const valorLimpeza = Number((r as any)._valor_limpeza_ap ?? 0);
      const taxaSite = Number((r as any).taxa_site || 0);
      const pct = Number((r as any)._porcentagem_cobrada_ap ?? 0);

      let valorProprietario = 0;
      let valorNotaFiscal = 0;
      let porcCobradaOut = 0;

      if (somaReserva > 0) {
        const baseReserva = somaReserva - valorLimpeza - taxaSite;
        valorProprietario = baseReserva * (1 - pct);
        // NF para Reserva passa a ser o valor que antes era 'Forest'
        valorNotaFiscal += baseReserva * pct;
        porcCobradaOut = pct;
      }

      if (somaRecebimento > 0) {
        // Para tipos diferentes de PAYOUT e de RESERVA, NF = total (recebimento) - limpeza - taxa do site
        valorNotaFiscal += (somaRecebimento - valorLimpeza - taxaSite);
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
        taxa_site: Number(taxaSite),
        valor_proprietario: Number(valorProprietario),
        porc_cobrada: Number(porcCobradaOut),
        valor_nota_fiscal: Number(valorNotaFiscal)
      });
    }
    return out;
  }

  // Totais agregados para indicadores (calculados uma vez em recomputeDerivedData)
  get totalLimpeza(): number {
    return this.totalLimpezaCache;
  }
  get totalTaxaSite(): number {
    return this.totalTaxaSiteCache;
  }
  get totalProprietario(): number {
    return this.totalProprietarioCache;
  }
  get totalNotaFiscal(): number {
    return this.totalNotaFiscalCache;
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
