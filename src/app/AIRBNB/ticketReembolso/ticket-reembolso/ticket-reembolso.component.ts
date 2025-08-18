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
              file_name: file.name,
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
      solucao: ['', Validators.required],
      notificado_forest: [0, Validators.required],
      data_notificacao: [null],
      valor_material: [null],
      valor_mao_obra: [null],
      data_realizado: [null],
      pagamento_confirmado: [0, Validators.required],
      data_pagamento: [null],
      created_at: [null],
      updated_at: [null],
      auth: [''],
      link_pagamento: ['']
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
    const raw = this.formTicket.value;
    const payload: Omit<TicketReembolso, 'id' | 'files'> = {
      apartamento_id: raw.apartamento_id,
      item_problema: raw.item_problema,
      descricao_problema: raw.descricao_problema,
      solucao: raw.solucao,
      status: 'PENDENTE',
      notificado_forest: raw.notificado_forest,
      data_notificacao: raw.data_notificacao || null,
      valor_material: raw.valor_material || null,
      valor_mao_obra: raw.valor_mao_obra || null,
      data_realizado: raw.data_realizado || null,
      pagamento_confirmado: raw.pagamento_confirmado,
      data_pagamento: raw.data_pagamento || null,
      created_at: raw.created_at || null,
      updated_at: raw.updated_at || null,
      auth: raw.auth || '',
      link_pagamento: raw.link_pagamento || '',
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
