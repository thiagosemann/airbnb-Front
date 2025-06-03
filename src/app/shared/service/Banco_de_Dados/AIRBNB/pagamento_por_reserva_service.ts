import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { PagamentoReserva } from 'src/app/shared/utilitarios/pagamentoReserva';

@Injectable({
  providedIn: 'root'
})
export class PagamentoReservaService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /** Lista todos os pagamentos */
  getAllPagamentos(): Observable<PagamentoReserva[]> {
    return this.http.get<PagamentoReserva[]>(`${this.url}/pagamentos`, {
      headers: this.getHeaders()
    });
  }

  /** Busca pagamento por ID */
  getPagamentoById(id: number): Observable<PagamentoReserva> {
    return this.http.get<PagamentoReserva>(`${this.url}/pagamentos/${id}`, {
      headers: this.getHeaders()
    });
  }

  /** Cria um novo pagamento */
  createPagamento(payload: PagamentoReserva): Observable<{ pagamentoId: number }> {
    return this.http.post<{ pagamentoId: number }>(
      `${this.url}/pagamentos`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** Atualiza um pagamento existente */
  updatePagamento(id: number, payload: Partial<PagamentoReserva>): Observable<any> {
    return this.http.put(`${this.url}/pagamentos/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  /** Deleta um pagamento por ID */
  deletePagamento(id: number): Observable<any> {
    return this.http.delete(`${this.url}/pagamentos/${id}`, {
      headers: this.getHeaders()
    });
  }

  /** Busca por código de reserva */
  getByCodReserva(codReserva: string): Observable<PagamentoReserva[]> {
    return this.http.get<PagamentoReserva[]>(`${this.url}/pagamentos/reserva/${codReserva}`, {
      headers: this.getHeaders()
    });
  }

  /** Busca por lista de códigos de reserva */
  getByCodReservaList(lista: string[]): Observable<PagamentoReserva[]> {
    return this.http.post<PagamentoReserva[]>(
      `${this.url}/pagamentos/reservas/lista`,
      { lista },
      { headers: this.getHeaders() }
    );
  }

  /** Busca todos os pagamentos por apartamento_id */
  getByApartamentoId(apartamentoId: number): Observable<PagamentoReserva[]> {
    return this.http.get<PagamentoReserva[]>(
      `${this.url}/pagamentos/apartamento/${apartamentoId}`,
      { headers: this.getHeaders() }
    );
  }
}
