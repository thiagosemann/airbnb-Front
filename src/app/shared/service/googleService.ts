import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class GoogleScriptService {
  
  private apiUrlDados = environment.backendUrl + '/enviar-dados';
  private apiUrlImagem = environment.backendUrl + '/enviar-imagem';
  private apiUrlPDF = environment.backendUrl + '/enviar-pdf';

  constructor(private http: HttpClient) { }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': 'Bearer ' + token });
  }
 
  //Envia os dados para o Google Script
  enviarDados(cod_reserva: string, CPF: string, Nome: string, Telefone: string): Observable<any> {
    const dados = { cod_reserva, CPF, Nome, Telefone };
    console.log('Enviando dados para o backend:', dados);
    return this.http.post(this.apiUrlDados, dados, { headers: this.getHeaders() });
  }

  //Envia a imagem (Base64) para o Google Script
  enviarImagem(imagemBase64: string,cod_reserva: string, CPF: string ,tipo:string): Observable<any> {
    const dados = { imagemBase64,cod_reserva,CPF,tipo };
    console.log('Enviando imagem para o backend:', dados);
    return this.http.post(this.apiUrlImagem, dados, { headers: this.getHeaders() });
  }

  //Envia o PDF (Base64) para o Google Script
  enviarPDF(documentBase64: string,cod_reserva: string, CPF: string): Observable<any> {
    const dados = { documentBase64,cod_reserva,CPF };
    console.log('Enviando PDF para o backend:', dados);
    return this.http.post(this.apiUrlPDF, dados, { headers: this.getHeaders() });
  }
}