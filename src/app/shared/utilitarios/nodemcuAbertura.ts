export interface NodemcuAbertura {
  id?: number;
  idNodemcu: string;
  fechaduras_predio_id: number;
  reserva_id: number;
  cod_reserva: string;
  created_at?: string;
  nodemcu_name?: string; // Adicionado para exibir o nome do portão
}
