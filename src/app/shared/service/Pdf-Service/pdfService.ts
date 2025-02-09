import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  // Configuração global para qualidade de imagens
CHART_SCALE = 1; // Reduz escala dos gráficos

constructor() {
  Chart.register(...registerables); // Registrar componentes do Chart.js
}

async generateCondoStatement(data: any): Promise<Blob> {
  let pdfBlob:any;
  if (data.summary.individualExpenses > 0){
     pdfBlob = this.pdfCompleto(data);
  }else{
    pdfBlob = this.pdfResumido1(data);
    
  }

  return pdfBlob;
}
async pdfResumido1(data: any): Promise<Blob>{
  console.log(data)
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true // Ativar compressão interna
   });
  const startX = 5;
  const logoPath = '../../../assets/images/logo-com-frase-V2.png';
  const logoWidth = 45;
  const logoHeight = 40;

  // Adiciona cabeçalho com logo e informações
  this.addHeader(pdf, logoPath, logoWidth, logoHeight, data);

  // Adiciona Resumo
  let currentY = this.addSummarySection(pdf, startX, data,14);
  let scale2 = [100, 100];
  currentY = this.addResumoMes(pdf, startX, currentY, data,scale2,20);
  // Adiciona Despesas Coletivas
  let totalValue = 0;
  let scale = [70, 25, 35, 35,35];
  [currentY,totalValue] = this.addCollectiveExpensesSection(pdf, startX, currentY, data,scale,20);
  
  let scale1 = [66, 66, 67];
  // Adiciona Fundos .
  currentY = this.addFundosSection(pdf, startX, currentY, data,totalValue,scale1,20);
  // Retorna o PDF como Blob
  let scale3 = [100, 100];
  currentY = this.addSaldosSection(pdf, startX, currentY, data,totalValue,scale3,20);
  // Retorna o PDF como Blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}


async pdfCompleto(data: any): Promise<Blob>{
  console.log(data)
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    compress: true // Ativar compressão interna
   });
  const startX = 5;
  const logoPath = '../../../assets/images/logo-com-frase-V2.png';
  const logoWidth = 45;
  const logoHeight = 40;
  const canvasWidth = 90 * 1.1;
  const canvasHeight = 70 * 1.1;

  // Adiciona cabeçalho com logo e informações
  this.addHeader(pdf, logoPath, logoWidth, logoHeight, data);

  // Adiciona a linha verde
  pdf.setDrawColor(0, 128, 0);
  pdf.setLineWidth(0.5);
  pdf.line(105, 45, 105, 290);

  // Adiciona Resumo
  let currentY = this.addSummarySection(pdf, startX, data,10);
  let scale2 = [45, 45];
  currentY = this.addResumoMes(pdf, startX, currentY, data,scale2,14);
  // Adiciona Despesas Individuais
  currentY = this.addIndividualExpensesSection(pdf, startX, currentY, data);

  // Adiciona Despesas Coletivas
  let totalValue=0;
  let scale = [30, 15, 15, 15,15];
  [currentY,totalValue] = this.addCollectiveExpensesSection(pdf, startX, currentY, data,scale,14);

  // Reinicia o Y
  currentY = 45;
  // Adiciona Provisões.
  currentY = this.addProvisionsSection(pdf, 110, currentY, data);

  // Adiciona Fundos .
  let scale1 = [66, 66, 67];
  currentY = this.addFundosSection(pdf, 110, currentY, data,totalValue,scale1,14);
  // Adiciona Saldos .
  let scale3 = [45, 45];
  currentY = this.addSaldosSection(pdf, 110, currentY, data,totalValue,scale3,14);

  // Adiciona nova página para os gráficos
  pdf.addPage();
  this.addHeaderPage2(pdf, logoPath, logoWidth, logoHeight, data);

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`A Forest está com um sistema novo, por isso nos próximos meses não serão incluídos os gráficos.`, 105, 45, { align: 'center' });
  pdf.text(`Estamos empenhados em melhorar o processo de prestação de contas e rateio. `, 105, 55, { align: 'center' });
  pdf.text(`Agradecemos a compreensão e colaboração de todos`, 105, 65, { align: 'center' });

  /*


  // Substituir a geração sequencial por Promise.all
  const [chart1, chart2, chart3, chart4] = await Promise.all([
    this.generateDonutChart(data.individualExpenses),
    this.generateChartAguaGas(data.individualExpensesHistory, 'Água (m³)'),
    this.generateChartAguaGas(data.individualExpensesHistory, 'Gás (m³)'),
    this.generateCondominioHistoryChart(data.rateiosPorApartamentoId)
  ]);
  // Adiciona os gráficos na nova página
  pdf.setFontSize(12);
  
  // Gráfico de Despesas Individuais (Donut)
  pdf.text('Despesas Individuais', 5, 50);
  pdf.addImage(chart1, 'JPEG', 5, 55, canvasWidth, canvasHeight, undefined, 'FAST');

  // Gráfico Histórico de Condomínios (abaixo do Donut)
  pdf.text('Histórico de Condomínio por Mês', 5, 140);
  pdf.addImage(chart4, 'JPEG', 5, 145, canvasWidth, canvasHeight, undefined, 'FAST');

  // Gráficos de Água e Gás (direita)
  pdf.text('Consumo de água (m3)', 110, 50);
  pdf.addImage(chart2, 'JPEG', 105, 55, canvasWidth, canvasHeight, undefined, 'FAST');

  pdf.text('Consumo de gás (m3)', 110, 140);
  pdf.addImage(chart3, 'JPEG', 105, 145, canvasWidth, canvasHeight, undefined, 'FAST');


  // Retorna o PDF como Blob
  */
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}


