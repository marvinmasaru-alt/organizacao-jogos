import { StatusFalta } from '../common/types/enums';

/**
 * Registrada separadamente da alocação, no dia do trabalho. Não gera
 * multa; cancela o pagamento do funcionário para aquele dia. Relevante
 * para até 3 partes: responsável da sede, responsável do fornecimento e
 * administrador.
 */
export interface Falta {
  id: string;
  alocacaoId: string;
  funcionarioId: string;
  vagaId: string;
  data: string;
  status: StatusFalta; // REGISTRADA ou URGENTE_SUBSTITUICAO — nunca assumido automaticamente
  observacao: string | null;
}

/**
 * Projeção pública exibida no board principal: NUNCA expõe o nome de quem
 * faltou. Detalhes completos só na área restrita (ver FaltasService).
 */
export interface FaltaResumoBoard {
  vagaId: string;
  necessitaSubstituicaoUrgente: boolean;
}
