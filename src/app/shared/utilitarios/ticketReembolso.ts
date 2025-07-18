export interface TicketReembolsoArquivo {
  id?: number;
  name?: string; // Nome do arquivo
  imagemBase64: string;
  type: string;
  created_at?: string;
}

export interface TicketReembolso {
  id?: number;
  apartamento_id: number;
  item_problema: string;
  descricao_problema: string;
  solucao?: string;
  status?: string;
  autorizado_proprietario?: boolean | number;
  data_autorizacao?: string;
  notificado_forest?: boolean | number;
  data_notificacao?: string;
  valor_material?: number;
  valor_mao_obra?: number;
  data_conclusao?: string;
  pagamento_confirmado?: boolean | number;
  data_pagamento?: string;
  data_arquivamento?: string;
  files?: TicketReembolsoArquivo[];
  arquivos?: TicketReembolsoArquivo[]; // Para envio
}