import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { NpsLimpeza, CreateNpsLimpezaPayload } from 'src/app/shared/utilitarios/npsLimpeza';

@Injectable({
  providedIn: 'root'
})
export class NpsLimpezaService {
  private apiUrl = `${environment.backendUrl}/nps-limpezas`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // GET /nps-limpezas
  getAll(): Observable<NpsLimpeza[]> {
    return this.http.get<NpsLimpeza[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // GET /nps-limpezas/:id
  getById(id: number): Observable<NpsLimpeza> {
    return this.http.get<NpsLimpeza>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // GET /nps-limpezas/apartamento/:apartamentoId
  getByApartamentoId(apartamentoId: number): Observable<NpsLimpeza[]> {
    return this.http.get<NpsLimpeza[]>(`${this.apiUrl}/apartamento/${apartamentoId}`, { headers: this.getHeaders() });
  }

  // GET /nps-limpezas/user/:userId
  getByUserId(userId: number): Observable<NpsLimpeza[]> {
    return this.http.get<NpsLimpeza[]>(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders() });
  }

  // POST /nps-limpezas
  create(payload: CreateNpsLimpezaPayload): Observable<{ insertId: number }> {
    return this.http.post<{ insertId: number }>(this.apiUrl, payload, { headers: this.getHeaders() });
  }

  // PUT /nps-limpezas/:id
  update(id: number, payload: Partial<CreateNpsLimpezaPayload>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  // DELETE /nps-limpezas/:id
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
