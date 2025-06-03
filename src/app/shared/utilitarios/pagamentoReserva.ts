export interface PagamentoReserva {
  id?: number;
  apartamento_id?: number;
  apartamento_nome?: string;
  reserva_id?: number;
  cod_reserva: string;
  taxas: number;
  valor_reserva: number;
  dataReserva?: string;
  noites?: number;
}
