import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FiltrosState } from '../reservar.component';

@Component({
    selector: 'app-reservas-filters',
    templateUrl: './reservas-filters.component.html',
    styleUrls: ['./reservas-filters.component.css']
})
export class ReservasFiltersComponent {
    @Input() filtros: FiltrosState = {
        aceitaPet: null,
        arCondicionado: null,
        vagaGaragem: null,
        wifi: null,
        bairro: ''
    };
    @Input() bairrosDisponiveis: string[] = [];

    @Output() filtrosChange = new EventEmitter<FiltrosState>();

    localFiltros: FiltrosState = {
        aceitaPet: null,
        arCondicionado: null,
        vagaGaragem: null,
        wifi: null,
        bairro: ''
    };

    ngOnInit(): void {
        this.localFiltros = { ...this.filtros };
    }

    ngOnChanges(): void {
        this.localFiltros = { ...this.filtros };
    }

    toggleFiltro(filtro: keyof FiltrosState): void {
        if (filtro === 'bairro') return;

        const current = this.localFiltros[filtro] as boolean | null;
        if (current === null) {
            (this.localFiltros[filtro] as boolean | null) = true;
        } else if (current === true) {
            (this.localFiltros[filtro] as boolean | null) = null;
        } else {
            (this.localFiltros[filtro] as boolean | null) = true;
        }
        this.emitChanges();
    }

    onBairroChange(): void {
        this.emitChanges();
    }

    emitChanges(): void {
        this.filtrosChange.emit({ ...this.localFiltros });
    }

    limparFiltros(): void {
        this.localFiltros = {
            aceitaPet: null,
            arCondicionado: null,
            vagaGaragem: null,
            wifi: null,
            bairro: ''
        };
        this.emitChanges();
    }

    get hasActiveFilters(): boolean {
        return this.localFiltros.aceitaPet !== null ||
            this.localFiltros.arCondicionado !== null ||
            this.localFiltros.vagaGaragem !== null ||
            this.localFiltros.wifi !== null ||
            this.localFiltros.bairro !== '';
    }

    getFiltroState(filtro: keyof FiltrosState): 'active' | 'inactive' {
        if (filtro === 'bairro') {
            return this.localFiltros.bairro ? 'active' : 'inactive';
        }
        return this.localFiltros[filtro] === true ? 'active' : 'inactive';
    }
}
