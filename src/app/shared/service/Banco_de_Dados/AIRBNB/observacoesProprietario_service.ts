import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../enviroments';
import { ObservacaoProprietario, ProprietarioResumo } from '../../../utilitarios/observacaoProprietario';

@Injectable({
	providedIn: 'root'
})
export class ObservacoesProprietarioService {
	private baseUrl = environment.backendUrl + '/observacoes-proprietario';

	constructor(private http: HttpClient) { }

	private getToken(): string {
		return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
	}

	private getHeaders(token: string): HttpHeaders {
		return new HttpHeaders({
			'Authorization': `Bearer ${token}`
		});
	}

	/** Adiciona um registro na timeline do proprietário. O autor sai do token. */
	create(payload: { proprietario_id: number; apartamento_id?: number | null; texto: string }): Observable<ObservacaoProprietario> {
		const token = this.getToken();
		return this.http.post<ObservacaoProprietario>(this.baseUrl, payload, { headers: this.getHeaders(token) });
	}

	/** Timeline completa do proprietário, do mais recente para o mais antigo */
	getByProprietarioId(proprietarioId: number | string): Observable<ObservacaoProprietario[]> {
		const token = this.getToken();
		return this.http.get<ObservacaoProprietario[]>(`${this.baseUrl}/proprietario/${proprietarioId}`, { headers: this.getHeaders(token) });
	}

	/** Apenas a observação mais recente do proprietário */
	getUltimaByProprietarioId(proprietarioId: number | string): Observable<ObservacaoProprietario | null> {
		const token = this.getToken();
		return this.http.get<ObservacaoProprietario | null>(`${this.baseUrl}/proprietario/${proprietarioId}/ultima`, { headers: this.getHeaders(token) });
	}

	/** Timeline dos proprietários vinculados ao apartamento */
	getByApartamentoId(apartamentoId: number | string): Observable<ObservacaoProprietario[]> {
		const token = this.getToken();
		return this.http.get<ObservacaoProprietario[]>(`${this.baseUrl}/apartamento/${apartamentoId}`, { headers: this.getHeaders(token) });
	}

	/** Proprietários vinculados ao apartamento */
	getProprietariosDoApartamento(apartamentoId: number | string): Observable<ProprietarioResumo[]> {
		const token = this.getToken();
		return this.http.get<ProprietarioResumo[]>(`${this.baseUrl}/apartamento/${apartamentoId}/proprietarios`, { headers: this.getHeaders(token) });
	}

	update(id: number, texto: string): Observable<ObservacaoProprietario> {
		const token = this.getToken();
		return this.http.put<ObservacaoProprietario>(`${this.baseUrl}/${id}`, { texto }, { headers: this.getHeaders(token) });
	}

	delete(id: number): Observable<any> {
		const token = this.getToken();
		return this.http.delete<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders(token) });
	}
}
