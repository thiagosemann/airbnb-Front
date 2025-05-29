export interface LimpezaExtra {
  id?: number;
  apartamento_id: number;
  apartamento_nome?: string;
  end_data: string;
  Observacoes?: string;
  limpeza_realizada?: boolean;
  faxina_userId?: number | null;
  valor_limpeza?: number;
}
