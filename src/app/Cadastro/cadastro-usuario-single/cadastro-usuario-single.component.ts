import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';

@Component({
  selector: 'app-cadastro-usuario-single',
  templateUrl: './cadastro-usuario-single.component.html',
  styleUrls: ['./cadastro-usuario-single.component.css']
})
export class CadastroUsuarioSingleComponent implements OnInit {
  // Se fornecido, fará o checkin para essa reserva
  @Input() cod_reserva: string | null = null;
  @Output() closed = new EventEmitter<boolean>(); // true = sucesso, false = cancelado

  step = 1;
  isSubmitting = false;

  formData = {
    cpf: '',
    nome: '',
    telefone: '',
    horarioPrevistoChegada: '15:00'
  };

  photoDataUrl: string | null = null;
  documentFile: string | null = null;

  hourOptions: string[] = [];
  souEstrangeiro = false;

  // uploads (opcionais para gestor)

  constructor(
    private checkinFormService: CheckInFormService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // gerar opções de horário semelhantes ao camera-app (15:00..24:00 + 01:00..06:00)
    for (let i = 15; i <= 24; i++) {
      const hora = i < 24 ? `${i.toString().padStart(2, '0')}:00` : '00:00';
      this.hourOptions.push(hora);
    }
    for (let i = 1; i <= 6; i++) {
      const hora = `${i.toString().padStart(2, '0')}:00`;
      this.hourOptions.push(hora);
    }

    // cod_reserva recebido opcionalmente; não é necessário buscar flags neste componente (gestor)
  }

  selectHour(hour: string) {
    this.formData.horarioPrevistoChegada = hour;
  }

  onSelfieSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isSizeValid = file.size <= 5 * 1024 * 1024;
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPDF && !isImage) { this.toastr.warning('Envie uma imagem ou PDF para a selfie.'); return; }
    if (!isSizeValid) { this.toastr.warning('Arquivo maior que 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      this.photoDataUrl = reader.result as string;
      this.toastr.success('Selfie selecionada.');
    };
    reader.onerror = () => this.toastr.error('Erro ao ler arquivo da selfie.');
    reader.readAsDataURL(file);
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isSizeValid = file.size <= 5 * 1024 * 1024;
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPDF && !isImage) { this.toastr.warning('Envie um PDF ou imagem do documento.'); return; }
    if (!isSizeValid) { this.toastr.warning('Arquivo maior que 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      this.documentFile = reader.result as string;
      this.toastr.success('Documento selecionado.');
    };
    reader.onerror = () => this.toastr.error('Erro ao ler arquivo do documento.');
    reader.readAsDataURL(file);
  }

  validateCPF(cpf: string): boolean {
    cpf = (cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11 || /^(.)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let dv1 = (soma * 10) % 11; if (dv1 === 10 || dv1 === 11) dv1 = 0;
    if (dv1 !== parseInt(cpf.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    let dv2 = (soma * 10) % 11; if (dv2 === 10 || dv2 === 11) dv2 = 0;
    if (dv2 !== parseInt(cpf.charAt(10))) return false;
    return true;
  }

  goForward() {
    if (!this.souEstrangeiro && !this.validateCPF(this.formData.cpf)) { this.toastr.warning('CPF inválido!'); return; }
    if (!this.formData.nome) { this.toastr.warning('Digite o nome!'); return; }
    if (!this.formData.telefone) { this.toastr.warning('Digite o telefone!'); return; }
    this.step = 2;
  }

  goBack() { if (this.step > 1) this.step--; }

  sendData() {
    if (this.isSubmitting) return;
    // Para gestor: selfie e documento são opcionais. Não validamos placa nem forçamos envio.

    this.isSubmitting = true;
    this.step = 4;

    const payload: any = {
      cod_reserva: this.cod_reserva ?? null,
      CPF: this.formData.cpf,
      Nome: (this.formData.nome || '').toUpperCase(),
      Telefone: this.formData.telefone,
      horarioPrevistoChegada: this.formData.horarioPrevistoChegada,
      imagemBase64: this.photoDataUrl ? this.photoDataUrl.split(',')[1] : null,
      tipo: this.cod_reserva ? 'guest' : 'manager',
      documentBase64: this.documentFile ? this.documentFile.split(',')[1] : null,
      reserva_id: this.cod_reserva ?? null
    };

    this.checkinFormService.createCheckin(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.step = 5;
        this.toastr.success(this.cod_reserva ? 'Check-in realizado com sucesso!' : 'Usuário cadastrado com sucesso!');
        // emitir sucesso para quem abriu o modal
        this.closed.emit(true);
      },
      error: (err) => {
        console.error('Erro ao enviar dados:', err);
        this.toastr.error('Erro ao salvar os dados.');
        this.isSubmitting = false;
        this.step = 1;
      }
    });
  }

  cancel() {
    this.closed.emit(false);
  }
}
