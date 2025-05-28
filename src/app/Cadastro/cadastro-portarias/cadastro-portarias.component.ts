// cadastro-portarias.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PortariaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/portarias_service';
import { PredioPortariaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_portari_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { Portaria } from 'src/app/shared/utilitarios/portarias';
import { Predio } from 'src/app/shared/utilitarios/predio';

@Component({
  selector: 'app-cadastro-portarias',
  templateUrl: './cadastro-portarias.component.html',
  styleUrls: ['./cadastro-portarias.component.css']
})
export class CadastroPortariasComponent implements OnInit {
  portarias: Portaria[] = [];
  portariasFiltradas: Portaria[] = [];
  predios: Predio[] = [];
  selectedPredios: Set<number> = new Set<number>();
  showModal = false;
  isEditing = false;
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private portariaService: PortariaService,
    private predioService: PredioService,
    private predioPortariaService: PredioPortariaService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      id: [null],
      nome: ['', Validators.required],
      telefone_principal: ['', Validators.required],
      telefone_secundario: [''],
      email: ['', Validators.email],
      modo_envio: ['email'],
      envio_documentos_texto: [false],
      envio_documentos_foto: [false],
      cadastro_aplicativo: [false],
      aplicativo_nome: [''],
      aplicativo_login: [''],
      aplicativo_senha: [''],
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.predioService.getAllPredios().subscribe((predios: Predio[]) => {
      this.predios = predios;
      this.carregarPortarias();
    });
  }

  private carregarPortarias(): void {
    this.portariaService.getAllPortarias().subscribe((portarias: Portaria[]) => {
      this.portarias = portarias;
      this.portariasFiltradas = [...portarias];
    });
  }

  filtrarPortarias(event: Event): void {
    const termo = (event.target as HTMLInputElement).value.toLowerCase();
    this.portariasFiltradas = this.portarias.filter((p: Portaria) =>
      p.nome.toLowerCase().includes(termo)
    );
  }

  abrirModal(): void {
    this.showModal = true;
    this.isEditing = false;
    this.form.reset({ modo_envio: 'email' });
    this.selectedPredios.clear();
  }

  editarPortaria(portaria: Portaria): void {
    this.isEditing = true;
    this.showModal = true;
    this.form.patchValue(portaria);
    this.predioPortariaService.getPrediosByPortaria(portaria.id).subscribe((predios: Predio[]) => {
      this.selectedPredios = new Set<number>(predios.map(p => p.id));
    });
  }

  onPredioToggle(predioId: number, checked: boolean): void {
    if (checked) this.selectedPredios.add(predioId);
    else this.selectedPredios.delete(predioId);
  }

  onSubmit(): void {
    const dados = this.form.value;
    const request$ = this.isEditing
      ? this.portariaService.updatePortaria(dados)
      : this.portariaService.createPortaria(dados);

    request$.subscribe({
      next: (result: any) => {
        const portariaId = this.isEditing ? dados.id : result.insertId;
        this.atualizarVinculos(portariaId);
      },
      error: () => this.toastr.error('Erro ao salvar portaria')
    });
  }

  private atualizarVinculos(portariaId: number): void {
    this.predioPortariaService.getPrediosByPortaria(portariaId).subscribe((originais: Predio[]) => {
      const origIds = new Set<number>(originais.map(p => p.id));
      origIds.forEach(id => {
        if (!this.selectedPredios.has(id)) {
          this.predioPortariaService.unlinkPortariaFromPredio(portariaId, id).subscribe();
        }
      });
      this.selectedPredios.forEach(id => {
        if (!origIds.has(id)) {
          this.predioPortariaService.linkPortariaToPredio(portariaId, id).subscribe();
        }
      });
      this.toastr.success('Portaria salva com sucesso!');
      this.fecharModal();
      this.carregarPortarias();
    });
  }

  excluirPortaria(id: number): void {
    if (confirm('Tem certeza que deseja excluir esta portaria?')) {
      this.portariaService.deletePortaria(id).subscribe({
        next: () => {
          this.toastr.success('Portaria excluída com sucesso!');
          this.carregarPortarias();
        },
        error: () => this.toastr.error('Erro ao excluir portaria')
      });
    }
  }

  fecharModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.selectedPredios.clear();
  }

  // Métodos utilitários para template
  getNomePredio(predioId: number): string {
    const predio = this.predios.find(p => p.id === predioId);
    return predio ? predio.nome : '—';
  }

  getModoEnvioLabel(modo: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      aplicativo: 'Aplicativo',
      todos: 'Email e Aplicativo',
      sms: 'SMS'
    };
    return labels[modo] || modo;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        this.form.patchValue({ documentBase64: base64.split(',')[1] });
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
}