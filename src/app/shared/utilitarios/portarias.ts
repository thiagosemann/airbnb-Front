export interface Portaria {
  id: number;
  predio_id: number;
  nome: string;
  telefone_principal: string;
  telefone_secundario: string;
  email: string;
  modo_envio: string;
  envio_documentos_texto: boolean;
  envio_documentos_foto: boolean;
  cadastro_aplicativo: boolean;
  aplicativo_nome: string;
  aplicativo_login: string;
  aplicativo_senha: string;
  documentBase64: string;
  [key: string]: string | number | boolean | undefined;
}
