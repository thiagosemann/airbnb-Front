// Registro único da timeline de observações de uma reserva
export interface ObservacaoReserva {
	id: number;
	reserva_id: number;
	cod_reserva: string;
	user_id: number | null;
	user_nome: string;
	texto: string;
	created_at: string;
	updated_at: string;
}
