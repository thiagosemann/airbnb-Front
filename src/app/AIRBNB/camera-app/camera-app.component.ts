import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Toast, ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';

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
  photoDataUrl: string | null = null; // Imagem capturada
  documentPhotoUrl: string | null = null; // Imagem capturada
  documentFile: string | null = null; // Arquivo do documento
  fotoOuDocumentoString:string='';
  @ViewChild('video', { static: false }) videoElement!: ElementRef;
  @ViewChild('videoDoc', { static: false }) videoDocElement!: ElementRef;
  private mediaStream: MediaStream | null = null; // Para parar a câmera depois do uso
  private documentMediaStream: MediaStream | null = null; // Para parar a câmera do documento
  loadingCamera:Boolean=false;
  hourOptions: string[] = [];

  constructor(
    private checkinFormService: CheckInFormService,
    private route: ActivatedRoute, // Injete o ActivatedRoute
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') ?? ''; // Atribui o valor do 'id' à variável
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
  selectHour(hour: string) {
    this.formData.horarioPrevistoChegada = hour;
  }
  // Recebe o arquivo selecionado para envio
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
  
    const isPDF = file.type === 'application/pdf';
    const isSizeValid = file.size <= 5 * 1024 * 1024; // 1MB
  
    if (!isPDF) {
      this.toastr.warning('Se necessário tire uma foto do documento.');
      this.toastr.warning('Somente arquivos PDF são permitidos.');
      return;
    }
  
    if (!isSizeValid) {
      this.toastr.warning('Se necessário tire uma foto do documento.');
      this.toastr.warning('Arquivo maior que 5MB.');


      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      this.documentFile = base64String;
      this.toastr.success('Documento PDF selecionado com sucesso.');
    };
    reader.onerror = () => {
      this.toastr.error('Erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
  }
  
  
  // Inicia a câmera do usuário
  startCamera() {
    this.loadingCamera = true;
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.mediaStream = stream; // Salvar a referência do stream
        this.videoElement.nativeElement.srcObject = stream;
      })
      .catch(err => {
        console.error('Erro ao acessar câmera', err);
      })
      .finally(() => {
        this.loadingCamera = false;
      });
  }

  // Inicia a câmera para capturar a foto do documento
  startDocumentCamera() {
    this.loadingCamera = true;
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: { ideal: 'environment' } } // Solicita a câmera traseira
    })
    .then(stream => {
      this.documentMediaStream = stream; // Salvar a referência do stream
      this.videoDocElement.nativeElement.srcObject = stream;
    })
    .catch(err => {
      console.error('Erro ao acessar câmera traseira', err);
      this.toastr.error('Erro ao acessar a câmera traseira.');
    })
    .finally(() => {
      this.loadingCamera = false;
    });
  }
  

  // Captura a foto da câmera
  capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.nativeElement.videoWidth;
    canvas.height = this.videoElement.nativeElement.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(this.videoElement.nativeElement, 0, 0);
    this.photoDataUrl = canvas.toDataURL('image/png');
    this.stopCamera();
    //this.videoElement.nativeElement.pause(); // Pausa o vídeo após capturar a foto
  }

   // Captura a foto do documento
   captureDocumentPhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = this.videoDocElement.nativeElement.videoWidth;
    canvas.height = this.videoDocElement.nativeElement.videoHeight;
    const context = canvas.getContext('2d');
    context?.drawImage(this.videoDocElement.nativeElement, 0, 0);
    this.documentPhotoUrl = canvas.toDataURL('image/png');
    this.stopDocumentCamera();
  }
  // Cancela a foto do documento e reinicia a câmera
  cancelDocumentPhoto() {
    this.documentPhotoUrl = null;
    this.startDocumentCamera(); // Reinicia a câmera do documento
  }
  


  // Cancela a foto capturada e reinicia a câmera
  cancelPhoto() {
    this.photoDataUrl = null;
    this.startCamera(); // Reinicia a câmera
  }

  // Envia a foto e as informações para o Google Apps Script
