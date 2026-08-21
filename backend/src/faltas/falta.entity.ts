import { StatusConfirmacao } from '@prisma/client';

/**
 * "Falta" não é mais uma tabela própria — vive dentro de `confirmacoes`
 * (1:1 com `alocacoes`), registrada separadamente da alocação, no dia do
 * trabalho. Não gera multa; cancela o pagamento do funcionário para
 * aquele dia. Relevante para até 3 partes: responsável da sede,
 * responsável do fornecimento e administrador.
 */
export interface Falta {
  id: string; // confirmacoes.id
  alocacaoId: string;
  funcionarioId: string;
  vagaId: string; // vaga_tipos.id — ver vaga.entity.ts
  data: string;
  status: StatusConfirmacao; // FALTOU ou SUBSTITUICAO_NECESSARIA — nunca assumido automaticamente
  observacao: string | null;
}

/**
 * Projeção pública exibida no board principal: NUNCA expõe o nome do
 * funcionário.
 */
export interface FaltaResumoBoard {
  vagaId: string;
  necessitaSubstituicaoUrgente: boolean;
}
