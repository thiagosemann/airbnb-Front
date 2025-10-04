// src/app/shared/utilitarios/npsLimpeza.ts
export interface NpsLimpeza {
  id?: number;
  user_id?: number | null;
  empresa_id: number;
  apartamento_id: number;
  nota_geral: number; // 0..10
  comentario?: string | null;

  // Subnotas opcionais (0..10)
  limpeza_quarto?: number | null;
  limpeza_banheiros?: number | null;
  limpeza_cozinha?: number | null;

  // Metadados
  created_at?: string;
  updated_at?: string;

  // Campos vindos dos JOINs do backend
  apartamento_nome?: string;
  terceirizado_nome?: string;
}

export type CreateNpsLimpezaPayload = Omit<
  NpsLimpeza,
  'id' | 'created_at' | 'updated_at' | 'apartamento_nome' | 'terceirizado_nome'
>;
