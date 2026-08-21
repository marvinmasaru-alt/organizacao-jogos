import {
  DashboardResumo,
  EscopoSedes,
  SedeComVagas,
  VagaResumo,
} from '../dashboard/dashboard.model';

export type { DashboardResumo, EscopoSedes, SedeComVagas, VagaResumo };

/**
 * Espelha SituacaoParaAlocacao do backend
 * (backend/src/funcionarios/funcionario.entity.ts).
 * Conflito é sempre por dia — ver docs/features/alocacao.md, seção 12.
 */
export type SituacaoParaAlocacao =
  | 'DISPONIVEL'
  | 'ALOCADO_OUTRA_VAGA'
  | 'JA_ALOCADO_NESTA_VAGA'
  | 'CANCELOU_NESTA_VAGA'
  | 'FALTOU_NESTA_VAGA';

export interface FuncionarioParaAlocacao {
  id: string;
  nome: string;
  telefone: string;
  situacao: SituacaoParaAlocacao;
  /** true somente quando situacao === 'DISPONIVEL'. */
  selecionavel: boolean;
}

/** Item de POST /alocacoes — corpo é { alocacoes: ItemAlocacao[] }. */
export interface ItemAlocacao {
  vagaId: string;
  funcionarioId: string;
}
