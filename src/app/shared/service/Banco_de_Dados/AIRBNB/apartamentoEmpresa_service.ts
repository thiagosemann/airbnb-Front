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
}
