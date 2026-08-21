// Registro único da timeline de observações de um proprietário.
// A mesma timeline é exibida no cadastro de proprietários e no cadastro de
// apartamentos, já que o apartamento pertence ao proprietário.
export interface ObservacaoProprietario {
	id: number;
	proprietario_id: number;
	proprietario_nome: string;
	/** Apartamento a partir do qual a nota foi registrada (contexto, opcional) */
	apartamento_id: number | null;
	apartamento_nome: string | null;
	user_id: number | null;
	user_nome: string;
	texto: string;
	created_at: string;
	updated_at: string;
}

/** Proprietário vinculado a um apartamento — define a quem atribuir a nota */
export interface ProprietarioResumo {
	id: number;
	nome: string;
}
