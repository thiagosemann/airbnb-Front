import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';

@Component({
  selector: 'app-camera-app',
  templateUrl: './camera-app.component.html',
  styleUrls: ['./camera-app.component.css','./camera-app2.component.css']
})
export class CameraAppComponent implements OnInit {
  step = 1; // Etapas do fluxo
  id: string = ''; // Código da reserva
  formData = {
    cpf: '',
    nome: '',
    telefone: '',
    horarioPrevistoChegada: '15:00' // Horário padrão
  };
  isSubmitting = false;

  // Agora ambas as imagens são enviadas por upload de arquivo
  photoDataUrl: string | null = null; // Selfie enviada via arquivo
  documentFile: string | null = null; // Documento (PDF ou imagem) enviado via arquivo

  hourOptions: string[] = [];
  souEstrangeiro:boolean=false;

  // Flags do apartamento
  vaga_garagem: string | null = null;
  pedir_selfie: boolean | null = null;
  tem_garagem: boolean | null = null;
  // Placa do carro (quando tem_garagem = true)
  placaCarro: string = '';

  constructor(
    private checkinFormService: CheckInFormService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private apartamentoService: ApartamentoService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') ?? ''; // Atribui o valor do 'id' à variável
      if (this.id) {
        this.carregarFlagsApartamento(this.id);
      }
    });
    // Gera horários de 15h até 24h
    for (let i = 15; i <= 24; i++) {
      const hora = i < 24 ? `${i.toString().padStart(2, '0')}:00` : '00:00';
      this.hourOptions.push(hora);
    }
    for (let i = 1; i <= 6; i++) {
      const hora = i < 24 ? `${i.toString().padStart(2, '0')}:00` : '00:00';
      this.hourOptions.push(hora);
    }
  }

  private carregarFlagsApartamento(cod_reserva: string) {
    this.apartamentoService.getSelfieGaragem(cod_reserva).subscribe({
      next: (dados: any) => {
        console.log('Dados do apartamento recebidos:', dados);
        this.vaga_garagem = dados?.vaga_garagem ?? null;
        // Converte 1/0, '1'/'0' ou boolean para booleano. Se null/undefined => false
        const ps = dados?.pedir_selfie;
        this.pedir_selfie = ps === true || ps === 1 || ps === '1' ? true : false;
        this.tem_garagem = (dados?.tem_garagem === true || dados?.tem_garagem === 1 || dados?.tem_garagem === '1') ? true : false;
      },
      error: (err) => {
        console.error('Falha ao carregar informações do apartamento:', err);
        this.toastr.warning('Não foi possível obter as informações do apartamento.');
        this.pedir_selfie = false; // fallback: não pedir selfie
      }
    });
  }

  selectHour(hour: string) {
    this.formData.horarioPrevistoChegada = hour;
  }

  // Selfie via upload de arquivo (imagens ou PDF, até 5MB)
  onSelfieSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSizeValid = file.size <= 5 * 1024 * 1024; // 5MB
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      this.toastr.warning('Envie uma imagem ou PDF para a selfie.');
      return;
    }
    if (!isSizeValid) {
      this.toastr.warning('Arquivo maior que 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoDataUrl = reader.result as string;
      this.toastr.success('Arquivo da selfie selecionado com sucesso.');
    };
    reader.onerror = () => {
      this.toastr.error('Erro ao ler o arquivo da selfie.');
    };
    reader.readAsDataURL(file);
  }

  // Documento via upload de arquivo (PDF ou imagem, até 5MB)
  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSizeValid = file.size <= 5 * 1024 * 1024; // 5MB
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      this.toastr.warning('Envie um PDF ou uma imagem do documento.');
      return;
    }

    if (!isSizeValid) {
      this.toastr.warning('Arquivo maior que 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      this.documentFile = base64String;
      this.toastr.success('Documento selecionado com sucesso.');
    };
    reader.onerror = () => {
      this.toastr.error('Erro ao ler o arquivo do documento.');
    };
    reader.readAsDataURL(file);
  }

  // Envia os dados para o backend
  sendData() {
    if (this.isSubmitting) return;

    // Validações
    if (!this.formData.cpf || !this.formData.nome || !this.formData.telefone || !this.formData.horarioPrevistoChegada) {
      this.toastr.warning('Preencha todos os campos obrigatórios.');
      return;
    }
    // Selfie só é obrigatória se pedir_selfie for true
    const selfieObrigatoria = this.pedir_selfie === true;
    if (selfieObrigatoria && (!this.photoDataUrl || this.photoDataUrl.length < 100)) {
      this.toastr.warning('Envie a selfie antes de continuar!');
      return;
    }
    if (!this.documentFile || this.documentFile.length < 100) {
      this.toastr.warning('Envie o documento antes de continuar!');
      return;
    }
    // Se o apartamento tem garagem, solicitar placa do carro
    if (this.tem_garagem === true) {
      const placa = (this.placaCarro || '').toUpperCase().trim();
      const regexAntigo = /^[A-Z]{3}-?\d{4}$/;
      const regexMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
      if (!placa) {
        this.toastr.warning('Informe a placa do carro para uso da garagem.');
        return;
      }
      if (!(regexAntigo.test(placa) || regexMercosul.test(placa))) {
        this.toastr.warning('Placa inválida. Use formato ABC-1234 ou ABC1D23.');
        return;
      }
      this.placaCarro = placa;
    }

    this.isSubmitting = true;

    // Construção do payload conforme backend
    const checkinData = {
      cod_reserva: this.id,
      CPF: this.formData.cpf,
      Nome: this.formData.nome.toUpperCase(),
      Telefone: this.formData.telefone,
      horarioPrevistoChegada: this.formData.horarioPrevistoChegada,
      imagemBase64: this.photoDataUrl ? this.photoDataUrl.split(',')[1] : null,
      tipo: 'guest',
      documentBase64: this.documentFile.split(',')[1],
      reserva_id: this.id,
      placa_carro: this.tem_garagem === true ? this.placaCarro : null
    };

    this.step = 4; // Mostrar loading

    this.checkinFormService.createCheckin(checkinData).subscribe(
      () => {
        this.step = 5; // Sucesso
        this.toastr.success('Check-in realizado com sucesso!');
        this.isSubmitting = false;
      },
      (error) => {
        console.error('Erro no check-in:', error);
        this.toastr.error('Erro ao realizar check-in');
        this.resetFlow();
        this.isSubmitting = false;
      }
    );
  }

  // Reseta o fluxo para o início
  resetFlow() {
    this.step = 1;
    this.formData = { cpf: '', nome: '', telefone: '',horarioPrevistoChegada:'15:00' };
    this.photoDataUrl = null;
    this.documentFile = null;
    this.isSubmitting = false;
    this.placaCarro = '';
  }

  // Valida o CPF do usuário
  validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(.)\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let primeiroDigitoVerificador = (soma * 10) % 11;
    if (primeiroDigitoVerificador === 10 || primeiroDigitoVerificador === 11) {
      primeiroDigitoVerificador = 0;
    }
    if (primeiroDigitoVerificador !== parseInt(cpf.charAt(9))) {
      return false;
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let segundoDigitoVerificador = (soma * 10) % 11;
    if (segundoDigitoVerificador === 10 || segundoDigitoVerificador === 11) {
      segundoDigitoVerificador = 0;
    }
    if (segundoDigitoVerificador !== parseInt(cpf.charAt(10))) {
      return false;
    }
    return true;
  }

  // Volta para a etapa anterior
  goBack() {
    if (this.step > 1) {
      this.step--;
    }
  }

  goForward() {
    if (this.step === 1) {
      if (!this.souEstrangeiro && !this.validateCPF(this.formData.cpf)) {
        this.toastr.warning('CPF inválido!');
        return;
      }
      if (this.formData.cpf === '') {
        this.toastr.warning('Digite o CPF!');
        return;
      }
      if (this.formData.nome === '') {
        this.toastr.warning('Digite o nome!');
        return;
      }
      if (this.formData.telefone === '') {
        this.toastr.warning('Digite o telefone!');
        return;
      }
      if (!this.formData.horarioPrevistoChegada) {
        this.toastr.warning('Selecione o horário previsto de chegada!');
        return;
      }
      this.step = 2; // Ir para etapa única de uploads (selfie e documento)
    }
  }

  concluirCadastro(){
    this.step=6;
  }

  /** Retorna true se o horário for entre 01:00 e 06:00 */
  isNextDay(hour: string): boolean {
    const h = parseInt(hour.split(':')[0], 10);
    return h >= 1 && h <= 6;
  }
}