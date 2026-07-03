export type VinculoTipo = 'forest' | 'proprietario' | 'fornecedor' | 'texto';
export type TransacaoTipo = 'entrada' | 'saida';
// Status armazenado no banco (ATRASADO é derivado e vem em status_efetivo)
export type ProvisionamentoStatus = 'PREVISTO' | 'PENDENTE' | 'REALIZADO';
export type StatusEfetivo = 'PREVISTO' | 'PENDENTE' | 'ATRASADO' | 'REALIZADO';

export interface Provisionamento {
  id?: number;
  empresa_id?: number;

  // Vínculo de identificação
  vinculo_tipo: VinculoTipo;
  vinculo_id?: number | null;      // users.id quando vinculo_tipo = 'proprietario'
  vinculo_label?: string | null;   // texto livre (fornecedor / manual)

  apartamento_id?: number | null;  // vínculo opcional com apartamento

  // Transação
  tipo: TransacaoTipo;
  valor: number;
  descricao?: string | null;

  // Datas (YYYY-MM-DD)
  data_prevista?: string | null;
  data_realizada?: string | null;

  status: ProvisionamentoStatus;

  created_at?: string;
  updated_at?: string;

  // Campos derivados retornados pelo backend
  status_efetivo?: StatusEfetivo;
  apartamento_nome?: string | null;
  apartamento_ativo?: number | null;
  proprietario_nome?: string | null;
}

// Linha do resumo agregado (GET /provisionamentos/resumo)
export interface ProvisionamentoResumoRow {
  status_efetivo: StatusEfetivo;
  tipo: TransacaoTipo;
  quantidade: number;
  total: number;
}
