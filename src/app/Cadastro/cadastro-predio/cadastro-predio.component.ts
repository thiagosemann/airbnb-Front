import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { Predio } from 'src/app/shared/utilitarios/predio';

@Component({
  selector: 'app-cadastro-predio',
  templateUrl: './cadastro-predio.component.html',
  styleUrls: ['./cadastro-predio.component.css']
})
export class CadastroPredioComponent {
  predios: Predio[] = [];
  showModal = false;
  isEditing = false;
  registerForm: FormGroup;

  constructor(
    private predioService: PredioService,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.registerForm = this.fb.group({
      id: [''],
      nome: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPredios();
  }

  loadPredios(): void {
    this.predioService.getAllPredios().subscribe({
      next: (predios) => this.predios = predios,
      error: (error) => console.error('Erro ao buscar prédios:', error)
    });
  }

  openModal(): void {
    this.showModal = true;
    this.isEditing = false;
    this.registerForm.reset();
  }

  closeModal(): void {
    this.showModal = false;
    this.registerForm.reset();
  }

  editPredio(predio: Predio): void {
    this.isEditing = true;
    this.showModal = true;
    this.registerForm.patchValue(predio);
  }

  deletePredio(predio: Predio): void {
    if (confirm(`Excluir o prédio ${predio.nome}?`)) {
      this.predioService.deletePredio(predio.id).subscribe({
        next: () => {
          this.toastr.success('Prédio excluído com sucesso!');
          this.loadPredios();
        },
        error: (error) => this.toastr.error('Erro ao excluir prédio')
      });
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    const predio: Predio = this.registerForm.value;
    const operation = this.isEditing ? 
      this.predioService.updatePredio(predio) : 
      this.predioService.createPredio(predio);

    operation.subscribe({
      next: () => {
        this.toastr.success(`Prédio ${this.isEditing ? 'atualizado' : 'criado'} com sucesso!`);
        this.closeModal();
        this.loadPredios();
      },
      error: (error) => {
        this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} prédio`);
        console.error(error);
      }
    });
  }
}
