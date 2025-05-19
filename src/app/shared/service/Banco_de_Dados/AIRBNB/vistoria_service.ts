// src/app/shared/service/vistoria.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { Vistoria } from 'src/app/shared/utilitarios/vistoria';

@Injectable({
  providedIn: 'root'
})
export class VistoriaService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /** Lista todas as vistorias (com todos os campos de checklist) */
  getAllVistorias(): Observable<Vistoria[]> {
    return this.http.get<Vistoria[]>(`${this.url}/vistorias`, {
      headers: this.getHeaders()
    });
  }

  /** Busca uma vistoria por ID */
  getVistoriaById(id: number): Observable<Vistoria> {
    return this.http.get<Vistoria>(`${this.url}/vistorias/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Cria uma nova vistoria.
   * payload deve conter:
   *  - apartamento_id, user_id, data, observacoes_gerais?
   *  - e todos os campos booleanos e de observação do checklist
   */
  createVistoria(payload: Vistoria): Observable<{ vistoriaId: number }> {
    return this.http.post<{ vistoriaId: number }>(
      `${this.url}/vistorias`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Atualiza uma vistoria existente.
   * payload pode ser parcial, incluindo qualquer campo de Vistoria.
   */
  updateVistoria(id: number, payload: Partial<Vistoria>): Observable<any> {
    return this.http.put(
      `${this.url}/vistorias/${id}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /** Deleta uma vistoria pelo ID */
  deleteVistoria(id: number): Observable<any> {
    return this.http.delete(
      `${this.url}/vistorias/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
