// src/app/shared/service/ticket-reembolso.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketReembolso, ResumoReembolsoRow, ResumoReembolsoFiltro } from 'src/app/shared/utilitarios/ticketReembolso';
import { environment } from 'enviroments';



@Injectable({
  providedIn: 'root'
})
export class TicketReembolsoService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /** Lista todos os tickets de reembolso */
  getAllReembolsos(): Observable<TicketReembolso[]> {
    return this.http.get<TicketReembolso[]>(`${this.url}/ticket-reembolso`, {
      headers: this.getHeaders()
    });
  }

  /** Resumo agregado de reembolsos por apartamento ou proprietário, para o fechamento mensal */
  getResumoReembolsos(filtro: ResumoReembolsoFiltro): Observable<ResumoReembolsoRow[]> {
    let params = new HttpParams()
      .set('periodo', filtro.periodo)
      .set('agrupamento', filtro.agrupamento);
    if (filtro.mes) {
      params = params.set('mes', filtro.mes);
    }
    if (filtro.status && filtro.status.length) {
      params = params.set('status', filtro.status.join(','));
    }
    return this.http.get<ResumoReembolsoRow[]>(`${this.url}/ticket-reembolso/resumo`, {
      headers: this.getHeaders(),
      params
    });
  }

  /** Primeiro mês com ticket de reembolso registrado, para popular o filtro de mês */
  getPeriodoDisponivelReembolso(): Observable<{ primeiroMes: string | null }> {
    return this.http.get<{ primeiroMes: string | null }>(`${this.url}/ticket-reembolso/periodo-disponivel`, {
      headers: this.getHeaders()
    });
  }

  /** Busca um ticket por ID (inclui arquivos) */
  getReembolsoById(id: number): Observable<TicketReembolso> {
    return this.http.get<TicketReembolso>(`${this.url}/ticket-reembolso/${id}`, {
      headers: this.getHeaders()
    });
  }

  /** Cria um novo ticket de reembolso (pode incluir arquivos) */
  createReembolso(payload: Omit<TicketReembolso, 'id' | 'files'>): Observable<{ message: string; insertId: number }> {
    return this.http.post<{ message: string; insertId: number }>(
      `${this.url}/ticket-reembolso`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** Atualiza um ticket existente (pode substituir arquivos) */
  updateReembolso(id: number, payload: Partial<TicketReembolso>): Observable<any> {
    return this.http.put(
      `${this.url}/ticket-reembolso/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** Deleta um ticket e seus arquivos */
  deleteReembolso(id: number): Observable<any> {
    return this.http.delete(
      `${this.url}/ticket-reembolso/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /** Busca um ticket por código de autorização (auth) */
  getReembolsoByAuth(auth: string): Observable<TicketReembolso> {
    return this.http.get<TicketReembolso>(`${this.url}/ticket-reembolso/auth/${auth}`, {
      headers: this.getHeaders()
    });
  }
  /** Aceite do proprietário para o reembolso */
  aceitarReembolsoProprietario(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.url}/ticket-reembolso/${id}/aceite-proprietario`,
      {}, // corpo vazio
      { headers: this.getHeaders() }
    );
  }

  /** Cria um arquivo para um ticket de reembolso */
  createArquivoReembolso(reembolso_id: number, imagemBase64: string, type: string) {
    return this.http.post<{ insertId: number }>(
      `${this.url}/ticket-reembolso/arquivo`,
      { reembolso_id, imagemBase64, type },
      { headers: this.getHeaders() }
    );
  }

  /** Atualiza um arquivo de ticket de reembolso */
  updateArquivoReembolso(id: number, fields: Partial<{ imagemBase64: string; type: string }>) {
    return this.http.put<{ message: string }>(
      `${this.url}/ticket-reembolso/arquivo/${id}`,
      fields,
      { headers: this.getHeaders() }
    );
  }

  /** Deleta um arquivo de ticket de reembolso */
  deleteArquivoReembolso(id: number) {
    return this.http.delete<{ message: string }>(
      `${this.url}/ticket-reembolso/arquivo/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
