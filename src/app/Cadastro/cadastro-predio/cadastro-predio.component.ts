import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { Predio } from 'src/app/shared/utilitarios/predio';

@Component({
  selector: 'app-cadastro-predio',
  templateUrl: './cadastro-predio.component.html',
  styleUrls: ['./cadastro-predio.component.css']
})
export class CadastroPredioComponent implements OnInit {
  predios: Predio[] = [];
  prediosFiltrados: Predio[] = [];

  showModal = false;
  isEditing = false;
  registerForm: FormGroup;

  // Lista de comodidades para gerar os checkboxes
  amenidades = [
    { key: 'piscina', label: 'Piscina' },
    { key: 'academia', label: 'Academia' },
    { key: 'churrasqueira', label: 'Churrasqueira' },
    { key: 'salao_de_festas', label: 'Salão de Festas' },
    { key: 'espaco_gourmet', label: 'Espaço Gourmet' },
    { key: 'sauna', label: 'Sauna' },
    { key: 'spa', label: 'Spa' },
    { key: 'salao_de_jogos', label: 'Salão de Jogos' },
    { key: 'coworking', label: 'Coworking' },
    { key: 'jardim_terraco', label: 'Jardim/Terraço' },
    { key: 'lavanderia', label: 'Lavanderia' },
    { key: 'bicicletario', label: 'Bicicletário' },
    { key: 'estacionamento_visitas', label: 'Estac. Visitas' },
    { key: 'elevador_social', label: 'Elevador Social' },
  ];

  constructor(
    private predioService: PredioService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    // Cria form group incluindo todas as comodidades
    const groupConfig: any = {
      id: [''],
      nome: ['', Validators.required]
    };
    this.amenidades.forEach(a => groupConfig[a.key] = [false]);
    this.registerForm = this.fb.group(groupConfig);
  }

  ngOnInit(): void {
    this.loadPredios();
  }

  loadPredios(): void {
    this.predioService.getAllPredios().subscribe({
      next: (lista) => {
        this.predios = lista;
        this.prediosFiltrados = [...this.predios];
      },
      error: err => console.error(err)
    });
  }
  filtrarPredios(event: Event): void {
    const termo = (event.target as HTMLInputElement).value.toLowerCase();
    this.prediosFiltrados = this.predios.filter(p =>
      p.nome.toLowerCase().includes(termo)
    );
  }

  openModal(): void {
    this.showModal = true;
    this.isEditing = false;
    this.registerForm.reset({ nome: '', ...this.amenidades.reduce((o, a) => ({ ...o, [a.key]: false }), {}) });
  }

  closeModal(): void {
    this.showModal = false;
    this.registerForm.reset();
  }

  editPredio(predio: Predio): void {
    this.isEditing = true;
    this.showModal = true;
    // Garante que temos booleans para todas as keys
    const patch = {
      ...predio,
      ...this.amenidades.reduce((o, a) => ({ ...o, [a.key]: !!predio[a.key] }), {})
    };
    this.registerForm.patchValue(patch);
  }

  deletePredio(predio: Predio): void {
    if (confirm(`Excluir o prédio ${predio.nome}?`)) {
      this.predioService.deletePredio(predio.id).subscribe({
        next: () => {
          this.toastr.success('Prédio excluído com sucesso!');
          this.loadPredios();
        },
        error: () => this.toastr.error('Erro ao excluir prédio')
      });
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    const predio: Predio = this.registerForm.value;
    const op = this.isEditing
      ? this.predioService.updatePredio(predio)
      : this.predioService.createPredio(predio);

    op.subscribe({
      next: () => {
        this.toastr.success(`Prédio ${this.isEditing ? 'atualizado' : 'criado'} com sucesso!`);
        this.closeModal();
        this.loadPredios();
      },
      error: () => this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} prédio`)
    });
  }
}
