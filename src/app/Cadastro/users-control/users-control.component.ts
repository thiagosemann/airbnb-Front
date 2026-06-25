// users-control.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { EmpresaService, Empresa } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/empresa_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-users-control',
  templateUrl: './users-control.component.html',
  styleUrls: ['./users-control.component.css','./users-control2.component.css']
})
export class UsersControlComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  showModal = false;
  isEditing = false;
  selectedUserId: number | null = null;
  userForm: FormGroup;
  isLoading = false;
  isTableLoading = false;
  searchTerm: string = '';
  userCheckins: any[] = [];
  user: User | null = null;
  empresas: Empresa[] = [];

  // Filtro de role
  roleFiltro: string = 'all';
  readonly roleOpcoes = [
    { valor: 'all',          label: 'Todos'    },
    { valor: 'guest',        label: 'Hóspede'  },
    { valor: 'terceirizado', label: 'Limpeza'  },
    { valor: 'admin',        label: 'Admin'    },
  ];

  // Paginação
  page     = 1;
  pageSize = 20;
  total    = 0;

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  get pageNumbers(): number[] {
    const range = 2; // páginas de cada lado da atual
    const start = Math.max(1, this.page - range);
    const end   = Math.min(this.totalPages, this.page + range);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  constructor(
    private fb: FormBuilder,
    private usersService: UserService,
    private sanitizer: DomSanitizer,
    private checkinService: CheckInFormService,
    private empresaService: EmpresaService,
    private toastr: ToastrService,
    private authService: AuthenticationService,

  ) {
    this.userForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
      Telefone: ['', Validators.required],
      email: ['', [Validators.email]],
      role: ['guest', Validators.required],
      empresa_id: [null],
      imagemBase64: [''],
      documentBase64: ['']
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.carregarUsuarios();
    this.userForm.get('role')!.valueChanges.subscribe(() => this.ajustarValidacaoEmpresa());
    if (this.isMaster) {
      this.empresaService.getEmpresas().subscribe({
        next: empresas => this.empresas = empresas,
        error: err => console.error('Erro ao carregar empresas:', err)
      });
    }
  }

  // Empresa 1 (master) gerencia várias empresas e precisa escolher a empresa do terceirizado
  get isMaster(): boolean {
    return this.user?.empresa_id === 1;
  }

  // Exibe o seletor de empresa apenas para o master ao cadastrar/editar um terceirizado
  get mostrarSeletorEmpresa(): boolean {
    return this.isMaster && this.userForm.get('role')?.value === 'terceirizado';
  }

  private ajustarValidacaoEmpresa(): void {
    const empresaCtrl = this.userForm.get('empresa_id')!;
    if (this.mostrarSeletorEmpresa) {
      empresaCtrl.setValidators(Validators.required);
    } else {
      empresaCtrl.clearValidators();
      empresaCtrl.setValue(null);
    }
    empresaCtrl.updateValueAndValidity({ emitEvent: false });
  }

  carregarUsuarios(): void {
    this.isTableLoading = true;
    this.usersService.getUsersPaginated({ page: this.page, limit: this.pageSize, role: this.roleFiltro }).subscribe({
      next: ({ data, total }) => {
        this.users = data;
        this.total = total;
        this.aplicarFiltroTexto();
        this.isTableLoading = false;
      },
      error: err => {
        console.error('Erro ao carregar usuários:', err);
        this.isTableLoading = false;
      }
    });
  }

  setRoleFiltro(role: string): void {
    this.roleFiltro = role;
    this.page = 1;
    this.carregarUsuarios();
  }

  irParaPagina(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.carregarUsuarios();
  }
  

  abrirModal() {
    this.showModal = true;
    this.isEditing = false;
    this.selectedUserId = null;

    // Se não for empresa 1, força o tipo terceirizado
    const roleValue = this.user?.empresa_id === 1 ? 'guest' : 'terceirizado';

    this.userForm.reset({
      role: roleValue,
      empresa_id: null,
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

    // Define a empresa do terceirizado (limpeza): o master escolhe; demais herdam a própria empresa
    if (userData.role === 'terceirizado') {
      userData.empresa_id = this.isMaster ? userData.empresa_id : (this.user?.empresa_id ?? null);
      if (!userData.empresa_id) {
        this.toastr.warning('Selecione a empresa do terceirizado.');
        return;
      }
    } else {
      userData.empresa_id = null;
    }
    try {
      if (this.isEditing && this.selectedUserId) {
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
    this.aplicarFiltroTexto();
  }

  private aplicarFiltroTexto(): void {
    const termo = this.searchTerm.toLowerCase().trim();
    if (!termo) {
      this.filteredUsers = [...this.users];
      return;
    }
    this.filteredUsers = this.users.filter(u =>
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(termo) ||
      u.cpf.replace(/\D/g, '').includes(termo) ||
      u.Telefone?.replace(/\D/g, '').includes(termo) ||
      u.role.toLowerCase().includes(termo)
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