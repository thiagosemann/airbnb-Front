import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { TerceirizadoDisponibilidade } from 'src/app/shared/utilitarios/terceirizadoDisponibilidade';

@Injectable({ providedIn: 'root' })
export class TerceirizadoDisponibilidadeService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getAll(): Observable<TerceirizadoDisponibilidade[]> {
    return this.http.get<TerceirizadoDisponibilidade[]>(`${this.url}/tercerizado-disponibilidade`, { headers: this.getHeaders() });
  }

  getByUser(userId: number): Observable<TerceirizadoDisponibilidade[]> {
    return this.http.get<TerceirizadoDisponibilidade[]>(`${this.url}/tercerizado-disponibilidade/user/${userId}`, { headers: this.getHeaders() });
  }

  create(data: TerceirizadoDisponibilidade): Observable<any> {
    return this.http.post(`${this.url}/tercerizado-disponibilidade`, data, { headers: this.getHeaders() });
  }

  update(id: number, data: TerceirizadoDisponibilidade): Observable<any> {
    return this.http.put(`${this.url}/tercerizado-disponibilidade/${id}`, data, { headers: this.getHeaders() });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/tercerizado-disponibilidade/${id}`, { headers: this.getHeaders() });
  }
}
