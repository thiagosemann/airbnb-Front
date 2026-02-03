import { Component, OnInit } from '@angular/core';
import { ApartamentoService } from '../shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from '../shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { Apartamento } from '../shared/utilitarios/apartamento';
import { ReservaAirbnb } from '../shared/utilitarios/reservaAirbnb';
import { ToastrService } from 'ngx-toastr';

export interface BuscaState {
    checkIn: string;
    checkOut: string;
    hospedes: number;
}

export interface FiltrosState {
    aceitaPet: boolean | null;
    arCondicionado: boolean | null;
    vagaGaragem: boolean | null;
    wifi: boolean | null;
    bairro: string;
}

@Component({
    selector: 'app-reservar',
    templateUrl: './reservar.component.html',
    styleUrls: ['./reservar.component.css']
})
export class ReservarComponent implements OnInit {
    apartamentos: Apartamento[] = [];
    apartamentosDisponiveis: Apartamento[] = [];
    reservas: ReservaAirbnb[] = [];

    isLoading = false;
    buscaRealizada = false;

    // Estado da busca
    busca: BuscaState = {
        checkIn: '',
        checkOut: '',
        hospedes: 2
    };

    // Estado dos filtros
    filtros: FiltrosState = {
        aceitaPet: null,
        arCondicionado: null,
        vagaGaragem: null,
        wifi: null,
        bairro: ''
    };

    // Modal
    showModal = false;
    apartamentoSelecionado: Apartamento | null = null;

    // Lista de bairros únicos para o filtro
    bairrosDisponiveis: string[] = [];

    constructor(
        private apartamentoService: ApartamentoService,
        private reservasService: ReservasAirbnbService,
        private toastr: ToastrService
    ) { }

    ngOnInit(): void {
        this.setDefaultDates();
        this.loadApartamentos();
    }

    setDefaultDates(): void {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        this.busca.checkIn = this.formatDateForInput(tomorrow);
        this.busca.checkOut = this.formatDateForInput(dayAfter);
    }

    private formatDateForInput(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    loadApartamentos(): void {
        this.apartamentoService.getAllApartamentos().subscribe({
            next: (apartamentos) => {
                this.apartamentos = apartamentos;
                this.extractBairros();
            },
            error: (error) => {
                console.error('Erro ao carregar apartamentos:', error);
                this.toastr.error('Erro ao carregar apartamentos');
            }
        });
    }

    extractBairros(): void {
        const bairros = new Set<string>();
        this.apartamentos.forEach(apt => {
            if (apt.bairro) {
                bairros.add(apt.bairro);
            }
        });
        this.bairrosDisponiveis = Array.from(bairros).sort();
    }

    onBuscar(busca: BuscaState): void {
        this.busca = busca;
        this.isLoading = true;
        this.buscaRealizada = true;

        // Buscar reservas no período para verificar disponibilidade
        this.reservasService.getReservasPorPeriodoCalendario(busca.checkIn, busca.checkOut).subscribe({
            next: (reservas) => {
                this.reservas = reservas;
                this.filtrarApartamentosDisponiveis();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Erro ao buscar reservas:', error);
                this.toastr.error('Erro ao verificar disponibilidade');
                this.isLoading = false;
            }
        });
    }

    onFiltrosChange(filtros: FiltrosState): void {
        this.filtros = filtros;
        if (this.buscaRealizada) {
            this.filtrarApartamentosDisponiveis();
        }
    }

    filtrarApartamentosDisponiveis(): void {
        const checkIn = new Date(this.busca.checkIn);
        const checkOut = new Date(this.busca.checkOut);

        this.apartamentosDisponiveis = this.apartamentos.filter(apt => {
            // Verificar disponibilidade (não tem reserva conflitante)
            const disponivel = this.isApartamentoDisponivel(apt, checkIn, checkOut);
            if (!disponivel) return false;

            // Verificar capacidade de hóspedes
            if (apt.numero_hospedes < this.busca.hospedes) return false;

            // Aplicar filtros adicionais (converter para boolean pois pode vir como 0/1 do banco)
            if (this.filtros.aceitaPet !== null && !!apt.aceita_pet !== this.filtros.aceitaPet) return false;
            if (this.filtros.arCondicionado !== null && !!apt.ar_condicionado !== this.filtros.arCondicionado) return false;
            if (this.filtros.vagaGaragem !== null && !!apt.vaga_garagem !== this.filtros.vagaGaragem) return false;
            if (this.filtros.wifi !== null && !!apt.ssid_wifi !== this.filtros.wifi) return false;
            if (this.filtros.bairro && apt.bairro !== this.filtros.bairro) return false;

            return true;
        });
    }

    isApartamentoDisponivel(apartamento: Apartamento, checkIn: Date, checkOut: Date): boolean {
        const reservasDoApartamento = this.reservas.filter(r => r.apartamento_id === apartamento.id);

        return !reservasDoApartamento.some(reserva => {
            const reservaInicio = new Date(reserva.start_date);
            const reservaFim = new Date(reserva.end_data);

            // Verifica sobreposição de datas
            return checkIn < reservaFim && checkOut > reservaInicio;
        });
    }

    onApartamentoClick(apartamento: Apartamento): void {
        this.apartamentoSelecionado = apartamento;
        this.showModal = true;
    }

    onModalClose(): void {
        this.showModal = false;
        this.apartamentoSelecionado = null;
    }

    onReservaConfirmada(reserva: ReservaAirbnb): void {
        this.reservasService.createReservaManual(reserva).subscribe({
            next: () => {
                this.toastr.success('Reserva realizada com sucesso!');
                this.showModal = false;
                this.apartamentoSelecionado = null;
                // Recarregar para atualizar disponibilidade
                this.onBuscar(this.busca);
            },
            error: (error) => {
                console.error('Erro ao criar reserva:', error);
                this.toastr.error('Erro ao processar reserva. Tente novamente.');
            }
        });
    }

    get nightsCount(): number {
        if (!this.busca.checkIn || !this.busca.checkOut) return 0;
        const checkIn = new Date(this.busca.checkIn);
        const checkOut = new Date(this.busca.checkOut);
        const diff = checkOut.getTime() - checkIn.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
}
