import { Injectable } from '@nestjs/common';
import { StatusAlocacao } from '../common/types/enums';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { Alocacao } from '../alocacoes/alocacao.entity';

/**
 * Visão administrativa: histórico completo de cancelamentos (funcionário,
 * vaga, data, responsável, data/motivo do cancelamento). Segue o princípio
 * geral do CLAUDE.md — alterar status é sempre preferível a apagar, então
 * este histórico nunca perde registros.
 */
@Injectable()
export class HistoricoService {
  constructor(private readonly alocacoesService: AlocacoesService) {}

  async listarCancelamentos(): Promise<Alocacao[]> {
    const todas = await this.alocacoesService.listarTodas();
    return todas.filter((a) => a.status === StatusAlocacao.CANCELADO);
  }
}
