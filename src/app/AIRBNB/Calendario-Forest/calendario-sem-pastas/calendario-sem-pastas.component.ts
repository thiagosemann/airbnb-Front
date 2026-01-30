import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { Apartment, CalendarDay, CalendarEvent, DayType } from 'src/app/shared/utilitarios/calendario';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Component({
  selector: 'app-calendario-sem-pastas',
  templateUrl: './calendario-sem-pastas.component.html',
  styleUrls: ['./calendario-sem-pastas.component.css', './calendario-sem-pastas.component2.css', './calendario-sem-pastas.component3.css']
})
export class CalendarioSemPastasComponent {
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

  // Retorna nome compacto: primeira palavra + " ..." se houver mais de uma palavra
  getCompactName(name: string | null | undefined): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ...` : parts[0];
  }

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService,
    private cdr: ChangeDetectorRef
  ) {
    const firstDay = new Date();
    const lastDay = new Date(firstDay.getTime() + 30 * 86400000); // +30 dias
    this.dataInicio = this.toInputDate(firstDay);
    this.dataFim = this.toInputDate(lastDay);

    this.generateDaysInMonth();
    this.generateCalendarDays();
  }

  ngOnInit(): void {
    this.generateDaysInRange();
    this.setupSearchDebounce();
    this.loadData();
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
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
    const endDate = this.parseLocalDate(this.dataFim);

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

  // --- NOVO: parse ISO 'yyyy-MM-dd' ou 'yyyy-MM-ddTHH:mm' para Date local (00:00) ---
  private parseIsoLocalDate(str: string): Date {
    if (!str) return new Date('Invalid');
    const onlyDate = String(str).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return new Date('Invalid');
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  filterApartments(): void {
    // Filtra por termo e disponibilidade, mantendo a ordem por prédio já aplicada em this.apartments
    const term = (this.searchTerm || '').toLowerCase().trim();

    let list = this.apartments.filter(apt => {
      const matchesTerm = !term ||
        apt.name.toLowerCase().includes(term) ||
        (this.buildings[apt.predioId]?.name?.toLowerCase().includes(term));

      const matchesAvailability = !this.showOnlyAvailable ||
        this.isApartmentFreeInRange(apt, this.dataInicio, this.dataFim);

      return matchesTerm && matchesAvailability;
    });

    this.filteredApartments = list;
    this.cdr.markForCheck();
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
      reservas: this.reservasAirbnbService.getReservasPorPeriodoCalendario(this.dataInicio, this.dataFim)
    }).subscribe({
      next: ({ apartamentos, reservas }) => {
        this.processApartments(apartamentos);
        // Filtra reservas: status 'reserved' OU origem 'FOREST' (independente do status)
        const reservasFiltradas = reservas.filter(r =>
          r.description?.toLowerCase() === 'reserved' ||
          r.origem?.toUpperCase() === 'FOREST'
        );
        this.mapReservations(reservasFiltradas);
        this.calcularOcupacao();
        // aplica filtros atuais mantendo ordenação por prédio
        this.filterApartments();
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
      this.expandedBuildings[predioId] = true; // Começa minimizado
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
        const startTs = new Date(r.start).setHours(0, 0, 0, 0);
        const endTs = new Date(r.end).setHours(0, 0, 0, 0);
        if (startTs === ts) checkins++;
        if (endTs === ts) checkouts++;
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
        // Usa parsing local para evitar deslocamento de 1 dia
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
      case 'cancelada': return '#999999';
      case 'check-in': return '#10B981';
      case 'check-out': return '#8B5CF6';
      default: return '#EF4444';
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
    const lastDay = new Date(year, month + 1, 0);

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
    const ts = new Date(dayDate).setHours(0, 0, 0, 0);

    return this.selectedApartment.reservations
      .filter(r => {
        const start = new Date(r.start).setHours(0, 0, 0, 0);
        const end = new Date(r.end).setHours(0, 0, 0, 0);
        return ts >= start && ts <= end;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        color: r.color,
        start: r.start.toISOString(),
        end: r.end.toISOString(),
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
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    this.dataInicio = this.toInputDate(firstDay);
    this.dataFim = this.toInputDate(lastDay);

    this.generateDaysInMonth();
    this.generateDaysInRange();
    this.loadData();

    if (this.viewMode === 'detail') {
      this.generateCalendarDays();
    }
    this.cdr.markForCheck();
  }

  trackByApartmentId(_: number, apt: Apartment) { return apt.id; }
  trackByDay(_: number, day: Date) { return day.getTime(); }

  isToday(day: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime() === new Date(day).setHours(0, 0, 0, 0);
  }

  getDayType(apt: Apartment, day: Date): DayType {
    const ts = new Date(day).setHours(0, 0, 0, 0);
    const key = `${apt.id}_${ts}`;
    if (this.dayTypeCache.has(key)) {
      return this.dayTypeCache.get(key)!;
    }

    let inAir = false, outAir = false, spanAir = false;
    let inBook = false, outBook = false, spanBook = false;
    let inForest = false, outForest = false, spanForest = false;

    for (const r of apt.reservations) {
      const startTs = new Date(r.start).setHours(0, 0, 0, 0);
      const endTs = new Date(r.end).setHours(0, 0, 0, 0);
      // Determine reservation type: Airbnb, Forest, or Booking
      const isAir = r.link?.toLowerCase().includes('airbnb');
      const isForest = r.link?.toLowerCase().includes('forest');
      const isBook = !isAir && !isForest;

      if (ts === startTs) {
        if (isAir) inAir = true;
        else if (isForest) inForest = true;
        else inBook = true;
      }

      if (ts === endTs) {
        if (isAir) outAir = true;
        else if (isForest) outForest = true;
        else outBook = true;
      }

      if (ts > startTs && ts < endTs) {
        if (isAir) spanAir = true;
        else if (isForest) spanForest = true;
        else spanBook = true;
      }
    }

    let result: DayType = 'none';

    // Handle same-type check-in/check-out on same day
    if (inAir && outAir) result = 'inOutAir';
    else if (inBook && outBook) result = 'inOutBook';
    else if (inForest && outForest) result = 'inOutForest';

    // Handle mixed check-in/check-out combinations
    else if (inAir && outBook) result = 'inAirOutBook';
    else if (inAir && outForest) result = 'inAirOutForest';
    else if (inBook && outAir) result = 'inBookOutAir';
    else if (inBook && outForest) result = 'inBookOutForest';
    else if (inForest && outAir) result = 'inForestOutAir';
    else if (inForest && outBook) result = 'inForestOutBook';

    // Handle single check-in or check-out
    else if (inAir) result = 'inAir';
    else if (inBook) result = 'inBook';
    else if (inForest) result = 'inForest';
    else if (outAir) result = 'outAir';
    else if (outBook) result = 'outBook';
    else if (outForest) result = 'outForest';

    // Handle span (middle of reservation)
    else if (spanAir) result = 'air';
    else if (spanBook) result = 'book';
    else if (spanForest) result = 'forest';

    this.dayTypeCache.set(key, result);
    return result;
  }

  private calcularOcupacao(): void {
    // Intervalo do filtro como meio-fechado [inicio, fimExclusive)
    const rangeStart = this.parseLocalDate(this.dataInicio).getTime();
    const rangeEndExclusive = this.parseLocalDate(this.dataFim).getTime() + 86400000; // inclui a noite do dia fim

    const nightsInRange = Math.max(0, Math.floor((rangeEndExclusive - rangeStart) / 86400000));
    this.totalDiasDisponiveis = this.apartments.length * nightsInRange;
    this.totalDiasReservados = 0;

    for (const apt of this.apartments) {
      const diasOcupados = new Set<number>();

      for (const r of apt.reservations) {
        // Reservas também como [rStart, rEndExclusive)
        const rStart = new Date(r.start).setHours(0, 0, 0, 0);
        const rEndExclusive = new Date(r.end).setHours(0, 0, 0, 0);

        // Ignora reservas inválidas ou de 0 noite
        if (rEndExclusive <= rStart) continue;

        // Interseção
        const overlapStart = Math.max(rStart, rangeStart);
        const overlapEndExclusive = Math.min(rEndExclusive, rangeEndExclusive);

        if (overlapStart < overlapEndExclusive) {
          for (let ts = overlapStart; ts < overlapEndExclusive; ts += 86400000) {
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
    // Considera noites: [start, end] como noites do período
    const start = this.parseLocalDate(startStr).getTime();
    const endExclusive = this.parseLocalDate(endStr).getTime() + 86400000; // fim exclusivo (noite do dia fim incluída)

    return !apt.reservations.some(r => {
      // Reservas são noites [rStart, rEndExclusive) (checkout não ocupa noite)
      const rStart = new Date(r.start).setHours(0, 0, 0, 0);
      const rEndExclusive = new Date(r.end).setHours(0, 0, 0, 0);
      // conflito se houver interseção entre [rStart, rEndExclusive) e [start, endExclusive)
      return rStart < endExclusive && rEndExclusive > start;
    });
  }

  // --- SELECTION LOGIC ---
  isSelecting = false;
  selectionStart: { aptId: number, date: Date } | null = null;
  selectionEnd: { aptId: number, date: Date } | null = null;

  // Modal State for child component
  showReservationModal = false;
  modalStartDate: string | null = null;
  modalEndDate: string | null = null;
  modalApartmentId: number | null = null;
  modalWarningMessage = '';
  modalEditMode = false;
  modalReservationToEdit: ReservaAirbnb | null = null;

  onCellMouseDown(aptId: number, date: Date, event: MouseEvent): void {
    if (event.button !== 0) return; // Only left click
    const apt = this.apartments.find(a => a.id === aptId);
    if (!apt) return;

    this.isSelecting = true;
    this.selectionStart = { aptId, date };
    this.selectionEnd = { aptId, date };
    this.cdr.markForCheck();
  }

  onCellMouseEnter(aptId: number, date: Date): void {
    if (!this.isSelecting || !this.selectionStart) return;
    if (this.selectionStart.aptId !== aptId) return;

    this.selectionEnd = { aptId, date };
    this.cdr.markForCheck();
  }

  onCellMouseUp(aptId: number, date: Date): void {
    if (!this.isSelecting || !this.selectionStart) return;
    this.isSelecting = false;

    if (this.selectionStart.aptId !== aptId) {
      this.cancelSelection();
      return;
    }

    let start = this.selectionStart.date;
    let end = date;
    if (start.getTime() > end.getTime()) {
      [start, end] = [end, start];
    }

    const apt = this.apartments.find(a => a.id === aptId);
    if (apt && this.isRangeFree(apt, start, end)) {
      this.openReservationModal(aptId, start, end);
    } else {
      // Check if clicking on a FOREST reservation
      const forestReservation = this.getForestReservationAtDate(apt!, date);
      if (forestReservation) {
        this.openEditReservationModal(forestReservation);
      } else {
        // Show warning modal for other reservations
        this.openReservationModalWithWarning(aptId);
      }
    }
  }

  cancelSelection(): void {
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.cdr.markForCheck();
  }

  isDateSelected(aptId: number, date: Date): boolean {
    if (!this.selectionStart || !this.selectionEnd) return false;
    if (this.selectionStart.aptId !== aptId) return false;

    const ts = date.getTime();
    const startTs = Math.min(this.selectionStart.date.getTime(), this.selectionEnd.date.getTime());
    const endTs = Math.max(this.selectionStart.date.getTime(), this.selectionEnd.date.getTime());

    return ts >= startTs && ts <= endTs;
  }

  private isRangeFree(apt: Apartment, start: Date, end: Date): boolean {
    let localEnd = new Date(end);
    if (start.getTime() === localEnd.getTime()) {
      localEnd.setDate(localEnd.getDate() + 1);
    }

    const rangeStart = start.getTime();
    const rangeEnd = localEnd.getTime();

    return !apt.reservations.some(r => {
      const rStart = new Date(r.start).setHours(0, 0, 0, 0);
      const rEnd = new Date(r.end).setHours(0, 0, 0, 0);
      return rangeStart < rEnd && rangeEnd > rStart;
    });
  }

  // Opens modal with a warning message (when user tried to select occupied dates)
  openReservationModalWithWarning(aptId: number): void {
    this.cancelSelection();
    this.modalWarningMessage = 'As datas selecionadas já possuem reserva. Por favor, selecione outras datas.';
    this.modalApartmentId = aptId;
    this.modalStartDate = null;
    this.modalEndDate = null;
    this.showReservationModal = true;
    this.cdr.markForCheck();
  }

  // Opens modal for a valid free range
  openReservationModal(aptId: number, start: Date, end: Date): void {
    const apt = this.apartments.find(a => a.id === aptId);
    if (!apt) return;

    let finalEnd = new Date(end);
    if (start.getTime() === finalEnd.getTime()) {
      finalEnd.setDate(finalEnd.getDate() + 1);
    }

    this.modalWarningMessage = '';
    this.modalApartmentId = aptId;
    this.modalStartDate = this.toInputDate(start);
    this.modalEndDate = this.toInputDate(finalEnd);
    this.showReservationModal = true;
    this.cdr.markForCheck();
  }

  // Opens modal manually (from button click)
  openManualReservationModal(): void {
    this.modalWarningMessage = '';
    this.modalApartmentId = this.apartments.length > 0 ? this.apartments[0].id : null;
    this.modalStartDate = null;
    this.modalEndDate = null;
    this.showReservationModal = true;
    this.cdr.markForCheck();
  }

  // Called when child component closes the modal
  onModalClosed(): void {
    this.showReservationModal = false;
    this.modalWarningMessage = '';
    this.modalApartmentId = null;
    this.modalStartDate = null;
    this.modalEndDate = null;
    this.modalEditMode = false;
    this.modalReservationToEdit = null;
    this.cancelSelection();
    this.cdr.markForCheck();
  }

  // Called when child component saves a reservation
  onReservationSaved(): void {
    this.loadData();
  }

  // Called when child component deletes a reservation
  onReservationDeleted(): void {
    this.loadData();
  }

  // Get FOREST reservation at specific date for an apartment
  private getForestReservationAtDate(apt: Apartment, date: Date): ReservaAirbnb | null {
    const ts = date.getTime();
    for (const r of apt.reservations) {
      const startTs = new Date(r.start).setHours(0, 0, 0, 0);
      const endTs = new Date(r.end).setHours(0, 0, 0, 0);
      if (ts >= startTs && ts <= endTs && r.link?.toLowerCase().includes('forest')) {
        // Need to fetch the full reservation data
        return {
          id: r.id,
          apartamento_id: apt.id,
          apartamento_nome: apt.name,
          start_date: this.toInputDate(r.start),
          end_data: this.toInputDate(r.end),
          cod_reserva: r.cod_reserva || '',
          link_reserva: r.link || '',
          description: 'Reserved',
          Observacoes: '',
          limpeza_realizada: false,
          credencial_made: false,
          informed: false,
          check_in: '',
          check_out: '',
          horarioPrevistoChegada: [],
          pagamentos: [],
          origem: 'FOREST'
        } as ReservaAirbnb;
      }
    }
    return null;
  }

  // Open modal in edit mode for FOREST reservation
  openEditReservationModal(reservation: ReservaAirbnb): void {
    this.cancelSelection();
    this.modalWarningMessage = '';
    this.modalEditMode = true;
    this.modalReservationToEdit = reservation;
    this.modalApartmentId = reservation.apartamento_id;
    this.modalStartDate = reservation.start_date;
    this.modalEndDate = reservation.end_data;
    this.showReservationModal = true;
    this.cdr.markForCheck();
  }
}
