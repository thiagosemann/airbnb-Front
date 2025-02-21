export interface User {
    id?: number,
    first_name: string;
    last_name: string;
    cpf: string;
    email: string;
    Telefone?: string;
    password: string;
    token?:string;
    role:string;
    imagemBase64?:string;
    documentBase64?:number;
    unavailable_days?: string[];
    totalCleanings?: number; // Calculado
    totalPayment?: number;   // Calculado
    segunda?: number;
    terca?: number;
    quarta?: number;
    quinta?: number;
    sexta?: number;
    sabado?: number;
    domingo?: number;
    [key: string]: any; // Índice para acessar propriedades com base em uma string

  }

