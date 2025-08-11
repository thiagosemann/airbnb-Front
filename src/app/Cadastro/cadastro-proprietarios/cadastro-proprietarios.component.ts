// cadastro-proprietarios.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ApartamentosProprietarioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamentos_proprietario_service';

@Component({
  selector: 'app-cadastro-proprietarios',
  templateUrl: './cadastro-proprietarios.component.html',
  styleUrls: ['./cadastro-proprietarios.component.css']
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
      cpf: ['', [Validators.required, Validators.pattern(/^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/)]],
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
      },
      (error) => {
        console.error('Erro ao carregar apartamentos:', error);
      }
    );
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

  async excluirUsuario(userId: number) {
    if (confirm('Tem certeza que deseja excluir este proprietário?')) {
      try {
        await this.usersService.deleteUser(userId);
        this.carregarUsuarios();
        this.toastr.success('Proprietário excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        this.toastr.error('Erro ao excluir proprietário');
      }
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
        const novoId = resp?.id || resp?.user?.id;
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
}