import { Component, OnInit } from '@angular/core';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { forkJoin, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-migrar-ical',
  templateUrl: './migrar-ical.component.html',
  styleUrls: ['./migrar-ical.component.css']
})
export class MigrarICALComponent implements OnInit {
  apartamentos: Apartamento[] = [];
  selectedApartamentoId: number | null = null;

  reservas: ReservaAirbnb[] = [];
  reservasSemAyrton: ReservaAirbnb[] = [];
  reservasAyrton: ReservaAirbnb[] = [];
  // Mapeia reserva.id -> { checkinIds: number[], totalHospedes: number }
  checkinsPorReserva: Record<number, { checkinIds: number[]; totalHospedes: number }> = {};
  carregandoCheckins = false;

  // Seleção para migração (somente layout/console por enquanto)
  selectedSourceId: number | null = null; // reserva da primeira tabela
  selectedTargetId: number | null = null; // reserva AYRTON da segunda tabela

  loadingApartamentos = false;
  loadingReservas = false;
  errorMsg: string | null = null;

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasService: ReservasAirbnbService,
    private checkinService: CheckInFormService
  ) {}

  ngOnInit(): void {
    this.loadApartamentos();
  }

  loadApartamentos(): void {
    this.loadingApartamentos = true;
    this.errorMsg = null;
    this.apartamentoService.getAllApartamentos().subscribe({
      next: (data) => {
        // Ordena por nome do anúncio, se existir, senão por nome
        this.apartamentos = (data || []).sort((a, b) => {
          const an = (a.nome_anuncio || a.nome || '').toLowerCase();
          const bn = (b.nome_anuncio || b.nome || '').toLowerCase();
          return an.localeCompare(bn);
        });
      },
      error: (err) => {
        console.error('Erro ao carregar apartamentos', err);
        this.errorMsg = 'Não foi possível carregar os apartamentos.';
      },
      complete: () => {
        this.loadingApartamentos = false;
      },
    });
  }

  onSelectApartamento(aptoIdStr: string): void {
    const id = Number(aptoIdStr);
    this.selectedApartamentoId = Number.isFinite(id) ? id : null;
    if (this.selectedApartamentoId) {
      this.loadReservas(this.selectedApartamentoId);
    } else {
      this.reservas = [];
    }
  }

  // Handler para evento change com tipagem segura
  onSelectApartamentoEvent(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.onSelectApartamento(target?.value || '');
  }

  private loadReservas(apartamentoId: number): void {
    this.loadingReservas = true;
    this.errorMsg = null;
    this.reservasService.getReservasByApartamentoId(apartamentoId).subscribe({
      next: (data) => {
        // Filtra removendo reservas anteriores (end_date < hoje) e ordena da mais nova para a mais antiga
        this.reservas = this.filterAndSortReservas(data || []);
        this.aplicarFiltroAyrton();
        // Após obter reservas, carregar check-ins para cada uma
        this.carregarCheckinsParaReservas();
      },
      error: (err) => {
        console.error('Erro ao carregar reservas', err);
        this.errorMsg = 'Não foi possível carregar as reservas.';
        this.reservas = [];
      },
      complete: () => {
        this.loadingReservas = false;
      },
    });
  }

  private carregarCheckinsParaReservas(): void {
    this.checkinsPorReserva = {};
    if (!this.reservas.length) {
      this.carregandoCheckins = false;
      return;
    }
    this.carregandoCheckins = true;

    const requests = this.reservas.map((res) => {
      const resId = res.id ?? -1;
      const codReserva = res.cod_reserva?.toString();
      if (resId === -1 || !codReserva) {
        return of({ resId, ids: [] as number[], total: 0 });
      }
      return this.checkinService
        .getCheckinByReservaIdOrCodReserva(resId.toString(), codReserva)
        .pipe(
          map((checkins) => {
            const arr = Array.isArray(checkins) ? checkins : checkins ? [checkins] : [];
            const ids = arr.map((c: any) => c.id).filter((v: any) => v !== undefined);
            return { resId, ids, total: ids.length };
          }),
          catchError((err) => {
            console.warn('Falha ao carregar check-ins para reserva', resId, err);
            return of({ resId, ids: [] as number[], total: 0 });
          })
        );
    });

    forkJoin(requests)
      .pipe(
        finalize(() => {
          this.carregandoCheckins = false;
        })
      )
      .subscribe((results) => {
        results.forEach((r) => {
          if (r.resId != null && r.resId !== -1) {
            this.checkinsPorReserva[r.resId] = {
              checkinIds: r.ids,
              totalHospedes: r.total,
            };
          }
        });
        // Reaplica filtro Ayrton após ter os dados (caso queira usar algo dos check-ins futuramente)
        this.aplicarFiltroAyrton();
      });
  }

  // Calcula número de noites entre duas datas ISO (yyyy-MM-dd) ou string date-time
  calcNoites(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = e.getTime() - s.getTime();
    const noites = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return noites > 0 ? noites : 0;
  }

  totalHospedesReserva(reserva: ReservaAirbnb): number {
    if (reserva.id == null) return 0;
    return this.checkinsPorReserva[reserva.id]?.totalHospedes ?? 0;
  }

  checkinIdsReserva(reserva: ReservaAirbnb): number[] {
    if (reserva.id == null) return [];
    return this.checkinsPorReserva[reserva.id]?.checkinIds || [];
  }

  private aplicarFiltroAyrton(): void {
    const termo = 'AYRTON';
    const upper = (v: any) => (v ?? '').toString().toUpperCase();
    this.reservasAyrton = this.reservas.filter(r => upper(r.cod_reserva).includes(termo));
    this.reservasSemAyrton = this.reservas.filter(r => !upper(r.cod_reserva).includes(termo));
  }

  // --- Filtro e ordenação ---
  private filterAndSortReservas(data: ReservaAirbnb[]): ReservaAirbnb[] {
    const todayStr = this.toDateOnlyStr(new Date().toISOString());
    const futurasOuAtuais = data.filter(r => {
      const endStr = this.toDateOnlyStr(r.end_data);
      return endStr >= todayStr; // mantém hoje e futuras; remove anteriores
    });
    // Ordena da mais nova para a mais antiga (start_date desc)
    return futurasOuAtuais.sort((a, b) => {
      const ad = new Date(a.start_date).getTime();
      const bd = new Date(b.start_date).getTime();
      return bd - ad;
    });
  }

  // --- Helpers de layout para migração (apenas console.log) ---
  private toDateOnlyStr(d: string): string {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  isSameDateRange(a: ReservaAirbnb, b: ReservaAirbnb): boolean {
    if (!a || !b) return false;
    return this.toDateOnlyStr(a.start_date) === this.toDateOnlyStr(b.start_date)
      && this.toDateOnlyStr(a.end_data) === this.toDateOnlyStr(b.end_data);
  }

  getAyrtonMatchesFor(reserva: ReservaAirbnb): ReservaAirbnb[] {
    return this.reservasAyrton.filter(r2 => this.isSameDateRange(reserva, r2));
  }

  hasMatch(reserva: ReservaAirbnb): boolean {
    return this.getAyrtonMatchesFor(reserva).length > 0;
  }

  onSelectSource(reserva: ReservaAirbnb): void {
    this.selectedSourceId = reserva.id ?? null;
    // Se já houver destino selecionado que não casa com a data, mantemos por enquanto; validação no migrate
    console.log('[layout] origem selecionada:', this.selectedSourceId, reserva);
  }

  onSelectTarget(reserva: ReservaAirbnb): void {
    this.selectedTargetId = reserva.id ?? null;
    console.log('[layout] destino selecionado (AYRTON):', this.selectedTargetId, reserva);
  }

  onMigrateSelected(): void {
    const src = this.reservas.find(r => r.id === this.selectedSourceId);
    const dst = this.reservasAyrton.find(r => r.id === this.selectedTargetId);
    const same = src && dst ? this.isSameDateRange(src, dst) : false;
    const checkins = src?.id ? this.checkinsPorReserva[src.id]?.checkinIds || [] : [];
    console.log('[layout] migrar selecionados ->', {
      sourceId: this.selectedSourceId,
      targetId: this.selectedTargetId,
      sameDateRange: same,
      sourceCheckinIds: checkins,
    });
  }

  onMigratePair(source: ReservaAirbnb, target: ReservaAirbnb): void {
    const same = this.isSameDateRange(source, target);
    const checkins = source.id ? this.checkinsPorReserva[source.id]?.checkinIds || [] : [];
    console.log('[layout] migrar par ->', {
      sourceId: source.id,
      targetId: target.id,
      sameDateRange: same,
      sourceCheckinIds: checkins,
    });
  }

  // Getters auxiliares para o template
  get selectedSource(): ReservaAirbnb | undefined {
    return this.reservas.find(r => r.id === this.selectedSourceId);
  }
  get selectedTarget(): ReservaAirbnb | undefined {
    return this.reservasAyrton.find(r => r.id === this.selectedTargetId);
  }
  selectedDatesMatch(): boolean {
    const s = this.selectedSource;
    const t = this.selectedTarget;
    return !!(s && t && this.isSameDateRange(s, t));
  }
}
