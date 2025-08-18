export interface TicketReembolsoArquivo {
  id?: number;
  file_name: string; // Nome do arquivo
  imagemBase64: string;
  type: string;
  created_at?: string;
}

export interface TicketReembolso {
  id?: number;
  apartamento_id: number;
  item_problema: string;
  descricao_problema: string;
  solucao: string;
  status: string;
  notificado_forest: boolean | number;
  data_notificacao?: string;
  valor_material?: number;
  valor_mao_obra?: number;
  data_realizado?: string;
  pagamento_confirmado: boolean | number;
  data_pagamento?: string;
  created_at?: string;
  updated_at?: string;
  auth?: string;
  link_pagamento?: string;
  apartamento_nome?: string; // Nome do apartamento, opcional
  valor_total?: number;
  files?: TicketReembolsoArquivo[];
  arquivos?: TicketReembolsoArquivo[]; // Para envio
}