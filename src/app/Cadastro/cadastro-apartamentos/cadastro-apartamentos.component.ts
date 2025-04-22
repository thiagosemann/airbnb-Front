import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';

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

  constructor(
    private apartamentoService: ApartamentoService,
    private predioService: PredioService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    // FormGroup sem validadores para que os campos não sejam obrigatórios
    this.form = this.fb.group({
      id: [''],
      nome: [''],
      predio_id: [''],
      nome_anuncio: [''],
      endereco: [''],
      bairro: [''],
      andar: [''],
      senha_porta: [''],
      acesso_predio: [''],
      acesso_porta: [''],
      tipo_checkin: ['self-checkin'],
      numero_hospedes: [1],
      aceita_pet: [false],
      porcentagem_cobrada: [0],
      valor_enxoval: [0],
      valor_limpeza: [0],
      ar_condicionado: [false],
      secador_cabelo: [false],
      smart_tv: [false],
      liquidificador: [false],
      tv_aberta: [false],
      cafeteira: [false],
      escritorio: [false],
      aspirador_de_po: [false],
      ssid_wifi: [''],
      senha_wifi: [''],
      link_airbnb_calendario: ['']
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.apartamentoService.getAllApartamentos().subscribe({
      next: (data) => this.apartamentos = data.sort((a,b)=>(a.nome > b.nome ? 1 : -1)),
      error: (error) => console.error('Erro ao carregar apartamentos:', error)
    });

    this.predioService.getAllPredios().subscribe({
      next: (data) => this.predios = data,
      error: (error) => console.error('Erro ao carregar prédios:', error)
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
    // Como não há mais validação obrigatória, o formulário sempre será válido
    const apartamento = this.form.value;
    const operacao = this.isEditing
      ? this.apartamentoService.updateApartamento(apartamento)
      : this.apartamentoService.createApartamento(apartamento);

    operacao.subscribe({
      next: () => {
        this.toastr.success(`Apartamento ${this.isEditing ? 'atualizado' : 'criado'} com sucesso!`);
        this.fecharModal();
        this.carregarDados();
      },
      error: (error) => {
        this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} apartamento`);
        console.error(error);
      }
    });
  }

  getNomePredio(predioId: number): string {
    const predio = this.predios.find(p => p.id === predioId);
    return predio ? predio.nome : 'Não encontrado';
  }
}
