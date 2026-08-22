export type TipoTrabalho = 'MANPOWER' | 'FORKLIFT';
export type StatusConfirmacao = 'PENDENTE' | 'PRESENTE' | 'FALTOU' | 'CANCELOU' | 'SUBSTITUICAO_NECESSARIA';
export type StatusDia = 'PENDENTE' | 'EM_CONFERENCIA' | 'CONFERIDO';

/** Espelha backend/src/confirmacoes/confirmacao-dia.entity.ts. */
export interface SedeComConfirmacoes {
  sedeId: string;
  nome: string;
  sigla: string;
  totalAlocados: number;
  statusDia: StatusDia;
}

export interface FuncionarioConfirmacao {
  alocacaoId: string;
  funcionarioId: string;
  nome: string;
  telefone: string | null;
  tipoTrabalho: TipoTrabalho;
  status: StatusConfirmacao;
  observacao: string | null;
  confirmadoEm: string | null;
}

export interface ResumoTipoConfirmacao {
  tipoTrabalho: TipoTrabalho;
  necessarios: number;
  alocados: number;
  trabalharam: number;
  pendentes: number;
  substituicoesNecessarias: number;
}

export interface ResumoConfirmacaoSede {
  sedeId: string;
  nome: string;
  data: string;
  statusDia: StatusDia;
  resumoPorTipo: ResumoTipoConfirmacao[];
  funcionarios: FuncionarioConfirmacao[];
}

/** Rótulo aceito por PATCH /confirmacoes/:alocacaoId — `TRABALHOU` é o nome de tela pra `PRESENTE`. */
export type NovaSituacao = 'TRABALHOU' | 'CANCELOU' | 'FALTOU';
