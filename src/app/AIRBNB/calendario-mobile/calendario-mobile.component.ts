import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { Apartment, CalendarDay, CalendarEvent, DayType } from 'src/app/shared/utilitarios/calendario';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Component({
  selector: 'app-calendario-mobile',
  templateUrl: './calendario-mobile.component.html',
  styleUrls: ['./calendario-mobile.component.css']
})
export class CalendarioMobileComponent {
  // Reaproveita a lógica do componente desktop mas com layout otimizado para mobile
  @ViewChild('globalScroll') globalScroll!: ElementRef;

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
  private dayTypeCache = new Map<string, DayType>();

  // Agrupamento por prédio (mantido para preservação de lógica, pode ser usado em melhorias futuras de UX mobile)
  buildings: { [predioId: number]: { name: string, color: string, apartments: Apartment[] } } = {};
  expandedBuildings: { [predioId: number]: boolean } = {};

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService,
    private cdr: ChangeDetectorRef
  ) {
    const firstDay = new Date();
    const lastDay  = new Date(firstDay.getTime() + 30 * 86400000);
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

  // ====== Utilidades ======
  getCompactName(name: string | null | undefined): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ...` : parts[0];
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private setupSearchDebounce() {
    this.searchControl.valueChanges.pipe(debounceTime(200)).subscribe(term => {
      this.searchTerm = term ?? '';
      this.filterApartments();
      this.cdr.markForCheck();
    });
  }

  getWeekDay(date: Date): string { return this.weekDays[date.getDay()]; }

  // ====== Geração de dias ======
  private generateDaysInRange(): void {
    const startDate = this.parseLocalDate(this.dataInicio);
    const endDate   = this.parseLocalDate(this.dataFim);
    this.daysTs = [];
    for (let ts = startDate.getTime(); ts <= endDate.getTime(); ts += 86400000) this.daysTs.push(ts);
    this.daysInMonthRange = this.daysTs.map(ts => new Date(ts));
  }

  private parseLocalDate(str: string): Date {
    const [year, month, day] = str.split('-').map(Number);
    const d = new Date(year, month - 1, day); d.setHours(0,0,0,0); return d;
  }

  private parseIsoLocalDate(str: string): Date {
    if (!str) return new Date('Invalid');
    const onlyDate = String(str).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return new Date('Invalid');
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    dt.setHours(0,0,0,0); return dt;
  }

  // ====== Filtro ======
  filterApartments(): void {
    const term = (this.searchTerm || '').toLowerCase().trim();
    this.filteredApartments = this.apartments.filter(apt => {
      const matchesTerm = !term || apt.name.toLowerCase().includes(term) || (this.buildings[apt.predioId]?.name?.toLowerCase().includes(term));
      const matchesAvailability = !this.showOnlyAvailable || this.isApartmentFreeInRange(apt, this.dataInicio, this.dataFim);
      return matchesTerm && matchesAvailability;
    });
    this.cdr.markForCheck();
  }

  onDateChange(): void {
    if (new Date(this.dataInicio) > new Date(this.dataFim)) this.dataFim = this.dataInicio;
    this.generateDaysInRange();
    this.loadData();
  }

  // ====== Dados ======
  loadData(): void {
    this.loading = true;
    forkJoin({
      apartamentos: this.apartamentoService.getAllApartamentos(),
      reservas: this.reservasAirbnbService.getReservasPorPeriodoCalendario(this.dataInicio, this.dataFim)
    }).subscribe({
      next: ({ apartamentos, reservas }) => {
        this.processApartments(apartamentos);
        const apenasReserved = reservas.filter(r => r.description?.toLowerCase() === 'reserved');
        this.mapReservations(apenasReserved);
        this.calcularOcupacao();
        this.filterApartments();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private processApartments(apts: any[]): void {
    const palette = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#D97706','#059669','#9333EA','#DC2626','#2563EB'];
    const grouped: { [predioId: number]: Apartment[] } = {};
    const predioNames: { [predioId: number]: string } = {};
    apts.forEach(a => {
      const predioId = a.predio_id; predioNames[predioId] = a.predio_name;
      if (!grouped[predioId]) grouped[predioId] = [];
      grouped[predioId].push({ id: a.id, predioId, name: a.nome, color: '', status: 'Disponível', reservations: [] });
    });
    const orderedPredios = Object.keys(grouped).map(Number).sort((a,b)=> predioNames[a].localeCompare(predioNames[b]));
    this.buildings = {}; this.expandedBuildings = {};
    orderedPredios.forEach((pid, idx) => {
      const color = palette[idx % palette.length];
      grouped[pid].forEach(apt => apt.color = color);
      this.buildings[pid] = { name: predioNames[pid], color, apartments: grouped[pid] };
      this.expandedBuildings[pid] = true;
    });
    this.apartments = orderedPredios.flatMap(pid => this.buildings[pid].apartments);
    this.dayTypeCache.clear();
  }

  private mapReservations(reservas: ReservaAirbnb[]): void {
    for (const apt of this.apartments) apt.reservations = [];
    for (const r of reservas) {
      const apt = this.apartments.find(a => a.id === r.apartamento_id); if (!apt) continue;
      apt.reservations.push({
        id: r.id!,
        title: r.apartamento_nome || r.cod_reserva,
        start: this.parseIsoLocalDate(String(r.start_date)),
        end: this.parseIsoLocalDate(String(r.end_data)),
        color: this.getColorByType(r),
        cod_reserva: r.cod_reserva,
        link: r.link_reserva
      });
    }
    this.dayTypeCache.clear();
  }

  private getColorByType(r: ReservaAirbnb): string {
    switch (r.description.toLowerCase()) {
      case 'reserved': return '#3B82F6';
      case 'cancelada': return '#999';
      case 'check-in': return '#10B981';
      case 'check-out': return '#8B5CF6';
      default: return '#EF4444';
    }
  }

  // ====== Calendário detalhado ======
  generateDaysInMonth(): void {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const daysCount = new Date(y, m + 1, 0).getDate();
    this.daysInMonthRange = Array.from({ length: daysCount }, (_, i) => new Date(y, m, i + 1));
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay  = new Date(y, m + 1, 0);
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, new Date(y, m, 0).getDate() - i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(y, m, i);
      this.calendarDays.push({ date: d, isCurrentMonth: true, events: this.getEventsForDay(d) });
    }
    for (let i = 1; i <= 6 - lastDay.getDay(); i++) {
      const d = new Date(y, m + 1, i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }
  }

  getEventsForDay(dayDate: Date): CalendarEvent[] {
    if (!this.selectedApartment) return [];
    const ts = new Date(dayDate).setHours(0,0,0,0);
    return this.selectedApartment.reservations.filter(r => {
      const start = new Date(r.start).setHours(0,0,0,0);
      const end   = new Date(r.end).setHours(0,0,0,0);
      return ts >= start && ts <= end;
    }).map(r => ({
      id: r.id,
      title: r.title,
      color: r.color,
      start: r.start.toISOString(),
      end: r.end.toISOString(),
      cod_reserva: r.cod_reserva,
      source: r.link.toLowerCase().includes('airbnb') ? 'airbnb' : 'booking'
    }));
  }

  // ====== Interações ======
  selectApartment(id: number): void {
    this.selectedApartmentId = id;
    this.selectedApartment = this.apartments.find(a => a.id === id) || null;
    this.viewMode = 'detail';
    this.generateCalendarDays();
    this.cdr.markForCheck();
  }

  setViewMode(mode: 'global' | 'detail') {
    this.viewMode = mode;
    if (mode === 'detail' && this.selectedApartment) this.generateCalendarDays();
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
    if (this.viewMode === 'detail') this.generateCalendarDays();
    this.cdr.markForCheck();
  }

  trackByApartmentId(_: number, apt: Apartment) { return apt.id; }
  trackByDay(_: number, day: Date) { return day.getTime(); }
  isToday(day: Date): boolean { const t=new Date(); t.setHours(0,0,0,0); return t.getTime()=== new Date(day).setHours(0,0,0,0); }

  getDayType(apt: Apartment, day: Date): DayType {
    const ts = new Date(day).setHours(0,0,0,0);
    const key = `${apt.id}_${ts}`;
    if (this.dayTypeCache.has(key)) return this.dayTypeCache.get(key)!;
    let inAir=false,outAir=false,spanAir=false,inBook=false,outBook=false,spanBook=false;
    for (const r of apt.reservations) {
      const startTs = new Date(r.start).setHours(0,0,0,0);
      const endTs   = new Date(r.end).setHours(0,0,0,0);
      const isAir = r.link.toLowerCase().includes('airbnb');
      if (ts===startTs) isAir? inAir=true: inBook=true;
      if (ts===endTs)   isAir? outAir=true: outBook=true;
      if (ts>startTs && ts<endTs) isAir? spanAir=true: spanBook=true;
    }
    let result: DayType = 'none';
    if (inAir && outAir) result='inOutAir';
    else if (inBook && outBook) result='inOutBook';
    else if (inAir && outBook) result='inAirOutBook';
    else if (inBook && outAir) result='inBookOutAir';
    else if (inAir) result='inAir';
    else if (outAir) result='outAir';
    else if (inBook) result='inBook';
    else if (outBook) result='outBook';
    else if (spanAir) result='air';
    else if (spanBook) result='book';
    this.dayTypeCache.set(key,result); return result;
  }

  calculateDayStats(day: Date): void {
    const ts = day.getTime(); let checkins=0, checkouts=0;
    for (const apt of this.apartments) for (const r of apt.reservations) {
      const startTs = new Date(r.start).setHours(0,0,0,0);
      const endTs   = new Date(r.end).setHours(0,0,0,0);
      if (startTs === ts) checkins++; if (endTs === ts) checkouts++; }
    this.dayStats = { checkins, checkouts };
  }
  showDayTooltipAt(event: MouseEvent, day: Date): void {
    this.calculateDayStats(day);
    this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
    this.showDayTooltip = true;
    setTimeout(()=> { const t = document.querySelector('.day-tooltip'); if (t) t.classList.add('show'); }, 10);
  }
  hideDayTooltip(): void { const t = document.querySelector('.day-tooltip'); if (t) t.classList.remove('show'); setTimeout(()=> this.showDayTooltip=false, 200); }

  // ====== Ocupação ======
  private calcularOcupacao(): void {
    const rangeStart = this.parseLocalDate(this.dataInicio).getTime();
    const rangeEndExclusive = this.parseLocalDate(this.dataFim).getTime() + 86400000;
    const nightsInRange = Math.max(0, Math.floor((rangeEndExclusive - rangeStart) / 86400000));
    this.totalDiasDisponiveis = this.apartments.length * nightsInRange; this.totalDiasReservados = 0;
    for (const apt of this.apartments) {
      const dias = new Set<number>();
      for (const r of apt.reservations) {
        const rStart = new Date(r.start).setHours(0,0,0,0);
        const rEndExclusive = new Date(r.end).setHours(0,0,0,0);
        if (rEndExclusive <= rStart) continue;
        const overlapStart = Math.max(rStart, rangeStart);
        const overlapEndExclusive = Math.min(rEndExclusive, rangeEndExclusive);
        if (overlapStart < overlapEndExclusive) for (let ts = overlapStart; ts < overlapEndExclusive; ts += 86400000) dias.add(ts);
      }
      this.totalDiasReservados += dias.size;
    }
    this.taxaOcupacao = this.totalDiasDisponiveis ? this.totalDiasReservados / this.totalDiasDisponiveis : 0;
  }

  private isApartmentFreeInRange(apt: Apartment, startStr: string, endStr: string): boolean {
    const start = this.parseLocalDate(startStr).getTime();
    const endExclusive = this.parseLocalDate(endStr).getTime() + 86400000;
    return !apt.reservations.some(r => {
      const rStart = new Date(r.start).setHours(0,0,0,0);
      const rEndExclusive = new Date(r.end).setHours(0,0,0,0);
      return rStart < endExclusive && rEndExclusive > start;
    });
  }
}
