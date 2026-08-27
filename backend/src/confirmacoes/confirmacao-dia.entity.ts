import { StatusConfirmacao } from '@prisma/client';

/**
 * Status agregado da conferência de uma sede/dia — calculado a partir das
 * `confirmacoes` das alocações daquele dia, nunca persistido
 * (docs/features/confirmacao-dia.md, seção 25).
 */
export type StatusDia = 'PENDENTE' | 'EM_CONFERENCIA' | 'CONFERIDO';

/**
 * "minha" = só a(s) sede(s) que o usuário administra; "todas" = sem
 * filtro. É só conveniência de visualização — o backend nunca esconde uma
 * sede por trás disso pra Administrador, só filtra o que a lista mostra
 * (mesmo padrão do Dashboard, ver DashboardService).
 */
export type EscopoSedes = 'minha' | 'todas';

/**
 * Item da lista de sedes com atividade numa data (passo 2 da tela) — no
 * modo "Todos" (sem filtrar por um dia específico) cada linha é uma
 * combinação sede+dia distinta, então a mesma sede pode aparecer mais de
 * uma vez se tiver pendência em dias diferentes.
 */
export interface SedeComConfirmacoes {
  sedeId: string;
  nome: string;
  sigla: string;
  data: string;
  totalAlocados: number;
  statusDia: StatusDia;
}

/** Um funcionário alocado, com sua situação de confirmação (passo 3). */
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

/** Resumo por tipo de trabalho dentro de uma vaga (seção 8 da doc). */
export interface ResumoTipoConfirmacao {
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  necessarios: number;
  alocados: number;
  trabalharam: number;
  /**
   * Vagas desse tipo ainda não preenchidas: `max(0, necessarios -
   * trabalharam)` — decisão revertida, não é mais "quantos ainda estão com
   * confirmação em aberto" (esse conceito de "aguardando confirmação"
   * continua existindo, só que calculado à parte no frontend a partir da
   * lista de `funcionarios`, pra decidir se dá pra finalizar a conferência
   * — ver ConfirmacoesService.finalizar).
   */
  pendentes: number;
  /**
   * Quantos funcionários desse tipo estão marcados como urgentes
   * (confirmação SUBSTITUICAO_NECESSARIA — só existe pra quem faltou, ver
   * FaltasService.registrar), abatendo quem já cobriu essa vaga
   * (SUBSTITUIU). É um subconjunto de `pendentes` — só a parte marcada
   * como urgente, não qualquer vaga ainda em aberto.
   */
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
  /**
   * true quando a conferência dessa sede/dia já foi finalizada e ainda não
   * foi reaberta (docs/features/confirmacao-dia.md, seção 28.1) — a tela
   * deve bloquear alteração individual de situação enquanto for true.
   */
  finalizado: boolean;
  finalizadoEm: string | null;
}
