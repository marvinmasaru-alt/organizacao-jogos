import { Injectable } from '@nestjs/common';
import { StatusPagamento } from '../common/types/enums';
import { PRAZO_PAGAMENTO_DIAS } from './pagamentos.constants';

/**
 * Comissão = Valor recebido - Valor pago ao funcionário, podendo ser
 * dividida entre responsável da sede e responsável do fornecimento quando
 * são pessoas diferentes.
 *
 * ⚠️ Fórmula exata de divisão da comissão é ponto em aberto no CLAUDE.md —
 * não implementar sem confirmação. Ver Extra_Responsavel para valores que
 * o responsável pagou a mais do próprio bolso.
 */
@Injectable()
export class PagamentosService {
  /** Indicador visual (não altera a regra, que é sempre "1 semana"). */
  calcularStatusPrazo(dataTrabalho: string): StatusPagamento {
    const dias = this.diasDesde(dataTrabalho);
    if (dias > PRAZO_PAGAMENTO_DIAS) return StatusPagamento.VENCIDO;
    if (dias >= PRAZO_PAGAMENTO_DIAS - 2) return StatusPagamento.PROXIMO_VENCIMENTO;
    return StatusPagamento.NO_PRAZO;
  }

  private diasDesde(dataIso: string): number {
    const umDiaMs = 1000 * 60 * 60 * 24;
    return Math.floor((Date.now() - new Date(dataIso).getTime()) / umDiaMs);
  }
}
