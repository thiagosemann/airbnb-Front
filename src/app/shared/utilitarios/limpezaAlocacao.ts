/** Tipo da limpeza na planilha de alocações: reserva sincronizada ou limpeza avulsa */
export type TipoLimpezaAlocacao = 'RESERVA' | 'LIMPEZA_EXTRA';

/** Registro único da timeline de alocações de uma limpeza */
export interface LimpezaAlocacao {
	id: number;
	tipo: TipoLimpezaAlocacao;
	referencia_id: number;
	apartamento_id: number | null;
	faxina_userId_anterior: number | null;
	faxina_user_nome_anterior: string | null;
	faxina_userId_novo: number | null;
	faxina_user_nome_novo: string | null;
	/** null quando a alocação veio da sincronização automática */
	user_id: number | null;
	user_nome: string | null;
	origem: 'SISTEMA' | 'MANUAL' | 'MIGRACAO';
	motivo: string;
	created_at: string;
	/** Presente apenas na consulta por período: quantas alocações a limpeza já teve */
	total_alteracoes?: number;
}
