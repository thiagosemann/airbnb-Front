import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import { ReservaAirbnb } from '../../utilitarios/reservaAirbnb';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {}

  async gerarDossieCompleto(reserva: ReservaAirbnb, hospedes: any[], apartamento: any): Promise<Blob> {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
    this.inserirCabecalho(pdf, `Relatório da Reserva  ${reserva.cod_reserva || 'N/A'}`);
    let currentY = 55;

    // Resumo da Reserva
    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Resumo da Reserva', 10, currentY);
    pdf.setTextColor(0, 0, 0);
    currentY += 6;

    const dataEntrada = this.formatDateBr(reserva.start_date);
    const dataSaida = this.formatDateBr(reserva.end_data);
    const horaEntrada = reserva.check_in || '15:00';
    const horaSaida = reserva.check_out || '11:00';

    autoTable(pdf, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fontSize: 11, cellPadding: 4 },
      head: [['Acomodação', 'Entrada', 'Saída']],
      body: [[
        apartamento?.nome || reserva.apartamento_nome || 'N/A',
        `${dataEntrada} a partir das ${horaEntrada}`,
        `${dataSaida} até as ${horaSaida}`
      ]]
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;

    const reservaInfo: string[][] = [
      ['Código Reserva:', reserva.cod_reserva || 'N/A'],
      ['Previsto de Chegada:', this.getMenorHorarioPrevistoChegada(hospedes)],
      ['Placa do Carro:', reserva.placa_carro || 'N/A'],
    ];
    if (reserva.marca_carro) reservaInfo.push(['Marca do Carro:', reserva.marca_carro]);
    if (reserva.modelo_carro) reservaInfo.push(['Modelo do Carro:', reserva.modelo_carro]);
    if (reserva.cor_carro) reservaInfo.push(['Cor do Carro:', reserva.cor_carro]);
    reservaInfo.push(['Observações:', reserva.Observacoes || 'Nenhuma observação informada.']);

    autoTable(pdf, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      body: reservaInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 'auto' }
      }
    });

    currentY = (pdf as any).lastAutoTable.finalY + 15;

    pdf.setDrawColor(200, 200, 200);
    pdf.line(10, currentY, 200, currentY);
    currentY += 10;

    // Seção de Hóspedes (dados textuais)
    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(`Hóspedes Registrados (${hospedes.length})`, 10, currentY);
    pdf.setTextColor(0, 0, 0);
    currentY += 8;

    for (let i = 0; i < hospedes.length; i++) {
      const h = hospedes[i];

      if (currentY > 250) {
        pdf.addPage();
        this.inserirCabecalho(pdf, `Relatório da Reserva  ${reserva.cod_reserva || 'N/A'}`);
        currentY = 55;
      }

      pdf.setFillColor(248, 249, 250);
      pdf.rect(10, currentY, 190, 38, 'F');

      pdf.setFontSize(12);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`Hóspede ${i + 1}: ${h.first_name || 'N/A'}`, 15, currentY + 8);

      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(`CPF: ${this.formatarCPF(h.CPF || '')}`, 15, currentY + 16);
      pdf.text(`Telefone: ${this.formatarTelefone(h.Telefone || '')}`, 15, currentY + 22);
      pdf.text(`Chegada Prevista: ${h.horarioPrevistoChegada || 'Não informado'}`, 15, currentY + 28);
      pdf.text(`Cadastrado em: ${this.formatDateBrTime(h.created_at)}`, 15, currentY + 34);

      currentY += 45;
    }

    // --- ANEXOS: imagens (via canvas) em páginas dedicadas ---
    for (let i = 0; i < hospedes.length; i++) {
      const h = hospedes[i];

      // Selfie (imagem, não PDF)
      if (h.imagemBase64 && !this.isPDFSafe(h.imagemBase64)) {
        try {
          const result = await this.base64ParaJpegCanvas(h.imagemBase64);
          pdf.addPage();
          this.inserirCabecalho(pdf, `Anexo Selfie — ${h.first_name || 'Hóspede ' + (i + 1)}`);
          this.inserirImagemConvertida(pdf, result.dataUri, result.width, result.height, 'Selfie', h.first_name || 'N/A', 55);
        } catch (err) {
          console.error(`[PDF] Erro ao converter selfie hóspede ${i}:`, err);
        }
      }

      // Documento (imagem, não PDF)
      if (h.documentBase64 && !this.isPDFSafe(h.documentBase64)) {
        try {
          const result = await this.base64ParaJpegCanvas(h.documentBase64);
          pdf.addPage();
          this.inserirCabecalho(pdf, `Anexo Documento — ${h.first_name || 'Hóspede ' + (i + 1)}`);
          this.inserirImagemConvertida(pdf, result.dataUri, result.width, result.height, 'Documento', h.first_name || 'N/A', 55);
        } catch (err) {
          console.error(`[PDF] Erro ao converter documento hóspede ${i}:`, err);
        }
      }
    }

    // Gerar o blob base do relatório
    const relatorioBytes = pdf.output('arraybuffer');

    // --- Mesclar PDFs de documentos dos hóspedes via pdf-lib ---
    const pdfsParaMesclar: { bytes: Uint8Array; label: string }[] = [];

    for (let i = 0; i < hospedes.length; i++) {
      const h = hospedes[i];

      if (h.imagemBase64 && this.isPDFSafe(h.imagemBase64)) {
        try {
          const bytes = this.base64ToUint8Array(h.imagemBase64);
          pdfsParaMesclar.push({ bytes, label: `Selfie (PDF) — ${h.first_name || 'Hóspede ' + (i + 1)}` });
        } catch (err) {
          console.error(`[PDF] Erro ao decodificar selfie PDF hóspede ${i}:`, err);
        }
      }

      if (h.documentBase64 && this.isPDFSafe(h.documentBase64)) {
        try {
          const bytes = this.base64ToUint8Array(h.documentBase64);
          pdfsParaMesclar.push({ bytes, label: `Documento (PDF) — ${h.first_name || 'Hóspede ' + (i + 1)}` });
        } catch (err) {
          console.error(`[PDF] Erro ao decodificar documento PDF hóspede ${i}:`, err);
        }
      }
    }

    if (pdfsParaMesclar.length === 0) {
      return new Blob([relatorioBytes], { type: 'application/pdf' });
    }

    // Mesclar tudo com pdf-lib
    return await this.mesclarPdfs(relatorioBytes, pdfsParaMesclar);
  }

  async gerarDossieHospede(reserva: ReservaAirbnb, hospede: any, apartamento: any): Promise<Blob> {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
    this.inserirCabecalho(pdf, `Informações do Hóspede — ${hospede.first_name || 'N/A'}`);
    let currentY = 55;

    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Informações da Reserva', 10, currentY);
    pdf.setTextColor(0, 0, 0);
    currentY += 6;

    const dataEntrada = this.formatDateBr(reserva.start_date);
    const dataSaida = this.formatDateBr(reserva.end_data);
    const horaEntrada = reserva.check_in || '15:00';
    const horaSaida = reserva.check_out || '11:00';

    autoTable(pdf, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fontSize: 11, cellPadding: 4 },
      head: [['Acomodação', 'Entrada', 'Saída', 'Código Reserva']],
      body: [[
        apartamento?.nome || reserva.apartamento_nome || 'N/A',
        `${dataEntrada} a partir das ${horaEntrada}`,
        `${dataSaida} até as ${horaSaida}`,
        reserva.cod_reserva || 'N/A'
      ]]
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;

    pdf.setDrawColor(200, 200, 200);
    pdf.line(10, currentY, 200, currentY);
    currentY += 10;

    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Informações do Hóspede', 10, currentY);
    pdf.setTextColor(0, 0, 0);
    currentY += 10;

    pdf.setFillColor(248, 249, 250);
    pdf.rect(10, currentY, 190, 38, 'F');

    pdf.setFontSize(12);
    pdf.setFont('Helvetica', 'bold');
    pdf.text(`Hóspede: ${hospede.first_name || 'N/A'}`, 15, currentY + 8);

    pdf.setFontSize(10);
    pdf.setFont('Helvetica', 'normal');
    pdf.text(`CPF: ${this.formatarCPF(hospede.CPF || '')}`, 15, currentY + 16);
    pdf.text(`Telefone: ${this.formatarTelefone(hospede.Telefone || '')}`, 15, currentY + 22);
    pdf.text(`Chegada Prevista: ${hospede.horarioPrevistoChegada || 'Não informado'}`, 15, currentY + 28);
    pdf.text(`Cadastrado em: ${this.formatDateBrTime(hospede.created_at)}`, 15, currentY + 34);

    // Imagens (não-PDF) via canvas
    if (hospede.imagemBase64 && !this.isPDFSafe(hospede.imagemBase64)) {
      try {
        const result = await this.base64ParaJpegCanvas(hospede.imagemBase64);
        pdf.addPage();
        this.inserirCabecalho(pdf, `Anexo Selfie — ${hospede.first_name || 'N/A'}`);
        this.inserirImagemConvertida(pdf, result.dataUri, result.width, result.height, 'Selfie', hospede.first_name || 'N/A', 55);
      } catch (err) {
        console.error('[PDF] Erro ao converter selfie:', err);
      }
    }

    if (hospede.documentBase64 && !this.isPDFSafe(hospede.documentBase64)) {
      try {
        const result = await this.base64ParaJpegCanvas(hospede.documentBase64);
        pdf.addPage();
        this.inserirCabecalho(pdf, `Anexo Documento — ${hospede.first_name || 'N/A'}`);
        this.inserirImagemConvertida(pdf, result.dataUri, result.width, result.height, 'Documento', hospede.first_name || 'N/A', 55);
      } catch (err) {
        console.error('[PDF] Erro ao converter documento:', err);
      }
    }

    const relatorioBytes = pdf.output('arraybuffer');

    // Mesclar PDFs de documentos do hóspede
    const pdfsParaMesclar: { bytes: Uint8Array; label: string }[] = [];

    if (hospede.imagemBase64 && this.isPDFSafe(hospede.imagemBase64)) {
      try {
        pdfsParaMesclar.push({
          bytes: this.base64ToUint8Array(hospede.imagemBase64),
          label: `Selfie (PDF) — ${hospede.first_name || 'N/A'}`
        });
      } catch (err) {
        console.error('[PDF] Erro ao decodificar selfie PDF:', err);
      }
    }

    if (hospede.documentBase64 && this.isPDFSafe(hospede.documentBase64)) {
      try {
        pdfsParaMesclar.push({
          bytes: this.base64ToUint8Array(hospede.documentBase64),
          label: `Documento (PDF) — ${hospede.first_name || 'N/A'}`
        });
      } catch (err) {
        console.error('[PDF] Erro ao decodificar documento PDF:', err);
      }
    }

    if (pdfsParaMesclar.length === 0) {
      return new Blob([relatorioBytes], { type: 'application/pdf' });
    }

    return await this.mesclarPdfs(relatorioBytes, pdfsParaMesclar);
  }

  // =====================================================================
  //  Funções de mesclagem (pdf-lib)
  // =====================================================================

  /**
   * Mescla o relatório gerado pelo jsPDF com PDFs anexos dos hóspedes.
   * Usa pdf-lib para copiar páginas dos PDFs anexos para o documento final.
   */
  private async mesclarPdfs(
    relatorioBytes: ArrayBuffer,
    anexos: { bytes: Uint8Array; label: string }[]
  ): Promise<Blob> {
    const docFinal = await PDFDocument.load(relatorioBytes);

    for (const anexo of anexos) {
      try {
        const anexoPdf = await PDFDocument.load(anexo.bytes, { ignoreEncryption: true });
        const paginas = await docFinal.copyPages(anexoPdf, anexoPdf.getPageIndices());
        for (const pagina of paginas) {
          docFinal.addPage(pagina);
        }
      } catch (err) {
        console.error(`[PDF] Erro ao mesclar anexo "${anexo.label}":`, err);
      }
    }

    const finalBytes = await docFinal.save();
    return new Blob([finalBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  // =====================================================================
  //  Funções auxiliares de imagem
  // =====================================================================

  /**
   * Converte base64 de qualquer formato de imagem para um JPEG data URI
   * usando Canvas do browser.
   */
  private base64ParaJpegCanvas(b64: string): Promise<{ dataUri: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const raw = this.normalizeBase64(b64);
      if (!raw) { reject(new Error('Base64 vazio')); return; }

      const mime = this.detectarMimeType(raw);
      const srcUri = `data:${mime};base64,${raw}`;
      const img = new Image();

      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error('Timeout ao carregar imagem'));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas 2D não suportado')); return; }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          resolve({ dataUri: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h });
        } catch (e) { reject(e); }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        // Fallback: tentar com outro mime
        const fallbackMime = mime === 'image/png' ? 'image/jpeg' : 'image/png';
        const img2 = new Image();
        const timeout2 = setTimeout(() => { reject(new Error('Timeout no fallback')); }, 10000);
        img2.onload = () => {
          clearTimeout(timeout2);
          try {
            const w = img2.naturalWidth || img2.width;
            const h = img2.naturalHeight || img2.height;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas 2D não suportado')); return; }
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img2, 0, 0);
            resolve({ dataUri: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h });
          } catch (e) { reject(e); }
        };
        img2.onerror = () => { clearTimeout(timeout2); reject(new Error('Imagem inválida')); };
        img2.src = `data:${fallbackMime};base64,${raw}`;
      };

      img.src = srcUri;
    });
  }

  /** Insere no PDF uma imagem JPEG data URI já convertida. Retorna Y final. */
  private inserirImagemConvertida(
    pdf: jsPDF, jpegDataUri: string, imgW: number, imgH: number,
    tipo: string, nomeHospede: string, startY: number
  ): number {
    let y = startY;

    pdf.setFontSize(12);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(`${tipo} — ${nomeHospede}`, 10, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;

    try {
      const maxW = 190;
      const maxH = 120;
      const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
      const w = imgW * ratio;
      const h = imgH * ratio;
      const x = 10 + (maxW - w) / 2;
      pdf.addImage(jpegDataUri, 'JPEG', x, y, w, h);
      y += h + 10;
    } catch (err) {
      console.error(`[PDF] Erro ao inserir ${tipo} no PDF:`, err);
      pdf.setFontSize(10);
      pdf.setTextColor(150, 0, 0);
      pdf.text(`[Erro ao inserir ${tipo.toLowerCase()}]`, 10, y + 5);
      pdf.setTextColor(0, 0, 0);
      y += 15;
    }

    return y;
  }

  // =====================================================================
  //  Utilitários
  // =====================================================================

  /** Converte base64 para Uint8Array (para pdf-lib) */
  private base64ToUint8Array(b64: string): Uint8Array {
    const raw = this.normalizeBase64(b64);
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /** Verifica se o base64 é um PDF (decodifica apenas os primeiros bytes). */
  private isPDFSafe(base64: string): boolean {
    try {
      const raw = this.normalizeBase64(base64);
      if (!raw || raw.length < 8) return false;
      const header = atob(raw.substring(0, 8));
      return header.substring(0, 5) === '%PDF-';
    } catch {
      return false;
    }
  }

  /** Detecta mime type pela assinatura dos primeiros bytes do base64 */
  private detectarMimeType(rawBase64: string): string {
    try {
      const bytes = atob(rawBase64.substring(0, 16));
      if (bytes.charCodeAt(0) === 0x89 && bytes.substring(1, 4) === 'PNG') return 'image/png';
      if (bytes.charCodeAt(0) === 0xFF && bytes.charCodeAt(1) === 0xD8) return 'image/jpeg';
      if (bytes.substring(0, 4) === 'GIF8') return 'image/gif';
      if (bytes.substring(0, 4) === 'RIFF' && bytes.substring(8, 12) === 'WEBP') return 'image/webp';
    } catch { /* fallback */ }
    return 'image/png';
  }

  private inserirCabecalho(pdf: jsPDF, titulo: string): void {
    const logoPath = '../../../assets/images/logo-com-frase-V2.png';
    try {
      pdf.addImage(logoPath, 'PNG', 10, 5, 45, 40);
    } catch (e) {
      console.warn('Logo não carregou no PDF');
    }

    pdf.setFontSize(18);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('FOREST', 60, 20);
    pdf.setTextColor(0, 0, 0);

    pdf.setFontSize(14);
    pdf.text(titulo, 60, 30);

    pdf.setDrawColor(41, 128, 185);
    pdf.setLineWidth(1);
    pdf.line(10, 48, 200, 48);
  }

  private normalizeBase64(b64: string | null | undefined): string {
    if (!b64) return '';
    return String(b64).replace(/^data:.*;base64,/, '').replace(/\s/g, '').trim();
  }

  private formatDateBr(dateISO: string | undefined): string {
    if (!dateISO) return 'N/A';
    const onlyDate = dateISO.split('T')[0];
    const match = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return dateISO;
  }

  private formatDateBrTime(dateISO: string | undefined): string {
    if (!dateISO) return 'N/A';
    try {
      const data = new Date(dateISO);
      const horas = data.getUTCHours().toString().padStart(2, '0');
      const minutos = data.getUTCMinutes().toString().padStart(2, '0');
      const dia = data.getUTCDate().toString().padStart(2, '0');
      const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
      const ano = data.getUTCFullYear();
      return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    } catch { return dateISO; }
  }

  private formatarTelefone(telefone: string): string {
    if (!telefone) return '';
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length === 11) return digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (digitos.length === 10) return digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return telefone;
  }

  private formatarCPF(cpf: string): string {
    if (!cpf) return '';
    const digitos = cpf.replace(/\D/g, '');
    if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return cpf;
  }

  private getMenorHorarioPrevistoChegada(hospedes: any[]): string {
    if (!hospedes || hospedes.length === 0) return 'Não informado';
    const horarios = hospedes.map(h => h.horarioPrevistoChegada).filter(h => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h));
    if (horarios.length === 0) return '15:00';
    const tempos = horarios.map(h => {
      const [hh, mm] = h.split(':').map(Number);
      return { original: h, totalMin: hh * 60 + mm };
    });
    const menor = tempos.reduce((prev, curr) => curr.totalMin < prev.totalMin ? curr : prev);
    return menor.original;
  }
}
