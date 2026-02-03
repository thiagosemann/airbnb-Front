import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Apartamento } from '../../shared/utilitarios/apartamento';

@Component({
    selector: 'app-reservas-list',
    templateUrl: './reservas-list.component.html',
    styleUrls: ['./reservas-list.component.css']
})
export class ReservasListComponent {
    @Input() apartamentos: Apartamento[] = [];

    @Output() apartamentoClick = new EventEmitter<Apartamento>();

    onCardClick(apartamento: Apartamento): void {
        this.apartamentoClick.emit(apartamento);
    }

    trackByApartamentoId(index: number, apartamento: Apartamento): number {
        return apartamento.id;
    }
}
