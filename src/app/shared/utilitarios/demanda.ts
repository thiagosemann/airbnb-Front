export interface Demanda {
  id?: number;
  apartamento_id: number;
  user_id_responsavel: number;
  reserva_id?: number | null;
  user_id_created: number;
  demanda: string;
  prazo?: string;        // formato esperado: YYYY-MM-DD
  periodo?: string;      // ex.: 'manhã', 'tarde', 'noite' ou similar
  status?: string;       // ex.: 'Pendente', 'Em andamento', 'Concluída'
  type?: string;         // categoria/tipo da demanda
  created_at?: string;
  updated_at?: string;
  apartamento_nome?: string; // retornado pelo JOIN do backend
}
