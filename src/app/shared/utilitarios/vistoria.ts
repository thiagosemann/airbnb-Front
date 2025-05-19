// src/app/shared/utilitarios/vistoria.ts

export interface Vistoria {
  id?: number;
  apartamento_id: number;
  user_id: number;
  data: string;               // Ex: "2025-05-19T14:30:00Z"
  observacoes_gerais?: string;

  // Checklist de eletrodomésticos
  geladeira: boolean;
  geladeira_obs?: string;
  microondas: boolean;
  maquina_lavar: boolean;
  maquina_lavar_obs?: string;
  tv: boolean;
  ar_condicionado: boolean;
  ar_condicionado_obs?: string;
  cafeteira: boolean;

  // Iluminação
  luzes_principal: boolean;
  luzes_auxiliares: boolean;
  luzes_externas: boolean;

  // Água
  chuveiro: boolean;
  chuveiro_obs?: string;
  torneiras: boolean;
  vaso_sanitario: boolean;
  pressao_agua: boolean;

  // Segurança
  fechaduras: boolean;
  senha_porta: boolean;
  extintor: boolean;

  // Itens específicos
  copos: boolean;
  copos_obs?: string;
  talheres: boolean;
  cortinas: boolean;
  janelas: boolean;
  internet: boolean;
  internet_obs?: string;
}
