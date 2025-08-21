import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { NodemcuAbertura } from 'src/app/shared/utilitarios/nodemcuAbertura';


@Injectable({
  providedIn: 'root'
})
export class NodemcuAberturasService {
  private url = environment.backendUrl;
  constructor(private http: HttpClient) { }
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllAberturas(startDate?: string, endDate?: string): Observable<NodemcuAbertura[]> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<NodemcuAbertura[]>(`${this.url}/nodemcu-aberturas`, { headers: this.getHeaders(), params });
  }

  getAberturaById(id: number): Observable<NodemcuAbertura> {
    return this.http.get<NodemcuAbertura>(`${this.url}/nodemcu-aberturas/${id}`, { headers: this.getHeaders() });
  }

  getAberturasByNodemcu(idNodemcu: string, startDate?: string, endDate?: string): Observable<NodemcuAbertura[]> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<NodemcuAbertura[]>(`${this.url}/nodemcu-aberturas/nodemcu/${idNodemcu}`, { headers: this.getHeaders(), params });
  }

  getAberturasByReservaId(reserva_id: number, startDate?: string, endDate?: string): Observable<NodemcuAbertura[]> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<NodemcuAbertura[]>(`${this.url}/nodemcu-aberturas/reserva/${reserva_id}`, { headers: this.getHeaders(), params });
  }

  getAberturasByPredioId(predio_id: number, startDate?: string, endDate?: string): Observable<NodemcuAbertura[]> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<NodemcuAbertura[]>(`${this.url}/nodemcu-aberturas/predio/${predio_id}`, { headers: this.getHeaders(), params });
  }

  createAbertura(data: { idNodemcu: string; fechaduras_predio_id: number; reserva_id: number; cod_reserva: string }): Observable<any> {
    return this.http.post(`${this.url}/nodemcu-aberturas`, data, { headers: this.getHeaders() });
  }

  deleteAbertura(id: number): Observable<any> {
    return this.http.delete(`${this.url}/nodemcu-aberturas/${id}`, { headers: this.getHeaders() });
  }
}
