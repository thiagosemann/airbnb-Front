export interface Predio {
  id: number;
  nome: string;
  piscina: boolean;
  academia: boolean;
  churrasqueira: boolean;
  salao_de_festas: boolean;
  espaco_gourmet: boolean;
  sauna: boolean;
  spa: boolean;
  salao_de_jogos: boolean;
  coworking: boolean;
  jardim_terraco: boolean;
  lavanderia: boolean;
  bicicletario: boolean;
  estacionamento_visitas: boolean;
  elevador_social: boolean;
  [key: string]: boolean | number | string | undefined;

}
