import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

export interface AnuncioComodidade {
  categoria: string;
  nome: string;
  subtitulo: string | null;
  disponivel: boolean;
}

export interface AnuncioAvaliacaoCategoria {
  categoria: string;
  nota: string;
}

export interface AnuncioAirbnb {
  id_listing: string;
  titulo: string;
  descricao: string;
  tipo_imovel: string | null;
  nota_geral: number;
  total_avaliacoes: number;
  capacidade_hospedes: number;
  detalhes_propriedade: string[];
  latitude: number;
  longitude: number;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  imagens: string[];
  url_anuncio: string;
  comodidades: AnuncioComodidade[];
  avaliacoes_categorias: AnuncioAvaliacaoCategoria[];
}

@Injectable({
  providedIn: 'root'
})
export class ScrapperService {
  private url = environment.backendUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getAnuncioById(id: string): Observable<AnuncioAirbnb> {
    return this.http.get<AnuncioAirbnb>(`${this.url}/scrapper/apartamento/${id}`, { headers: this.getHeaders() });
  }

  getAnuncioByLink(url: string): Observable<AnuncioAirbnb> {
    return this.http.post<AnuncioAirbnb>(`${this.url}/scrapper/link`, { url }, { headers: this.getHeaders() });
  }
}
