import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root'
})
export class ApartamentosProprietarioService {
  private url = environment.backendUrl;
  private vinculos: any[] = [];
  private vinculoListSubject: Subject<any[]> = new Subject<any[]>();

  constructor(private http: HttpClient) { }

  // Adiciona vínculo entre apartamento e proprietário
  addProprietarioToApartamento(apartamento_id: number, user_id: number): Observable<any> {
    const token = this.getToken();
    return this.http.post(`${this.url}/apartamentos-proprietario`, { apartamento_id, user_id }, { headers: this.getHeaders(token) });
  }

  // Remove vínculo entre apartamento e proprietário
  removeProprietarioFromApartamento(apartamento_id: number, user_id: number): Observable<any> {
    const token = this.getToken();
    return this.http.request('delete', `${this.url}/apartamentos-proprietario`, { body: { apartamento_id, user_id }, headers: this.getHeaders(token) });
  }

  // Busca todos os proprietários de um apartamento
  getProprietariosByApartamento(apartamento_id: number): Observable<any[]> {
    const token = this.getToken();
    return this.http.get<any[]>(`${this.url}/apartamentos-proprietario/proprietarios/${apartamento_id}`, { headers: this.getHeaders(token) });
  }

  // Busca todos os apartamentos de um proprietário
  getApartamentosByProprietario(user_id: number): Observable<any[]> {
    const token = this.getToken();
    return this.http.get<any[]>(`${this.url}/apartamentos-proprietario/apartamentos/${user_id}`, { headers: this.getHeaders(token) });
  }

  // Remove todos os vínculos de um apartamento
  removeAllProprietariosFromApartamento(apartamento_id: number): Observable<any> {
    const token = this.getToken();
    return this.http.request('delete', `${this.url}/apartamentos-proprietario/apartamento`, { body: { apartamento_id }, headers: this.getHeaders(token) });
  }

  // Remove todos os vínculos de um proprietário
  removeAllApartamentosFromProprietario(user_id: number): Observable<any> {
    const token = this.getToken();
    return this.http.request('delete', `${this.url}/apartamentos-proprietario/proprietario`, { body: { user_id }, headers: this.getHeaders(token) });
  }

  updateVinculoList(): void {
    // Exemplo: pode ser implementado para buscar todos os vínculos, se necessário
    // this.getAllVinculos().subscribe(vinculos => {
    //   this.vinculos = vinculos;
    //   this.notifyVinculoListUpdate();
    // });
  }

  getVinculoList(): any[] {
    return this.vinculos;
  }

  getVinculoListObservable(): Observable<any[]> {
    return this.vinculoListSubject.asObservable();
  }

  private notifyVinculoListUpdate(): void {
    this.vinculoListSubject.next([...this.vinculos]);
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
