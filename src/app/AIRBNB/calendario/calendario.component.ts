// calendario.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

interface Apartment {
  id: number;
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
  type: 'reservation' | 'checkin' | 'checkout' | 'block';
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
  | 'none'
  | 'air'           // span interno Airbnb
  | 'book'          // span interno Booking
  | 'inAir'         // check-in Airbnb
  | 'inBook'        // check-in Booking
  | 'outAir'        // check-out Airbnb
  | 'outBook'       // check-out Booking
  | 'inOutAir'      // check-in + check-out Airbnb
  | 'inOutBook'     // check-in + check-out Booking
  | 'inAirOutBook'  // check-in Airbnb + check-out Booking
  | 'inBookOutAir'  // check-in Booking + check-out Airbnb
;

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css','./calendario2.component.css','./calendario3.component.css']
})
export class CalendarioComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  apartments: Apartment[] = [];
  filteredApartments: Apartment[] = [];

  selectedApartmentId: number | null = null;
  selectedApartment: Apartment | null = null;

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  viewMode: 'global' | 'detail' = 'global';
  searchTerm: string = '';

  currentDate = new Date();
  currentMonth = this.currentDate.toLocaleString('default', { month: 'long' });
  currentYear = this.currentDate.getFullYear();
  daysInMonthRange: Date[] = [];
  visibleDays: Date[] = [];
  calendarDays: CalendarDay[] = [];

  loading = false;
  dataInicio: string;
  dataFim: string;

  constructor(
    private apartamentoService: ApartamentoService,
    private reservasAirbnbService: ReservasAirbnbService
  ) {
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

    this.dataInicio = this.toInputDate(firstDay);
    this.dataFim = this.toInputDate(lastDay);

    this.generateDaysInMonth();
    this.generateCalendarDays();
  }

  ngOnInit(): void {
    this.loadData();
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getWeekDay(date: Date): string {
    return this.weekDays[date.getDay()];
  }

  filterApartments(): void {
    if (!this.searchTerm) {
      this.filteredApartments = [...this.apartments];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredApartments = this.apartments.filter(apt =>
      apt.name.toLowerCase().includes(term)
    );
  }

loadData(): void {
  this.loading = true;
  this.apartamentoService.getAllApartamentos().subscribe({
    next: (apts) => {
      this.apartments = apts.map(a => ({
        id: a.id,
        name: a.nome,
        color: this.getRandomColor(),
        status: 'Disponível',
        reservations: []
      }));

      this.reservasAirbnbService
        .getReservasPorPeriodo(this.dataInicio, this.dataFim)
        .subscribe({
          next: (reservas) => {
            // filtra apenas as reservas com description === 'Reserved'
            const apenasReserved = reservas.filter(r =>
              r.description &&
              r.description.toLowerCase() === 'reserved'
            );
            console.log('Reservas válidas:', apenasReserved);
            this.mapReservations(apenasReserved);
            this.filteredApartments = [...this.apartments];
            this.loading = false;
            setTimeout(() => this.syncScroll(), 100);
          },
          error: () => this.loading = false
        });
    },
    error: () => this.loading = false
  });
}


  private getRandomColor(): string {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  syncScroll(): void {
    const container = this.scrollContainer?.nativeElement;
    if (container) {
      container.addEventListener('scroll', () => {
        const scrollLeft = container.scrollLeft;
        const header = container.querySelector('.days-header');
        if (header) {
          header.scrollLeft = scrollLeft;
        }
      });
    }
  }

  private mapReservations(reservas: ReservaAirbnb[]): void {
    this.apartments.forEach(apt => apt.reservations = []);

    reservas.forEach(r => {
      const apt = this.apartments.find(a => a.id === r.apartamento_id);
      if (!apt) return;

      const event: CalendarReservation = {
        id: r.id!,
        title: r.apartamento_nome || r.cod_reserva,
        start: new Date(r.start_date),
        end:   new Date(r.end_data),
        color: this.getColorByType(r),   // pode continuar usando description pra cor
        type:  'reservation',             // **sempre reservation**
        cod_reserva: r.cod_reserva,
        link: r.link_reserva
      };

      apt.reservations.push(event);
    });
  }


  private getColorByType(r: ReservaAirbnb): string {
    switch (r.description.toLowerCase()) {
      case 'reserved':
        return '#3B82F6';
      case 'cancelada':
        return '#999999';
      case 'check-in':
        return '#10B981';
      case 'check-out':
        return '#8B5CF6';
      default:
        return '#EF4444';
    }
  }

  generateDaysInMonth(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    this.daysInMonthRange = Array.from({ length: daysCount }, (_, i) => new Date(year, month, i + 1));
    this.visibleDays = [...this.daysInMonthRange];
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLast = new Date(year, month, 0).getDate();

    // Dias do mês anterior
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const events = this.getEventsForDay(d);
      this.calendarDays.push({ date: d, isCurrentMonth: true, events });
    }

    // Dias do próximo mês
    const lastWeekday = lastDay.getDay();
    for (let i = 1; i <= 6 - lastWeekday; i++) {
      const d = new Date(year, month + 1, i);
      this.calendarDays.push({ date: d, isCurrentMonth: false, events: [] });
    }
  }

  getEventsForDay(dayDate: Date): CalendarEvent[] {
    if (!this.selectedApartment) return [];

    return this.selectedApartment.reservations
      .filter(r => {
        const start = new Date(r.start).setHours(0,0,0,0);
        const end   = new Date(r.end).setHours(0,0,0,0);
        const target= new Date(dayDate).setHours(0,0,0,0);
        return target >= start && target <= end;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        color: r.color,
        start: r.start instanceof Date ? r.start.toISOString() : r.start,
        end: r.end instanceof Date ? r.end.toISOString() : r.end,
        cod_reserva: r.cod_reserva,
        source: r.link.toLowerCase().includes('airbnb') ? 'airbnb' : 'booking'
      }));
  }

  formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR');
  }

  selectApartment(id: number): void {
    this.selectedApartmentId = id;
    this.selectedApartment = this.apartments.find(a => a.id === id) || null;
    this.viewMode = 'detail';
    this.generateCalendarDays();
  }

  setViewMode(mode: 'global' | 'detail') {
    this.viewMode = mode;
    if (mode === 'global') {
      setTimeout(() => this.syncScroll(), 100);
    } else if (this.selectedApartment) {
      this.generateCalendarDays();
    }
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
    this.loadData();

    if (this.viewMode === 'detail') this.generateCalendarDays();
  }

  isToday(day: Date): boolean {
    const today = new Date();
    today.setHours(0,0,0,0);
    const ts = new Date(day).setHours(0,0,0,0);
    return today.getTime() === ts;
  }
  getDayType(apt: Apartment, day: Date): DayType {
      const ts = new Date(day).setHours(0,0,0,0);

      // flags para Airbnb
      let inAir = false;
      let outAir = false;
      let spanAir = false;

      // flags para Booking
      let inBook = false;
      let outBook = false;
      let spanBook = false;

      for (const r of apt.reservations) {
        const startTs = new Date(r.start).setHours(0,0,0,0);
        const endTs   = new Date(r.end).setHours(0,0,0,0);

        // detecta se é Airbnb ou Booking (ajuste conforme sua fonte de verdade)
        const isAir = r.link.toLowerCase().includes('airbnb');
       
        if (ts === startTs) {
          if (isAir) inAir = true;
          else       inBook = true;
        }
        if (ts === endTs) {
          if (isAir) outAir = true;
          else       outBook = true;
        }
        if (ts > startTs && ts < endTs) {
          if (isAir)  spanAir = true;
          else        spanBook = true;
        }
      }

      // composições de check-in + check-out
      if (inAir && outAir)         return 'inOutAir';
      if (inBook && outBook)       return 'inOutBook';
      if (inAir && outBook)        return 'inAirOutBook';
      if (inBook && outAir)        return 'inBookOutAir';

      // casos individuais
      if (inAir)   return 'inAir';
      if (outAir)  return 'outAir';
      if (inBook)  return 'inBook';
      if (outBook) return 'outBook';

      // spans (dias intermediários)
      if (spanAir)  return 'air';
      if (spanBook) return 'book';

      return 'none';
    }

}
