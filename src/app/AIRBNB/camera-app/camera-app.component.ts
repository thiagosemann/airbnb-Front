import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';

@Component({
  selector: 'app-camera-app',
  templateUrl: './camera-app.component.html',
  styleUrls: ['./camera-app.component.css']
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
  souEstrangeiro: boolean = false;

  // Flags do apartamento
  vaga_garagem: string | null = null;
  pedir_selfie: boolean | null = null;
  tem_garagem: boolean | null = null;
  // Placa do carro (quando tem_garagem = true)
  placaCarro: string = '';
  marcaCarro: string = '';
  modeloCarro: string = '';
  corCarro: string = '';
  usarGaragem: boolean = true;

  // Booking route (por apartamentoId)
  isBookingRoute: boolean = false;
  apartamentoNome: string = '';
  dataInicio: string = '';
  dataFim: string = '';
  isSearchingReserva: boolean = false;

  get t() {
    return this.souEstrangeiro ? this.enText : this.ptText;
  }

  ptText = {
    tagline: 'Gestão e Inovação Patrimonial',
    codeLabel: 'Código da Reserva',
    step1Title: 'Identificação',
    foreignerLabel: 'Sou estrangeiro(a)',
    nameLabel: 'Nome Completo',
    namePlaceholder: 'Ex: João Silva',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    passportLabel: 'Passaporte',
    passportPlaceholder: 'Número do documento',
    phoneLabel: 'Telefone',
    phonePlaceholder: '(00) 00000-0000',
    arrivalLabel: 'Horário previsto de chegada',
    afternoonLabel: 'Tarde',
    nightLabel: 'Noite',
    earlyMorningLabel: 'Madrugada (Dia seguinte)',
    nextDay: '(Dia seguinte)',
    legalText1: 'Seus dados são usados exclusivamente para garantir a segurança e agilidade no seu atendimento no prédio.',
    nextStep: 'Próximo Passo',
    step2Title: 'Envio de arquivos',
    step2Subtitle: 'Passo 2 de 3: Identificação do hóspede',
    uploadInstruction: 'Envie os arquivos obrigatórios:',
    selfieItem: 'Selfie',
    selfieDesc: '(Foto 3x4)',
    docItem: 'Documento',
    docDesc: '(RG/CNH/Passaporte)',
    selfieLabel: 'Selfie do hóspede',
    sent: 'Enviado',
    pending: 'Pendente',
    takePhoto: 'Tirar foto ou selecionar arquivo',
    selfieSent: 'Selfie enviada',
    readyToSend: 'Pronto para envio',
    docLabel: 'Documento com foto',
    selectDoc: 'Selecionar RG, CNH ou Passaporte',
    docLoaded: 'Documento carregado',
    plateLabel: 'Placa do Veículo',
    platePlaceholder: 'ABC-1234',
    marcaLabel: 'Marca do Veículo',
    marcaPlaceholder: 'Ex: Chevrolet',
    modeloLabel: 'Modelo do Veículo',
    modeloPlaceholder: 'Ex: Onix',
    corLabel: 'Cor do Veículo',
    corPlaceholder: 'Ex: Preto',
    plateHint: 'Necessário para liberação de vaga na garagem.',
    sendDocs: 'Enviar Documentos',
    back: 'Voltar',
    processing: 'Processando...',
    successTitle: 'Cadastro Concluído!',
    successText: 'Tudo pronto para sua estadia.<br>Aguardamos sua chegada.',
    legalText2: 'Suas instruções de acesso serão enviadas 1 hora antes da sua entrada no apartamento.',
    registerAnother: 'Cadastrar Outro Hóspede',
    finish: 'Concluir',
    useGarageLabel: 'Utilizar vaga de garagem',
    useGarageHint: 'Desmarque caso não vá utilizar a vaga ou se o veículo já foi preenchido por outro hóspede.',
    dateStepTitle: 'Datas da Reserva',
    startDateLabel: 'Data de Início',
    endDateLabel: 'Data de Fim',
    searchReserva: 'Buscar Reserva',
    searchingReserva: 'Buscando...',
    reservaNotFound: 'Nenhuma reserva encontrada para o período informado.'
  };

  enText = {
    tagline: 'Property Management and Innovation',
    codeLabel: 'Reservation Code',
    step1Title: 'Identification',
    foreignerLabel: 'I am a foreigner',
    nameLabel: 'Full Name',
    namePlaceholder: 'Ex: John Doe',
    cpfLabel: 'CPF',
    cpfPlaceholder: '000.000.000-00',
    passportLabel: 'Passport',
    passportPlaceholder: 'Document Number',
    phoneLabel: 'Phone',
    phonePlaceholder: '+1 (555) 000-0000',
    arrivalLabel: 'Estimated Arrival Time',
    afternoonLabel: 'Afternoon',
    nightLabel: 'Night',
    earlyMorningLabel: 'Early Morning (Next Day)',
    nextDay: '(Next Day)',
    legalText1: 'Your data is used exclusively to ensure security and agility in your service at the building.',
    nextStep: 'Next Step',
    step2Title: 'File Upload',
    step2Subtitle: 'Step 2 of 3: Guest Identification',
    uploadInstruction: 'Upload the required files:',
    selfieItem: 'Selfie',
    selfieDesc: '(Headshot)',
    docItem: 'Document',
    docDesc: '(ID/License/Passport)',
    selfieLabel: 'Guest Selfie',
    sent: 'Sent',
    pending: 'Pending',
    takePhoto: 'Take photo or select file',
    selfieSent: 'Selfie uploaded',
    readyToSend: 'Ready to send',
    docLabel: 'Photo Document',
    selectDoc: 'Select ID, License or Passport',
    docLoaded: 'Document uploaded',
    plateLabel: 'Vehicle Plate',
    platePlaceholder: 'ABC-1234',
    marcaLabel: 'Vehicle Brand',
    marcaPlaceholder: 'Ex: Chevrolet',
    modeloLabel: 'Vehicle Model',
    modeloPlaceholder: 'Ex: Onix',
    corLabel: 'Vehicle Color',
    corPlaceholder: 'Ex: Black',
    plateHint: 'Required for garage access release.',
    sendDocs: 'Submit Documents',
    back: 'Back',
    processing: 'Processing...',
    successTitle: 'Registration Complete!',
    successText: 'Everything is ready for your stay.<br>We look forward to your arrival.',
    legalText2: 'The instructions to access your apartment will be sent to you 1 hour before your arrival.',
    registerAnother: 'Register Another Guest',
    finish: 'Finish',
    useGarageLabel: 'Use parking space',
    useGarageHint: 'Uncheck if you will not use the space or if the vehicle has already been registered by another guest.',
    dateStepTitle: 'Reservation Dates',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    searchReserva: 'Search Reservation',
    searchingReserva: 'Searching...',
    reservaNotFound: 'No reservation found for the given period.'
  };

  constructor(
    private checkinFormService: CheckInFormService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const apartamentoNome = params.get('apartamentoNome');
      if (apartamentoNome) {
        // Rota booking/:apartamentoNome
        this.isBookingRoute = true;
        this.apartamentoNome = apartamentoNome;
        this.step = 0; // Step de seleção de datas
      } else {
        // Rota tradicional: reserva/:id ou cameraApp/:id
        this.id = params.get('id') ?? '';
        if (this.id) {
          this.carregarFlagsApartamento(this.id);
        }
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
    this.splitHours();
  }

  afternoonHours: string[] = [];
  nightHours: string[] = [];
  earlyMorningHours: string[] = [];

  private splitHours() {
    this.afternoonHours = this.hourOptions.filter(h => {
      const hour = parseInt(h.split(':')[0], 10);
      return hour >= 12 && hour < 18;
    });
    this.nightHours = this.hourOptions.filter(h => {
      const hour = parseInt(h.split(':')[0], 10);
      // Noite: 18:00 até 23:00
      return hour >= 18 && hour <= 23;
    });
    this.earlyMorningHours = this.hourOptions.filter(h => {
      const hour = parseInt(h.split(':')[0], 10);
      // Madrugada: 00:00 até 06:00
      return hour >= 0 && hour <= 6;
    });
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

        // Padrão: se tem garagem, supõe que vai usar
        if (this.tem_garagem) {
          this.usarGaragem = true;
        }
      },
      error: (err) => {
        console.error('Falha ao carregar informações do apartamento:', err);
        this.toastr.warning('Não foi possível obter as informações do apartamento.');
        this.pedir_selfie = false; // fallback: não pedir selfie
      }
    });
  }


  searchReserva() {
    if (!this.dataInicio || !this.dataFim) {
      this.toastr.warning(this.souEstrangeiro ? 'Please fill in both dates.' : 'Preencha ambas as datas.');
      return;
    }
    this.isSearchingReserva = true;
    this.reservasAirbnbService.getCodReservaByApartamentoAndDates(
      this.apartamentoNome,
      this.dataInicio,
      this.dataFim
    ).subscribe({
      next: (result) => {
        console.log('Reserva encontrada:', result);
        this.isSearchingReserva = false;
        if (result && result.cod_reserva) {
          this.id = result.cod_reserva;
          this.carregarFlagsApartamento(this.id);
          this.step = 1;
          this.toastr.success(
            this.souEstrangeiro
              ? `Reservation found: ${result.cod_reserva}`
              : `Reserva encontrada: ${result.cod_reserva}`
          );
        } else {
          this.toastr.error(this.t.reservaNotFound);
        }
      },
      error: (err) => {
        this.isSearchingReserva = false;
        console.error('Erro ao buscar reserva:', err);
        this.toastr.error(this.t.reservaNotFound);
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
    // Se o apartamento tem garagem, solicitar placa e dados do carro
    if (this.tem_garagem === true && this.usarGaragem) {
      const placa = (this.placaCarro || '').toUpperCase().trim();
      const regexAntigo = /^[A-Z]{3}-?\d{4}$/;
      const regexMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;

      if (!placa) {
        this.toastr.warning('Informe a placa do carro.');
        return;
      }
      if (!(regexAntigo.test(placa) || regexMercosul.test(placa))) {
        this.toastr.warning('Placa inválida. Use formato ABC-1234 ou ABC1D23.');
        return;
      }

      if (!this.marcaCarro) {
        this.toastr.warning('Informe a marca do carro.');
        return;
      }
      if (!this.modeloCarro) {
        this.toastr.warning('Informe o modelo do carro.');
        return;
      }
      if (!this.corCarro) {
        this.toastr.warning('Informe a cor do carro.');
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
      // Se tiver garagem, envia os dados.
      // Assumindo que o backend aceite esses novos campos. Se não, idealmente concatenariamos ou avisariamos o dev.
      // Vou enviar como campos individuais, pois é o mais semântico.
      placa_carro: this.tem_garagem === true ? this.placaCarro : null,
      marca_carro: this.tem_garagem === true ? this.marcaCarro : null,
      modelo_carro: this.tem_garagem === true ? this.modeloCarro : null,
      cor_carro: this.tem_garagem === true ? this.corCarro : null
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
    this.step = this.isBookingRoute ? 0 : 1;
    this.formData = { cpf: '', nome: '', telefone: '', horarioPrevistoChegada: '15:00' };
    this.photoDataUrl = null;
    this.documentFile = null;
    this.isSubmitting = false;
    this.placaCarro = '';
    this.marcaCarro = '';
    this.modeloCarro = '';
    this.corCarro = '';
    if (this.isBookingRoute) {
      this.id = '';
      this.dataInicio = '';
      this.dataFim = '';
    }
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
    if (this.isBookingRoute && this.step === 1) {
      this.step = 0;
    } else if (this.step > 1) {
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

  concluirCadastro() {
    this.step = 6;
  }

  /** Retorna true se o horário for entre 01:00 e 06:00 */
  isNextDay(hour: string): boolean {
    const h = parseInt(hour.split(':')[0], 10);
    return h >= 1 && h <= 6;
  }
}