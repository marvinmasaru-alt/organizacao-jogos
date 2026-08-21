import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusConfirmacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Falta, FaltaResumoBoard } from './falta.entity';
import { RegistrarFaltaDto } from './dto/registrar-falta.dto';

const INCLUDE = {
  alocacao: { include: { vaga: { include: { tipos: true } } } },
} as const;

@Injectable()
export class FaltasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Detalhes completos — área restrita, nunca é o que o board consome. */
  async listarDetalhado(): Promise<Falta[]> {
    const confirmacoes = await this.prisma.confirmacao.findMany({
      where: { status: { in: [StatusConfirmacao.FALTOU, StatusConfirmacao.SUBSTITUICAO_NECESSARIA] } },
      include: INCLUDE,
    });
    return confirmacoes.map((c) => this.mapear(c));
  }

  /** Projeção segura para o board principal: nunca inclui o nome do funcionário. */
  async listarResumoBoard(data: string): Promise<FaltaResumoBoard[]> {
    const todas = await this.listarDetalhado();
    return todas
      .filter((f) => f.data === data)
      .map((f) => ({
        vagaId: f.vagaId,
        necessitaSubstituicaoUrgente:
          f.status === StatusConfirmacao.SUBSTITUICAO_NECESSARIA,
      }));
  }

  /**
   * Registra a falta (não cancela a alocação em si — `alocacoes.status`
   * continua ATIVA — mas cancela o pagamento daquele dia, já que a vaga
   * fica marcada como não ocupada por essa alocação, ver
   * AlocacoesService.contarValidasPorVagaRealETipo) e, se marcada como
   * urgente, sinaliza necessidade de substituição.
   */
  async registrar(dto: RegistrarFaltaDto): Promise<Falta> {
    const confirmacao = await this.prisma.confirmacao.findUnique({
      where: { alocacaoId: dto.alocacaoId },
    });
    if (!confirmacao) {
      throw new NotFoundException(
        `Alocação ${dto.alocacaoId} não encontrada.`,
      );
    }

    const atualizada = await this.prisma.confirmacao.update({
      where: { alocacaoId: dto.alocacaoId },
      data: {
        status: dto.necessitaSubstituicaoUrgente
          ? StatusConfirmacao.SUBSTITUICAO_NECESSARIA
          : StatusConfirmacao.FALTOU,
        observacao: dto.observacao ?? null,
        confirmadoEm: new Date(),
      },
      include: INCLUDE,
    });
    return this.mapear(atualizada);
  }

  /**
   * TODO (ponto em aberto no CLAUDE.md): fluxo exato de substituição
   * urgente — provavelmente mantém o registro original da falta e cria uma
   * NOVA alocação para o substituto, em vez de sobrescrever o original.
   */
  async registrarSubstituicao(faltaId: string, funcionarioSubstitutoId: string) {
    void faltaId;
    void funcionarioSubstitutoId;
    throw new Error('TODO: fluxo de substituição ainda não definido.');
  }

  private mapear(c: {
    id: string;
    status: StatusConfirmacao;
    observacao: string | null;
    alocacaoId: string;
    alocacao: {
      funcionarioId: string;
      tipoTrabalho: string;
      vaga: { data: Date; tipos: { id: string; tipoTrabalho: string }[] };
    };
  }): Falta {
    const vagaTipo = c.alocacao.vaga.tipos.find(
      (t) => t.tipoTrabalho === c.alocacao.tipoTrabalho,
    );
    return {
      id: c.id,
      alocacaoId: c.alocacaoId,
      funcionarioId: c.alocacao.funcionarioId,
      vagaId: vagaTipo?.id ?? '',
      data: c.alocacao.vaga.data.toISOString().slice(0, 10),
      status: c.status,
      observacao: c.observacao,
    };
  }
}
