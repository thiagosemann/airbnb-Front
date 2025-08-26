import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { forkJoin, debounceTime } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

interface Apartment {
  id: number;
  predioId: number;
  name: string;
  color: string;
  status: string;
  reservations: CalendarReservation[];
}

interface CalendarReservation {
  id: number;
  title: string;
  start: Date;
  end: Date;
  color: string;
  cod_reserva: string;
  link: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

interface CalendarEvent {
  id: number;
  title: string;
  color: string;
  start: string;
  end: string;
  cod_reserva: string;
  source: 'airbnb' | 'booking';
}

type DayType =
  | 'none' | 'air' | 'book'
  | 'inAir' | 'inBook' | 'outAir' | 'outBook'
  | 'inOutAir' | 'inOutBook' | 'inAirOutBook' | 'inBookOutAir';

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: [
    './calendario.component.css',
    './calendario2.component.css',
    './calendario3.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  apartments: Apartment[] = [];
  filteredApartments: Apartment[] = [];

  selectedApartmentId: number | null = null;
  selectedApartment: Apartment | null = null;

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  viewMode: 'global' | 'detail' = 'global';

  searchControl = new FormControl('');
  searchTerm = '';

  currentDate = new Date();
  currentMonth = this.currentDate.toLocaleString('default', { month: 'long' });
  currentYear = this.currentDate.getFullYear();
  daysInMonthRange: Date[] = [];
  calendarDays: CalendarDay[] = [];

  // pre-calc timestamps for range
  private daysTs: number[] = [];

  loading = false;
  dataInicio: string;
  dataFim: string;

  showDayTooltip = false;
  tooltipPosition = { x: 0, y: 0 };
  dayStats = { checkins: 0, checkouts: 0 };

  totalDiasDisponiveis = 0;
  totalDiasReservados = 0;
  taxaOcupacao = 0;

  showOnlyAvailable = false;

  // cache for getDayType
  private dayTypeCache = new Map<string, DayType>();

  // Agrupamento de apartamentos por prédio
  buildings: { [predioId: number]: { name: string, color: string, apartments: Apartment[] } } = {};
  expandedBuildings: { [predioId: number]: boolean } = {};

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService,
    private cdr: ChangeDetectorRef
  ) {
    const firstDay = new Date();
    const lastDay  = new Date(firstDay.getTime() + 30 * 86400000); // +30 dias
    this.dataInicio = this.toInputDate(firstDay);
    this.dataFim    = this.toInputDate(lastDay);

    this.generateDaysInMonth();
    this.generateCalendarDays();
  }

  ngOnInit(): void {
    this.generateDaysInRange();
    this.setupSearchDebounce();
    this.loadData();
  }

