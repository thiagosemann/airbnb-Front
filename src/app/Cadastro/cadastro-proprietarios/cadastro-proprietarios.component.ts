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
      role: ['proprietario', Validators.required],
      imagemBase64: [''],
      documentBase64: ['']
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
      // Backend já retorna { id, nome }
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
          console.log('Usuários proprietários carregados:', users);
          this.users = this.applySort(users);
          this.filteredUsers = [...this.users];
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
    this.userForm.reset({
      role: 'proprietario',
      imagemBase64: '',
      documentBase64: ''
    });
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
          ...fetchedUser,
          cpf: this.formatCPF(fetchedUser.cpf)
        });
        // Buscar apartamentos já vinculados
        this.aptoProprietarioService.getApartamentosByProprietario(user.id).subscribe(
          (apartamentos: any[]) => {
            this.apartamentosSelecionados = apartamentos.map(a => a.id);
            this.ordenarApartamentosFiltrados();
            this.isLoading = false;
          },
          (err) => {
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
      this.toastr.warning('Preencha os campos obrigatórios');
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

    // Remove todos os vínculos existentes
    await this.aptoProprietarioService.removeAllApartamentosFromProprietario(this.selectedUserId).toPromise();
    
    // Adiciona os novos vínculos
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
        user.role.toLowerCase().includes(termo)
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

  async exportApartamentosPorProprietario() {
    try {
      const usuariosOrdenados = [...this.users].sort((a, b) => {
        const nomeA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nomeB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        if (nomeA && nomeB && nomeA !== nomeB) return nomeA.localeCompare(nomeB);
        return (a.id || 0) - (b.id || 0);
      });

      const linhas: string[] = [];
      const header = ['proprietario_id', 'proprietario_nome', 'apartamento_nome', 'apartamento_id'];
      linhas.push(header.join(','));

      for (const user of usuariosOrdenados) {
        const idProp = user.id!;
        const nomeProp = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        let aptosDoProp: any[] = [];

        try {
          const result = await firstValueFrom(this.aptoProprietarioService.getApartamentosByProprietario(idProp));
          aptosDoProp = Array.isArray(result) ? result : [];
        } catch (e) {
          aptosDoProp = [];
        }

        if (!aptosDoProp || aptosDoProp.length === 0) {
          // Fallback: tenta mapear por campo proprietario_id se existir
          aptosDoProp = this.apartamentos.filter(a => (a as any).proprietario_id === idProp).map(a => ({ id: a.id, nome: a.nome }));
        }

        for (const apto of aptosDoProp) {
          const aptoId = apto.id;
          const aptoNome = apto.nome || this.getAptoName(aptoId);
          const row = [
            String(idProp),
            this.csvEscape(nomeProp),
            this.csvEscape(aptoNome),
            String(aptoId)
          ].join(',');
          linhas.push(row);
        }
      }

      const csvContent = linhas.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apartamentos_por_proprietario.csv';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toastr.success('Arquivo CSV gerado com sucesso.');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      this.toastr.error('Erro ao gerar exportação');
    }
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

// Validador customizado para CPF
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const documento = (control.value || '').replace(/\D/g, '');

  if (!documento) return { cpfCnpjInvalido: true };

  if (documento.length === 11) {
    return isValidCPF(documento) ? null : { cpfCnpjInvalido: true };
  }

  if (documento.length === 14) {
    return isValidCNPJ(documento) ? null : { cpfCnpjInvalido: true };
  }

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
    for (let i = 0; i < length; i++) {
      total += parseInt(cnpj.charAt(i)) * weights[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const digit1 = calcDigit(weights1, 12);
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;

  const digit2 = calcDigit(weights2, 13);
  if (digit2 !== parseInt(cnpj.charAt(13))) return false;

  return true;
}