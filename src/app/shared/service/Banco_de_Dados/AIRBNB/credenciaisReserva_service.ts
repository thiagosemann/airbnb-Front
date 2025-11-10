import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../enviroments';
import { CredencialReserva } from '../../../utilitarios/credencialReserva';

@Injectable({
	providedIn: 'root'
})
export class CredenciaisReservaService {
	private baseUrl = environment.backendUrl + '/credenciais-reserva';

	constructor(private http: HttpClient) {}

	// Helper to read token from storage
	private getToken(): string {
		return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
	}

	private getHeaders(token: string): HttpHeaders {
		return new HttpHeaders({
			'Authorization': `Bearer ${token}`
		});
	}

	createCredencial(payload: { reserva_id: number; cod_reserva: string; arquivoBase64: string }): Observable<any> {
		const token = this.getToken();
		return this.http.post<any>(this.baseUrl, payload, { headers: this.getHeaders(token) });
	}

	getAll(): Observable<CredencialReserva[]> {
		const token = this.getToken();
		return this.http.get<CredencialReserva[]>(this.baseUrl, { headers: this.getHeaders(token) });
	}

	getById(id: number | string): Observable<CredencialReserva> {
		const token = this.getToken();
		return this.http.get<CredencialReserva>(`${this.baseUrl}/${id}`, { headers: this.getHeaders(token) });
	}

	getByReservaId(reservaId: number | string): Observable<CredencialReserva[]> {
		const token = this.getToken();
		return this.http.get<CredencialReserva[]>(`${this.baseUrl}/reserva/${reservaId}`, { headers: this.getHeaders(token) });
	}

	getByCodReserva(cod_reserva: string): Observable<CredencialReserva[]> {
		const token = this.getToken();
		return this.http.get<CredencialReserva[]>(`${this.baseUrl}/cod/${encodeURIComponent(cod_reserva)}`, { headers: this.getHeaders(token) });
	}

	deleteById(id: number | string): Observable<any> {
		const token = this.getToken();
		return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders(token) });
	}

	deleteByReservaId(reservaId: number | string): Observable<any> {
		const token = this.getToken();
		return this.http.delete<any>(`${this.baseUrl}/reserva/${reservaId}`, { headers: this.getHeaders(token) });
	}
}
