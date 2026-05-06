import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

interface ApartmentPerformance {
  id: number;
  name: string;
  predioId: number;
  predioName: string;
  color: string;
  totalDias: number;
  diasReservados: number;
  diasDisponiveis: number;
  taxaOcupacao: number;
  reservasCount: number;
  mediaEstadia: number;
  airbnbDias: number;
  bookingDias: number;
  forestDias: number;
}

interface BuildingGroup {
  predioId: number;
  predioName: string;
  color: string;
  apartments: ApartmentPerformance[];
  avgOcupacao: number;
}

@Component({
  selector: 'app-performance-apartamentos',
  templateUrl: './performance-apartamentos.component.html',
  styleUrls: ['./performance-apartamentos.component.css']
})
export class PerformanceApartamentosComponent implements OnInit {
  currentDate = new Date();
  loading = false;

  buildings: BuildingGroup[] = [];
  allApartments: ApartmentPerformance[] = [];

  avgOcupacaoGeral = 0;
  totalReservas = 0;
  melhorApartamento: ApartmentPerformance | null = null;
  piorApartamento: ApartmentPerformance | null = null;
  totalApartamentos = 0;
  totalDiasReservadosGeral = 0;

  sortOrder: 'ocupacao' | 'nome' | 'dias' = 'ocupacao';
  viewGrouped = true;
  totalDiasNoMes = 0;
  totalDiasPossivel = 0;
  flatApartments: ApartmentPerformance[] = [];

