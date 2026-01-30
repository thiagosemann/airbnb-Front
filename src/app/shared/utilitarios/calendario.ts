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
  source: 'airbnb' | 'booking' | 'forest';
}

type DayType =
  | 'none' | 'air' | 'book' | 'forest'
  | 'inAir' | 'inBook' | 'inForest' | 'outAir' | 'outBook' | 'outForest'
  | 'inOutAir' | 'inOutBook' | 'inOutForest' 
  | 'inAirOutBook' | 'inBookOutAir' | 'inAirOutForest' | 'inBookOutForest' | 'inForestOutAir' | 'inForestOutBook';

  export {
    Apartment,
    CalendarReservation,
    CalendarDay,
    CalendarEvent,
    DayType
  };    