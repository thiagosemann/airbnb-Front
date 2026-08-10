import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../enviroments';
import { ObservacaoReserva } from '../../../utilitarios/observacaoReserva';

@Injectable({
	providedIn: 'root'
})
export class ObservacoesReservaService {
	private baseUrl = environment.backendUrl + '/observacoes-reserva';

	constructor(private http: HttpClient) { }

	private getToken(): string {
		return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
	}

	private getHeaders(token: string): HttpHeaders {
		return new HttpHeaders({
			'Authorization': `Bearer ${token}`
		});
	}

	/** Adiciona um novo registro na timeline. O autor é resolvido no backend pelo token. */
	create(payload: { reserva_id: number; cod_reserva: string; texto: string }): Observable<ObservacaoReserva> {
		const token = this.getToken();
		return this.http.post<ObservacaoReserva>(this.baseUrl, payload, { headers: this.getHeaders(token) });
	}

	/** Timeline completa, do mais recente para o mais antigo */
	getByReservaId(reservaId: number | string): Observable<ObservacaoReserva[]> {
		const token = this.getToken();
		return this.http.get<ObservacaoReserva[]>(`${this.baseUrl}/reserva/${reservaId}`, { headers: this.getHeaders(token) });
	}

	/** Apenas a observação mais recente — usada na coluna do diário */
	getUltimaByReservaId(reservaId: number | string): Observable<ObservacaoReserva | null> {
		const token = this.getToken();
		return this.http.get<ObservacaoReserva | null>(`${this.baseUrl}/reserva/${reservaId}/ultima`, { headers: this.getHeaders(token) });
	}

	getByCodReserva(cod_reserva: string): Observable<ObservacaoReserva[]> {
		const token = this.getToken();
		return this.http.get<ObservacaoReserva[]>(`${this.baseUrl}/cod/${encodeURIComponent(cod_reserva)}`, { headers: this.getHeaders(token) });
	}

	update(id: number, texto: string): Observable<ObservacaoReserva> {
		const token = this.getToken();
		return this.http.put<ObservacaoReserva>(`${this.baseUrl}/${id}`, { texto }, { headers: this.getHeaders(token) });
	}

	delete(id: number): Observable<any> {
		const token = this.getToken();
		return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders(token) });
	}
}
