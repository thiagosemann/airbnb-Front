import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver'; // Importando corretamente

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

exportToExcel(data: any[], fileName: string) {
    // Criar uma planilha a partir dos dados fornecidos
  
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data, {
      header: [
        "Apartamento", "Água(m3)", "Gás(m3)","Lazer", "Lavanderia", "Multa"]
    });
    // Definir largura de coluna para a coluna A (Apartamento) como 20
    const columnWidths = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]; // Definir larguras para cada coluna, você pode ajustar conforme necessário

    // Aplicar as larguras das colunas
    worksheet['!cols'] = columnWidths;

    // Criar o livro de trabalho
    const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };

    // Converter o livro de trabalho em uma matriz de bytes
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Criar um blob a partir dos bytes
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Salvar o arquivo
    FileSaver.saveAs(blob, fileName + '.xlsx');
}

downloadModelUsersLote(): void {
  // Definir o cabeçalho do arquivo Excel (sem valores, apenas o cabeçalho)
  const headers = [
      ['first_name', 'last_name', 'cpf', 'email']
  ];

  // Criar uma planilha a partir dos cabeçalhos (sem dados)
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(headers);

  // Criar o workbook (livro de trabalho) e adicionar a planilha
  const workbook: XLSX.WorkBook = { Sheets: { 'Usuários': worksheet }, SheetNames: ['Usuários'] };

  // Converter o workbook em um buffer do Excel
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Criar um Blob a partir do buffer e definir o tipo de arquivo
  const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Usar o FileSaver para salvar o arquivo no navegador
  FileSaver.saveAs(data, 'usuario_modelo.xlsx');
}
downloadModelApartamentosLote(building: any): void {
  // Definir o cabeçalho do arquivo Excel
  const headers = [
      ['Numero' ,'Nome', 'Bloco', 'Fracao']
  ];

  // Criar as linhas para os apartamentos
  const rows = [];
  if (building && building.qnt_Apartamentos) {
      for (let i = 1; i <= Number(building.qnt_Apartamentos); i++) {
          rows.push([i, '', '', '']);
      }
  }

  // Combinar cabeçalho e linhas
  const data = [...headers, ...rows];

  // Criar uma planilha a partir dos dados
  const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);

  // Criar o workbook (livro de trabalho) e adicionar a planilha
  const workbook: XLSX.WorkBook = { Sheets: { 'Apartamentos': worksheet }, SheetNames: ['Apartamentos'] };

  // Converter o workbook em um buffer do Excel
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Criar um Blob a partir do buffer e definir o tipo de arquivo
  const blob: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Usar o FileSaver para salvar o arquivo no navegador
  FileSaver.saveAs(blob, 'apartamento_modelo.xlsx');
}

  
  
}
