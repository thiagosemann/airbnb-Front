import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { Provisionamento, ProvisionamentoResumoRow } from 'src/app/shared/utilitarios/provisionamento';

export interface ProvisionamentoFiltro {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
  tipo?: 'entrada' | 'saida';
}

@Injectable({
  providedIn: 'root'
})
export class ProvisionamentoService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private buildParams(filtro: ProvisionamentoFiltro = {}): HttpParams {
    let params = new HttpParams();
    if (filtro.dataInicio) params = params.set('dataInicio', filtro.dataInicio);
    if (filtro.dataFim) params = params.set('dataFim', filtro.dataFim);
    if (filtro.tipo) params = params.set('tipo', filtro.tipo);
    return params;
  }

  getAll(filtro: ProvisionamentoFiltro = {}): Observable<Provisionamento[]> {
    return this.http.get<Provisionamento[]>(`${this.url}/provisionamentos`, {
      headers: this.getHeaders(),
      params: this.buildParams(filtro)
    });
  }

  getResumo(filtro: ProvisionamentoFiltro = {}): Observable<ProvisionamentoResumoRow[]> {
    return this.http.get<ProvisionamentoResumoRow[]>(`${this.url}/provisionamentos/resumo`, {
      headers: this.getHeaders(),
      params: this.buildParams(filtro)
    });
  }

  getById(id: number): Observable<Provisionamento> {
    return this.http.get<Provisionamento>(`${this.url}/provisionamentos/${id}`, {
      headers: this.getHeaders()
    });
  }

  create(data: Partial<Provisionamento>): Observable<{ message: string; insertId: number }> {
    return this.http.post<{ message: string; insertId: number }>(
      `${this.url}/provisionamentos`,
      data,
      { headers: this.getHeaders() }
    );
  }

  update(id: number, patch: Partial<Provisionamento>): Observable<any> {
    return this.http.put(`${this.url}/provisionamentos/${id}`, patch, { headers: this.getHeaders() });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/provisionamentos/${id}`, { headers: this.getHeaders() });
  }
}
