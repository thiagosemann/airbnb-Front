import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Portaria } from 'src/app/shared/utilitarios/portarias';
import { environment } from 'enviroments';
import { Predio } from 'src/app/shared/utilitarios/predio';


@Injectable({
  providedIn: 'root'
})
export class PredioPortariaService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  // Listar todas as associações prédio-portaria
  getAllAssociacoes(): Observable<{ predioId: number; portariaId: number; }[]> {
    const token = this.getToken();
    return this.http.get<{ predioId: number; portariaId: number; }[]>(
      `${this.url}/predio-portaria`,
      { headers: this.getHeaders(token) }
    );
  }

  // Listar portarias de um prédio
  getPortariasByPredio(predioId: number): Observable<Portaria[]> {
    const token = this.getToken();
    return this.http.get<Portaria[]>(
      `${this.url}/predio-portaria/predio/${predioId}`,
      { headers: this.getHeaders(token) }
    );
  }

  // Listar prédios de uma portaria
  getPrediosByPortaria(portariaId: number): Observable<Predio[]> {
    const token = this.getToken();
    return this.http.get<Predio[]>(
      `${this.url}/predio-portaria/portaria/${portariaId}`,
      { headers: this.getHeaders(token) }
    );
  }

  // Vincular portaria a prédio
  linkPortariaToPredio(portariaId: number, predioId: number): Observable<any> {
    const token = this.getToken();
    return this.http.post(
      `${this.url}/predio-portaria`,
      { portariaId, predioId },
      { headers: this.getHeaders(token) }
    );
  }

  // Remover vínculo portaria-prédio
  unlinkPortariaFromPredio(portariaId: number, predioId: number): Observable<any> {
    const token = this.getToken();
    return this.http.request(
      'delete',
      `${this.url}/predio-portaria`,
      { headers: this.getHeaders(token), body: { portariaId, predioId } }
    );
  }

  private getToken(): string {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}
