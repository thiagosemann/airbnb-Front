import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NpsLimpezaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/nps_limpeza_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';

@Component({
  selector: 'app-nps-limpeza-hospede',
  templateUrl: './nps-limpeza-hospede.component.html',
  styleUrls: ['./nps-limpeza-hospede.component.css']
})
export class NpsLimpezaHospedeComponent implements OnInit {
  npsForm!: FormGroup;
  apartamentoNome: string = '';
  terceirizadaNome: string = '';

  apartamentoId!: number;
  userId!: number;
  currentEmpresaId: number | null = null;

  precisionStars = [
    { value: 1, label: '1 estrela' },
    { value: 2, label: '2 estrelas' },
    { value: 3, label: '3 estrelas' },
    { value: 4, label: '4 estrelas' },
    { value: 5, label: '5 estrelas' }
  ];

  private dragging = false;
  private dragField: string | null = null;
  private tempRatings: { [key: string]: number } = {};

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private npsService: NpsLimpezaService,
    private userService: UserService,
    private apartamentoService: ApartamentoService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.readIdsFromRoute();
    this.buildForm();
    this.loadDisplayInfo();
  }

  private readIdsFromRoute(): void {
    const user = this.authService.getUser();
    this.currentEmpresaId = user?.empresa_id ?? null;

    const aptoParam = this.route.snapshot.paramMap.get('apartamentoId');
    const userParam = this.route.snapshot.paramMap.get('userId');

    const aptoId = Number(aptoParam);
    const uId = Number(userParam);

    if (!aptoParam || isNaN(aptoId) || aptoId <= 0) {
      this.toastr.error('Apartamento inválido na URL.');
      throw new Error('apartamentoId inválido');
    }
    if (!userParam || isNaN(uId) || uId <= 0) {
      this.toastr.error('Usuário inválido na URL.');
      throw new Error('userId inválido');
    }

    this.apartamentoId = aptoId;
    this.userId = uId;
  }

  private loadDisplayInfo(): void {
    this.apartamentoService.getApartamentoById(this.apartamentoId).subscribe({
      next: a => this.apartamentoNome = a?.nome || 'Apartamento',
      error: () => this.apartamentoNome = 'Apartamento'
    });
    this.userService.getUser(this.userId).subscribe({
      next: u => this.terceirizadaNome = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Responsável',
      error: () => this.terceirizadaNome = 'Responsável'
    });
  }

  private buildForm(): void {
    this.npsForm = this.fb.group({
      limpeza_quarto: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      limpeza_banheiros: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      limpeza_cozinha: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      comentario: ['']
    });
  }

  getCurrentRating(field: string): number {
    return this.tempRatings[field] || this.npsForm.get(field)?.value || 0;
  }

  setPrecisionRating(field: string, rating: number): void {
    const current = this.getCurrentRating(field);
    // Toggle para limpar quando estiver em 0.5 e clicar novamente
    if (rating === current && rating <= 0.5) {
      this.npsForm.get(field)?.setValue(0);
      this.tempRatings[field] = 0;
      return;
    }
    this.npsForm.get(field)?.setValue(rating);
    this.tempRatings[field] = rating;
  }

  // Slider-like interactions para precisão
  onStarsTouchStart(field: string, ev: TouchEvent) {
    this.dragging = true;
    this.dragField = field;
    const container = ev.currentTarget as HTMLElement;
    const touch = ev.touches[0];
    this.updatePrecisionRatingFromPosition(field, container, touch.clientX);
  }

  onStarsTouchMove(field: string, ev: TouchEvent) {
    if (!this.dragging || this.dragField !== field) return;
    const container = ev.currentTarget as HTMLElement;
    const touch = ev.touches[0];
    this.updatePrecisionRatingFromPosition(field, container, touch.clientX);
    ev.preventDefault();
  }

  onStarsTouchEnd() { 
    this.dragging = false; 
    this.dragField = null;
  }

  onStarsMouseDown(field: string, ev: MouseEvent) {
    this.dragging = true;
    this.dragField = field;
    const container = ev.currentTarget as HTMLElement;
    this.updatePrecisionRatingFromPosition(field, container, ev.clientX);
  }

  onStarsMouseMove(field: string, ev: MouseEvent) {
    if (!this.dragging || this.dragField !== field) return;
    const container = ev.currentTarget as HTMLElement;
    this.updatePrecisionRatingFromPosition(field, container, ev.clientX);
  }

  onStarsMouseUp() { 
    this.dragging = false; 
    this.dragField = null;
  }

  private updatePrecisionRatingFromPosition(field: string, container: HTMLElement, clientX: number) {
    const rect = container.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width > 0 ? x / rect.width : 0;
    // 0..5 com passo de 0.5 e permitindo 0
    let rating = Math.round((ratio * 5) * 2) / 2;
    if (x <= 4) rating = 0; // zona de folga para zerar facilmente
    rating = Math.max(0, Math.min(5, rating));
    this.setPrecisionRating(field, rating);
  }

  getPrecisionRatingLabel(rating: number | null): string {
    if (!rating || rating < 0.5) return 'Toque nas estrelas para avaliar';
    
    const labels: { [key: number]: string } = {
      0.5: 'Muito Ruim',
      1: 'Ruim',
      1.5: 'Regular -',
      2: 'Regular',
      2.5: 'Regular +',
      3: 'Bom -',
      3.5: 'Bom',
      4: 'Bom +',
      4.5: 'Excelente -',
      5: 'Excelente'
    };
    
    return labels[rating] || 'Avalie';
  }

  getInitials(name: string): string {
    if (!name || name === 'Responsável') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  submitNps(): void {
    if (this.npsForm.invalid) {
      this.npsForm.markAllAsTouched();
      this.toastr.warning('Por favor, avalie todos os itens antes de enviar.');
      return;
    }

    const formValue = this.npsForm.value;
    const payload: any = {
      apartamento_id: this.apartamentoId,
      user_id: this.userId,
      empresa_id: this.currentEmpresaId,
      limpeza_quarto: formValue.limpeza_quarto * 2, // Convertendo para escala 0-10
      limpeza_banheiros: formValue.limpeza_banheiros * 2,
      limpeza_cozinha: formValue.limpeza_cozinha * 2,
      comentario: formValue.comentario,
      nota_geral: this.calculateNotaGeral(formValue)
    };

    this.npsService.create(payload).subscribe({
      next: () => {
        this.toastr.success('Avaliação enviada com sucesso! Obrigado pelo feedback.');
        this.npsForm.reset();
        this.tempRatings = {};
      },
      error: (error) => {
        console.error('Erro ao enviar avaliação:', error);
        this.toastr.error('Erro ao enviar avaliação. Tente novamente.');
      }
    });
  }

  private calculateNotaGeral(formValue: any): number {
    const notas = [formValue.limpeza_quarto, formValue.limpeza_banheiros, formValue.limpeza_cozinha];
    const soma = notas.reduce((acc: number, n: number) => acc + (Number(n) || 0), 0);
    const media = soma / notas.length;
    return Math.round((media * 2) * 10) / 10;
  }
}