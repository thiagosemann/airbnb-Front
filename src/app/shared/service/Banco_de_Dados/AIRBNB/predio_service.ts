import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'enviroments';

// Interface para representar um prédio (ajuste conforme sua implementação)
export interface Predio {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class PredioService {
  private url = environment.backendUrl;
  private predios: Predio[] = [];
  private predioListSubject: Subject<Predio[]> = new Subject<Predio[]>();

  constructor(private http: HttpClient) { }

  // Obtém todos os prédios
  getAllPredios(): Observable<Predio[]> {
    const token = this.getToken();
    return this.http.get<Predio[]>(`${this.url}/predios`, { headers: this.getHeaders(token) });
  }

  // Cria um novo prédio
  createPredio(predio: Predio): Observable<any> {
    const token = this.getToken();
    return this.http.post(`${this.url}/predios`, predio, { headers: this.getHeaders(token) });
  }

  // Obtém um prédio por ID
  getPredioById(id: number): Observable<Predio> {
    const token = this.getToken();
    return this.http.get<Predio>(`${this.url}/predios/${id}`, { headers: this.getHeaders(token) });
  }

  // Atualiza um prédio
  updatePredio(predio: Predio): Observable<any> {
    const token = this.getToken();
    return this.http.put(`${this.url}/predios/${predio.id}`, predio, { headers: this.getHeaders(token) });
  }

  // Exclui um prédio
  deletePredio(id: number): Observable<any> {
    const token = this.getToken();
    return this.http.delete(`${this.url}/predios/${id}`, { headers: this.getHeaders(token) });
  }

  // Atualiza a lista local de prédios e notifica os subscribers
  updatePredioList(): void {
    this.getAllPredios().subscribe(predios => {
      this.predios = predios;
      this.notifyPredioListUpdate();
    });
  }

  // Obtém a lista atual de prédios
  getPredioList(): Predio[] {
    return this.predios;
  }

  // Observable para acompanhar atualizações na lista
  getPredioListObservable(): Observable<Predio[]> {
    return this.predioListSubject.asObservable();
  }

  // Método privado para notificar atualizações
  private notifyPredioListUpdate(): void {
    this.predioListSubject.next([...this.predios]);
  }

  // Helper para obter o token
  private getToken(): string {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  // Helper para criar headers
  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }
}