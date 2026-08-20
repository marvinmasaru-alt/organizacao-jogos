import { StatusAlocacao } from '../common/types/enums';

/**
 * Espelha a aba ALOCACOES.
 * Responsavel_Sede_ID e Responsavel_Fornecimento_ID são sempre guardados
 * separadamente: são papéis independentes, mesmo que na prática atual a
 * mesma pessoa costume exercer os dois.
 *
 * Falta vive dentro desta mesma tabela (Status = FALTOU +
 * Data_Falta/Motivo_Falta/Falta_Urgente), não numa aba separada — decisão
 * confirmada que substitui a seção "Faltas" mais antiga do CLAUDE.md.
 */
export interface Alocacao {
  id: string;
  vagaId: string;
  funcionarioId: string;
  responsavelSedeId: string;
  responsavelFornecimentoId: string;
  data: string;
  valorRecebido: number;
  valorFuncionario: number;
  comissaoTotal: number;
  comissaoResponsavelSede: number;
  comissaoResponsavelFornecimento: number;
  extraResponsavel: number;
  status: StatusAlocacao;
  dataCancelamento: string | null;
  motivoCancelamento: string | null;
  dataFalta: string | null;
  motivoFalta: string | null;
  /** Sinaliza pendência no Dashboard sem nunca expor quem faltou. */
  faltaUrgente: boolean;
}
