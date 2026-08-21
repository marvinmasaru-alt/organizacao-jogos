import { Injectable } from '@nestjs/common';
import { Prisma, StatusAlocacao, StatusConfirmacao, TipoTrabalho } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Alocacao } from './alocacao.entity';

const INCLUDE = {
  vaga: { include: { sede: true, tipos: true } },
} satisfies Prisma.AlocacaoInclude;

type AlocacaoComRelacoes = Prisma.AlocacaoGetPayload<{ include: typeof INCLUDE }>;

/**
 * Dados mínimos pra criar uma alocação nova — sem valores/comissão (fora
 * de escopo desta migração, ver plano) e sem `id`/`status` (gerados aqui:
 * sempre ATIVA, com uma `confirmacao` PENDENTE criada junto).
 * `vagaId`/`tipoTrabalho` são os campos REAIS da tabela `alocacoes` — quem
 * resolve o `vagaTipoId` da API pra esse par é o AlocarService.
 */
export interface NovaAlocacaoInput {
  vagaId: string;
  tipoTrabalho: TipoTrabalho;
  funcionarioId: string;
  responsavelFornecimentoId: string;
}

@Injectable()
export class AlocacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarTodas(): Promise<Alocacao[]> {
    const linhas = await this.prisma.alocacao.findMany({ include: INCLUDE });
    return linhas.map((a) => this.mapear(a));
  }

  /**
   * Só contam para "preenchidas" as alocações ATIVAS cuja confirmação não
   * seja FALTOU — quem faltou libera a posição, mesmo sem cancelar a
   * alocação em si (a falta cancela o pagamento, não a vaga preenchida).
   */
  async listarValidasPorVagaTipo(vagaTipoId: string): Promise<Alocacao[]> {
    const vagaTipo = await this.prisma.vagaTipo.findUnique({
      where: { id: vagaTipoId },
    });
    if (!vagaTipo) {
      return [];
    }
    const linhas = await this.prisma.alocacao.findMany({
      where: {
        vagaId: vagaTipo.vagaId,
        tipoTrabalho: vagaTipo.tipoTrabalho,
        status: StatusAlocacao.ATIVA,
        NOT: { confirmacao: { status: StatusConfirmacao.FALTOU } },
      },
      include: INCLUDE,
    });
    return linhas.map((a) => this.mapear(a));
  }

  /** Mesma regra de "ocupa a vaga" que listarValidasPorVagaTipo, mas só a contagem — usado por VagasService. */
  async contarValidasPorVagaRealETipo(
    vagaRealId: string,
    tipoTrabalho: TipoTrabalho,
  ): Promise<number> {
    return this.prisma.alocacao.count({
      where: {
        vagaId: vagaRealId,
        tipoTrabalho,
        status: StatusAlocacao.ATIVA,
        NOT: { confirmacao: { status: StatusConfirmacao.FALTOU } },
      },
    });
  }

  /** Alocações ativas do funcionário numa data (join com vagas.data) — base do conflito por dia. */
  async listarAtivasPorFuncionarioEData(
    funcionarioId: string,
    data: string,
  ): Promise<Alocacao[]> {
    const linhas = await this.prisma.alocacao.findMany({
      where: {
        funcionarioId,
        status: StatusAlocacao.ATIVA,
        vaga: { data: new Date(data) },
      },
      include: INCLUDE,
    });
    return linhas.map((a) => this.mapear(a));
  }

  /** Alocações do dia com confirmação SUBSTITUICAO_NECESSARIA — consumido pelo Dashboard. */
  async listarFaltasUrgentesPorData(data: string): Promise<Alocacao[]> {
    const linhas = await this.prisma.alocacao.findMany({
      where: {
        status: StatusAlocacao.ATIVA,
        vaga: { data: new Date(data) },
        confirmacao: { status: StatusConfirmacao.SUBSTITUICAO_NECESSARIA },
      },
      include: INCLUDE,
    });
    return linhas.map((a) => this.mapear(a));
  }

  /**
   * Grava um lote de alocações novas numa transação (tudo ou nada de
   * verdade, ao contrário do Sheets). Quem decide SE o lote pode ser
   * gravado é o chamador (AlocarService, que já revalidou tudo antes de
   * chegar aqui) — este método só grava, sem validação de regra de
   * negócio, pra não duplicar lógica entre módulos. Cada alocação nasce
   * junto com uma `confirmacao` PENDENTE.
   */
  async gravarEmLote(itens: NovaAlocacaoInput[]): Promise<Alocacao[]> {
    if (itens.length === 0) {
      return [];
    }

    const criadas = await this.prisma.$transaction(
      itens.map((item) =>
        this.prisma.alocacao.create({
          data: {
            vagaId: item.vagaId,
            funcionarioId: item.funcionarioId,
            responsavelId: item.responsavelFornecimentoId,
            tipoTrabalho: item.tipoTrabalho,
            status: StatusAlocacao.ATIVA,
            confirmacao: { create: { status: StatusConfirmacao.PENDENTE } },
          },
          include: INCLUDE,
        }),
      ),
    );
    return criadas.map((a) => this.mapear(a));
  }

  /**
   * Nunca apaga a linha: `alocacoes.status -> CANCELADA` +
   * `confirmacoes.status -> CANCELOU` (com motivo/quem confirmou/quando),
   * dentro de uma transação. Libera a vaga mas mantém o histórico.
   */
  async cancelar(
    id: string,
    motivo: string,
    usuarioEmail?: string,
  ): Promise<void> {
    const usuario = usuarioEmail
      ? await this.prisma.usuario.findUnique({ where: { email: usuarioEmail } })
      : null;

    await this.prisma.$transaction([
      this.prisma.alocacao.update({
        where: { id },
        data: { status: StatusAlocacao.CANCELADA },
      }),
      this.prisma.confirmacao.update({
        where: { alocacaoId: id },
        data: {
          status: StatusConfirmacao.CANCELOU,
          observacao: motivo,
          confirmadoPor: usuario?.id,
          confirmadoEm: new Date(),
        },
      }),
    ]);
  }

  private mapear(a: AlocacaoComRelacoes): Alocacao {
    const vagaTipo = a.vaga.tipos.find((t) => t.tipoTrabalho === a.tipoTrabalho);
    return {
      id: a.id,
      vagaId: a.vagaId,
      vagaTipoId: vagaTipo?.id ?? '',
      funcionarioId: a.funcionarioId,
      responsavelFornecimentoId: a.responsavelId,
      responsavelSedeId: a.vaga.sede.responsavelId ?? '',
      tipoTrabalho: a.tipoTrabalho,
      data: a.vaga.data.toISOString().slice(0, 10),
      status: a.status,
    };
  }
}
