// Interface correspondente ao modelo de reservas
export interface ReservaAirbnb {
  id?: number;
  apartamento_id: number;
  apartamento_nome: string;
  description: string;
  end_data: string;  // Ou Date se for converter datas
  start_date: string; // Ou Date se for converter datas
  Observacoes: string;
  cod_reserva: string;
  link_reserva:string;
  limpeza_realizada: boolean;
  credencial_made: boolean;
  informed : boolean;
  check_in:string;
  check_out:string;
  checkinInfo?: any; // Adicionado para armazenar informações do check-in
  faxina_userId?: number | null; // Adicione este campo
  check_in_mesmo_dia?:boolean;

}