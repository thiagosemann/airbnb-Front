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

  export {
    Apartment,
    CalendarReservation,
    CalendarDay,
    CalendarEvent,
    DayType
  };    