export interface PaymentRequest {
  user_id: number;
  apartamento_id: number;
  cod_reserva: string;
  valorReais: number;
  tipo: string;
  metadata?: Record<string, any>;
}