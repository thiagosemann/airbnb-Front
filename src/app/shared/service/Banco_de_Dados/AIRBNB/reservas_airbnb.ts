import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Injectable({
  providedIn: 'root'
})
export class ReservasAirbnbService {
  private apiUrl = environment.backendUrl + '/reservas-airbnb';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': 'Bearer ' + token });
  }

  // Novos métodos adicionados
  getReservasHoje(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/hoje`,
      { headers: this.getHeaders() }
    );
  }
    getReservasAmanha(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/amanha`,
      { headers: this.getHeaders() }
    );
  }

  getProximasReservas(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/proximas`,
      { headers: this.getHeaders() }
    );
  }

  getReservasFinalizadas(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/finalizadas`,
      { headers: this.getHeaders() }
    );
  }

  // Novo método para reservas em andamento
  getReservasEmAndamento(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/em-andamento`, // Endpoint correspondente
      { headers: this.getHeaders() }
    );
  }

  // Métodos existentes mantidos abaixo
  getReservasPorPeriodo(startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(`${this.apiUrl}/periodo`, {
      headers: this.getHeaders(),
      params
    });
  }

  getAllReservas(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getReservaById(id: number): Observable<ReservaAirbnb> {
    return this.http.get<ReservaAirbnb>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getReservasByApartamentoId(apartamentoId: number): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/apartamentos/${apartamentoId}`,
      { headers: this.getHeaders() }
    );
  }

  createReserva(reserva: ReservaAirbnb): Observable<ReservaAirbnb> {
    return this.http.post<ReservaAirbnb>(this.apiUrl, reserva, { headers: this.getHeaders() });
  }

  updateReserva(reserva: ReservaAirbnb): Observable<ReservaAirbnb> {
    return this.http.put<ReservaAirbnb>(
      `${this.apiUrl}/${reserva.id}`,
      reserva,
      { headers: this.getHeaders() }
    );
  }

  deleteReserva(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}