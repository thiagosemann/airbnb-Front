import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';
import { TicketReembolso, TicketReembolsoArquivo } from 'src/app/shared/utilitarios/ticketReembolso';

@Component({
  selector: 'app-controle-ticket-reembolso',
  templateUrl: './controle-ticket-reembolso.component.html',
  styleUrls: ['./controle-ticket-reembolso.component.css']
})
export class ControleTicketReembolsoComponent implements OnInit {
  tickets: TicketReembolso[] = [];
  ticketsFiltrados: TicketReembolso[] = [];
  showModal = false;
  form!: FormGroup;
  selectedId?: number;
  arquivosModal: TicketReembolsoArquivo[] = [];
  searchTerm: string = '';
  constructor(
    private service: TicketReembolsoService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.initForm();
  }

  loadTickets() {
    this.service.getAllReembolsos().subscribe(list => {
      console.log(list)
      this.tickets = list;
      this.ticketsFiltrados = [...list];
      this.ticketsFiltrados.sort((a, b) => Number(b.id) - Number(a.id));
    });
  }

  initForm() {
    this.form = this.fb.group({
      apartamento_id: ['', Validators.required],
      item_problema: ['', Validators.required],
      descricao_problema: [''],
      solucao: [''],
      status: ['PENDENTE', Validators.required],
      data_autorizacao: [null],
      valor_material: [null],
      valor_mao_obra: [null],
      data_conclusao: [null],
    });
  }

  filtrarTickets() {
    const term = this.searchTerm.toLowerCase();
    this.ticketsFiltrados = this.tickets.filter(t =>
      t.apartamento_id?.toString().includes(term) ||
      (t.item_problema ?? '').toLowerCase().includes(term) ||
      (t.status ?? '').toLowerCase().includes(term)
    );
  }

  editarTicket(ticket: TicketReembolso) {
    if (!ticket.id) return;
    this.selectedId = ticket.id;
    this.arquivosModal = [];
    // Busca atualizado com arquivos
    this.service.getReembolsoById(ticket.id).subscribe((resp) => {
      console.log(resp);
      this.form.patchValue({
        ...resp,
        data_autorizacao: resp.data_autorizacao ? resp.data_autorizacao.substring(0, 10) : null,
        data_conclusao: resp.data_conclusao ? resp.data_conclusao.substring(0, 10) : null,
        // outros campos que precisar
      });
      this.arquivosModal = resp.files || [];
      this.showModal = true;
    });
  }

  fecharModal() {
    this.showModal = false;
  }

  onSubmit() {
    const payload: Partial<TicketReembolso> = {
      ...this.form.value,
      data_autorizacao: this.form.value.data_autorizacao || null,
      data_conclusao: this.form.value.data_conclusao || null
    };
    if (this.selectedId != null) {
      this.service.updateReembolso(this.selectedId, payload).subscribe(() => {
        this.loadTickets();
        this.fecharModal();
      });
    }
  }

  excluirTicket(id: number) {
    if (!confirm('Confirma a exclusão deste ticket?')) return;
    this.service.deleteReembolso(id).subscribe(() => this.loadTickets());
  }

  redirectToNovoTicket() {
    this.router.navigate(['/ticket-reembolso']);
  }
}
