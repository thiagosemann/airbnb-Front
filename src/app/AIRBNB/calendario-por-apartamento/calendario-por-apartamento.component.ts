// calendario-por-apartamento.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

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

interface Apartment {
  id: number;
  name: string;
  status: string;
  color: string;
  link_anuncio_airbnb?: string;
  link_anuncio_booking?: string;
}

@Component({
  selector: 'app-calendario-por-apartamento',
  templateUrl: './calendario-por-apartamento.component.html',
  styleUrls: ['./calendario-por-apartamento.component.css','./calendario-por-apartamento2.component.css']
})
export class CalendarioPorApartamentoComponent implements OnInit {
  selectedApartment!: Apartment;
  @Input() weekDays: string[] = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  calendarDays: CalendarDay[] = [];
  currentDate = new Date();
  loading: boolean = false;

  // Métricas de cabeçalho
  occupancyRate = 0;
  airbnbCount = 0;
  bookingCount = 0;

  constructor(
    private reservasService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService,
    private route: ActivatedRoute // <-- injeta o ActivatedRoute

  ) {}

  ngOnInit(): void {
  const cod = this.route.snapshot.paramMap.get('cod');
  if (!cod) return;
    this.apartamentoService.getApartamentoByCodProprietario(cod).subscribe(apartment => {
      this.selectedApartment = {
        id: apartment.id,
        name: apartment.nome, // Use the correct property name from Apartamento
        link_anuncio_airbnb: apartment.link_anuncio_airbnb,
        link_anuncio_booking: apartment.link_anuncio_booking,
        status: 'Disponível', // Use the correct property name from Apartamento
        color:'#3B82F6' // Use the correct property name from Apartamento
      };
      this.loadCalendar();
    });
  }

  /* --------------------- Navegação --------------------*/
  get currentMonthLabel(): string {
    return this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  changeMonth(offset: number): void {
    this.loading = true;
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + offset, 1);
    this.loadCalendar();
  }

  /* -------------------- Carregamento ------------------*/
  private loadCalendar(): void {
    if (!this.selectedApartment) return;

    const start = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const end = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

    this.reservasService
      .getReservasPorPeriodoCalendarioPorApartamento(
        this.selectedApartment.id,
        this.formatarDataParaInput(start),
        this.formatarDataParaInput(end)
      )
      .subscribe(reservas => {
        this.buildCalendarDays(reservas, start, end);
        this.loading = false;

      });
  }

