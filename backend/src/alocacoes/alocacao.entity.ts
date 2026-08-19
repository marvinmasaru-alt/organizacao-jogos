import { StatusAlocacao } from '../common/types/enums';

/**
 * Espelha a aba ALOCACOES.
 * Responsavel_Sede_ID e Responsavel_Fornecimento_ID são sempre guardados
 * separadamente: são papéis independentes, mesmo que na prática atual a
 * mesma pessoa costume exercer os dois.
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
}