private addHeader(pdf: any, logoPath: string, logoWidth: number, logoHeight: number, data: any): void {
    pdf.addImage(logoPath, 'PNG', 82.5, -5, logoWidth, logoHeight);
    pdf.setFontSize(20);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`Nome do Prédio`, 105, 30, { align: 'center' });
    pdf.text(`Mês: ${data.month} | Apartamento: ${data.apartment} | Total: R$ ${data.condoTotal.toFixed(2)}`, 105, 35, { align: 'center' });

}

private addHeaderPage2(pdf: any, logoPath: string, logoWidth: number, logoHeight: number, data: any): void {
  pdf.addImage(logoPath, 'PNG', 82.5, -5, logoWidth, logoHeight);
  pdf.setFontSize(20);
  pdf.setFont('Helvetica', 'bold');
 // pdf.setFontSize(14);
 // pdf.text(`Demonstrativo dos seus gastos individuais para o mês  ${data.month}`, 105, 35, { align: 'center' });
  //pdf.setDrawColor(0, 128, 0);
 // pdf.setLineWidth(0.5);
  //pdf.line(105, 50, 105, 290);
}

private addSummarySection(pdf: any, startX: number, data: any,fontSize:number): number {
  let currentY = 45;
  // Adiciona os textos estáticos
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(fontSize);
  pdf.text('Sua Fração ideal:', startX, currentY);
  pdf.text('Fração garagem:', 60, currentY);
  currentY += 5;
  pdf.text(data.apt_fracao, startX, currentY);
  pdf.text(data.vagas_fracao, 60, currentY);
  currentY += 10;
  
  return currentY

}

private addResumoMes(pdf: any, startX: number, currentY: number, data: any,scale:number[],fontSize:number): number {
  // Adiciona o título "Resumo"
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text('Resumo', startX, currentY);
  currentY += 2;


  // Cria as linhas da tabela condicionalmente
  const tableRows = [];
  
  // Adiciona Despesas Individuais apenas se o valor for maior que zero
  if (data.summary.individualExpenses > 0) {
    tableRows.push(
      ['Despesas Individuais', `R$ ${data.summary.individualExpenses.toFixed(2)}`],
      ['Despesas Coletivas', `R$ ${data.summary.collectiveExpenses.toFixed(2)}`],
      ['Seu Condomínio', `R$ ${data.summary.totalCondo.toFixed(2)}`]
    );
  }else{
    tableRows.push(
      ['Seu Condomínio', `R$ ${data.summary.totalCondo.toFixed(2)}`]
    );
  }



  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(
    pdf,
    startX,
    currentY,
    ['Categoria', 'Valor'],
    tableRows,
    [scale[0], scale[1]],
    fontSize-8
  );

  return currentY;
}


private addIndividualExpensesSection(pdf: any, startX: number, currentY: number, data: any): number {
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Despesas Individuais', startX, currentY);
  currentY += 2;
  pdf.setFontSize(10);
  pdf.setFont('Helvetica', 'normal');
  // Calcula o total das despesas individuais
  const totalIndividualExpenses = data.individualExpenses.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.value) || 0);
  }, 0);

  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(pdf, startX, currentY , 
      ['Categoria', 'Valor'], 
      [
          ...data.individualExpenses.map((item: any) => [
              item.category,
              `R$ ${parseFloat(item.value || '0').toFixed(2)}`
          ]),
          // Adiciona o item "Total" ao final da tabela
          [
              { content: 'Total', styles: { fontStyle: 'bold' } },
              { content: `R$ ${totalIndividualExpenses.toFixed(2)}`, styles: { fontStyle: 'bold' } },
          ]
      ], 
      [45, 45], 6);

  return currentY;
}


