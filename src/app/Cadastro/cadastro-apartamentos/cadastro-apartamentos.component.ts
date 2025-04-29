import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-cadastro-apartamentos',
  templateUrl: './cadastro-apartamentos.component.html',
  styleUrls: ['./cadastro-apartamentos.component.css']
})
export class CadastroApartamentosComponent implements OnInit {
  apartamentos: any[] = [];
  predios: any[] = [];
  showModal = false;
  isEditing = false;
  form: FormGroup;
  currentUserId: number | undefined;
  apartamentosFiltrados: any[] = [];

  constructor(
    private apartamentoService: ApartamentoService,
    private predioService: PredioService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private userService: UserService
  ) {
    // FormGroup sem validadores para que os campos não sejam obrigatórios
    const user = this.authService.getUser();
    this.currentUserId = user ? user.id : 0;

    this.form = this.fb.group({
      id: [''],
      nome: [''],
      predio_id: [''],
      nome_anuncio: [''],
      link_airbnb_calendario: [''],
      endereco: [''],
      bairro: [''],
      andar: [''],
      senha_porta: [''],  
      numero_hospedes: [1],
      porcentagem_cobrada: [0],
      valor_enxoval: [0],
      valor_limpeza: [0],
      data_troca: [null],             // new Date() ou null
      totem: [false],
      adesivo_aviso: [false],
      qtd_cama_solteiro: [0],
      qtd_cama_casal: [0],
      qtd_sofa_cama: [0],
      aceita_pet: [false],
      tipo_checkin: ['self-checkin'],
      acesso_predio: [''],
      acesso_porta: [''],
      link_app: [''],
      secador_cabelo: [false],
      cafeteira: [false],
      ventilador: [false],
      ferro_passar: [false],
      sanduicheira: [false],
      chaleira_eletrica: [false],
      liquidificador: [false],
      smart_tv: [false],
      tv_aberta: [false],
      tipo_chuveiro: [''],
      escritorio: [false],
      tv_quarto: [false],
      ar_condicionado: [false],
      aspirador_de_po: [false],
      qtd_taca_vinho: [0],
      tipo_fogao: [''],
      ssid_wifi: [''],
      senha_wifi: [''],
      aquecedor: [false],
      vaga_garagem: [0],
      itens_limpeza: [''],
      air_fryer: [false],
      modificado_user_id: [0],
      data_ultima_modificacao: [''],
      link_fotos: ['']
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.apartamentoService.getAllApartamentos().subscribe({
      next: (data) => {
        console.log(data)
        this.apartamentos = data.sort((a, b) => a.nome.localeCompare(b.nome));
        // para cada apt, busca o nome do usuário que modificou
        this.apartamentos.forEach(apt => {
          if (apt.modificado_user_id) {
            this.userService.getUser(apt.modificado_user_id).subscribe({
              next: user => apt.modificado_user_nome = user.first_name,
              error: () => apt.modificado_user_nome = '—'
            });
          } else {
            apt.modificado_user_nome = '—';
          }
        });
        this.apartamentosFiltrados = [...this.apartamentos];
      },
      error: (err) => console.error('Erro ao carregar apartamentos:', err)
    });

    this.predioService.getAllPredios().subscribe({
      next: (data) => this.predios = data,
      error: (err) => console.error('Erro ao carregar prédios:', err)
    });
  }

  filtrarApartamentos(event: Event): void {
      const termo = (event.target as HTMLInputElement).value
                    .toLowerCase()
                    .trim();
  
      if (!termo) {
        // sem filtro: mostra tudo
        this.apartamentosFiltrados = [...this.apartamentos];
        return;
      }
  
      this.apartamentosFiltrados = this.apartamentos.filter(apt => {
        const nome = apt.nome.toLowerCase();
        const predio = this.getNomePredio(apt.predio_id)
                          .toLowerCase();
        return nome.includes(termo)
            || predio.includes(termo);
      });
    }

  abrirModal(): void {
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
    this.form.reset();
    this.isEditing = false;
  }

  editarApartamento(apartamento: any): void {
    this.isEditing = true;
    this.form.patchValue(apartamento);
    this.abrirModal();
  }

  excluirApartamento(id: number): void {
    if (confirm('Tem certeza que deseja excluir este apartamento?')) {
      this.apartamentoService.deleteApartamento(id).subscribe({
        next: () => {
          this.toastr.success('Apartamento excluído com sucesso!');
          this.carregarDados();
        },
        error: (error) => this.toastr.error('Erro ao excluir apartamento')
      });
    }
  }

  onSubmit(): void {
    const apt = this.form.value;
    // preenche audit fields
    apt.modificado_user_id = this.currentUserId;
    apt.data_ultima_modificacao = this.getTodayDateString();
    
    const request$ = this.isEditing
      ? this.apartamentoService.updateApartamento(apt)
      : this.apartamentoService.createApartamento(apt);

    request$.subscribe({
      next: () => {
        this.toastr.success(`Apartamento ${this.isEditing ? 'atualizado' : 'criado'} com sucesso!`);
        this.fecharModal();
        this.carregarDados();
      },
      error: () => this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} apartamento`)
    });
  }

  getNomePredio(predioId: number): string {
    const predio = this.predios.find(p => p.id === predioId);
    return predio ? predio.nome : 'Não encontrado';
  }

  getTodayDateString(): string {
    const date = new Date();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0'); // Janeiro é 0
    const ano = date.getFullYear();
    return `${horas}:${minutos} ${dia}/${mes}/${ano}`;
  }

}
