import { Injectable } from '@nestjs/common';
import { TipoSede, TipoTrabalho } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StatusPrazoPagamento } from '../common/types/enums';
import { PRAZO_PAGAMENTO_DIAS } from './pagamentos.constants';

/**
 * Valores fixos por tipo de trabalho/sede não são mais hardcoded aqui —
 * vêm de `tabela_valores` (docs/SQL/create.sql), que já prevê vigência
 * (`data_inicio`/`data_fim`) pra mudar sem precisar de deploy.
 *
 * Comissão fica fora de escopo desta migração (ver plano) — `valor` aqui é
 * só o valor de referência, sem cálculo de divisão entre responsáveis.
 */
@Injectable()
export class PagamentosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Valor vigente na data informada para (tipoTrabalho, tipoSede), ou `null` se nenhum estiver ativo/vigente. */
  async valorVigente(
    tipoTrabalho: TipoTrabalho,
    tipoSede: TipoSede,
    data: string,
  ): Promise<number | null> {
    const dataRef = new Date(data);
    const valor = await this.prisma.tabelaValor.findFirst({
      where: {
        tipoTrabalho,
        tipoSede,
        ativo: true,
        dataInicio: { lte: dataRef },
        OR: [{ dataFim: null }, { dataFim: { gte: dataRef } }],
      },
      orderBy: { dataInicio: 'desc' },
    });
    return valor ? Number(valor.valor) : null;
  }

  /** Indicador visual (não altera a regra, que é sempre "1 semana"). */
  calcularStatusPrazo(dataTrabalho: string): StatusPrazoPagamento {
    const dias = this.diasDesde(dataTrabalho);
    if (dias > PRAZO_PAGAMENTO_DIAS) return StatusPrazoPagamento.VENCIDO;
    if (dias >= PRAZO_PAGAMENTO_DIAS - 2)
      return StatusPrazoPagamento.PROXIMO_VENCIMENTO;
    return StatusPrazoPagamento.NO_PRAZO;
  }

  private diasDesde(dataIso: string): number {
    const umDiaMs = 1000 * 60 * 60 * 24;
    return Math.floor((Date.now() - new Date(dataIso).getTime()) / umDiaMs);
  }
}
