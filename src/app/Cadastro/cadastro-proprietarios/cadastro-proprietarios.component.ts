// cadastro-proprietarios.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ApartamentosProprietarioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamentos_proprietario_service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-cadastro-proprietarios',
  templateUrl: './cadastro-proprietarios.component.html',
  styleUrls: ['./cadastro-proprietarios.component.css','./cadastro-proprietarios2.component.css','./cadastro-proprietarios3.component.css']
})
export class CadastroProprietariosComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  showModal = false;
  isEditing = false;
  selectedUserId: number | null = null;
  userForm: FormGroup;
  isLoading = false;
  searchTerm: string = "";
  userCheckins: any[] = [];
  apartamentos: Apartamento[] = [];
  apartamentosSelecionados: number[] = [];
  searchAptoTerm: string = '';
  apartamentosFiltrados: Apartamento[] = [];
  sortKey: 'nome' | 'qtd' = 'nome';
  sortDir: 'asc' | 'desc' = 'asc';
  apartamentosSemProprietario: Apartamento[] = [];
  selectedProprietarioPorApto: { [aptoId: number]: number | null } = {};
  showUnlinked = false;

  // Exportação
  showExportModal = false;
  showExportProgress = false;
  exportProgress = 0;
  exportTotal = 0;
  exportCancelled = false;

  // Apt names on demand + busca por apartamento
  expandedUserId: number | null = null;
  userAptosCache: { [userId: number]: any[] } = {};
  loadingUserAptos: { [userId: number]: boolean } = {};
  aptoNamesByUser: { [userId: number]: string[] } = {};

  constructor(
    private fb: FormBuilder,
    private usersService: UserService,
    private toastr: ToastrService,
    private apartamentoService: ApartamentoService,
    private aptoProprietarioService: ApartamentosProprietarioService
  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      cpf: ['', [Validators.required, cpfValidator]],
      Telefone: ['', Validators.required],
      email: ['', [Validators.email]],
      role: ['proprietario', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarApartamentos();
  }

  async carregarApartamentos() {
    try {
      const apartamentos = await firstValueFrom(this.apartamentoService.getAllApartamentos());
      this.apartamentos = apartamentos;
      this.apartamentosFiltrados = [...apartamentos];
      await this.atualizarApartamentosSemProprietario();
    } catch (error) {
      console.error('Erro ao carregar apartamentos:', error as any);
    }
  }

  private async atualizarApartamentosSemProprietario() {
    try {
      const semVinculo = await firstValueFrom(this.aptoProprietarioService.getApartamentosSemVinculo());
      this.apartamentosSemProprietario = Array.isArray(semVinculo) ? semVinculo as any[] : [];
    } catch (error) {
      console.error('Erro ao buscar apartamentos sem vínculo:', error);
      this.apartamentosSemProprietario = [];
    }

    const mapa: { [id: number]: number | null } = {};
    this.apartamentosSemProprietario.forEach(a => {
      mapa[a.id] = this.selectedProprietarioPorApto[a.id] ?? null;
    });
    this.selectedProprietarioPorApto = mapa;
  }

  filtrarApartamentos() {
    if (!this.searchAptoTerm) {
      this.apartamentosFiltrados = [...this.apartamentos];
      return;
    }
    const term = this.searchAptoTerm.toLowerCase().trim();
    this.apartamentosFiltrados = this.apartamentos.filter(apto =>
      apto.nome.toLowerCase().includes(term) ||
      apto.id.toString().includes(term)
    );
  }

  limparPesquisaAptos() {
    this.searchAptoTerm = '';
    this.apartamentosFiltrados = [...this.apartamentos];
  }

  async carregarUsuarios() {
    try {
      this.usersService.getProprietarios().subscribe(
        (users: User[]) => {
          this.users = this.applySort(users);
          this.filteredUsers = [...this.users];
          this.carregarAptosParaBusca(users);
        },
        (error) => {
          console.error('Erro ao carregar usuários:', error);
        }
      );
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }

  abrirModal() {
    this.showModal = true;
    this.isEditing = false;
    this.selectedUserId = null;
    this.apartamentosSelecionados = [];
    this.userForm.reset({ role: 'proprietario' });
  }

  fecharModal() {
    this.showModal = false;
    this.selectedUserId = null;
  }

  editarUsuario(user: any) {
    this.isEditing = true;
    this.selectedUserId = user.id;
    this.showModal = true;
    this.isLoading = true;
    this.apartamentosSelecionados = [];

    this.usersService.getUser(user.id).subscribe(
      (fetchedUser: User) => {
        this.userForm.patchValue({
          first_name: fetchedUser.first_name,
          last_name: fetchedUser.last_name,
          cpf: this.formatCPF(fetchedUser.cpf),
          Telefone: fetchedUser.Telefone,
          email: fetchedUser.email,
          role: fetchedUser.role
        });
        this.aptoProprietarioService.getApartamentosByProprietario(user.id).subscribe(
          (apartamentos: any[]) => {
            this.apartamentosSelecionados = apartamentos.map(a => a.id);
            this.ordenarApartamentosFiltrados();
            this.isLoading = false;
          },
          (_err) => {
            this.isLoading = false;
          }
        );
      },
      (error) => {
        this.isLoading = false;
        console.error('Erro ao carregar usuário:', error);
      }
    );
  }

  ordenarApartamentosFiltrados() {
    this.apartamentosFiltrados = [
      ...this.apartamentos.filter(a => this.apartamentosSelecionados.includes(a.id)),
      ...this.apartamentos.filter(a => !this.apartamentosSelecionados.includes(a.id))
    ];
  }

  async excluirUsuario(userId: number) {
    if (confirm('Tem certeza que deseja excluir este proprietário?')) {
      this.usersService.deleteUser(userId).subscribe({
        next: () => {
          this.carregarUsuarios();
          this.toastr.success('Proprietário excluído com sucesso!');
        },
        error: (error) => {
          console.error('Erro ao excluir usuário:', error);
          this.toastr.error('Erro ao excluir proprietário');
        }
      });
    }
  }

  async salvarUsuario() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      const cpfCtrl = this.userForm.get('cpf');
      if (cpfCtrl?.errors?.['cpfCnpjInvalido']) {
        this.toastr.warning('CPF/CNPJ inválido. Verifique o documento informado.');
      } else {
        this.toastr.warning('Preencha os campos obrigatórios');
      }
      return;
    }

    let userData = this.userForm.value;
    userData.cpf = userData.cpf.replace(/\D/g, '');
    userData.id = this.selectedUserId;
    userData.role = 'proprietario';

    try {
      if (this.isEditing && this.selectedUserId) {
        await this.usersService.updateUser(userData).toPromise();
        await this.atualizarVinculosApartamentos();
        this.toastr.success('Proprietário atualizado com sucesso!');
      } else {
        const resp: any = await this.usersService.addUser(userData).toPromise();
        const novoId = resp?.insertId;
        if (novoId) {
          this.selectedUserId = novoId;
          await this.atualizarVinculosApartamentos();
        }
        this.toastr.success('Proprietário criado com sucesso!');
      }

      this.fecharModal();
      this.carregarUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      this.toastr.error('Erro ao salvar proprietário');
    }
  }

  private async atualizarVinculosApartamentos() {
    if (!this.selectedUserId) return;
    await this.aptoProprietarioService.removeAllApartamentosFromProprietario(this.selectedUserId).toPromise();
    const requests = this.apartamentosSelecionados.map(aptoId =>
      this.aptoProprietarioService.addProprietarioToApartamento(aptoId, this.selectedUserId!).toPromise()
    );
    await Promise.all(requests);
  }

  filtrar(): void {
    const termo = this.searchTerm.toLowerCase().trim();
    if (!termo) {
      this.filteredUsers = this.applySort(this.users);
      return;
    }
    this.filteredUsers = this.applySort(
      this.users.filter(user =>
        (user.first_name + ' ' + user.last_name).toLowerCase().includes(termo) ||
        user.cpf.replace(/\D/g, '').includes(termo) ||
        (user.Telefone?.replace(/\D/g, '') || '').includes(termo) ||
        (user.email?.toLowerCase() || '').includes(termo) ||
        (this.aptoNamesByUser[user.id!] || []).some(nome => nome.includes(termo))
      )
    );
  }

  async vincularApartamentoSemProprietario(aptoId: number) {
    const proprietarioId = this.selectedProprietarioPorApto[aptoId];
    if (!proprietarioId) {
      this.toastr.warning('Selecione um proprietário para vincular.');
      return;
    }
    try {
      await this.aptoProprietarioService.addProprietarioToApartamento(aptoId, proprietarioId).toPromise();
      this.toastr.success('Apartamento vinculado com sucesso.');
      await Promise.all([this.carregarApartamentos(), this.carregarUsuarios()]);
    } catch (error) {
      console.error('Erro ao vincular apartamento:', error);
      this.toastr.error('Erro ao vincular apartamento.');
    }
  }

  private async carregarAptosParaBusca(users: User[]) {
    await Promise.all(users.map(async (user) => {
      try {
        const aptos = await firstValueFrom(this.aptoProprietarioService.getApartamentosByProprietario(user.id!));
        const lista = Array.isArray(aptos) ? aptos : [];
        this.userAptosCache[user.id!] = lista;
        this.aptoNamesByUser[user.id!] = lista.map((a: any) => (a.nome || '').toLowerCase());
      } catch {
        this.aptoNamesByUser[user.id!] = [];
      }
    }));
  }

  async toggleAptoDetails(userId: number) {
    if (this.expandedUserId === userId) {
      this.expandedUserId = null;
      return;
    }
    this.expandedUserId = userId;
    if (!this.userAptosCache[userId]) {
      this.loadingUserAptos[userId] = true;
      try {
        const aptos = await firstValueFrom(this.aptoProprietarioService.getApartamentosByProprietario(userId));
        this.userAptosCache[userId] = Array.isArray(aptos) ? aptos : [];
      } catch {
        this.userAptosCache[userId] = [];
      } finally {
        this.loadingUserAptos[userId] = false;
      }
    }
  }

  formatCPF(cpf: string): string {
    if (!cpf) return '';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpf;
  }

  formtarTelefone(telefone: string | undefined): string {
    if (!telefone) return '';
    const formatedTelefone = telefone.replace(/\D/g, '');
    return formatedTelefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  getAptoName(aptoId: number): string {
    const apto = this.apartamentos.find(a => a.id === aptoId);
    return apto ? apto.nome : 'Apartamento não encontrado';
  }

  toggleAptoSelection(aptoId: number) {
    if (this.apartamentosSelecionados.includes(aptoId)) {
      this.apartamentosSelecionados = this.apartamentosSelecionados.filter(id => id !== aptoId);
    } else {
      this.apartamentosSelecionados = [...this.apartamentosSelecionados, aptoId];
    }
  }

  abrirModalExport() {
    this.showExportModal = true;
  }

  async confirmarExport(incluirAptos: boolean) {
    this.showExportModal = false;
    await this.exportarCSV(incluirAptos);
  }

  cancelarExport() {
    this.exportCancelled = true;
  }

  async exportarCSV(incluirAptos: boolean) {
    this.showExportProgress = true;
    this.exportCancelled = false;
    this.exportProgress = 0;

    const usuariosOrdenados = [...this.users].sort((a, b) => {
      const nomeA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const nomeB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return nomeA.localeCompare(nomeB) || (a.id || 0) - (b.id || 0);
    });

    this.exportTotal = usuariosOrdenados.length;
    const dadosUsuarios: { user: User; aptos: any[] }[] = [];

    for (const user of usuariosOrdenados) {
      if (this.exportCancelled) {
        this.showExportProgress = false;
        this.toastr.info('Exportação cancelada');
        return;
      }

      let aptos: any[] = [];
      if (incluirAptos) {
        try {
          const result = await firstValueFrom(
            this.aptoProprietarioService.getApartamentosByProprietario(user.id!)
          );
          aptos = Array.isArray(result) ? result : [];
        } catch {
          aptos = [];
        }
      }

      dadosUsuarios.push({ user, aptos });
      this.exportProgress++;
    }

    if (this.exportCancelled) {
      this.showExportProgress = false;
      return;
    }

    const maxAptos = incluirAptos
      ? Math.max(0, ...dadosUsuarios.map(d => d.aptos.length))
      : 0;

    const baseHeaders = ['Nome', 'CPF/CNPJ', 'Telefone', 'Email'];
    const aptoHeaders = Array.from({ length: maxAptos }, (_, i) => `Apartamento ${i + 1}`);
    const headers = [...baseHeaders, ...aptoHeaders];

    const linhas: string[] = [headers.join(',')];

    for (const { user, aptos } of dadosUsuarios) {
      const row = [
        this.csvEscape(`${user.first_name || ''} ${user.last_name || ''}`.trim()),
        this.csvEscape(this.formatCPF(user.cpf)),
        this.csvEscape(this.formtarTelefone(user.Telefone)),
        this.csvEscape(user.email || '')
      ];

      for (let i = 0; i < maxAptos; i++) {
        row.push(this.csvEscape(aptos[i]?.nome || ''));
      }

      linhas.push(row.join(','));
    }

    // BOM para Excel abrir com encoding correto
    const csvContent = '﻿' + linhas.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proprietarios.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showExportProgress = false;
    this.toastr.success('Arquivo exportado com sucesso.');
  }

  private csvEscape(valor: string): string {
    if (valor == null) return '';
    const needsQuotes = /[",\n\r]/.test(valor);
    let v = String(valor).replace(/"/g, '""');
    return needsQuotes ? `"${v}"` : v;
  }

  changeSort(key: 'nome' | 'qtd') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.filteredUsers = this.applySort(this.filteredUsers);
  }

  private applySort(list: User[]): User[] {
    const sorted = [...list].sort((a, b) => {
      if (this.sortKey === 'nome') {
        const nomeA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nomeB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        const comp = nomeA.localeCompare(nomeB);
        if (comp !== 0) return comp;
        return (a.id || 0) - (b.id || 0);
      }
      const qtdA = Number(a.qtd_apartamentos || 0);
      const qtdB = Number(b.qtd_apartamentos || 0);
      if (qtdA !== qtdB) return qtdA - qtdB;
      const nomeA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const nomeB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return nomeA.localeCompare(nomeB);
    });
    return this.sortDir === 'asc' ? sorted : sorted.reverse();
  }
}

export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const documento = (control.value || '').replace(/\D/g, '');
  if (!documento) return { cpfCnpjInvalido: true };
  if (documento.length === 11) return isValidCPF(documento) ? null : { cpfCnpjInvalido: true };
  if (documento.length === 14) return isValidCNPJ(documento) ? null : { cpfCnpjInvalido: true };
  return { cpfCnpjInvalido: true };
}

function isValidCPF(cpf: string): boolean {
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  return true;
}

function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcDigit = (weights: number[], length: number) => {
    let total = 0;
    for (let i = 0; i < length; i++) total += parseInt(cnpj.charAt(i)) * weights[i];
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const digit1 = calcDigit(weights1, 12);
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;
  const digit2 = calcDigit(weights2, 13);
  if (digit2 !== parseInt(cnpj.charAt(13))) return false;
  return true;
}