private addCollectiveExpensesSection(pdf: any, startX: number, currentY: number, data: any, scale:number[],fontSize:number): [number, number] {
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text('Despesas Coletivas', startX, currentY);
  currentY += 2;
  pdf.setFontSize(fontSize-4);
  pdf.setFont('Helvetica', 'normal');


  // Agrupar e somar os valores pelo mesmo tipo_Gasto_Extra
  const groupedExpenses = data.collectiveExpenses.reduce((acc: any, item: any) => {
    const existing = acc.find((exp: any) => exp.tipo_Gasto_Extra === item.tipo_Gasto_Extra);
    if (existing) {
      existing.valor +=  Number(item.valor) ; // Soma apenas se o tipo for "Rateio"
    } else {
      acc.push({ 
        tipo_Gasto_Extra: item.tipo_Gasto_Extra, 
        valor:  Number(item.valor) , // Soma apenas se o tipo for "Rateio"
        tipo: item.tipo 
      });
    }
    return acc;
  }, []);

  // Filtrar itens que não são do tipo "Provisão"
  const filteredExpenses = groupedExpenses.filter((item: any) => item.tipo !== "Provisão");

  // Calcula o total dos valores (apenas tipos "Rateio")
  const totalValueRateado = filteredExpenses
    .filter((item: any) => item.tipo === "Rateio") // Considera apenas "Rateio"
    .reduce((sum: number, item: any) => sum + item.valor, 0);

    const totalValue = filteredExpenses.reduce((sum: number, item: any) => sum + item.valor, 0);
  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(
    pdf,
    startX,
    currentY,
    ['Categoria', 'Tipo', 'Valor','Rateado', 'Sua Fração'],
    [
      ...filteredExpenses.map((item: any) => [
        item.tipo_Gasto_Extra,
        item.tipo,
        `R$ ${item.valor.toFixed(2)}`,
        item.tipo === "Rateio" ? `R$ ${(item.valor).toFixed(2)}` : `R$ 0,00`,
        item.tipo === "Rateio" ? `R$ ${(item.valor * data.fracao_total).toFixed(2)}` : `R$ 0,00` // Fração zero se não for "Rateio"
      ]),
      // Adiciona o item "Total" ao final da tabela
      [
        { content: 'Total',colSpan:2, styles: { fontStyle: 'bold', halign: 'center' } }, // Ocupa 2 colunas
        { content: `R$ ${totalValue.toFixed(2)}`, styles: { fontStyle: 'bold' } },
        { content: `R$ ${totalValueRateado.toFixed(2)}`, styles: { fontStyle: 'bold' } },
        { content: `R$ ${(totalValueRateado * data.fracao_total).toFixed(2)}`, styles: { fontStyle: 'bold' } },
      ]
    ],
    [scale[0], scale[1], scale[2], scale[3],scale[4]], // Largura das colunas
    fontSize-8
  );

  return [currentY, totalValue];
}



private addProvisionsSection(pdf: any, startX: number, currentY: number, data: any): number {
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Provisões', startX, currentY);
  currentY += 5;
  pdf.setFontSize(10);
  pdf.setFont('Helvetica', 'normal');
  pdf.text('Resumo das provisões do condomínio.', startX, currentY);

  // Calcula o total das provisoes
  const totalProvisoes = data.provisoes.reduce((sum: number, item: any) => {
    return sum + (Number(item.valor)/ Number(item.frequencia) || 0);
  }, 0);

  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(pdf, startX, currentY , 
      ['Categoria', 'Valor Mensal', 'Sua Fração'],
      [
          ...data.provisoes.map((item: any) => [
              item.detalhe,
              `R$ ${(Number(item.valor)/ Number(item.frequencia)).toFixed(2)}`,
              `R$ ${((Number(item.valor)/ Number(item.frequencia)) * data.fracao_total).toFixed(2)}`
          ]),
          // Adiciona o item "Total" ao final da tabela
          [
              { content: 'Total', styles: { fontStyle: 'bold' } },
              { content: `R$ ${totalProvisoes.toFixed(2)}`, styles: { fontStyle: 'bold' } },
              { content: `R$ ${(totalProvisoes * data.fracao_total).toFixed(2)}`, styles: { fontStyle: 'bold' } },

          ]
      ], 
      [30, 30, 30], 6);

  return currentY;
}

