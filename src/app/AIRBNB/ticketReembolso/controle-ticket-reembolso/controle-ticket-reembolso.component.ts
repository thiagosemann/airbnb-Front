// controle-ticket-reembolso.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';
import { TicketReembolso, TicketReembolsoArquivo } from 'src/app/shared/utilitarios/ticketReembolso';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';

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
  usuarios: User[] = [];
  activeStatusTab: string = 'PENDENTE';
  filtroForest = false;
  readonly FOREST_USER_ID = 6641;
  resumoMensal: { mes: string; total: number; totalPago: number; quantidade: number }[] = [];
  mesSelecionadoIndex = 0;

  constructor(
    private service: TicketReembolsoService,
    private fb: FormBuilder,
    private router: Router,
    private apartamentoService: ApartamentoService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.initForm();
    this.carregarApartamentos();
    this.carregarUsuarios();
  }

  carregarApartamentos() {
    this.apartamentoService.getAllApartamentos().subscribe(apts => {
      this.apartamentos = apts;
    });
  }

  carregarUsuarios() {
    this.userService.getUsersByRole('admin').subscribe({
      next: u => (this.usuarios = u),
    });
  }

  getUserName(id: number | undefined): string {
    if (!id) return '-';
    const u = this.usuarios.find(x => x.id === id);
    return u ? u.first_name : '-';
  }

  loadTickets() {
    this.service.getAllReembolsos().subscribe(list => {
      this.tickets = list;
      this.tickets.forEach(t => {
        t.valor_total = (Number(t.valor_material) || 0) + (Number(t.valor_mao_obra) || 0);
      });
      this.tickets.sort((a, b) => Number(b.id) - Number(a.id));
      this.calcularResumoMensal();
      this.filtrarTickets();
    });
  }

  calcularResumoMensal() {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const mapa: { [key: string]: { total: number; totalPago: number; quantidade: number } } = {};
    this.tickets.forEach(t => {
      if (!t.created_at) return;
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mapa[key]) mapa[key] = { total: 0, totalPago: 0, quantidade: 0 };
      mapa[key].total += t.valor_total || 0;
      if (t.status === 'PAGO') mapa[key].totalPago += t.valor_total || 0;
      mapa[key].quantidade++;
    });
    const chaves = Object.keys(mapa).sort((a, b) => b.localeCompare(a));
    this.resumoMensal = chaves.map(key => {
      const [year, month] = key.split('-');
      return { mes: `${MESES[Number(month) - 1]}/${year}`, ...mapa[key] };
    });
    const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const idx = chaves.indexOf(mesAtual);
    this.mesSelecionadoIndex = idx >= 0 ? idx : 0;
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
      link_pagamento: [''],
      user_id: [null],
    });
  }

  setStatusTab(tab: string) {
    this.activeStatusTab = tab;
    this.filtrarTickets();
  }

  toggleFiltroForest() {
    this.filtroForest = !this.filtroForest;
    this.filtrarTickets();
  }

  filtrarTickets() {
    const term = this.searchTerm.toLowerCase();
    this.ticketsFiltrados = this.tickets.filter(t => {
      const matchSearch =
        (t.apartamento_nome ?? '').toLowerCase().includes(term) ||
        (t.item_problema ?? '').toLowerCase().includes(term) ||
        (t.status ?? '').toLowerCase().includes(term);
      const matchStatus = this.activeStatusTab === '' || (t.status ?? '') === this.activeStatusTab;
      const matchForest = !this.filtroForest || t.user_id === this.FOREST_USER_ID;
      return matchSearch && matchStatus && matchForest;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDENTE': return 'status-pendente';
      case 'REALIZADO': return 'status-realizado';
      case 'PAGO': return 'status-pago';
      default: return '';
    }
  }

  editarTicket(ticket: TicketReembolso) {
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