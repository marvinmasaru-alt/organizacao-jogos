/** Espelha backend/src/funcionarios/funcionario.entity.ts. */
export type StatusFuncionario = 'PENDENTE' | 'APROVADO' | 'BLOQUEADO' | 'INATIVO';

export interface Funcionario {
  id: string;
  nome: string;
  telefone: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  documentoUrl: string | null;
  responsavelId: string;
  status: StatusFuncionario;
}

/** Campos editáveis pela tela de Funcionários (docs/features/Cadastro-funcionario.md). */
export interface AtualizarFuncionario {
  nome?: string;
  telefone?: string;
  provincia?: string;
  codigoPostal?: string;
  documentoUrl?: string;
  status?: StatusFuncionario;
}