private addFundosSection(pdf: any, startX: number, currentY: number, data: any, totalValue:number,scale:number[],fontSize:number): number {
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text('Fundos ', startX, currentY);
  currentY += 2;
  pdf.setFontSize(fontSize-4);
  pdf.setFont('Helvetica', 'normal');

  // Calcula o total das provisoes
  const totalFundos = data.fundos.reduce((sum: number, item: any) => {
    return sum + (Number(item.porcentagem)* totalValue || 0);
  }, 0);

  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(pdf, startX, currentY , 
      ['Categoria', 'Valor Mensal', 'Sua Fração'],
      [
          ...data.fundos.map((item: any) => [
              item.tipo_fundo,
              `R$ ${(Number(item.porcentagem)* totalValue).toFixed(2)}`,
              `R$ ${((Number(item.porcentagem)* totalValue) * data.fracao_total).toFixed(2)}`
          ]),
          // Adiciona o item "Total" ao final da tabela
          [
              { content: 'Total', styles: { fontStyle: 'bold' } },
              { content: `R$ ${totalFundos.toFixed(2)}`, styles: { fontStyle: 'bold' } },
              { content: `R$ ${(totalFundos * data.fracao_total).toFixed(2)}`, styles: { fontStyle: 'bold' } },

          ]
      ], 
      [scale[0], scale[1], scale[2]], fontSize-8);

  return currentY;
}

private addSaldosSection(pdf: any, startX: number, currentY: number, data: any, totalValue: number,scale:number[],fontSize:number): number {
  // Configurações iniciais de fonte e título
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text('Saldos Bancários', startX, currentY);
  currentY += 2;


  // Acessa os saldos em data.saldosPredios
  const sortedSaldos = [...data.saldosPredios].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const latestConta = sortedSaldos.find((item) => item.type === 'conta');
  const latestInvestimento1 = sortedSaldos.find((item) => item.type === 'investimento1');
  const latestInvestimento2 = sortedSaldos.find((item) => item.type === 'investimento2');

  const contaValue = latestConta ? parseFloat(latestConta.valor) : 0;
  const investimento1Value = latestInvestimento1 ? parseFloat(latestInvestimento1.valor) : 0;
  const investimento2Value = latestInvestimento2 ? parseFloat(latestInvestimento2.valor) : 0;

  // Cria a tabela utilizando a função auxiliar
  currentY = this.generateTable(
    pdf,
    startX,
    currentY ,
    ['Categoria', 'Valor'],
    [
      [
        { content: 'Conta Corrente', styles: { fontStyle: 'bold' } },
        { content: `R$ ${contaValue.toFixed(2)}`, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Tipo de Investimento 1', styles: { fontStyle: 'bold' } },
        { content: `R$ ${investimento1Value.toFixed(2)}`, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Tipo de Investimento 2', styles: { fontStyle: 'bold' } },
        { content: `R$ ${investimento2Value.toFixed(2)}`, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Total', styles: { fontStyle: 'bold' } },
        { content: `R$ ${(Number(contaValue)+Number(investimento1Value)+Number(investimento2Value)).toFixed(2)}`, styles: { fontStyle: 'bold' } },

    ]
    ],
    [scale[0], scale[1]],fontSize-8
  );

  return currentY;
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



  private generateChartAguaGas(data: any[], title: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const scale = this.CHART_SCALE; // Aumentar a resolução para 10x
        canvas.width = 400 * scale;
        canvas.height = 300 * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject('Erro ao criar contexto do canvas.');
            return;
        }

        // Determinar o campo de dados e a cor com base no título
        const dataField = title === 'Água (m³)' ? 'aguaM3' : 'gasM3';
        const borderColor = title === 'Água (m³)' ? '#3498db' : '#f1c40f'; // Azul para água, amarelo para gás
        const backgroundColor = title === 'Água (m³)'
            ? 'rgba(52, 152, 219, 0.5)' // Azul claro
            : 'rgba(241, 196, 15, 0.5)'; // Amarelo claro

        const chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((item) => this.getMonthTwoDigits(item.data_gasto)), // Labels com o número do mês
                datasets: [
                    {
                        label: title,
                        data: data.map((item) => item[dataField]), // Valores do consumo de água ou gás
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        fill: true,
                        tension: 0.4, // Curvatura das linhas
                    },
                ],
            },
            options: {
                responsive: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14 * scale, // Tamanho da fonte da legenda
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Mês',
                            font: {
                                size: 14 * scale, // Tamanho do título do eixo X
                            },
                        },
                        ticks: {
                            font: {
                                size: 10 * scale, // Tamanho dos rótulos do eixo X
                            },
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            font: {
                                size: 14 * scale, // Tamanho do título do eixo Y
                            },
                        },
                        ticks: {
                            font: {
                                size: 10 * scale, // Tamanho dos rótulos do eixo Y
                            },
                        },
                        beginAtZero: true,
                    },
                },
                animation: {
                    onComplete: () => {
                        resolve(canvas.toDataURL('image/png'));
                        chartInstance.destroy(); // Destruir gráfico após a criação
                    },
                },
            },
        });
    });
}

