/**
 * Filtro opt-in de visualização: "todas" (padrão, sem restrição) ou
 * "minha" (só as sedes do próprio responsável). Não é controle de acesso —
 * é só conveniência, o usuário pode ver tudo a qualquer momento.
 */
export type EscopoSedes = 'minha' | 'todas';

/**
 * Espelha a resposta de GET /dashboard (backend/src/dashboard/dashboard.service.ts).
 */
export interface VagaResumo {
  id: string;
  data: string;
  sedeId: string;
  tipo: string;
  quantidade: number;
  status: string;
  alocacoesValidas: number;
  disponiveis: number;
}

export interface SedeComVagas {
  sedeId: string;
  nome: string;
  localizacao: string;
  /** true quando há alguma alocação FALTOU com Falta_Urgente = true nessa sede, na data. */
  urgente: boolean;
  /** true quando a sede tem vaga no dia e todas as vagas dela estão completas. */
  completa: boolean;
  vagas: VagaResumo[];
}

export interface DashboardTotais {
  totalVagas: number;
  vagasCompletas: number;
  vagasIncompletas: number;
  totalNecessario: number;
  totalAlocado: number;
  ocupacaoPercentual: number;
}

export interface VagaIncompletaPendencia {
  vagaId: string;
  sedeId: string;
  sedeSigla: string;
  tipo: string;
  faltam: number;
}

export interface SubstituicaoUrgentePendencia {
  vagaId: string;
  sedeSigla: string;
  tipo: string;
  faltam: number;
}

export interface DashboardPendencias {
  vagasIncompletas: VagaIncompletaPendencia[];
  substituicoesUrgentes: SubstituicaoUrgentePendencia[];
}

export interface DashboardResumo {
  data: string;
  totais: DashboardTotais;
  sedes: SedeComVagas[];
  pendencias: DashboardPendencias;
}
