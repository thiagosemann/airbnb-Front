import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';

@Injectable({
  providedIn: 'root'
})
export class ApartamentoService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllApartamentos(): Observable<Apartamento[]> {
    return this.http.get<Apartamento[]>(`${this.url}/apartamentos-airbnb`, { headers: this.getHeaders() });
  }

  createApartamento(apartamento: Apartamento): Observable<any> {
    return this.http.post(`${this.url}/apartamentos-airbnb`, apartamento, { headers: this.getHeaders() });
  }

  updateApartamento(apartamento: Apartamento): Observable<any> {
    return this.http.put(`${this.url}/apartamentos-airbnb/${apartamento.id}`, apartamento, { headers: this.getHeaders() });
  }

  deleteApartamento(id: number): Observable<any> {
    return this.http.delete(`${this.url}/apartamentos-airbnb/${id}`, { headers: this.getHeaders() });
  }

  getApartamentosByPredio(predioId: number): Observable<Apartamento[]> {
    return this.http.get<Apartamento[]>(`${this.url}/apartamentos-airbnb/predios/${predioId}`, { headers: this.getHeaders() });
  }

  // Nova função para buscar um apartamento pelo id
  getApartamentoById(id: number): Observable<Apartamento> {
    return this.http.get<Apartamento>(`${this.url}/apartamentos-airbnb/${id}`, { headers: this.getHeaders() });
  }
    // Nova função para buscar um apartamento pelo id
  getApartamentoByCodProprietario(cod_link_proprietario: string): Observable<Apartamento> {
    return this.http.get<Apartamento>(`${this.url}/apartamentos-airbnb/codigo-proprietario/${cod_link_proprietario}`, { headers: this.getHeaders() });
  }
  validarIcalBackend(icalData: string): Observable<any> {
    return this.http.post<any>(
      `${this.url}/validar-ical`,
      { icalData },
      { headers: this.getHeaders() }
    );
  }

  // Nova rota: retorna vaga_garagem, pedir_selfie e tem_garagem via backend
  // GET /apartamentos-airbnb/selfie-garagem?cod_reserva=XXX
  getSelfieGaragem(cod_reserva: string): Observable<any> {
    const params = new HttpParams().set('cod_reserva', cod_reserva);

    return this.http.get(`${this.url}/apartamentos-airbnb/selfie-garagem`, {
      headers: this.getHeaders(),
      params
    });
  }
}
