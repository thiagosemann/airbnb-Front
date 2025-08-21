import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { NodemcuPredio } from 'src/app/shared/utilitarios/nodemcuPredio';


@Injectable({
  providedIn: 'root'
})
export class NodemcuPrediosService {
  private url = environment.backendUrl;
  constructor(private http: HttpClient) { }
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllNodemcuPredios(): Observable<NodemcuPredio[]> {
    return this.http.get<NodemcuPredio[]>(`${this.url}/nodemcu-predios`, { headers: this.getHeaders() });
  }

  getNodemcuPredioById(id: number): Observable<NodemcuPredio> {
    return this.http.get<NodemcuPredio>(`${this.url}/nodemcu-predios/${id}`, { headers: this.getHeaders() });
  }

  getNodemcuPredioByNodemcu(idNodemcu: string): Observable<NodemcuPredio> {
    return this.http.get<NodemcuPredio>(`${this.url}/nodemcu-predios/nodemcu/${idNodemcu}`, { headers: this.getHeaders() });
  }

  getNodemcuPrediosByPredioId(predio_id: number): Observable<NodemcuPredio[]> {
    return this.http.get<NodemcuPredio[]>(`${this.url}/nodemcu-predios/predio/${predio_id}`, { headers: this.getHeaders() });
  }

  createNodemcuPredio(data: { predio_id: number; idNodemcu: string }): Observable<any> {
    return this.http.post(`${this.url}/nodemcu-predios`, data, { headers: this.getHeaders() });
  }

  updateNodemcuPredio(id: number, data: { predio_id: number; idNodemcu: string }): Observable<any> {
    return this.http.put(`${this.url}/nodemcu-predios/${id}`, data, { headers: this.getHeaders() });
  }

  deleteNodemcuPredio(id: number): Observable<any> {
    return this.http.delete(`${this.url}/nodemcu-predios/${id}`, { headers: this.getHeaders() });
  }
}
