export interface TicketReembolsoArquivo {
  id?: number;
  name?: string; // Nome do arquivo
  imagemBase64: string;
  type: string;
  created_at?: string;
}

export interface TicketReembolso {
  id?: number;
  auth?: string;
  apartamento_id: number;
  apartamento_nome?: string; // Nome do apartamento, opcional
  item_problema: string;
  descricao_problema: string;
  solucao?: string;
  status?: string;
  data_autorizacao?: string;
  notificado_forest?: boolean | number;
  data_notificacao?: string;
  valor_material?: number;
  valor_mao_obra?: number;
  data_conclusao?: string;
  pagamento_confirmado?: boolean | number;
  data_pagamento?: string;
  data_arquivamento?: string;
  link_pagamento?: string;
  files?: TicketReembolsoArquivo[];
  arquivos?: TicketReembolsoArquivo[]; // Para envio
}