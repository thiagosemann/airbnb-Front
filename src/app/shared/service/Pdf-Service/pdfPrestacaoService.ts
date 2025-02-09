import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class PdfPrestacaoService {
  font: string = 'times';

  constructor(   
  ) {}

async generatePdfPrestacao(data: any): Promise<string> {
  const pdf = new jsPDF();
  const logoPath = '../../../assets/images/logo-com-frase-V2.png';
  const footerPath = '../../../assets/images/footerPdf.png';
  let months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let startX = 5;
  console.log(data)
  // Carregar imagens como base64
  const logoData = await this.getImageAsBase64(logoPath);
  const footerData = await this.getImageAsBase64(footerPath);

  // Adiciona o capa com o título e informações básicas
  this.addCapa(pdf, logoData, footerData, startX,data,months);
  pdf.addPage();
  // Adiciona A segunda página com as assinaturas
  this.addParecerConselho(pdf, logoData, startX,data);
  pdf.addPage();
  // Tabelas de Gastos
  this.addTabelas(pdf, startX, data,months,logoData);

  // Retorna o PDF como base64
  const pdfBase64 = pdf.output('datauristring');

  return pdfBase64;
}


  private addCapa(pdf: any,logoData:any,footerData:any,startX:number,data:any,months:any): void {
    // Adiciona logo com compactação
    pdf.addImage(logoData, 'JPEG', startX+10, 0, 30, 30, undefined, 'FAST');
    this.configText(pdf, 'bold', 25);
    pdf.text('Prestação de Contas', startX+100, 80, { align: 'center' });
    this.configText(pdf, 'normal', 12);
    pdf.text(`Condomínio ${data.building.nome}`, startX+100, 92, { align: 'center' });
    // Desenhar botão com bordas arredondadas, cinza com texto branco "Novembro/2024"
    const rectX = 60;
    const rectY = 98;
    const rectWidth = 90;
    const rectHeight = 15;
    const borderRadius = 5;

    pdf.setDrawColor(0);
    pdf.setFillColor(64, 64, 64); // Cinza escuro

    // Desenha o retângulo com bordas arredondadas
    pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, borderRadius, borderRadius, 'F');

    this.configText(pdf, 'bold', 16);
    pdf.setTextColor(255, 255, 255); // Branco
    pdf.text(`${months[Number(data.selectedMonth)-1]}/${data.selectedYear}`, startX+100, rectY + 9, { align: 'center' });
    pdf.setTextColor(0, 0, 0); // Preto

    this.configText(pdf, 'bold', 16);
    pdf.text('Síndico', startX+100, 210, { align: 'center' });

    this.configText(pdf, 'normal', 14);
    pdf.text(data.building.sindico, startX+100, 218, { align: 'center' });

    // Adicionando a imagem de footer com compactação
    pdf.addImage(footerData, 'JPEG', 0, 240, 210, 60, undefined, 'FAST');
  }

  private addParecerConselho(pdf: any, logoData: any, startX: number, data: any): void {
    // Adiciona logo com compactação
    pdf.addImage(logoData, 'JPEG', startX + 10, 0, 30, 30, undefined, 'FAST');
    // Título principal
    this.addTextCentered(pdf, 'Parecer do Conselho', 'bold', 25, startX + 100, 70);
    // Texto auxiliar
    const textAux =
      'Declaramos ter examinado as contas, documentos e papéis que compõem esta prestação de contas ao mês de novembro de 2024, sendo que os documentos estão em ordem e as contas exatas, em conformidade com a Lei 4.591/64 e regimento interno do condomínio.';
    this.addTextBlock(pdf, 'normal', 14, textAux, startX + 30, 80, 160);
    // Síndico
    this.addSignatureBlock(pdf,'Síndico',data.building.sindico,startX,115,145);
    // Conselheiros Fiscais
    this.addSignatureBlock(pdf, 'Conselheiros Fiscais', 'Conselheiro(a)', startX, 165, 195);
    this.addSignatureBlock(pdf, '', 'Conselheiro(a)', startX, 235, 235);
    this.addSignatureBlock(pdf, '', 'Conselheiro(a)', startX, 275, 275);
  }

  private addTabelas(pdf: any, startX: number, data: any,months:any,logoData:any):void{
    let currentY=0;
    let totalValue =0;
    pdf.addImage(logoData, 'JPEG', startX+10, currentY, 30, 30, undefined, 'FAST');
    currentY+=30;
    this.configText(pdf, 'bold', 20);
    pdf.text(`Prestação de contas`, startX+100, currentY, { align: 'center' });
    currentY+=15;
    [currentY,totalValue] = this.addCollectiveExpensesSection(pdf,startX,currentY,data,months)
    // Adiciona Provisões.
    currentY = this.addProvisionsSection(pdf, startX, currentY, data);
    // Adiciona Fundos .
    currentY = this.addFundosSection(pdf, startX, currentY, data,totalValue);
    // Adiciona Saldos .
    currentY = this.addSaldosSection(pdf, startX, currentY, data,totalValue);
    pdf.addPage();
    currentY =0;
    pdf.addImage(logoData, 'JPEG', startX+10, currentY, 30, 30, undefined, 'FAST');
    currentY+=30;
    currentY = this.addGastosIndividuais(pdf,startX,currentY,data,months)

    
  }


  private addCollectiveExpensesSection(pdf: any, startX: number, currentY: number, data: any,months:any):  [number,number] {
    this.configText(pdf, 'bold', 15);
    pdf.text(`Rateio dos gastos comuns referente ao mês ${data.selectedMonth} com vencimento no mês seguinte.`, startX, currentY);
    const groupedExpenses = data.commonExpenses.reduce((acc: any, item: any) => {
        const existing = acc.find((exp: any) => exp.tipo_Gasto_Extra === item.tipo_Gasto_Extra);
        if (existing) {
            existing.valor += Number(item.valor);
        } else {
            acc.push({ tipo_Gasto_Extra: item.tipo_Gasto_Extra, valor: Number(item.valor) });
        }
        return acc;
    }, []);
  
    // Calcula o total dos valores
    const totalValue = groupedExpenses.reduce((sum: number, item: any) => sum + item.valor, 0);
  
    // Cria a tabela utilizando a função auxiliar
    currentY = this.generateTable(pdf, startX, currentY , 
        ['Categoria', 'Valor'], 
        [
            ...groupedExpenses.map((item: any) => [
                item.tipo_Gasto_Extra,
                `R$ ${item.valor.toFixed(2)}`,
            ]),
            // Adiciona o item "Total" ao final da tabela
            [
                { content: 'Total', styles: { fontStyle: 'bold' } },
                { content: `R$ ${totalValue.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            ]
        ], 
        [120, 80 ], 10);
  
    return [currentY,totalValue];
  }

  private addGastosIndividuais(pdf: any, startX: number, currentY: number, data: any, months: any): number {
    this.configText(pdf, 'bold', 15);
    pdf.text('Consumos Individuais', startX, currentY);

    // Calcula o total dos valores
    const totalValue = data.gastosIndividuais.reduce((sum: number, item: any) => sum + parseFloat(item.aguaValor) + parseFloat(item.gasValor) + parseFloat(item.lazer) + parseFloat(item.lavanderia) + parseFloat(item.multa), 0);

    // Cria a tabela utilizando a função auxiliar
    currentY = this.generateTable(pdf, startX, currentY,
        [
            'Apartamento', 'Água (R$)', 'Gás (R$)', 
            'Lazer (R$)', 'Lavanderia (R$)', 'Multa (R$)', 'Total'
        ], 
        [
            ...data.gastosIndividuais.map((item: any) => [
                item.apt_name,
                `R$ ${parseFloat(item.aguaValor).toFixed(2)}`,
                `R$ ${parseFloat(item.gasValor).toFixed(2)}`,
                `R$ ${parseFloat(item.lazer).toFixed(2)}`,
                `R$ ${parseFloat(item.lavanderia).toFixed(2)}`,
                `R$ ${parseFloat(item.multa).toFixed(2)}`,
                `R$ ${(parseFloat(item.aguaValor) + parseFloat(item.gasValor) + parseFloat(item.lazer) + parseFloat(item.lavanderia) + parseFloat(item.multa)).toFixed(2)}`
            ]),
            // Adiciona o item "Total" ao final da tabela
            [
                { content: 'Total', styles: { fontStyle: 'bold' } },
                '', '', '', '', '', 
                { content: `R$ ${totalValue.toFixed(2)}`, styles: { fontStyle: 'bold' } }
            ]
        ], 
        [45, 25, 25, 25, 30, 25, 25], 9
    );

    return currentY;
}

  private addProvisionsSection(pdf: any, startX: number, currentY: number, data: any): number {
    this.configText(pdf, 'bold', 15);
    pdf.text('Provisões', startX, currentY);
  
    // Calcula o total das provisoes
    const totalProvisoes = data.provisoes.reduce((sum: number, item: any) => {
      return sum + (Number(item.valor)/ Number(item.frequencia) || 0);
    }, 0);
  
    // Cria a tabela utilizando a função auxiliar
    currentY = this.generateTable(pdf, startX, currentY , 
        ['Categoria', 'Valor Mensal'],
        [
            ...data.provisoes.map((item: any) => [
                item.detalhe,
                `R$ ${(Number(item.valor)/ Number(item.frequencia)).toFixed(2)}`,
            ]),
            // Adiciona o item "Total" ao final da tabela
            [
                { content: 'Total', styles: { fontStyle: 'bold' } },
                { content: `R$ ${totalProvisoes.toFixed(2)}`, styles: { fontStyle: 'bold' } },
  
            ]
        ], 
        [120, 80], 10);
  
    return currentY;
  }
  
  private addFundosSection(pdf: any, startX: number, currentY: number, data: any, totalValue:number): number {
    this.configText(pdf, 'bold', 15);
    pdf.text('Fundos ', startX, currentY);
  
    // Calcula o total das provisoes
    const totalFundos = data.fundos.reduce((sum: number, item: any) => {
      return sum + (Number(item.porcentagem)* totalValue || 0);
    }, 0);
  
    // Cria a tabela utilizando a função auxiliar
    currentY = this.generateTable(pdf, startX, currentY , 
        ['Categoria', 'Valor Mensal'],
        [
            ...data.fundos.map((item: any) => [
                item.tipo_fundo,
                `R$ ${(Number(item.porcentagem)* totalValue).toFixed(2)}`,
            ]),
            // Adiciona o item "Total" ao final da tabela
            [
                { content: 'Total', styles: { fontStyle: 'bold' } },
                { content: `R$ ${totalFundos.toFixed(2)}`, styles: { fontStyle: 'bold' } },
  
            ]
        ], 
        [120, 80], 10);
  
    return currentY;
  }

  private addSaldosSection(pdf: any, startX: number, currentY: number, data: any, totalValue: number): number {
    // Configurações iniciais de fonte e título
    this.configText(pdf, 'bold', 15);
    pdf.text('Saldo ', startX, currentY);  
    // Acessa os saldos em data.saldosPredios
    const sortedSaldos = [...data.saldos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const latestConta = sortedSaldos.find((item) => item.type === 'conta');
    const latestInvestimento = sortedSaldos.find((item) => item.type === 'investimento');
  
    const contaValue = latestConta ? parseFloat(latestConta.valor) : 0;
    const investimentoValue = latestInvestimento ? parseFloat(latestInvestimento.valor) : 0;
  
    // Cria a tabela utilizando a função auxiliar
    currentY = this.generateTable(
      pdf,
      startX,
      currentY ,
      ['Categoria', 'Valor'],
      [
        [
          { content: 'Conta Corrente' },
          { content: `R$ ${contaValue.toFixed(2)}` },
        ],
        [
          { content: 'Investimento' },
          { content: `R$ ${investimentoValue.toFixed(2)}` },
        ],
        [
          { content: 'Total', styles: { fontStyle: 'bold' } },
          { content: `R$ ${(Number(contaValue)+Number(investimentoValue)).toFixed(2)}`, styles: { fontStyle: 'bold' } },
  
      ]
      ],
      [120, 80],10
    );
  
    return currentY;
  }

  
  //------------------------- UTILITARIOS----------------------------------------------------------------------------------------------------//
  private addTextCentered(pdf: any, text: string, fontStyle: string, fontSize: number, x: number, y: number): void {
    this.configText(pdf, fontStyle, fontSize);
    pdf.text(text, x, y, { align: 'center' });
  }
  
  private addTextBlock(pdf: any, fontStyle: string, fontSize: number, text: string, x: number, y: number, width: number): number {
    this.configText(pdf, fontStyle, fontSize);
    return pdf.text(text, x, y, { maxWidth: width });
  }
  
  private addSignatureBlock(pdf: any, title: string, name: string, startX: number, titleY: number, lineY: number): void {
    if (title) this.addTextCentered(pdf, title, 'bold', 20, startX + 100, titleY);
    this.drawLine(pdf, startX + 60, lineY, startX + 140, lineY); // Linha para assinatura
    this.addTextCentered(pdf, name, 'normal', 12, startX + 100, lineY + 5);
    this.addTextCentered(pdf, 'Data:', 'normal', 12, startX + 100, lineY + 10);
  } 
  
  // Função para desenhar uma linha
  private drawLine(pdf: any, x1: number, y1: number, x2: number, y2: number): void {
    pdf.setLineWidth(0.5); // Define a espessura da linha
    pdf.line(x1, y1, x2, y2); // Desenha a linha de (x1, y1) até (x2, y2)
  }
  
// Função para justificar uma linha de texto
  private justifyText(pdf: any,text: string,startX: number, startY: number, maxWidth: number, fontSize: number ): void {
    const words = text.split(' ');
    const totalSpaces = words.length - 1;
    const spaceWidth = pdf.getTextWidth(' ');
    const textWidth = pdf.getTextWidth(text.replace(/ /g, ''));
    const extraSpace = (maxWidth - textWidth) / totalSpaces;

    let currentX = startX;

    words.forEach((word, index) => {
      pdf.text(word, currentX, startY);
      currentX += pdf.getTextWidth(word) + spaceWidth + (index < totalSpaces ? extraSpace : 0);
    });
  }
  private configText(pdf: any, fontWeight: string, size: number): void {
    pdf.setFont(this.font, fontWeight);
    pdf.setFontSize(size);
  }

  private async getImageAsBase64(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = path;
  
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Preenche o fundo transparente com branco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
  
          // Desenha a imagem no canvas
          ctx.drawImage(img, 0, 0);
  
          // Converte para base64 em formato JPEG com compactação
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
        } else {
          reject('Canvas context not found');
        }
      };
  
      img.onerror = () => reject('Failed to load image');
    });
  }
  private generateTable(pdf: any, startX: number, currentY: number, head: string[], body: any[], columnWidths: number[], fontSize: number): number {
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(fontSize);
  
    // Adiciona a tabela
    autoTable(pdf, {
        startY: currentY + 5,
        margin: { left: startX, right: 110 },
        head: [head],
        body: body,
        theme: 'grid',
        styles: { fontSize: fontSize, cellPadding: 1 },
        headStyles: { fontSize: fontSize, fillColor: [0, 128, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: columnWidths.reduce((styles: any, width, index) => {
            styles[index] = { cellWidth: width };
            return styles;
        }, {}),
    });
  
    return (pdf as any).lastAutoTable.finalY + 10;
  }
  
}


