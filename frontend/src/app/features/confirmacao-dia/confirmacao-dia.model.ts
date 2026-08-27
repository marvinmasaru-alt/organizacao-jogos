export type StatusConfirmacao =
  | 'PENDENTE'
  | 'PRESENTE'
  | 'FALTOU'
  | 'CANCELOU'
  | 'SUBSTITUICAO_NECESSARIA'
  | 'SUBSTITUIU';
export type StatusDia = 'PENDENTE' | 'EM_CONFERENCIA' | 'CONFERIDO';
/** "minha" = só a(s) sede(s) do usuário; "todas" = sem filtro (só conveniência de visualização). */
export type EscopoSedes = 'minha' | 'todas';

/**
 * Espelha backend/src/confirmacoes/confirmacao-dia.entity.ts. No modo
 * "Todos" (sem filtro de data) cada linha é uma combinação sede+dia
 * distinta — a mesma sede pode aparecer mais de uma vez.
 */
export interface SedeComConfirmacoes {
  sedeId: string;
  nome: string;
  sigla: string;
  data: string;
  totalAlocados: number;
  statusDia: StatusDia;
}

export interface FuncionarioConfirmacao {
  alocacaoId: string;
  funcionarioId: string;
  nome: string;
  telefone: string | null;
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  status: StatusConfirmacao;
  observacao: string | null;
  confirmadoEm: string | null;
}

export interface ResumoTipoConfirmacao {
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  necessarios: number;
  alocados: number;
  trabalharam: number;
  /** Vagas ainda não preenchidas: `max(0, necessarios - trabalharam)`. Não é "aguardando confirmação" — ver pendentesRestantes no componente. */
  pendentes: number;
  /**
   * Subconjunto de `pendentes` — só quem está marcado como urgente
   * (SUBSTITUICAO_NECESSARIA), abatendo quem já cobriu essa vaga
   * (SUBSTITUIU).
   */
  substituicoesNecessarias: number;
}

export interface ResumoConfirmacaoSede {
  sedeId: string;
  nome: string;
  data: string;
  statusDia: StatusDia;
  resumoPorTipo: ResumoTipoConfirmacao[];
  funcionarios: FuncionarioConfirmacao[];
  /** true = conferência já finalizada, tela deve bloquear novas alterações (só Admin reabre). */
  finalizado: boolean;
  finalizadoEm: string | null;
}

/** Rótulo aceito por PATCH /confirmacoes/:alocacaoId — `TRABALHOU` é o nome de tela pra `PRESENTE`. */
export type NovaSituacao = 'TRABALHOU' | 'CANCELOU' | 'FALTOU' | 'SUBSTITUIU';
