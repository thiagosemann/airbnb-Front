import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { Demanda } from 'src/app/shared/utilitarios/demanda';

@Injectable({
  providedIn: 'root'
})
export class DemandasService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // CRUD básico
  getAllDemandas(): Observable<Demanda[]> {
    return this.http.get<Demanda[]>(`${this.url}/demandas`, { headers: this.getHeaders() });
  }

  getDemandaById(id: number): Observable<Demanda> {
    return this.http.get<Demanda>(`${this.url}/demandas/${id}`, { headers: this.getHeaders() });
  }

  createDemanda(data: Partial<Demanda>): Observable<any> {
    return this.http.post(`${this.url}/demandas`, data, { headers: this.getHeaders() });
  }

  updateDemanda(id: number, patch: Partial<Demanda>): Observable<any> {
    return this.http.put(`${this.url}/demandas/${id}`, patch, { headers: this.getHeaders() });
  }

  deleteDemanda(id: number): Observable<any> {
    return this.http.delete(`${this.url}/demandas/${id}`, { headers: this.getHeaders() });
  }

  // Filtros
  getDemandasByResponsavel(userId: number): Observable<Demanda[]> {
    return this.http.get<Demanda[]>(`${this.url}/demandas/responsavel/${userId}`, { headers: this.getHeaders() });
  }

  getDemandasByUserCreated(userId: number): Observable<Demanda[]> {
    return this.http.get<Demanda[]>(`${this.url}/demandas/criador/${userId}`, { headers: this.getHeaders() });
  }

  getDemandasByPrazo(prazo: string): Observable<Demanda[]> {
    return this.http.get<Demanda[]>(`${this.url}/demandas/prazo/${prazo}`, { headers: this.getHeaders() });
  }

  getDemandasByStatus(status: string): Observable<Demanda[]> {
    return this.http.get<Demanda[]>(`${this.url}/demandas/status/${status}`, { headers: this.getHeaders() });
  }
}
