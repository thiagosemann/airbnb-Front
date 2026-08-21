export interface LimpezaExtra {
  id?: number;
  apartamento_id: number;
  apartamento_nome?: string;
  apartamento_senha?: string;
  end_data: string;
  Observacoes?: string;
  limpeza_realizada?: boolean;
  faxina_userId?: number | null;
  valor_limpeza?: number;
  /** Justificativa exigida para trocar o responsável de limpeza de hoje ou anterior */
  motivo_alteracao?: string;
}