  private toInputDate(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private setupSearchDebounce() {
    this.searchControl.valueChanges
      .pipe(debounceTime(200))
      .subscribe(term => {
        this.searchTerm = term ?? '';
        this.filterApartments();
        this.cdr.markForCheck();
      });
  }

  getWeekDay(date: Date): string {
    return this.weekDays[date.getDay()];
  }

  private generateDaysInRange(): void {
    // usa parseLocalDate para criar Date em horário local
    const startDate = this.parseLocalDate(this.dataInicio);
    const endDate   = this.parseLocalDate(this.dataFim);

    this.daysTs = [];
    for (let ts = startDate.getTime(); ts <= endDate.getTime(); ts += 86400000) {
      this.daysTs.push(ts);
    }

    this.daysInMonthRange = this.daysTs.map(ts => new Date(ts));
  }
  // --- NOVO método de parsing local ---
  private parseLocalDate(str: string): Date {
    const [year, month, day] = str.split('-').map(s => Number(s));
    const d = new Date(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }


  filterApartments(): void {

  }

  onDateChange(): void {
    if (new Date(this.dataInicio) > new Date(this.dataFim)) {
      this.dataFim = this.dataInicio;
    }
    this.generateDaysInRange();
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      apartamentos: this.apartamentoService.getAllApartamentos(),
      reservas:    this.reservasAirbnbService.getReservasPorPeriodoCalendario(this.dataInicio, this.dataFim)
    }).subscribe({
      next: ({ apartamentos, reservas }) => {
        this.processApartments(apartamentos);
        const apenasReserved = reservas.filter(r =>
          r.description?.toLowerCase() === 'reserved'
        );
        this.mapReservations(apenasReserved);
        this.calcularOcupacao();
        this.filteredApartments = [...this.apartments];
        this.loading = false;
        setTimeout(() => this.syncScroll(), 100);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

private processApartments(apts: any[]): void {
  // Cores por prédio
  const palette = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#D97706',
    '#059669', '#9333EA', '#DC2626', '#2563EB'
  ];

  // Agrupa apartamentos por predioId
  const groupedByPredio: { [predioId: number]: Apartment[] } = {};
  const predioNames: { [predioId: number]: string } = {};
  apts.forEach((a: any) => {
    const predioId = a.predio_id;
    const predio_name = a.predio_name;
    predioNames[predioId] = predio_name;
    if (!groupedByPredio[predioId]) groupedByPredio[predioId] = [];
    // color será preenchido depois
    groupedByPredio[predioId].push({
      id: a.id,
      predioId: predioId,
      name: a.nome,
      color: '', // placeholder
      status: 'Disponível',
      reservations: []
    });
  });

  // Ordena os predios pelo nome
  const predioIdsOrdenados = Object.keys(groupedByPredio)
    .map(id => +id)
    .sort((a, b) => predioNames[a].localeCompare(predioNames[b]));

  // Cores por prédio
  const buildingColors = new Map<number, string>();
  predioIdsOrdenados.forEach((pId, idx) => buildingColors.set(pId, palette[idx % palette.length]));

  // Preenche estrutura buildings e estado expandido
  this.buildings = {};
  this.expandedBuildings = {};
  for (const [idx, predioId] of predioIdsOrdenados.entries()) {
    const color = buildingColors.get(predioId)!;
    // Preenche color em cada apt
    groupedByPredio[predioId].forEach(apt => apt.color = color);
    this.buildings[predioId] = {
      name: predioNames[predioId],
      color,
      apartments: groupedByPredio[predioId]
    };
    this.expandedBuildings[predioId] = false; // Começa minimizado
  }

  // Junta todos os apartamentos ordenados para manter compatibilidade
  const ordered: Apartment[] = [];
  for (const predioId of predioIdsOrdenados) {
    ordered.push(...this.buildings[predioId].apartments);
  }
  this.apartments = ordered;

  this.dayTypeCache.clear();
}

// Alterna expansão do prédio
public toggleBuilding(predioId: number): void {
  this.expandedBuildings[predioId] = !this.expandedBuildings[predioId];
}

// Retorna lista de prédios ordenados
getOrderedBuildingIds(): number[] {
  return Object.keys(this.buildings)
    .map(id => +id)
    .sort((a, b) => this.buildings[a].name.localeCompare(this.buildings[b].name));
}

  calculateDayStats(day: Date): void {
    const ts = day.getTime();
    let checkins = 0;
    let checkouts = 0;

    for (const apt of this.apartments) {
      for (const r of apt.reservations) {
        const startTs = new Date(r.start).setHours(0,0,0,0);
        const endTs   = new Date(r.end).setHours(0,0,0,0);
        if (startTs === ts) checkins++;
        if (endTs === ts)   checkouts++;
      }
    }

    this.dayStats = { checkins, checkouts };
  }

  showDayTooltipAt(event: MouseEvent, day: Date): void {
    this.calculateDayStats(day);
    this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
    this.showDayTooltip = true;
    setTimeout(() => {
      const tooltip = document.querySelector('.day-tooltip');
      if (tooltip) tooltip.classList.add('show');
    }, 10);
  }

  hideDayTooltip(): void {
    const tooltip = document.querySelector('.day-tooltip');
    if (tooltip) tooltip.classList.remove('show');
    setTimeout(() => this.showDayTooltip = false, 200);
  }

  syncScroll(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.addEventListener('scroll', () => {
        const header = container.querySelector('.days-header');
        if (header) header.scrollLeft = container.scrollLeft;
      });
    }
  }

  private mapReservations(reservas: ReservaAirbnb[]): void {
    for (const apt of this.apartments) {
      apt.reservations = [];
    }
    for (const r of reservas) {
      const apt = this.apartments.find(a => a.id === r.apartamento_id);
      if (!apt) continue;
      apt.reservations.push({
        id: r.id!,
        title: r.apartamento_nome || r.cod_reserva,
        start: new Date(r.start_date),
        end:   new Date(r.end_data),
        color: this.getColorByType(r),
        cod_reserva: r.cod_reserva,
        link: r.link_reserva
      });
    }
    this.dayTypeCache.clear();
  }

  private getColorByType(r: ReservaAirbnb): string {
    switch (r.description.toLowerCase()) {
      case 'reserved':  return '#3B82F6';
      case 'cancelada': return '#999999';
      case 'check-in':  return '#10B981';
      case 'check-out': return '#8B5CF6';
      default:          return '#EF4444';
    }
  }

  generateDaysInMonth(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    this.daysInMonthRange = Array.from({ length: daysCount }, (_, i) =>
      new Date(year, month, i + 1)
    );
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    // mês anterior
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, new Date(year, month, 0).getDate() - i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }

    // mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      this.calendarDays.push({ date: d, isCurrentMonth: true, events: this.getEventsForDay(d) });
    }

    // próximo mês
    for (let i = 1; i <= 6 - lastDay.getDay(); i++) {
      const d = new Date(year, month + 1, i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }
  }

  getEventsForDay(dayDate: Date): CalendarEvent[] {
    if (!this.selectedApartment) return [];
    const ts = new Date(dayDate).setHours(0,0,0,0);

    return this.selectedApartment.reservations
      .filter(r => {
        const start = new Date(r.start).setHours(0,0,0,0);
        const end   = new Date(r.end).setHours(0,0,0,0);
        return ts >= start && ts <= end;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        color: r.color,
        start: r.start.toISOString(),
        end:   r.end.toISOString(),
        cod_reserva: r.cod_reserva,
        source: r.link.toLowerCase().includes('airbnb') ? 'airbnb' : 'booking'
      }));
  }

