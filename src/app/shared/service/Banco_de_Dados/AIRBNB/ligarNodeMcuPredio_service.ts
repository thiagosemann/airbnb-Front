import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class LigarNodeMcuPredioService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  ligarNodeMcu(nodeId: string, cod_reserva: string): Observable<any> {
    return this.http.post(
      `${this.url}/nodemcu-predios/ligar`,
      { nodeId, cod_reserva },
      { headers: this.getHeaders() }
    );
  }
}