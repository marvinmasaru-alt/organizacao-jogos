/** Espelha a resposta de GET /dashboard (backend/src/dashboard/dashboard.service.ts). */
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
  tipo: string;
  faltam: number;
}

export interface SubstituicaoUrgentePendencia {
  vagaId: string;
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
