export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'CANCELADO';
/** Status "rico" pra tela (docs/features/pagamento.md, seção 18) — vem sempre calculado do backend. */
export type StatusExibicaoPagamento = 'A_VENCER' | 'VENCENDO' | 'ATRASADO' | 'PAGO' | 'CANCELADO';

/** Status da comissão — próprio, independente do StatusPagamento do funcionário (pagar um não implica ter recebido o outro). */
export type StatusComissao = 'PENDENTE' | 'RECEBIDA' | 'CANCELADA';
export type StatusExibicaoComissao = 'A_VENCER' | 'VENCENDO' | 'ATRASADO' | 'RECEBIDA' | 'CANCELADA';

/** Espelha backend/src/pagamentos/pagamento.entity.ts — tela "Pagamentos de Funcionários". */
export interface ItemPagamentoFuncionario {
  id: string;
  alocacaoId: string;
  funcionarioId: string;
  funcionarioNome: string;
  data: string;
  sedeId: string;
  sedeNome: string;
  tipoSede: string;
  tipoTrabalhoNome: string;
  valorGerado: number;
  valorPrevisto: number | null;
  valorPago: number | null;
  dataPrevista: string | null;
  dataPagamento: string | null;
  status: StatusPagamento;
  statusExibicao: StatusExibicaoPagamento;
  observacao: string | null;
  comprovanteUrl: string | null;
}

/** Tela "Pagamentos a Receber" — `minhaComissao` já resolve a perna (sede ou fornecimento) de quem consulta. */
export interface ItemComissaoAReceber {
  id: string;
  alocacaoId: string;
  data: string;
  dataPrevista: string | null;
  sedeId: string;
  sedeNome: string;
  tipoTrabalhoNome: string;
  funcionarioNome: string;
  responsavelPagadorNome: string;
  valorGerado: number;
  valorFuncionario: number | null;
  comissaoCalculada: number | null;
  minhaComissao: number | null;
  status: StatusComissao;
  statusExibicao: StatusExibicaoComissao;
}

export interface ResumoPagamentosFuncionarios {
  totalAPagar: number;
  proximos7Dias: number;
  urgente2Dias: number;
  emAtraso: number;
  pagoNoPeriodo: number;
}

export interface ResumoComissoes {
  totalAReceber: number;
  proximos7Dias: number;
  urgente2Dias: number;
  emAtraso: number;
  recebidoNoPeriodo: number;
}

export interface FiltrosPagamentos {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  sedeId?: string;
  tipoTrabalhoId?: string;
  tipoSede?: string;
}

export interface RegistrarPagamentoPayload {
  valorPago: number;
  dataPagamento: string;
  observacao?: string;
  comprovante?: File;
}

/** `leg` só é necessário pra Administrador numa linha com responsáveis diferentes nas duas pernas — Responsável sempre marca a própria, resolvida no backend. */
export interface MarcarComissaoRecebidaPayload {
  leg?: 'SEDE' | 'FORNECIMENTO';
}
