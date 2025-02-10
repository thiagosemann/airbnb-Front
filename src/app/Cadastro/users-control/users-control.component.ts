// users-control.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-users-control',
  templateUrl: './users-control.component.html',
  styleUrls: ['./users-control.component.css']
})
export class UsersControlComponent implements OnInit {
  users: User[] = [];
  showModal = false;
  isEditing = false;
  selectedUserId: number | null = null;
  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private usersService: UserService,
    private sanitizer: DomSanitizer
    
  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
      Telefone: ['', Validators.required],
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
          console.log(users)
          this.users = users; // Atribui o resultado do Observable
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
    this.userForm.reset({ role: 'guest' });
  }

  fecharModal() {
    this.showModal = false;
    this.selectedUserId = null;
  }

  editarUsuario(user: any) {
    this.isEditing = true;
    this.selectedUserId = user.id;
    this.userForm.patchValue({
      ...user,
      cpf: user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    });
    this.showModal = true;
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
    if (this.userForm.invalid) return;

    const userData = this.userForm.value;
    userData.cpf = userData.cpf.replace(/\D/g, '');

    try {
      if (this.isEditing && this.selectedUserId) {
        await this.usersService.updateUser(userData);
      } else {
        await this.usersService.addUser(userData);
      }
      this.fecharModal();
      this.carregarUsuarios();
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
}