private generateCondominioHistoryChart(data: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const scale = this.CHART_SCALE;
      canvas.width = 400 * scale;
      canvas.height = 300 * scale;
      // Adicionar este código para todos os gráficos:
      canvas.style.imageRendering = 'optimizeQuality'; // Melhora a qualidade em baixa resolução
      canvas.getContext('2d')!.imageSmoothingEnabled = true;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
          reject('Erro ao criar contexto do canvas.');
          return;
      }

      // Ordenar dados por data
      const sortedData = data.slice().sort((a, b) => {
          const dateA = new Date(`${a.ano}-${a.mes}-01`);
          const dateB = new Date(`${b.ano}-${b.mes}-01`);
          return dateA.getTime() - dateB.getTime();
      });

      const labels = sortedData.map(item => `${String(item.mes).padStart(2, '0')}/${item.ano}`);
      const valores = sortedData.map(item => parseFloat(item.valor));

      const chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
              labels: labels,
              datasets: [{
                  label: 'Valor do Condomínio (R$)',
                  data: valores,
                  borderColor: '#2ecc71',
                  backgroundColor: 'rgba(46, 204, 113, 0.2)',
                  fill: true,
                  tension: 0.4,
              }]
          },
          options: {
              responsive: false,
              plugins: {
                  legend: {
                      display: true,
                      position: 'top',
                      labels: {
                          font: { size: 14 * scale },
                      },
                  },
              },
              scales: {
                  x: {
                      title: {
                          display: true,
                          text: 'Mês',
                          font: { size: 14 * scale },
                      },
                      ticks: { font: { size: 10 * scale } },
                  },
                  y: {
                      title: {
                          display: false,
                          text: 'Valor (R$)',
                          font: { size: 14 * scale },
                      },
                      ticks: {
                          font: { size: 10 * scale },
                          callback: (value) => `R$ ${value}`,
                      },
                      beginAtZero: true,
                  },
              },
              animation: {
                  onComplete: () => {
                      resolve(canvas.toDataURL('image/png'));
                      chartInstance.destroy();
                  },
              },
          },
      });
  });
}

private generateDonutChart(data: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = this.CHART_SCALE; // Aumentar a resolução para 10x
    canvas.width = 400 * scale;
    canvas.height = 300 * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject('Erro ao criar contexto do canvas.');
      return;
    }

    // Filtrar despesas individuais com valores maiores que 0
    const filteredData = data.filter((item) => item.value > 0);

    // Gerar cores em tons de verde
    const generateGreenTones = (count: number) => {
      const tones = [];
      for (let i = 0; i < count; i++) {
        const intensity = Math.floor(128 + (i * 127) / count); // Gera valores de 128 a 255
        tones.push(`rgba(0, ${intensity}, 0, 0.75)`); // Tons de verde com opacidade de 0.8
      }
      return tones;
    };

    const labels = filteredData.map((item) => item.category);
    const values = filteredData.map((item) => item.value);
    const colors = generateGreenTones(values.length);

    const chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#ffffff', // Bordas brancas para destacar as divisões
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 14 * scale, // Tamanho da fonte da legenda
              },
              color: '#000000', // Cor preta para os textos da legenda
              padding: 30, // Aumenta o espaçamento entre as legendas
              boxWidth: 20 * scale, // Aumenta o tamanho do marcador
              boxHeight: 10 * scale, // Ajusta a altura do marcador
            }
          },
        },
        animation: {
          onComplete: () => {
            resolve(canvas.toDataURL('image/png'));
            chartInstance.destroy(); // Destruir gráfico após a criação
          },
        },
      },
    });
  });
}

 getMonthTwoDigits(dateString:string) :string{
  // Converte a string em um objeto Date
  const date = new Date(dateString);

  // Extrai o mês (adiciona 1 porque os meses começam em 0)
  const month = date.getUTCMonth() + 1;

  // Retorna o mês com dois dígitos
  return month.toString().padStart(2, '0');
}

}
