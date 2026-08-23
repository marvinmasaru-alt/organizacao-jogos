import { Injectable } from '@nestjs/common';
import { Prisma, StatusAlocacao, StatusConfirmacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Alocacao } from './alocacao.entity';

const INCLUDE = {
  vaga: { include: { sede: true, tipos: { include: { tipoTrabalho: true } } } },
  tipoTrabalho: true,
} satisfies Prisma.AlocacaoInclude;

type AlocacaoComRelacoes = Prisma.AlocacaoGetPayload<{ include: typeof INCLUDE }>;

/**
 * Dados mínimos pra criar uma alocação nova — sem valores/comissão (fora
 * de escopo desta migração, ver plano) e sem `id`/`status` (gerados aqui:
 * sempre ATIVA, com uma `confirmacao` PENDENTE criada junto).
 * `vagaId`/`tipoTrabalhoId` são os campos REAIS da tabela `alocacoes` —
 * quem resolve o `vagaTipoId` da API pra esse par é o AlocarService.
 */
export interface NovaAlocacaoInput {
  vagaId: string;
  tipoTrabalhoId: string;
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
   * seja FALTOU nem SUBSTITUICAO_NECESSARIA — as duas são a mesma situação
   * (a pessoa não compareceu), só que a segunda é a variante marcada como
   * urgente; ambas liberam a posição, mesmo sem cancelar a alocação em si
   * (a falta cancela o pagamento, não a vaga preenchida).
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
        tipoTrabalhoId: vagaTipo.tipoTrabalhoId,
        status: StatusAlocacao.ATIVA,
        NOT: {
          confirmacao: {
            status: { in: [StatusConfirmacao.FALTOU, StatusConfirmacao.SUBSTITUICAO_NECESSARIA] },
          },
        },
      },
      include: INCLUDE,
    });
    return linhas.map((a) => this.mapear(a));
  }

  /** Mesma regra de "ocupa a vaga" que listarValidasPorVagaTipo, mas só a contagem — usado por VagasService. */
  async contarValidasPorVagaRealETipo(
    vagaRealId: string,
    tipoTrabalhoId: string,
  ): Promise<number> {
    return this.prisma.alocacao.count({
      where: {
        vagaId: vagaRealId,
        tipoTrabalhoId,
        status: StatusAlocacao.ATIVA,
        NOT: {
          confirmacao: {
            status: { in: [StatusConfirmacao.FALTOU, StatusConfirmacao.SUBSTITUICAO_NECESSARIA] },
          },
        },
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

  /**
   * Alocações do dia com confirmação SUBSTITUICAO_NECESSARIA ainda em
   * aberto — consumido pelo Dashboard. `status: ATIVA` porque essa
   * urgência só existe pra quem faltou (a alocação continua ATIVA — o
   * funcionário estava alocado, só não compareceu); cancelamento nunca
   * gera esse alerta.
   *
   * "Em aberto" abate, por vaga_tipo, uma urgência pra cada SUBSTITUIU já
   * registrado no mesmo vaga_tipo — quem cobriu a vaga resolve o alerta
   * (nunca deixa a contagem passar de zero), sem precisar sobrescrever o
   * registro original da falta (ver princípio geral de histórico).
   */
  async listarFaltasUrgentesPorData(data: string): Promise<Alocacao[]> {
    const dataRef = new Date(data);
    const [urgentesRaw, resolvidasRaw] = await Promise.all([
      this.prisma.alocacao.findMany({
        where: {
          status: StatusAlocacao.ATIVA,
          vaga: { data: dataRef },
          confirmacao: { status: StatusConfirmacao.SUBSTITUICAO_NECESSARIA },
        },
        include: INCLUDE,
      }),
      this.prisma.alocacao.findMany({
        where: {
          status: StatusAlocacao.ATIVA,
          vaga: { data: dataRef },
          confirmacao: { status: StatusConfirmacao.SUBSTITUIU },
        },
        include: INCLUDE,
      }),
    ]);

    const urgentes = urgentesRaw.map((a) => this.mapear(a));
    const resolvidas = resolvidasRaw.map((a) => this.mapear(a));

    const resolvidasPorVagaTipo = new Map<string, number>();
    for (const r of resolvidas) {
      resolvidasPorVagaTipo.set(
        r.vagaTipoId,
        (resolvidasPorVagaTipo.get(r.vagaTipoId) ?? 0) + 1,
      );
    }

    const abatidasPorVagaTipo = new Map<string, number>();
    const linhas = urgentes.filter((u) => {
      const jaAbatidas = abatidasPorVagaTipo.get(u.vagaTipoId) ?? 0;
      const disponivelParaAbater = resolvidasPorVagaTipo.get(u.vagaTipoId) ?? 0;
      if (jaAbatidas < disponivelParaAbater) {
        abatidasPorVagaTipo.set(u.vagaTipoId, jaAbatidas + 1);
        return false; // urgência já coberta por um substituto
      }
      return true;
    });
    return linhas;
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
            tipoTrabalhoId: item.tipoTrabalhoId,
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
   *
   * Cancelamento nunca é "urgente" — esse alerta (SUBSTITUICAO_NECESSARIA)
   * é exclusivo de quem faltou (ver FaltasService.registrar); cancelar já
   * libera a vaga normalmente, aparecendo como pendência comum no board.
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
    const vagaTipo = a.vaga.tipos.find((t) => t.tipoTrabalhoId === a.tipoTrabalhoId);
    return {
      id: a.id,
      vagaId: a.vagaId,
      vagaTipoId: vagaTipo?.id ?? '',
      funcionarioId: a.funcionarioId,
      responsavelFornecimentoId: a.responsavelId,
      responsavelSedeId: a.vaga.sede.responsavelId ?? '',
      tipoTrabalhoId: a.tipoTrabalhoId,
      tipoTrabalhoNome: a.tipoTrabalho.nome,
      data: a.vaga.data.toISOString().slice(0, 10),
      status: a.status,
    };
  }
}
