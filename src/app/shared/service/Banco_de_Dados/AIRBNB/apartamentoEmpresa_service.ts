import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { User } from 'src/app/shared/utilitarios/user';

export interface VinculoApartamentoEmpresa {
  apartamento_id: number;
  empresa_id: number;
  empresa_nome: string;
}

export interface EmpresaComAcesso {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApartamentoEmpresaService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Vínculos apartamento-empresa visíveis (cada apartamento traz todas as empresas que atuam nele)
  getVinculos(): Observable<VinculoApartamentoEmpresa[]> {
    return this.http.get<VinculoApartamentoEmpresa[]>(
      `${this.url}/apartamentos-empresa/vinculos`,
      { headers: this.getHeaders() }
    );
  }

  // Terceirizados das empresas vinculadas aos apartamentos visíveis (cada um com empresa_nome)
  getTerceirizados(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.url}/apartamentos-empresa/terceirizados`,
      { headers: this.getHeaders() }
    );
  }

  // Empresas com acesso ativo a um apartamento
  getEmpresasDoApartamento(apartamentoId: number): Observable<EmpresaComAcesso[]> {
    return this.http.get<EmpresaComAcesso[]>(
      `${this.url}/apartamentos-empresa/empresas/${apartamentoId}`,
      { headers: this.getHeaders() }
    );
  }

  // Concede acesso de uma empresa secundária ao apartamento.
  // O backend só aceita quando a empresa logada é a dona do apartamento.
  vincularEmpresa(apartamentoId: number, empresaId: number): Observable<any> {
    return this.http.post(
      `${this.url}/apartamentos-empresa`,
      { apartamento_id: apartamentoId, empresa_id: empresaId },
      { headers: this.getHeaders() }
    );
  }

  // Revoga o acesso de uma empresa secundária ao apartamento
  desvincularEmpresa(apartamentoId: number, empresaId: number): Observable<any> {
    return this.http.delete(
      `${this.url}/apartamentos-empresa`,
      {
        headers: this.getHeaders(),
        body: { apartamento_id: apartamentoId, empresa_id: empresaId }
      }
    );
  }
}
