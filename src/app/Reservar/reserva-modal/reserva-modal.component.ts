import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Apartamento } from '../../shared/utilitarios/apartamento';
import { ReservaAirbnb } from '../../shared/utilitarios/reservaAirbnb';
import { BuscaState } from '../reservar.component';

@Component({
    selector: 'app-reserva-modal',
    templateUrl: './reserva-modal.component.html',
    styleUrls: ['./reserva-modal.component.css']
})
export class ReservaModalComponent implements OnInit {
    @Input() apartamento!: Apartamento;
    @Input() busca!: BuscaState;

    @Output() close = new EventEmitter<void>();
    @Output() confirmar = new EventEmitter<ReservaAirbnb>();

    // Form data
    formData = {
        nomeHospede: '',
        telefone: '',
        observacoes: ''
    };

    isSaving = false;
    activeTab: 'detalhes' | 'reservar' = 'detalhes';

    ngOnInit(): void {
        document.body.style.overflow = 'hidden';
    }

    ngOnDestroy(): void {
        document.body.style.overflow = '';
    }

    onOverlayClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
            this.onClose();
        }
    }

    onClose(): void {
        this.close.emit();
    }

    onConfirmar(): void {
        if (!this.isFormValid()) return;

        this.isSaving = true;

        const reserva: ReservaAirbnb = {
            apartamento_id: this.apartamento.id,
            apartamento_nome: this.apartamento.nome,
            description: this.formData.nomeHospede,
            start_date: this.busca.checkIn,
            end_data: this.busca.checkOut,
            check_in: '15:00',
            check_out: '11:00',
            telefone_principal: this.formData.telefone,
            qtd_hospedes: this.busca.hospedes,
            Observacoes: this.formData.observacoes,
            cod_reserva: this.generateCodReserva(),
            link_reserva: '',
            limpeza_realizada: false,
            credencial_made: false,
            informed: false,
            horarioPrevistoChegada: [],
            pagamentos: [],
            origem: 'FOREST'
        };

        this.confirmar.emit(reserva);
    }

    generateCodReserva(): string {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `FOREST-${this.apartamento.id}-${date}`;
    }

    isFormValid(): boolean {
        return !!(this.formData.nomeHospede.trim() && this.formData.telefone.trim());
    }

    get nightsCount(): number {
        if (!this.busca.checkIn || !this.busca.checkOut) return 0;
        const start = new Date(this.busca.checkIn);
        const end = new Date(this.busca.checkOut);
        const diff = end.getTime() - start.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Amenities list
    get amenitiesList(): { icon: string; label: string; active: boolean }[] {
        return [
            { icon: 'ac', label: 'Ar condicionado', active: this.apartamento.ar_condicionado },
            { icon: 'wifi', label: 'WiFi', active: !!this.apartamento.ssid_wifi },
            { icon: 'tv', label: 'Smart TV', active: this.apartamento.smart_tv },
            { icon: 'parking', label: 'Vaga de garagem', active: this.apartamento.vaga_garagem },
            { icon: 'pet', label: 'Aceita pet', active: this.apartamento.aceita_pet },
            { icon: 'coffee', label: 'Cafeteira', active: this.apartamento.cafeteira },
            { icon: 'hairdryer', label: 'Secador de cabelo', active: this.apartamento.secador_cabelo },
            { icon: 'desk', label: 'Escritório', active: this.apartamento.escritorio },
            { icon: 'fan', label: 'Ventilador', active: this.apartamento.ventilador },
            { icon: 'iron', label: 'Ferro de passar', active: this.apartamento.ferro_passar }
        ].filter(a => a.active);
    }

    get bedsDescription(): string {
        const parts: string[] = [];
        if (this.apartamento.qtd_cama_casal) {
            parts.push(`${this.apartamento.qtd_cama_casal} cama${this.apartamento.qtd_cama_casal > 1 ? 's' : ''} de casal`);
        }
        if (this.apartamento.qtd_cama_solteiro) {
            parts.push(`${this.apartamento.qtd_cama_solteiro} cama${this.apartamento.qtd_cama_solteiro > 1 ? 's' : ''} de solteiro`);
        }
        if (this.apartamento.qtd_sofa_cama) {
            parts.push(`${this.apartamento.qtd_sofa_cama} sofá-cama`);
        }
        return parts.join(', ');
    }
}
