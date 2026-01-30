import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { Apartment } from 'src/app/shared/utilitarios/calendario';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Component({
  selector: 'app-criador-reserva-calendario',
  templateUrl: './criador-reserva-calendario.component.html',
  styleUrls: ['./criador-reserva-calendario.component.css']
})
export class CriadorReservaCalendarioComponent {
  // Inputs from parent component
  @Input() apartments: Apartment[] = [];
  @Input() showModal = false;
  @Input() startDate: string | null = null;
  @Input() endDate: string | null = null;
  @Input() apartmentId: number | null = null;
  @Input() warningMessage = '';
  @Input() editMode = false;
  @Input() reservationToEdit: ReservaAirbnb | null = null;

  // Outputs to communicate with parent
  @Output() modalClosed = new EventEmitter<void>();
  @Output() reservationSaved = new EventEmitter<void>();
  @Output() reservationDeleted = new EventEmitter<void>();

  // Modal state
  newReservation: Partial<ReservaAirbnb> = {};
  loading = false;

  constructor(private reservasAirbnbService: ReservasAirbnbService) { }

  ngOnChanges(): void {
    // Initialize form when modal opens with new data
    if (this.showModal) {
      if (this.editMode && this.reservationToEdit) {
        this.loadReservationForEdit();
      } else {
        this.initializeReservation();
      }
    }
  }

  private initializeReservation(): void {
    this.newReservation = {
      apartamento_id: this.apartmentId ?? (this.apartments.length > 0 ? this.apartments[0].id : undefined),
      start_date: this.startDate ?? undefined,
      end_data: this.endDate ?? undefined,
      description: 'reserved',
      qtd_hospedes: 1,
      Observacoes: '',
      precisa_limpeza: false
    };
  }

  private loadReservationForEdit(): void {
    if (!this.reservationToEdit) return;
    console.log('Reserva para edição:', this.reservationToEdit);
    this.newReservation = {
      id: this.reservationToEdit.id,
      apartamento_id: this.reservationToEdit.apartamento_id,
      start_date: this.reservationToEdit.start_date,
      end_data: this.reservationToEdit.end_data,
      description: this.reservationToEdit.description,
      Observacoes: this.reservationToEdit.Observacoes,
      precisa_limpeza: this.reservationToEdit.description.includes('CANCELADA-VERIFICADA') ? true : false
    };
  }

  closeModal(): void {
    this.newReservation = {};
    this.loading = false;
    this.modalClosed.emit();
  }

  saveReservation(): void {
    if (!this.newReservation.apartamento_id || !this.newReservation.start_date || !this.newReservation.end_data) {
      alert('Dados incompletos');
      return;
    }

    this.loading = true;

    if (this.editMode && this.newReservation.id) {
      // Update existing reservation
      // Se não precisa de limpeza (precisa_limpeza = true), status = CANCELADA-VERIFICADA
      const status = this.newReservation.precisa_limpeza ? 'CANCELADA-VERIFICADA' : 'Reserved';
      const payload: Partial<ReservaAirbnb> = {
        id: this.newReservation.id,
        apartamento_id: this.newReservation.apartamento_id,
        start_date: this.newReservation.start_date,
        end_data: this.newReservation.end_data,
        description: status,
        Observacoes: this.newReservation.Observacoes || '',
        precisa_limpeza: this.newReservation.precisa_limpeza ?? false
      };

      console.log('Payload atualização:', payload);

      this.reservasAirbnbService.updateReserva(payload as ReservaAirbnb).subscribe({
        next: (res) => {
          console.log('Resposta do backend:', res);
          alert('Reserva atualizada com sucesso!');
          this.closeModal();
          this.reservationSaved.emit();
        },
        error: (err) => {
          console.error('Erro ao atualizar reserva:', err);
          alert('Erro ao atualizar reserva.');
          this.loading = false;
        }
      });
    } else {
      // Create new reservation
      // Se não precisa de limpeza (precisa_limpeza = true), status = CANCELADA-VERIFICADA
      const status = this.newReservation.precisa_limpeza ? 'CANCELADA-VERIFICADA' : 'Reserved';
      const payload: Partial<ReservaAirbnb> = {
        apartamento_id: this.newReservation.apartamento_id,
        start_date: this.newReservation.start_date,
        end_data: this.newReservation.end_data,
        description: status,
        Observacoes: this.newReservation.Observacoes || '',
        precisa_limpeza: this.newReservation.precisa_limpeza ?? false,
        credencial_made: false,
        informed: false
      };

      console.log('Payload criação:', payload);

      this.reservasAirbnbService.createReservaManual(payload as ReservaAirbnb).subscribe({
        next: (res) => {
          console.log('Resposta do backend:', res);
          alert('Reserva criada com sucesso!');
          this.closeModal();
          this.reservationSaved.emit();
        },
        error: (err) => {
          console.error('Erro ao criar reserva:', err);
          alert('Erro ao criar reserva.');
          this.loading = false;
        }
      });
    }
  }

  deleteReservation(): void {
    if (!this.newReservation.id) {
      alert('Reserva não encontrada.');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar esta reserva?')) {
      return;
    }

    this.loading = true;
    this.reservasAirbnbService.deleteReserva(this.newReservation.id).subscribe({
      next: () => {
        alert('Reserva deletada com sucesso!');
        this.closeModal();
        this.reservationDeleted.emit();
      },
      error: (err) => {
        console.error('Erro ao deletar reserva:', err);
        alert('Erro ao deletar reserva.');
        this.loading = false;
      }
    });
  }
}
