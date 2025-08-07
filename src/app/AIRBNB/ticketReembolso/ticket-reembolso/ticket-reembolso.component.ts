import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { TicketReembolso, TicketReembolsoArquivo } from 'src/app/shared/utilitarios/ticketReembolso';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';

@Component({
  selector: 'app-ticket-reembolso',
  templateUrl: './ticket-reembolso.component.html',
  styleUrls: ['./ticket-reembolso.component.css']
})
export class TicketReembolsoComponent implements OnInit, AfterViewInit  {
  step = 1;
  formTicket!: FormGroup;
  apartamentos: Apartamento[] = [];
  @ViewChild('inputFile') inputFile!: ElementRef<HTMLInputElement>;
  arquivos: TicketReembolsoArquivo[] = [];

  constructor(
    private fb: FormBuilder,
    private ticketSrv: TicketReembolsoService,
    private aptoSrv: ApartamentoService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.aptoSrv.getAllApartamentos().subscribe(a => this.apartamentos = a);
  }
  ngAfterViewInit(): void {
    this.inputFile.nativeElement.addEventListener('change', (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length) {
        Array.from(input.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            this.arquivos.push({
              name: file.name,
              imagemBase64: e.target?.result as string,
              type: file.type,
            });
          };
          reader.readAsDataURL(file);
        });
        // Limpar o input para permitir o upload do mesmo arquivo novamente, se precisar
        input.value = '';
      }
    });
  }

  initForm() {
    this.formTicket = this.fb.group({
      apartamento_id: [null, Validators.required],
      item_problema: ['', Validators.required],
      descricao_problema: ['', Validators.required],
      solucao: ['Selecione', Validators.required],
      status: ['PENDENTE', Validators.required],
      data_autorizacao: [null],            // date string/null
      notificado_forest: [false],          // boolean (0/1)
      data_notificacao: [null],            // date string/null
      valor_material: [0, [Validators.min(0)]],
      valor_mao_obra: [0, [Validators.min(0)]],
      data_conclusao: [null],              // date string/null
      pagamento_confirmado: [false],       // boolean (0/1)
      data_pagamento: [null],              // date string/null
      data_arquivamento: [null],           // date string/null
    });
  }

  next() {
    if (this.formTicket.valid) {
      this.step = 2;
    } else {
      this.formTicket.markAllAsTouched();
    }
  }

  back() {
    this.step = 1;
  }



  removeArquivo(idx: number) {
    this.arquivos.splice(idx, 1);
  }

  getAptoNome(id: number): string {
    const apto = this.apartamentos.find(a => a.id === id);
    return apto ? apto.nome : '';
  }

  submit() {
    if (this.formTicket.invalid) {
      this.formTicket.markAllAsTouched();
      return;
    }

    // Monta o payload garantindo todos os campos do backend
    const raw = this.formTicket.value;

    // Converte booleanos do formulário para 0/1, nulo para campos de data/string
    const payload: Omit<TicketReembolso, 'id' | 'files'> = {
      apartamento_id: raw.apartamento_id,
      item_problema: raw.item_problema,
      descricao_problema: raw.descricao_problema,
      solucao: raw.solucao || null,
      status: raw.status || 'Aberto',
      data_autorizacao: raw.data_autorizacao || null,
      notificado_forest: raw.notificado_forest ? 1 : 0,
      data_notificacao: raw.data_notificacao || null,
      valor_material: raw.valor_material || null,
      valor_mao_obra: raw.valor_mao_obra || null,
      data_conclusao: raw.data_conclusao || null,
      pagamento_confirmado: raw.pagamento_confirmado ? 1 : 0,
      data_pagamento: raw.data_pagamento || null,
      data_arquivamento: raw.data_arquivamento || null,
      arquivos: this.arquivos || [],
    };

    this.ticketSrv.createReembolso(payload).subscribe({
      next: () => {
        alert('Ticket de reembolso criado com sucesso!');
        this.reset();
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao criar o ticket!');
      }
    });
  }

  reset() {
    this.formTicket.reset({
      status: 'PENDENTE',
      solucao: 'Selecione',
      valor_material: 0,
      valor_mao_obra: 0,
      notificado_forest: false,
      pagamento_confirmado: false,
    });
    this.arquivos = [];
    this.step = 1;
  }
}