  private palette = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#D97706',
    '#059669', '#9333EA', '#DC2626', '#2563EB'
  ];

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get currentMonthLabel(): string {
    return this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  changeMonth(delta: number): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    this.loadData();
  }

  private get dataInicio(): string {
    const d = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    return this.toInputDate(d);
  }

  private get dataFim(): string {
    const d = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    return this.toInputDate(d);
  }

  private toInputDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private parseLocalDate(str: string): Date {
    const [year, month, day] = str.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseIsoLocalDate(str: string): Date {
    if (!str) return new Date('Invalid');
    const onlyDate = String(str).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return new Date('Invalid');
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      apartamentos: this.apartamentoService.getAllApartamentos(),
      reservas: this.reservasAirbnbService.getReservasPorPeriodoCalendario(this.dataInicio, this.dataFim)
    }).subscribe({
      next: ({ apartamentos, reservas }) => {
        const reservasFiltradas = reservas.filter(r =>
          r.description?.toLowerCase() === 'reserved' ||
          r.origem?.toUpperCase() === 'FOREST'
        );
        this.buildPerformance(apartamentos, reservasFiltradas);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildPerformance(apts: any[], reservas: ReservaAirbnb[]): void {
    const totalDias = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();
    const rangeStart = this.parseLocalDate(this.dataInicio).getTime();
    const rangeEndExclusive = this.parseLocalDate(this.dataFim).getTime() + 86400000;

    const predioNames = new Map<number, string>();
    for (const a of apts) {
      predioNames.set(a.predio_id, a.predio_name);
    }

    const orderedPredioIds = [...new Set(apts.map(a => a.predio_id as number))]
      .sort((a, b) => (predioNames.get(a) || '').localeCompare(predioNames.get(b) || ''));

    const predioColors = new Map<number, string>();
    orderedPredioIds.forEach((pId, idx) => predioColors.set(pId, this.palette[idx % this.palette.length]));

    const aptPerf: ApartmentPerformance[] = apts.map(a => {
      const aptReservas = reservas.filter(r => r.apartamento_id === a.id);
      const occupiedNights = new Set<number>();
      const airbnbNights = new Set<number>();
      const bookingNights = new Set<number>();
      const forestNights = new Set<number>();
      const reservasIds = new Set<string>();

      for (const r of aptReservas) {
        const rStart = this.parseIsoLocalDate(String(r.start_date)).getTime();
        const rEnd = this.parseIsoLocalDate(String(r.end_data)).getTime();
        if (isNaN(rStart) || isNaN(rEnd) || rEnd <= rStart) continue;

        const isForest = r.origem?.toUpperCase() === 'FOREST' || (r.link_reserva || '').toLowerCase().includes('forest');
        const isAirbnb = !isForest && (r.link_reserva || '').toLowerCase().includes('airbnb');

        const overlapStart = Math.max(rStart, rangeStart);
        const overlapEnd = Math.min(rEnd, rangeEndExclusive);

        for (let ts = overlapStart; ts < overlapEnd; ts += 86400000) {
          occupiedNights.add(ts);
          if (isForest) forestNights.add(ts);
          else if (isAirbnb) airbnbNights.add(ts);
          else bookingNights.add(ts);
        }

        if (r.cod_reserva) reservasIds.add(r.cod_reserva);
      }

      const diasReservados = occupiedNights.size;
      const taxaOcupacao = totalDias > 0 ? Math.round((diasReservados / totalDias) * 100) : 0;
      const mediaEstadia = reservasIds.size > 0
        ? Math.round((diasReservados / reservasIds.size) * 10) / 10
        : 0;

      return {
        id: a.id,
        name: a.nome,
        predioId: a.predio_id,
        predioName: a.predio_name || '',
        color: predioColors.get(a.predio_id) || '#3B82F6',
        totalDias,
        diasReservados,
        diasDisponiveis: totalDias - diasReservados,
        taxaOcupacao,
        reservasCount: reservasIds.size,
        mediaEstadia,
        airbnbDias: airbnbNights.size,
        bookingDias: bookingNights.size,
        forestDias: forestNights.size
      };
    });

    this.allApartments = aptPerf;

    this.buildings = orderedPredioIds.map(predioId => {
      const predioApts = aptPerf
        .filter(a => a.predioId === predioId)
        .sort((a, b) => this.compareApts(a, b));

      const avgOcupacao = predioApts.length > 0
        ? Math.round(predioApts.reduce((sum, a) => sum + a.taxaOcupacao, 0) / predioApts.length)
        : 0;

      return {
        predioId,
        predioName: predioNames.get(predioId) || '',
        color: predioColors.get(predioId) || '#3B82F6',
        apartments: predioApts,
        avgOcupacao
      };
    });

    this.totalApartamentos = aptPerf.length;
    this.totalDiasNoMes = totalDias;
    this.totalDiasPossivel = aptPerf.length * totalDias;
    this.totalReservas = new Set(reservas.map(r => r.cod_reserva)).size;
    this.totalDiasReservadosGeral = aptPerf.reduce((sum, a) => sum + a.diasReservados, 0);
    this.avgOcupacaoGeral = aptPerf.length > 0
      ? Math.round(aptPerf.reduce((sum, a) => sum + a.taxaOcupacao, 0) / aptPerf.length)
      : 0;

    const sorted = [...aptPerf].sort((a, b) => b.taxaOcupacao - a.taxaOcupacao);
    this.melhorApartamento = sorted[0] || null;
    this.piorApartamento = sorted[sorted.length - 1] || null;

    this.flatApartments = [...aptPerf].sort((a, b) => this.compareApts(a, b));
  }

  private compareApts(a: ApartmentPerformance, b: ApartmentPerformance): number {
    if (this.sortOrder === 'nome') return a.name.localeCompare(b.name);
    if (this.sortOrder === 'dias') return b.diasReservados - a.diasReservados;
    return b.taxaOcupacao - a.taxaOcupacao;
  }

  setSortOrder(order: 'ocupacao' | 'nome' | 'dias'): void {
    this.sortOrder = order;
    for (const b of this.buildings) {
      b.apartments.sort((a, c) => this.compareApts(a, c));
    }
    this.flatApartments = [...this.flatApartments].sort((a, b) => this.compareApts(a, b));
    this.cdr.markForCheck();
  }

  toggleView(): void {
    this.viewGrouped = !this.viewGrouped;
  }

  getOcupacaoClass(taxa: number): string {
    if (taxa >= 70) return 'high';
    if (taxa >= 40) return 'medium';
    return 'low';
  }

  getOcupacaoColor(taxa: number): string {
    if (taxa >= 70) return '#10B981';
    if (taxa >= 40) return '#F59E0B';
    return '#EF4444';
  }
}
