import { Injectable } from '@nestjs/common';
import { StatusAlocacao } from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { Alocacao } from '../alocacoes/alocacao.entity';

/**
 * Visão administrativa: histórico completo de cancelamentos (funcionário,
 * vaga, data, responsável, data/motivo do cancelamento — motivo/quem
 * confirmou/quando vêm de `confirmacoes`, não de `alocacoes`). Segue o
 * princípio geral do CLAUDE.md — alterar status é sempre preferível a
 * apagar, então este histórico nunca perde registros.
 */
@Injectable()
export class HistoricoService {
  constructor(private readonly alocacoesService: AlocacoesService) {}

  async listarCancelamentos(): Promise<Alocacao[]> {
    const todas = await this.alocacoesService.listarTodas();
    return todas.filter((a) => a.status === StatusAlocacao.CANCELADA);
  }
}
