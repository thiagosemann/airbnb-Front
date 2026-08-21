import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../enviroments';
import { LimpezaAlocacao, TipoLimpezaAlocacao } from '../../../utilitarios/limpezaAlocacao';

@Injectable({
	providedIn: 'root'
})
export class LimpezaAlocacaoService {
	private baseUrl = environment.backendUrl + '/limpeza-alocacoes';

	constructor(private http: HttpClient) { }

	private getToken(): string {
		return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
	}

	private getHeaders(): HttpHeaders {
		return new HttpHeaders({
			'Authorization': `Bearer ${this.getToken()}`
		});
	}

	/** Histórico completo de trocas de responsável, do mais recente para o mais antigo */
	getTimeline(tipo: TipoLimpezaAlocacao, referenciaId: number | string): Observable<LimpezaAlocacao[]> {
		return this.http.get<LimpezaAlocacao[]>(`${this.baseUrl}/${tipo}/${referenciaId}`, { headers: this.getHeaders() });
	}

	getUltima(tipo: TipoLimpezaAlocacao, referenciaId: number | string): Observable<LimpezaAlocacao | null> {
		return this.http.get<LimpezaAlocacao | null>(`${this.baseUrl}/${tipo}/${referenciaId}/ultima`, { headers: this.getHeaders() });
	}

	/** Última alocação de cada limpeza do período — alimenta a coluna "Alocado por" da escala */
	getUltimasPorPeriodo(inicio: string, fim: string): Observable<LimpezaAlocacao[]> {
		return this.http.get<LimpezaAlocacao[]>(`${this.baseUrl}/ultimas?inicio=${inicio}&fim=${fim}`, { headers: this.getHeaders() });
	}
}
