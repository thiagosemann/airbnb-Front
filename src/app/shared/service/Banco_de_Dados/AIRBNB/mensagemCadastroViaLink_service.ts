import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class CadastroMensagemViaLinkService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  enviarMensagemCadastro(reservaId:number): Observable<any> {
    return this.http.post(
      `${this.url}/mensagem-cadastro-link`,
      { reservaId },
      { headers: this.getHeaders() }
    );
  }
}