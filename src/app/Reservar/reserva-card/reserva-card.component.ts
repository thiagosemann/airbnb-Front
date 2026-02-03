import { Component, Input } from '@angular/core';
import { Apartamento } from '../../shared/utilitarios/apartamento';

@Component({
    selector: 'app-reserva-card',
    templateUrl: './reserva-card.component.html',
    styleUrls: ['./reserva-card.component.css']
})
export class ReservaCardComponent {
    @Input() apartamento!: Apartamento;

    // Placeholder image (will be replaced with real photos later)
    get imageUrl(): string {
        // Generate a placeholder based on apartment id for variety
        const colors = ['0F392B', '1e4c40', '2d6555', '3c7e6a'];
        const colorIndex = this.apartamento.id % colors.length;
        return `https://via.placeholder.com/400x300/${colors[colorIndex]}/d4af37?text=${encodeURIComponent(this.apartamento.nome || 'Apartamento')}`;
    }

    get displayName(): string {
        return this.apartamento.nome_anuncio || this.apartamento.nome || 'Apartamento';
    }

    get bedsDescription(): string {
        const parts: string[] = [];

        if (this.apartamento.qtd_cama_casal) {
            parts.push(`${this.apartamento.qtd_cama_casal} cama${this.apartamento.qtd_cama_casal > 1 ? 's' : ''} casal`);
        }
        if (this.apartamento.qtd_cama_solteiro) {
            parts.push(`${this.apartamento.qtd_cama_solteiro} cama${this.apartamento.qtd_cama_solteiro > 1 ? 's' : ''} solteiro`);
        }
        if (this.apartamento.qtd_sofa_cama) {
            parts.push(`${this.apartamento.qtd_sofa_cama} sofá-cama`);
        }

        return parts.join(' · ') || 'Consultar acomodações';
    }

    get mainAmenities(): { icon: string, label: string }[] {
        const amenities: { icon: string, label: string }[] = [];

        if (this.apartamento.ar_condicionado) {
            amenities.push({ icon: 'ac', label: 'Ar cond.' });
        }
        if (this.apartamento.ssid_wifi) {
            amenities.push({ icon: 'wifi', label: 'WiFi' });
        }
        if (this.apartamento.smart_tv) {
            amenities.push({ icon: 'tv', label: 'Smart TV' });
        }
        if (this.apartamento.vaga_garagem) {
            amenities.push({ icon: 'parking', label: 'Garagem' });
        }

        // Limit to 4 amenities for display
        return amenities.slice(0, 4);
    }
}
