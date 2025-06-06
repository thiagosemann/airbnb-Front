// users-control.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-users-control',
  templateUrl: './users-control.component.html',
  styleUrls: ['./users-control.component.css']
})
export class UsersControlComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  showModal = false;
  isEditing = false;
  selectedUserId: number | null = null;
  userForm: FormGroup;
  isLoading = false;           // ← nova flag
  searchTerm:string = "";
  userCheckins: any[] = []; // ← armazena os check-ins do user

  constructor(
    private fb: FormBuilder,
    private usersService: UserService,
    private sanitizer: DomSanitizer,
    private checkinService: CheckInFormService,
    private toastr: ToastrService,
    
  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
      Telefone: ['', Validators.required],
      email: ['', [Validators.email]],
      role: ['guest', Validators.required],
      imagemBase64: [''],
      documentBase64: ['']
    });
  }

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  async carregarUsuarios() {
    try {
      this.usersService.getUsers().subscribe(
        (users: User[]) => {
          console.log(users);
          this.users = users;
          this.filteredUsers = [...users]; // Inicializa filteredUsers
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
  
    // Reseta o form e limpa validação de imagens
    this.userForm.reset({
      role: 'guest',
      imagemBase64: '',
      documentBase64: ''
    });
    this.userForm.get('imagemBase64')!.clearValidators();
    this.userForm.get('imagemBase64')!.updateValueAndValidity();
    this.userForm.get('documentBase64')!.clearValidators();
    this.userForm.get('documentBase64')!.updateValueAndValidity();
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
  
    // faz obrigatória a presença de imagens ao submeter edição
    this.userForm.get('imagemBase64')!.setValidators(Validators.required);
    this.userForm.get('imagemBase64')!.updateValueAndValidity();
    this.userForm.get('documentBase64')!.setValidators(Validators.required);
    this.userForm.get('documentBase64')!.updateValueAndValidity();
  
    this.usersService.getUser(user.id).subscribe(
      (fetchedUser: User) => {
        this.userForm.patchValue({
          ...fetchedUser,
          cpf: fetchedUser.cpf.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            '$1.$2.$3-$4'
          )
        });
          // 2) depois de preencher o form, busca os check-ins
          this.checkinService.getCheckinsByUserId(user.id).subscribe(
            (checkins: any[]) => 
              this.userCheckins = checkins,
            err => {
              console.error('Erro ao carregar check-ins:', err);
              this.userCheckins = [];
            }
          );
        this.isLoading = false;
      },
      (error) => {
        console.error('Erro ao carregar usuário:', error);
      }
    );
  }
  
  

  async excluirUsuario(userId: number) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await this.usersService.deleteUser(userId);
        this.carregarUsuarios();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  }

  onFileSelected(event: any, field: string) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.userForm.patchValue({ [field]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  }

  async salvarUsuario() {
    //if (this.userForm.invalid) return;

    let userData = this.userForm.value;
    userData.cpf = userData.cpf.replace(/\D/g, '');
    userData.id = this.selectedUserId;
    try {
      if (this.isEditing && this.selectedUserId) {
        console.log(userData)
          this.usersService.updateUser(userData).subscribe(
            (resp) => {
              // aqui você pode exibir uma mensagem de sucesso se quiser
              this.fecharModal();
              this.carregarUsuarios();
              this.toastr.success('Usuário atualizado com sucesso!');

            },
            (err) => {
              console.error('Erro ao atualizar usuário:', err);
            }
          );
      } else {
        this.usersService.addUser(userData).subscribe(
            (resp) => {
              // aqui você pode exibir uma mensagem de sucesso se quiser
              this.fecharModal();
              this.carregarUsuarios();
              this.toastr.success('Usuário criado com sucesso!');

            },
            (err) => {
              console.error('Erro ao atualizar usuário:', err);
            }
          );
      }

    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  }

  isPDF(base64: string): boolean {
    // Verifica se o base64 começa com o cabeçalho de um PDF
    return base64.startsWith('JVBERi0'); // Assinatura de um arquivo PDF em base64
  }
  
  // Função para criar uma URL segura para exibição do PDF
  getSafeUrl(base64: string): SafeResourceUrl {
    const pdfSrc = `data:application/pdf;base64,${base64}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(pdfSrc);
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
      user.Telefone?.replace(/\D/g, '').includes(termo) ||
      user.role.toLowerCase().includes(termo)
    );
  }
  formatCPF(cpf:string):string{
    let formatedCpf = cpf.replace(/\D/g, ''); // Remove caracteres não numéricos
    // trasnformar cpf de 11 digitos para ficar com . e traço
    formatedCpf = formatedCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return formatedCpf
  }
  formtarTelefone(telefone:string | undefined):string{
    if(!telefone){
      return ''
    }
    let formatedTelefone = telefone.replace(/\D/g, ''); // Remove caracteres não numéricos
    // transformar telefone de 11 digitos para ficar com (xx) xxxxx-xxxx
    formatedTelefone = formatedTelefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return  formatedTelefone
  }
}