  selectApartment(id: number): void {
    this.selectedApartmentId = id;
    this.selectedApartment = this.apartments.find(a => a.id === id) || null;
    this.viewMode = 'detail';
    this.generateCalendarDays();
    this.cdr.markForCheck();
  }

  setViewMode(mode: 'global' | 'detail') {
    this.viewMode = mode;
    if (mode === 'global') {
      setTimeout(() => this.syncScroll(), 100);
    } else if (this.selectedApartment) {
      this.generateCalendarDays();
    }
    this.cdr.markForCheck();
  }

  changeMonth(delta: number): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    this.currentMonth = this.currentDate.toLocaleString('default', { month: 'long' });
    this.currentYear = this.currentDate.getFullYear();

    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay  = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    this.dataInicio = this.toInputDate(firstDay);
    this.dataFim    = this.toInputDate(lastDay);

    this.generateDaysInMonth();
    this.generateDaysInRange();
    this.loadData();

    if (this.viewMode === 'detail') {
      this.generateCalendarDays();
    }
    this.cdr.markForCheck();
  }

  trackByApartmentId(_: number, apt: Apartment) { return apt.id; }
  trackByDay(_: number, day: Date)       { return day.getTime(); }

  isToday(day: Date): boolean {
    const today = new Date();
    today.setHours(0,0,0,0);
    return today.getTime() === new Date(day).setHours(0,0,0,0);
  }

  getDayType(apt: Apartment, day: Date): DayType {
    const ts = new Date(day).setHours(0,0,0,0);
    const key = `${apt.id}_${ts}`;
    if (this.dayTypeCache.has(key)) {
      return this.dayTypeCache.get(key)!;
    }

    let inAir = false, outAir = false, spanAir = false;
    let inBook = false, outBook = false, spanBook = false;

    for (const r of apt.reservations) {
      const startTs = new Date(r.start).setHours(0,0,0,0);
      const endTs   = new Date(r.end).setHours(0,0,0,0);
      const isAir   = r.link.toLowerCase().includes('airbnb');

      if (ts === startTs)      isAir ? inAir = true  : inBook = true;
      if (ts === endTs)        isAir ? outAir = true : outBook = true;
      if (ts > startTs && ts < endTs) isAir ? spanAir = true : spanBook = true;
    }

    let result: DayType = 'none';
    if (inAir && outAir)     result = 'inOutAir';
    else if (inBook && outBook)   result = 'inOutBook';
    else if (inAir && outBook)    result = 'inAirOutBook';
    else if (inBook && outAir)    result = 'inBookOutAir';
    else if (inAir)               result = 'inAir';
    else if (outAir)              result = 'outAir';
    else if (inBook)              result = 'inBook';
    else if (outBook)             result = 'outBook';
    else if (spanAir)             result = 'air';
    else if (spanBook)            result = 'book';

    this.dayTypeCache.set(key, result);
    return result;
  }

private calcularOcupacao(): void {
  const startDate = this.parseLocalDate(this.dataInicio).getTime();
  const endDate   = this.parseLocalDate(this.dataFim).getTime();
  const daysCount = Math.ceil((endDate - startDate) / 86400000) + 1;

  this.totalDiasDisponiveis = this.apartments.length * daysCount;
  this.totalDiasReservados = 0;

  for (const apt of this.apartments) {
    const diasOcupados = new Set<number>();

    for (const r of apt.reservations) {
      const rStart = this.parseLocalDate(this.toInputDate(new Date(r.start))).getTime();
      const rEnd   = this.parseLocalDate(this.toInputDate(new Date(r.end))).getTime();

      // define o último dia efetivamente contado (um dia antes do checkout)
      const effectiveEnd = rEnd > rStart
        ? rEnd - 86400000
        : rStart;

      // interseção com o período selecionado
      const overlapStart = Math.max(rStart, startDate);
      const overlapEnd   = Math.min(effectiveEnd, endDate);

      if (overlapStart <= overlapEnd) {
        // adiciona todos os dias de overlapStart até overlapEnd (inclusive)
        for (let ts = overlapStart; ts <= overlapEnd; ts += 86400000) {
          diasOcupados.add(ts);
        }
      }
    }

    this.totalDiasReservados += diasOcupados.size;
  }

  this.taxaOcupacao = this.totalDiasDisponiveis
    ? this.totalDiasReservados / this.totalDiasDisponiveis
    : 0;
}


  private isApartmentFreeInRange(apt: Apartment, startStr: string, endStr: string): boolean {
    const start = new Date(startStr).setHours(0,0,0,0);
    const end   = new Date(endStr).setHours(0,0,0,0);
    return !apt.reservations.some(r => {
      const rStart = new Date(r.start).setHours(0,0,0,0);
      const rEnd   = new Date(r.end).setHours(0,0,0,0);
      return rStart <= end && rEnd >= start;
    });
  }
}
