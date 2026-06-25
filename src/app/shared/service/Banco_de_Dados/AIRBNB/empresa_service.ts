import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

export interface Empresa {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Lista as empresas ativas (para seleção no cadastro de terceirizados)
  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.url}/empresas`, { headers: this.getHeaders() });
  }
}
