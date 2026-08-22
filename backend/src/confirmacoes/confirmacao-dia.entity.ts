import { StatusConfirmacao, TipoTrabalho } from '@prisma/client';

/**
 * Status agregado da conferência de uma sede/dia — calculado a partir das
 * `confirmacoes` das alocações daquele dia, nunca persistido
 * (docs/features/confirmacao-dia.md, seção 25).
 */
export type StatusDia = 'PENDENTE' | 'EM_CONFERENCIA' | 'CONFERIDO';

/** Item da lista de sedes com atividade numa data (passo 2 da tela). */
export interface SedeComConfirmacoes {
  sedeId: string;
  nome: string;
  sigla: string;
  totalAlocados: number;
  statusDia: StatusDia;
}

/** Um funcionário alocado, com sua situação de confirmação (passo 3). */
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

/** Resumo por tipo de trabalho dentro de uma vaga (seção 8 da doc). */
export interface ResumoTipoConfirmacao {
  tipoTrabalho: TipoTrabalho;
  necessarios: number;
  alocados: number;
  trabalharam: number;
  pendentes: number;
  /** necessarios - trabalharam, nunca negativo — calculado, não gravado (seção 20/22). */
  substituicoesNecessarias: number;
}

/** Payload completo do passo 3 — sede selecionada, com resumo e funcionários. */
export interface ResumoConfirmacaoSede {
  sedeId: string;
  nome: string;
  data: string;
  statusDia: StatusDia;
  resumoPorTipo: ResumoTipoConfirmacao[];
  funcionarios: FuncionarioConfirmacao[];
}
