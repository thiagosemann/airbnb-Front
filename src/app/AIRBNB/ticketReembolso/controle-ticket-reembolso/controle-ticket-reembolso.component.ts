// controle-ticket-reembolso.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';
import { TicketReembolso, TicketReembolsoArquivo } from 'src/app/shared/utilitarios/ticketReembolso';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';

@Component({
  selector: 'app-controle-ticket-reembolso',
  templateUrl: './controle-ticket-reembolso.component.html',
  styleUrls: ['./controle-ticket-reembolso.component.css','./controle-ticket-reembolso2.component.css','./controle-ticket-reembolso3.component.css']
})
export class ControleTicketReembolsoComponent implements OnInit {
  tickets: TicketReembolso[] = [];
  ticketsFiltrados: TicketReembolso[] = [];
  showModal = false;
  form!: FormGroup;
  selectedId?: number;
  arquivosModal: TicketReembolsoArquivo[] = [];
  searchTerm: string = '';
  apartamentos: Apartamento[] = [];

  constructor(
    private service: TicketReembolsoService,
    private fb: FormBuilder,
    private router: Router,
    private apartamentoService: ApartamentoService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.initForm();
    this.carregarApartamentos();
  }

  carregarApartamentos() {
    this.apartamentoService.getAllApartamentos().subscribe(apts => {
      this.apartamentos = apts;
    });
  }

  loadTickets() {
    this.service.getAllReembolsos().subscribe(list => {
      this.tickets = list;
      this.ticketsFiltrados = [...list];
      this.ticketsFiltrados.sort((a, b) => Number(b.id) - Number(a.id));
      this.somarValores();
    });
  }

  initForm() {
    this.form = this.fb.group({
      apartamento_id: ['', Validators.required],
      item_problema: ['', Validators.required],
      descricao_problema: ['', Validators.required],
      solucao: ['', Validators.required],
      status: ['Aberto', Validators.required],
      notificado_forest: [0, Validators.required],
      data_notificacao: [null],
      valor_material: [null],
      valor_mao_obra: [null],
      data_realizado: [null],
      pagamento_confirmado: [0, Validators.required],
      data_pagamento: [null],
      created_at: [null],
      updated_at: [null],
      auth: [''],
      link_pagamento: ['']
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDENTE': return 'status-pendente';
      case 'AUTORIZADO': return 'status-autorizado';
      case 'AGUARDANDO PAGAMENTO': return 'status-pagamento';
      case 'PAGO': return 'status-pago';
      case 'CANCELADO': return 'status-cancelado';
      default: return '';
    }
  }

  editarTicket(ticket: TicketReembolso) {
    console.log('Editando ticket:', ticket);
    if (!ticket.id) return;
    this.selectedId = ticket.id;
    this.arquivosModal = [];
    this.service.getReembolsoById(ticket.id).subscribe((resp) => {
      this.form.patchValue({
        ...resp,
        data_autorizacao: undefined, // removido pois não existe mais
        data_conclusao: undefined, // removido pois não existe mais
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
      ...this.form.value
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
    this.router.navigate(['/ticketReembolso']);
  }

  deletarArquivo(file: TicketReembolsoArquivo, index: number) {
    if (!file.id) return;
    if (!confirm('Deseja remover este arquivo?')) return;
    this.service.deleteArquivoReembolso(file.id).subscribe(() => {
      this.arquivosModal.splice(index, 1);
      this.arquivosModal = [...this.arquivosModal]; // força atualização
    });
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !this.selectedId) return;
    const files = Array.from(input.files);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove prefix if exists
        const imagemBase64 = base64.split(',')[1] || base64;
        this.service.createArquivoReembolso(this.selectedId!, imagemBase64, file.type).subscribe(resp => {
          this.arquivosModal.push({
            id: resp.insertId,
            file_name: file.name,
            imagemBase64: 'data:' + file.type + ';base64,' + imagemBase64,
            type: file.type
          });
          this.arquivosModal = [...this.arquivosModal];
        });
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  somarValores() {
    this.ticketsFiltrados.forEach(ticket => {
      ticket.valor_total = (Number(ticket.valor_material) || 0) + (Number(ticket.valor_mao_obra) || 0);
    });
  }

  baixarArquivo(arquivo: TicketReembolsoArquivo, index: number) {
    // Detecta extensão
    let ext = 'file';
    if (arquivo.type.includes('pdf')) ext = 'pdf';
    else if (arquivo.type.includes('png')) ext = 'png';
    else if (arquivo.type.includes('jpeg') || arquivo.type.includes('jpg')) ext = 'jpg';
    else if (arquivo.type.includes('image')) ext = 'img';
    const nome = arquivo.file_name || `Arquivo-${index+1}.${ext}`;
    // Remove prefixo se existir
    let base64 = arquivo.imagemBase64;
    let contentType = arquivo.type;
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      contentType = parts[0].split(':')[1].split(';')[0];
      base64 = parts[1];
    }
    // Converte base64 para Blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    // Cria link para download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  calcularDiasDesde(data: string | undefined | null): number | null {
    if (!data) return null;
    const dataCriacao = new Date(data);
    const hoje = new Date();
    // Zera horas para comparar só datas
    dataCriacao.setHours(0,0,0,0);
    hoje.setHours(0,0,0,0);
    const diffMs = hoje.getTime() - dataCriacao.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}