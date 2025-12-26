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

  carregarApartamentos() {
    this.apartamentoService.getAllApartamentos().subscribe(
      (apartamentos: Apartamento[]) => {
        this.apartamentos = apartamentos;
        this.apartamentosFiltrados = [...apartamentos]; // Inicializa com todos os apartamentos
      },
      (error) => {
        console.error('Erro ao carregar apartamentos:', error);
      }
    );
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
      this.usersService.getUsers().subscribe(
        (users: User[]) => {
          this.users = users.filter(u => u.role === 'proprietario');
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
          cpf: fetchedUser.cpf.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            '$1.$2.$3-$4'
          )
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
      this.filteredUsers = [...this.users];
      return;
    }
  
    this.filteredUsers = this.users.filter(user => 
      (user.first_name + ' ' + user.last_name).toLowerCase().includes(termo) ||
      user.cpf.replace(/\D/g, '').includes(termo) ||
      (user.Telefone?.replace(/\D/g, '') || '').includes(termo) ||
      user.role.toLowerCase().includes(termo)
    );
  }

  formatCPF(cpf: string): string {
    if (!cpf) return '';
    const formatedCpf = cpf.replace(/\D/g, '');
    return formatedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
}

// Validador customizado para CPF
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const cpf = (control.value || '').replace(/\D/g, '');
  if (!cpf || cpf.length !== 11) return { cpfInvalido: true };
  if (/^(\d)\1+$/.test(cpf)) return { cpfInvalido: true };
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return { cpfInvalido: true };
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return { cpfInvalido: true };
  return null;
}