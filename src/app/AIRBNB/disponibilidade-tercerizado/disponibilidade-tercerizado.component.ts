import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { TerceirizadoDisponibilidadeService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/tercerizado_disponibilidade_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { TerceirizadoDisponibilidade } from 'src/app/shared/utilitarios/terceirizadoDisponibilidade';
import { User } from 'src/app/shared/utilitarios/user';

interface DiaState {
  dia_semana: number;
  label: string;
  abrev: string;
  id?: number;
  value: number | null;
  originalValue: number | null;
  originalId?: number;
}

@Component({
  selector: 'app-disponibilidade-tercerizado',
  templateUrl: './disponibilidade-tercerizado.component.html',
  styleUrls: ['./disponibilidade-tercerizado.component.css']
})
export class DisponibilidadeTercerizadoComponent implements OnInit {
  terceirizados: User[] = [];
  selectedUserId: number | null = null;
  dias: DiaState[] = [];
  loading = false;
  saving = false;

  private readonly DIAS = [
    { label: 'Domingo',  abrev: 'Dom' },
    { label: 'Segunda',  abrev: 'Seg' },
    { label: 'Terça',    abrev: 'Ter' },
    { label: 'Quarta',   abrev: 'Qua' },
    { label: 'Quinta',   abrev: 'Qui' },
    { label: 'Sexta',    abrev: 'Sex' },
    { label: 'Sábado',   abrev: 'Sáb' },
  ];

  constructor(
    private userService: UserService,
    private disponibilidadeService: TerceirizadoDisponibilidadeService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.userService.getUsersByRole('terceirizado').subscribe({
      next: users => this.terceirizados = users,
      error: () => this.toastr.error('Erro ao carregar terceirizados')
    });
    this.initDias();
  }

  private initDias(registros: TerceirizadoDisponibilidade[] = []): void {
    this.dias = this.DIAS.map(({ label, abrev }, i) => {
      const reg = registros.find(r => r.dia_semana === i);
      const val = reg !== undefined ? reg.max_limpezas_dia : null;
      return {
        dia_semana: i,
        label,
        abrev,
        id: reg?.id,
        value: val,
        originalValue: val,
        originalId: reg?.id,
      };
    });
  }

  onUserChange(): void {
    if (!this.selectedUserId) {
      this.initDias();
      return;
    }
    this.loading = true;
    this.disponibilidadeService.getByUser(Number(this.selectedUserId)).subscribe({
      next: registros => {
        this.initDias(registros);
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Erro ao carregar disponibilidade');
        this.loading = false;
      }
    });
  }

  onDiaInput(dia: DiaState, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    dia.value = val === '' ? null : Number(val);
  }

  get hasMudancas(): boolean {
    return this.dias.some(d => {
      const hasValue = d.value !== null && String(d.value) !== '';
      const hadRecord = d.originalId !== undefined;
      if (hasValue && !hadRecord) return true;
      if (!hasValue && hadRecord) return true;
      if (hasValue && hadRecord && Number(d.value) !== d.originalValue) return true;
      return false;
    });
  }

  salvar(): void {
    if (!this.selectedUserId) return;
    const userId = Number(this.selectedUserId);
    const requests: any[] = [];

    for (const dia of this.dias) {
      const hasValue = dia.value !== null && String(dia.value) !== '';
      const valNum = hasValue ? Number(dia.value) : null;

      if (hasValue && dia.originalId === undefined) {
        requests.push(this.disponibilidadeService.create({ user_id: userId, dia_semana: dia.dia_semana, max_limpezas_dia: valNum! }));
      } else if (hasValue && dia.originalId !== undefined && valNum !== dia.originalValue) {
        requests.push(this.disponibilidadeService.update(dia.originalId, { user_id: userId, dia_semana: dia.dia_semana, max_limpezas_dia: valNum! }));
      } else if (!hasValue && dia.originalId !== undefined) {
        requests.push(this.disponibilidadeService.delete(dia.originalId));
      }
    }

    if (requests.length === 0) return;

    this.saving = true;
    forkJoin(requests).subscribe({
      next: () => {
        this.toastr.success('Disponibilidade salva com sucesso!');
        this.saving = false;
        this.onUserChange();
      },
      error: () => {
        this.toastr.error('Erro ao salvar disponibilidade');
        this.saving = false;
      }
    });
  }

  getNomeTerceirizado(user: User): string {
    return `${user.first_name} ${user.last_name}`.trim();
  }

  trackByDia(_: number, dia: DiaState): number {
    return dia.dia_semana;
  }
}