  // Converte 'yyyy-MM-dd' (ou 'yyyy-MM-ddTHH:mm') para Date local sem UTC
  private toLocalDateFromIso(dateStr: string): Date {
    if (!dateStr) return new Date('Invalid');
    const onlyDate = String(dateStr).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mth, d] = m;
      return new Date(Number(y), Number(mth) - 1, Number(d));
    }
    // fallback: ainda assim evita deslocamento ao usar UTC getters
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) {
      return new Date(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
    }
    return new Date('Invalid');
  }

  // Helpers baseados em inteiros (YYYYMMDD) para evitar timezone totalmente
  private ymdIntFromStr(dateStr: string): number {
    if (!dateStr) return NaN;
    const onlyDate = String(dateStr).split('T')[0];
    const m = onlyDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return y * 10000 + mo * 100 + d;
    }
    return NaN;
  }
  private ymdIntFromDate(dt: Date): number {
    return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
  }
  private dateFromYmdInt(ymd: number): Date {
    const y = Math.floor(ymd / 10000);
    const mo = Math.floor((ymd % 10000) / 100);
    const d = ymd % 100;
    return new Date(y, mo - 1, d);
  }
  private nextDayInt(ymd: number): number {
    const dt = this.dateFromYmdInt(ymd);
    dt.setDate(dt.getDate() + 1);
    return this.ymdIntFromDate(dt);
  }

  // Formata Date local em 'yyyy-MM-dd' sem UTC
  private formatarDataParaInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /* -------------------- Monta grade + Métricas --------*/
  private buildCalendarDays(reservas: ReservaAirbnb[], inicio: Date, fim: Date): void {
    const days: CalendarDay[] = [];
    const dailyOccupancy = new Map<string, { source: 'airbnb' | 'booking', counted: boolean }>();

    let airbnb = 0;
    let booking = 0;

    // Preenche dias anteriores ao primeiro dia do mês para alinhar com o cabeçalho (Dom inicia coluna 0)
    const firstWeekday = inicio.getDay(); // 0=Dom, 6=Sáb
    if (firstWeekday > 0) {
      const leadDate = new Date(inicio);
      leadDate.setDate(1 - firstWeekday);
      for (let i = 0; i < firstWeekday; i++) {
        const curr = new Date(leadDate);
        curr.setHours(0, 0, 0, 0);
        days.push({ date: curr, isCurrentMonth: false, events: [] });
        leadDate.setDate(leadDate.getDate() + 1);
      }
    }

    // Construção visual do calendário (dias do mês atual)
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const curr = new Date(d);
      curr.setHours(0, 0, 0, 0);
      const cInt = this.ymdIntFromDate(curr);

      const events = reservas
        .filter(r => {
          const sInt = this.ymdIntFromStr(String(r.start_date));
          const eInt = this.ymdIntFromStr(String(r.end_data));
          return Number.isFinite(sInt) && Number.isFinite(eInt)
            && cInt >= sInt && cInt <= eInt // inclui o dia do checkout
            && r.description === 'Reserved';
        })
        .map(r => ({
          id: r.id!,
          title: r.apartamento_nome || r.cod_reserva,
          color: this.selectedApartment.color,
          start: r.start_date,
          end: r.end_data,
          cod_reserva: r.cod_reserva,
          source: (r.link_reserva || '').toLowerCase().includes('airbnb') ? 'airbnb' : 'booking'
        } as CalendarEvent));

      days.push({
        date: new Date(curr),
        isCurrentMonth: curr.getMonth() === this.currentDate.getMonth(),
        events
      });
    }

    // Preenche dias após o último dia do mês para completar a semana
    const lastWeekday = fim.getDay(); // 0=Dom, 6=Sáb
    if (lastWeekday < 6) {
      const trailDate = new Date(fim);
      trailDate.setDate(fim.getDate() + 1);
      for (let i = lastWeekday + 1; i <= 6; i++) {
        const curr = new Date(trailDate);
        curr.setHours(0, 0, 0, 0);
        days.push({ date: curr, isCurrentMonth: false, events: [] });
        trailDate.setDate(trailDate.getDate() + 1);
      }
    }

    // Lógica de contagem (inclui checkout)
    reservas.forEach(r => {
      const sInt = this.ymdIntFromStr(String(r.start_date));
      const eInt = this.ymdIntFromStr(String(r.end_data));
      if (!Number.isFinite(sInt) || !Number.isFinite(eInt)) return;
      const source = (r.link_reserva || '').toLowerCase().includes('airbnb') ? 'airbnb' : 'booking';

      for (let dInt = sInt; dInt <= eInt; dInt = this.nextDayInt(dInt)) {
        const dt = this.dateFromYmdInt(dInt);
        if (dt.getMonth() !== this.currentDate.getMonth()) continue;

        const key = this.formatarDataParaInput(dt);
        if (!dailyOccupancy.has(key)) {
          dailyOccupancy.set(key, { source, counted: false });
        } else {
          const existing = dailyOccupancy.get(key)!;
          if (existing.source !== source && dInt === sInt) {
            dailyOccupancy.set(key, { source, counted: false });
          }
        }
      }
    });

    for (const { source, counted } of dailyOccupancy.values()) {
      if (!counted) {
        if (source === 'airbnb') airbnb++;
        else booking++;
      }
    }

    const totalDays = fim.getDate();
    const uniqueDays = dailyOccupancy.size;
    this.occupancyRate = Math.round((uniqueDays / totalDays) * 100);
    this.airbnbCount = airbnb;
    this.bookingCount = booking;
    this.calendarDays = days;
  }

  /* ----------------------- Util ----------------------*/
  isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    return today.getTime() === d.getTime();
  }
}