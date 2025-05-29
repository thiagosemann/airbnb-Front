import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';
import { LimpezaExtra } from 'src/app/shared/utilitarios/limpezaextra';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LimpezaExtraService {
  private apiUrl = `${environment.backendUrl}/limpeza-extra`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // CRUD básico
  getAllLimpezasExtras(): Observable<LimpezaExtra[]> {
    return this.http.get<LimpezaExtra[]>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getLimpezaExtraById(id: number): Observable<LimpezaExtra> {
    return this.http.get<LimpezaExtra>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createLimpezaExtra(limpeza: LimpezaExtra): Observable<{ insertId: number }> {
    return this.http.post<{ insertId: number }>(
      this.apiUrl,
      limpeza,
      { headers: this.getHeaders() }
    );
  }

  updateLimpezaExtra(limpeza: LimpezaExtra): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${limpeza.id}`,
      limpeza,
      { headers: this.getHeaders() }
    );
  }

  deleteLimpezaExtra(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // NOVOS MÉTODOS DE FILTRO

  /** Limpezas extras com end_data = hoje */
  getLimpezasExtrasHoje(): Observable<LimpezaExtra[]> {
    return this.http.get<LimpezaExtra[]>(
      `${this.apiUrl}/hoje`,
      { headers: this.getHeaders() }
    );
  }

  /** Limpezas extras com end_data na semana atual */
  getLimpezasExtrasSemana(): Observable<LimpezaExtra[]> {
    return this.http.get<LimpezaExtra[]>(
      `${this.apiUrl}/semana`,
      { headers: this.getHeaders() }
    );
  }

  /** Limpezas extras com end_data na semana que vem */
  getLimpezasExtrasSemanaQueVem(): Observable<LimpezaExtra[]> {
    return this.http.get<LimpezaExtra[]>(
      `${this.apiUrl}/semana-que-vem`,
      { headers: this.getHeaders() }
    );
  }
    getLimpezasExtrasPorPeriodo(startDate: string, endDate: string): Observable<LimpezaExtra[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<LimpezaExtra[]>(
      `${this.apiUrl}/por-periodo`,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }
}
