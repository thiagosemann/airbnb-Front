// calendario-por-apartamento.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
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
  console.log(cod)
  if (!cod) return;
    this.apartamentoService.getApartamentoByCodProprietario(cod).subscribe(apartment => {
      this.selectedApartment = {
        id: apartment.id,
        name: apartment.nome, // Use the correct property name from Apartamento
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
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      )
      .subscribe(reservas => {
        this.buildCalendarDays(reservas, start, end);
        this.loading = false;

      });
  }

  /* -------------------- Monta grade + Métricas --------*/
private buildCalendarDays(reservas: ReservaAirbnb[], inicio: Date, fim: Date): void {
  const days: CalendarDay[] = [];
  const dailyOccupancy = new Map<string, { source: 'airbnb' | 'booking', counted: boolean }>();

  let airbnb = 0;
  let booking = 0;

  // Construção visual do calendário
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const curr = new Date(d);
    curr.setHours(0, 0, 0, 0);

    const events = reservas
      .filter(r => {
        const s = new Date(r.start_date); s.setHours(0, 0, 0, 0);
        const e = new Date(r.end_data);  e.setHours(0, 0, 0, 0);
        return curr >= s && curr < e && r.description === 'Reserved'; // exclui o dia do checkout
      })
      .map(r => {
        return {
          id: r.id!,
          title: r.apartamento_nome || r.cod_reserva,
          color: this.selectedApartment.color,
          start: r.start_date,
          end: r.end_data,
          cod_reserva: r.cod_reserva,
          source: r.link_reserva.toLowerCase().includes('airbnb') ? 'airbnb' : 'booking'
        } as CalendarEvent;
      });

    days.push({
      date: new Date(curr),
      isCurrentMonth: curr.getMonth() === this.currentDate.getMonth(),
      events
    });
  }

  // Lógica de contagem sem afetar a visualização
  reservas.forEach(r => {
    const s = new Date(r.start_date); s.setHours(0, 0, 0, 0);
    const e = new Date(r.end_data);  e.setHours(0, 0, 0, 0);
    const source = r.link_reserva.toLowerCase().includes('airbnb') ? 'airbnb' : 'booking';

    for (let dt = new Date(s); dt < e; dt.setDate(dt.getDate() + 1)) {
      if (dt.getMonth() !== this.currentDate.getMonth()) continue;

      const key = dt.toISOString().split('T')[0];

      if (!dailyOccupancy.has(key)) {
        dailyOccupancy.set(key, { source, counted: false });
      } else {
        const existing = dailyOccupancy.get(key)!;
        if (existing.source !== source && dt.getTime() === s.getTime()) {
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