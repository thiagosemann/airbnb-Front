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
  filteredUsers: User[] = [];
  showModal = false;
  isEditing = false;
  selectedUserId: number | null = null;
  userForm: FormGroup;
  isLoading = false;           // ← nova flag
  searchTerm:string = "";
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
    this.userForm.reset({ role: 'guest' });
  }

  fecharModal() {
    this.showModal = false;
    this.selectedUserId = null;
  }

  editarUsuario(user: any) {
    this.isEditing = true;
    this.selectedUserId = user.id;
    this.showModal = true;
    this.isLoading = true;     // ← início do loading

    this.usersService.getUser(user.id).subscribe(
      (fetchedUser: User) => {
        console.log(fetchedUser);
        this.userForm.patchValue({
          ...fetchedUser,
          cpf: fetchedUser.cpf.replace(
            /(\d{3})(\d{3})(\d{3})(\d{2})/,
            '$1.$2.$3-$4'
          )

        });
        this.isLoading = false;  // ← terminou de carregar

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