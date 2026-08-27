import { StatusComissao, StatusPagamento } from '@prisma/client';
import { StatusExibicaoComissao, StatusExibicaoPagamento } from './pagamentos.util';

/**
 * Linha da tela "Pagamentos de Funcionários" (docs/features/pagamento.md,
 * seção 24) — obrigação de pagar o funcionário por uma alocação
 * confirmada. `valorPrevisto`/`valorPago` ficam sempre separados (seção
 * 27/28); `valorPrevisto` é `null` em sede HUB até o pagamento ser
 * registrado (valor livre, seção 7).
 */
export interface ItemPagamentoFuncionario {
  id: string;
  alocacaoId: string;
  funcionarioId: string;
  funcionarioNome: string;
  data: string; // data do trabalho
  sedeId: string;
  sedeNome: string;
  tipoSede: string;
  tipoTrabalhoNome: string;
  valorGerado: number;
  valorPrevisto: number | null;
  valorPago: number | null;
  dataPrevista: string | null; // data limite (vencimento)
  dataPagamento: string | null;
  status: StatusPagamento;
  statusExibicao: StatusExibicaoPagamento;
  observacao: string | null;
  comprovanteUrl: string | null;
}

/**
 * Linha da tela "Pagamentos a Receber" (docs/features/pagamento.md, seção
 * 21) — comissão calculada pra uma alocação confirmada, sob o ponto de
 * vista de QUEM está consultando (`minhaComissao`/`status`/
 * `statusExibicao` já resolvem qual das duas pernas — sede ou
 * fornecimento — pertence ao usuário logado). Status é independente do
 * `Pagamento` ligado (decisão do usuário): pagar o funcionário e receber
 * a comissão são eventos distintos.
 */
export interface ItemComissaoAReceber {
  id: string;
  alocacaoId: string;
  data: string; // data do trabalho
  dataPrevista: string | null; // vencimento — herdado do Pagamento ligado
  sedeId: string;
  sedeNome: string;
  tipoTrabalhoNome: string;
  funcionarioNome: string;
  responsavelPagadorNome: string; // dono do funcionário — quem paga o funcionário
  valorGerado: number;
  valorFuncionario: number | null;
  comissaoCalculada: number | null; // resultadoCalculado
  minhaComissao: number | null; // a perna (sede ou fornecimento) que pertence a quem consulta
  status: StatusComissao; // da perna de quem consulta (própria da Comissao, não do Pagamento)
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

/**
 * Corpo de PATCH /pagamentos/comissoes/:id/marcar-recebida. `leg` só é
 * necessário quando quem chama não tem uma perna óbvia (Administrador
 * numa linha com dois responsáveis diferentes) — Responsável sempre tem a
 * própria perna resolvida automaticamente, o campo é ignorado pra ele.
 */
export interface MarcarComissaoRecebidaInput {
  leg?: 'SEDE' | 'FORNECIMENTO';
}

/** Corpo de PATCH /pagamentos/:id/registrar. */
export interface RegistrarPagamentoInput {
  valorPago: number;
  dataPagamento: string;
  observacao?: string;
}
