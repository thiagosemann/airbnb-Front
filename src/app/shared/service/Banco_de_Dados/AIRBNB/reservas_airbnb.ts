import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class ReservasAirbnbService {
  private apiUrl = `${environment.backendUrl}/reservas-airbnb`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Filtros de faxina
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

  getReservasEmAndamento(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/em-andamento`,
      { headers: this.getHeaders() }
    );
  }

  // Novos filtros de faxina
  getReservasEncerraHoje(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/encerra-hoje`,
      { headers: this.getHeaders() }
    );
  }

  getReservasEncerraSemana(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/encerra-semana`,
      { headers: this.getHeaders() }
    );
  }
  getReservasEncerraSemanaQueVem(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(`${this.apiUrl}/filtro/encerra-semana-que-vem`, { headers: this.getHeaders() });
  }
  
  getFaxinasFuturasUmMes(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/filtro/futuras-um-mes`,
      { headers: this.getHeaders() }
    );
  }

  // Métodos existentes mantidos
  getReservasPorPeriodo(startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/por-periodo`, // ajustado para rotas do backend
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  getAllReservas(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getReservaById(id: number): Observable<ReservaAirbnb> {
    return this.http.get<ReservaAirbnb>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getReservasByApartamentoId(apartamentoId: number): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/apartamentos/${apartamentoId}`,
      { headers: this.getHeaders() }
    );
  }

  createReserva(reserva: ReservaAirbnb): Observable<ReservaAirbnb> {
    return this.http.post<ReservaAirbnb>(
      this.apiUrl,
      reserva,
      { headers: this.getHeaders() }
    );
  }

  updateReserva(reserva: ReservaAirbnb): Observable<ReservaAirbnb> {
    return this.http.put<ReservaAirbnb>(
      `${this.apiUrl}/${reserva.id}`,
      reserva,
      { headers: this.getHeaders() }
    );
  }

  deleteReserva(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
