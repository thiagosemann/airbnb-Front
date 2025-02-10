export interface User {
    id: number,
    first_name: string;
    last_name: string;
    cpf: string;
    email: string;
    Telefone?: string;
    password: string;
    token:string;
    role:string;
    imagemBase64?:string;
    documentBase64?:number;
    [key: string]: any; // Índice para acessar propriedades com base em uma string

  }

