import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from 'enviroments';
import { Portaria } from 'src/app/shared/utilitarios/portarias';

@Injectable({
  providedIn: 'root'
})
export class PortariaService {
  private url = environment.backendUrl;
  private portarias: Portaria[] = [];
  private portariaListSubject: Subject<Portaria[]> = new Subject<Portaria[]>();

  constructor(private http: HttpClient) { }

  getAllPortarias(): Observable<Portaria[]> {
    const token = this.getToken();
    return this.http.get<Portaria[]>(`${this.url}/portarias`, { headers: this.getHeaders(token) });
  }

  createPortaria(portaria: Portaria): Observable<any> {
    const token = this.getToken();
    return this.http.post(`${this.url}/portarias`, portaria, { headers: this.getHeaders(token) });
  }

  getPortariaById(id: number): Observable<Portaria> {
    const token = this.getToken();
    return this.http.get<Portaria>(`${this.url}/portarias/${id}`, { headers: this.getHeaders(token) });
  }

  updatePortaria(portaria: Portaria): Observable<any> {
    const token = this.getToken();
    return this.http.put(`${this.url}/portarias/${portaria.id}`, portaria, { headers: this.getHeaders(token) });
  }

  deletePortaria(id: number): Observable<any> {
    const token = this.getToken();
    return this.http.delete(`${this.url}/portarias/${id}`, { headers: this.getHeaders(token) });
  }

  updatePortariaList(): void {
    this.getAllPortarias().subscribe(portarias => {
      this.portarias = portarias;
      this.notifyPortariaListUpdate();
    });
  }

  getPortariaList(): Portaria[] {
    return this.portarias;
  }

  getPortariaListObservable(): Observable<Portaria[]> {
    return this.portariaListSubject.asObservable();
  }

  private notifyPortariaListUpdate(): void {
    this.portariaListSubject.next([...this.portarias]);
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