// Modifique o método sendData() para isto:
sendData() {
  // Validar campos obrigatórios
  if (!this.photoDataUrl || !this.formData.cpf || !this.formData.nome || !this.formData.telefone || (!this.documentPhotoUrl && !this.documentFile)) {
    this.toastr.warning('Preencha todos os campos obrigatórios, incluindo o documento.');
    return;
  }

  // Construir o objeto conforme o model do backend
  const checkinData = {
    cod_reserva: this.id, // Supondo que o id da rota seja o cod_reserva
    CPF: this.formData.cpf,
    Nome: this.formData.nome.toUpperCase(),
    Telefone: this.formData.telefone,
    horarioPrevistoChegada: this.formData.horarioPrevistoChegada,  // ← inclua aqui
    imagemBase64: this.photoDataUrl.split(',')[1], // Remove o prefixo Data URL
    tipo: 'guest', // Ou outro valor conforme sua regra de negócio
    documentBase64: this.documentPhotoUrl 
      ? this.documentPhotoUrl.split(',')[1] 
      : this.documentFile?.split(',')[1] || null,
    reserva_id: this.id // Supondo que reserva_id é o mesmo que cod_reserva
  };

  this.step = 4; // Mostrar loading

  this.checkinFormService.createCheckin(checkinData).subscribe(
    (response) => {
      this.step = 5; // Sucesso
      this.toastr.success('Check-in realizado com sucesso!');
    },
    (error) => {
      console.error('Erro no check-in:', error);
      this.toastr.error('Erro ao realizar check-in');
      this.resetFlow();
    }
  );
}

  // Reseta o fluxo para o início
  resetFlow() {
    this.step = 1;
    this.formData = { cpf: '', nome: '', telefone: '',horarioPrevistoChegada:'15:00' };
    this.stopCamera();
    this.stopDocumentCamera();
    this.photoDataUrl = null;
    this.documentPhotoUrl = null;
    this.documentFile = null;
    this.loadingCamera = false;
    this.fotoOuDocumentoString = '';
  }

  // Valida o CPF do usuário
  validateCPF(cpf: string): boolean {
    // Remove todos os caracteres que não forem dígitos
    cpf = cpf.replace(/\D/g, '');

    // Verifica se o CPF tem 11 dígitos ou se todos os dígitos são iguais
    if (cpf.length !== 11 || /^(.)\1+$/.test(cpf)) return false;

    // Cálculo do primeiro dígito verificador
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

    // Cálculo do segundo dígito verificador
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

    // CPF válido
    return true;
  }


  // Para a câmera e limpa o fluxo de vídeo
  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
  // Para a câmera do documento e limpa o fluxo de vídeo
  stopDocumentCamera() {
    if (this.documentMediaStream) {
      this.documentMediaStream.getTracks().forEach(track => track.stop());
      this.documentMediaStream = null;
    }
  }

  // Volta para a etapa anterior
  goBack() {
    if (this.step > 1) {
      this.step--; // Decrementa a etapa
    }
  
    if (this.step === 2) {
      if (!this.photoDataUrl) {
        this.startCamera(); // Inicia a câmera se a foto não estiver presente
      } 
    }
  }
  
  
  goForward() {
    if(this.step==1){
      if (!this.validateCPF(this.formData.cpf)) {
        this.toastr.warning("CPF inválido!")
        return;
      }
      if(this.formData.cpf==""){
        this.toastr.warning("Digite o CPF!")
        return;
      }
      if(this.formData.nome==""){
        this.toastr.warning("Digite o nome!")
        return;
      }
      if(this.formData.telefone==""){
        this.toastr.warning("Digite o telefone!")
        return;
      }
      if (!this.formData.horarioPrevistoChegada) {
        this.toastr.warning('Selecione o horário previsto de chegada!');
        return;
      }
      this.step = 2; // Avançar para a etapa de captura de foto
      this.startCamera(); // Iniciar a câmera
    }else if (this.step < 5) {
      this.step++; // Decrementa a etapa
    }
  }

  documentoComoFoto():void{
    this.fotoOuDocumentoString="foto"
    this.startDocumentCamera();
  }
  documentoComoArquivo():void{
    this.fotoOuDocumentoString="arquivo"
  }
  voltarParaEntregaDocumentos():void{
    this.fotoOuDocumentoString=""
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