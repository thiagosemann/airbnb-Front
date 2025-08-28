import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class CheckInFormService {

  private apiUrl = environment.backendUrl + '/checkins';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Listar todos os check-ins
  getAllCheckins(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obter check-in por ID
  getCheckinById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Obter check-ins por reservaId
  getCheckinsByReservaId(reservaId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reserva/${reservaId}`, { headers: this.getHeaders() });
  }

  // Obter check-in por reservaId e codReserva
  getCheckinByReservaIdOrCodReserva(reservaId: string, codReserva: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search/${reservaId}/${codReserva}`, { headers: this.getHeaders() });
  }

  // Obter check-ins por userId
  getCheckinsByUserId(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders() });
  }

  // Criar um novo check-in
  createCheckin(checkinData: any): Observable<any> {
    return this.http.post(this.apiUrl, checkinData, { 
      headers: this.getHeaders().set('Content-Type', 'application/json')
    });
  }

  // Atualizar um check-in por ID
  updateCheckin(id: string, checkinData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, checkinData, { headers: this.getHeaders() });
  }

  // Deletar um check-in por ID
  deleteCheckin(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Enviar lista de check-ins para WhatsApp
  envioPorCheckins(checkinIds: number[]): Observable<any> {
    const payload = { checkinIds };
    return this.http.post(
      `${this.apiUrl}/envio`,
      payload,
      { headers: this.getHeaders().set('Content-Type', 'application/json') }
    );
  }
}