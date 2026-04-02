import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { AnuncioAirbnb, AnuncioComodidade, ScrapperService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/scrapper_service';

@Component({
  selector: 'app-scrapper-airbnb',
  templateUrl: './scrapper-airbnb.component.html',
  styleUrls: ['./scrapper-airbnb.component.css']
})
export class ScrapperAirbnbComponent implements OnInit {
  modo: 'link' | 'apartamento' = 'link';
  linkInput = '';
  apartamentos: Apartamento[] = [];
  apartamentoSelecionadoId: number | null = null;
  loadingApartamentos = false;

  anuncio: AnuncioAirbnb | null = null;
  loading = false;
  erro: string | null = null;
  imagemAtiva = 0;

  constructor(
    private scrapperService: ScrapperService,
    private apartamentoService: ApartamentoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.carregarApartamentos();
  }

  carregarApartamentos(): void {
    this.loadingApartamentos = true;
    this.apartamentoService.getAllApartamentos().subscribe({
      next: (data) => {
        this.apartamentos = (data || [])
          .filter(a => a.link_anuncio_airbnb)
          .sort((a, b) => (a.nome_anuncio || a.nome || '').localeCompare(b.nome_anuncio || b.nome || ''));
        this.loadingApartamentos = false;
      },
      error: () => { this.loadingApartamentos = false; }
    });
  }

  trocarModo(m: 'link' | 'apartamento'): void {
    this.modo = m;
    this.anuncio = null;
    this.erro = null;
  }

  buscar(): void {
    if (this.modo === 'link') {
      this.buscarPorLink(this.linkInput.trim());
    } else {
      const apto = this.apartamentos.find(a => a.id === this.apartamentoSelecionadoId);
      const url = apto?.link_anuncio_airbnb?.trim();
      if (url) this.buscarPorLink(url);
    }
  }

  private buscarPorLink(url: string): void {
    if (!url) return;
    this.loading = true;
    this.erro = null;
    this.anuncio = null;
    this.imagemAtiva = 0;

    this.scrapperService.getAnuncioByLink(url).subscribe({
      next: (data) => {
        this.anuncio = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao buscar anúncio', err);
        this.erro = 'Não foi possível carregar o anúncio. Verifique o link e tente novamente.';
        this.loading = false;
      }
    });
  }

  get podeBuscar(): boolean {
    if (this.loading) return false;
    if (this.modo === 'link') return !!this.linkInput.trim();
    return !!this.apartamentoSelecionadoId;
  }

  get paragrafosDescricao(): string[] {
    return (this.anuncio?.descricao || '').split('\n\n').filter(p => p.trim());
  }

  get comodidadesDisponiveis(): AnuncioComodidade[] {
    return (this.anuncio?.comodidades || []).filter(c => c.disponivel);
  }

  get comodidadesNaoIncluso(): AnuncioComodidade[] {
    return (this.anuncio?.comodidades || []).filter(c => !c.disponivel);
  }

  get categoriaComodidades(): string[] {
    const cats = this.comodidadesDisponiveis.map(c => c.categoria);
    return [...new Set(cats)];
  }

  comodidadesPorCategoria(categoria: string): AnuncioComodidade[] {
    return this.comodidadesDisponiveis.filter(c => c.categoria === categoria);
  }

  notaNumero(nota: string): number {
    return parseFloat(nota.replace(',', '.')) || 0;
  }

  detalheLabel(detalhe: string): string {
    return detalhe.replace('· ', '').trim();
  }

  proximaImagem(): void {
    if (!this.anuncio) return;
    this.imagemAtiva = (this.imagemAtiva + 1) % this.anuncio.imagens.length;
  }

  imagemAnterior(): void {
    if (!this.anuncio) return;
    this.imagemAtiva = (this.imagemAtiva - 1 + this.anuncio.imagens.length) % this.anuncio.imagens.length;
  }

  irParaImagem(index: number): void {
    this.imagemAtiva = index;
  }

  get mapaUrl(): string {
    if (!this.anuncio) return '';
    return `https://maps.google.com/?q=${this.anuncio.latitude},${this.anuncio.longitude}`;
  }

  get mapaEmbedUrl() {
    if (!this.anuncio) return '';
    const { latitude, longitude } = this.anuncio;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
    );
  }
}
