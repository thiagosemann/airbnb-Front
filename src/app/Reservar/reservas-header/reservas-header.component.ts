import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { BuscaState } from '../reservar.component';

@Component({
    selector: 'app-reservas-header',
    templateUrl: './reservas-header.component.html',
    styleUrls: ['./reservas-header.component.css']
})
export class ReservasHeaderComponent implements OnInit {
    @Input() busca: BuscaState = {
        checkIn: '',
        checkOut: '',
        hospedes: 2
    };
    @Input() bairrosDisponiveis: string[] = [];

    @Output() buscar = new EventEmitter<BuscaState>();

    localBusca: BuscaState = {
        checkIn: '',
        checkOut: '',
        hospedes: 2
    };

    // Options for guests dropdown
    hospedesOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Min date for check-in (today)
    minCheckInDate: string = '';
    minCheckOutDate: string = '';

    ngOnInit(): void {
        this.localBusca = { ...this.busca };
        this.setMinDates();
    }

    setMinDates(): void {
        const today = new Date();
        this.minCheckInDate = this.formatDateForInput(today);
        this.updateMinCheckOutDate();
    }

    private formatDateForInput(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    updateMinCheckOutDate(): void {
        if (this.localBusca.checkIn) {
            const checkIn = new Date(this.localBusca.checkIn);
            checkIn.setDate(checkIn.getDate() + 1);
            this.minCheckOutDate = this.formatDateForInput(checkIn);

            // If check-out is before new min, update it
            if (this.localBusca.checkOut && this.localBusca.checkOut <= this.localBusca.checkIn) {
                this.localBusca.checkOut = this.minCheckOutDate;
            }
        }
    }

    onCheckInChange(): void {
        this.updateMinCheckOutDate();
    }

    onBuscar(): void {
        if (this.isFormValid()) {
            this.buscar.emit({ ...this.localBusca });
        }
    }

    isFormValid(): boolean {
        return !!(this.localBusca.checkIn && this.localBusca.checkOut && this.localBusca.hospedes > 0);
    }

    get nightsPreview(): number {
        if (!this.localBusca.checkIn || !this.localBusca.checkOut) return 0;
        const start = new Date(this.localBusca.checkIn);
        const end = new Date(this.localBusca.checkOut);
        const diff = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
}
