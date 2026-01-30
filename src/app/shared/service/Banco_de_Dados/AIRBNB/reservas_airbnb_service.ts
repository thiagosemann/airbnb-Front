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



  // Métodos existentes mantidos
  getFaxinasPorPeriodo(inicio_end_data: string, fim_end_date: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', inicio_end_data)
      .set('end', fim_end_date);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/faxinas/por-periodo`, // ajustado para rotas do backend
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  // Métodos existentes mantidos
  getReservasPorPeriodo(startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/reservas/por-periodo`, // ajustado para rotas do backend
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

  createReservaManual(reserva: ReservaAirbnb): Observable<ReservaAirbnb> {
    return this.http.post<ReservaAirbnb>(
      `${this.apiUrl}/manual`,
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

  getPagamentosPorCodReserva(codigos: number[]): Observable<{ cod_reserva: number, valor_pagamento: number }[]> {
    return this.http.post<{ cod_reserva: number, valor_pagamento: number }[]>(
      `${this.apiUrl}/pagamentos`,
      { codigos },
      { headers: this.getHeaders() }
    );
  }

  getReservasPorPeriodoCalendario(startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/reservas/por-periodo-calendario`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }
  getReservasCanceladasHoje(): Observable<ReservaAirbnb[]> {
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/cancelados/hoje`,
      { headers: this.getHeaders() }
    );
  }

  // Novo endpoint: /reservas-airbnb/cancelados/por-periodo
  getReservasCanceladasPorPeriodo(startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/cancelados/por-periodo`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  // Novo endpoint: /reservas-airbnb/reservas/cod/:cod_reserva
  getReservaByCodReserva(codReserva: number | string): Observable<ReservaAirbnb[]> {
    const cod = encodeURIComponent(String(codReserva));
    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/reservas/cod/${cod}`,
      { headers: this.getHeaders() }
    );
  }
  getReservasPorPeriodoCalendarioPorApartamento(apartamentoId: number, startDate: string, endDate: string): Observable<ReservaAirbnb[]> {
    const params = new HttpParams()
      .set('start', startDate)
      .set('end', endDate);

    return this.http.get<ReservaAirbnb[]>(
      `${this.apiUrl}/reservas/por-periodo-calendario/${apartamentoId}`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  deleteReservasByOrigem(origem: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/origem/${encodeURIComponent(origem)}`,
      { headers: this.getHeaders() }
    );
  }
}
