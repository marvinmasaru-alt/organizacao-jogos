import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusVaga } from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarVagaEsporadicaDto } from './dto/criar-vaga-esporadica.dto';
import { Vaga, VagaComDisponibilidade } from './vaga.entity';

const INCLUDE = { vaga: true, tipoTrabalho: true } satisfies Prisma.VagaTipoInclude;
type VagaTipoComVaga = Prisma.VagaTipoGetPayload<{ include: typeof INCLUDE }>;

/** ISO: 1 (segunda) a 7 (domingo) — `Date.getUTCDay()` usa 0 (domingo) a 6 (sábado). */
function diaSemanaIso(data: Date): number {
  const dia = data.getUTCDay();
  return dia === 0 ? 7 : dia;
}

@Injectable()
export class VagasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alocacoesService: AlocacoesService,
  ) {}

  async listarTodas(): Promise<Vaga[]> {
    const tipos = await this.prisma.vagaTipo.findMany({ include: INCLUDE });
    return tipos.map((t) => this.mapear(t));
  }

  async listarPorData(data: string): Promise<Vaga[]> {
    await this.garantirVagasFixasParaData(data);
    const tipos = await this.prisma.vagaTipo.findMany({
      where: { vaga: { data: new Date(data) } },
      include: INCLUDE,
    });
    return tipos.map((t) => this.mapear(t));
  }

  /** `id` aqui é sempre o `vaga_tipos.id` — ver comentário em vaga.entity.ts. */
  async buscarPorId(id: string): Promise<Vaga | null> {
    const tipo = await this.prisma.vagaTipo.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return tipo ? this.mapear(tipo) : null;
  }

  /**
   * Calcula disponibilidade real de cada vaga (quantidade - alocações que
   * ocupam a vaga, ver AlocacoesService), nunca negativo. Consumido pelo
   * DashboardModule. Uma vaga `CANCELADA` nunca é recalculada como
   * ABERTA/COMPLETA — cancelamento é definitivo (docs/features/cadastro-vagas.md,
   * seção 14).
   */
  async calcularDisponibilidade(
    vagas: Vaga[],
  ): Promise<VagaComDisponibilidade[]> {
    return Promise.all(
      vagas.map(async (v) => {
        const alocacoesValidas =
          await this.alocacoesService.contarValidasPorVagaRealETipo(
            v.vagaRealId,
            v.tipoId,
          );
        const disponiveis = Math.max(0, v.quantidade - alocacoesValidas);
        const status =
          v.status === StatusVaga.CANCELADA
            ? StatusVaga.CANCELADA
            : disponiveis === 0
              ? StatusVaga.COMPLETA
              : StatusVaga.ABERTA;
        return { ...v, alocacoesValidas, disponiveis, status };
      }),
    );
  }

  /**
   * Cria uma vaga ESPORADICA (docs/features/cadastro-vagas.md, seção 19) —
   * `modeloVagaId: null`, então `origem` sai como ESPORADICA (ver
   * mapear()). Nunca mexe em nenhuma configuração fixa (Regra 2 da doc).
   */
  async criarEsporadica(dto: CriarVagaEsporadicaDto): Promise<Vaga[]> {
    const sede = await this.prisma.sede.findUnique({
      where: { id: dto.sedeId },
    });
    if (!sede) {
      throw new NotFoundException(`Sede ${dto.sedeId} não encontrada.`);
    }
    if (!sede.ativo) {
      throw new BadRequestException('Sede não está ativa.');
    }
    await this.validarTiposAtivos(dto.tipos.map((t) => t.tipoTrabalhoId));

    const vaga = await this.prisma.vaga.create({
      data: {
        sedeId: dto.sedeId,
        modeloVagaId: null,
        data: new Date(dto.data),
        status: StatusVaga.ABERTA,
        observacao: dto.observacao ?? null,
        tipos: {
          createMany: {
            data: dto.tipos.map((t) => ({
              tipoTrabalhoId: t.tipoTrabalhoId,
              quantidade: t.quantidade,
            })),
          },
        },
      },
      include: { tipos: { include: { tipoTrabalho: true } } },
    });

    return vaga.tipos.map((t) => this.mapear({ ...t, vaga }));
  }

  /**
   * `id` é o `vaga_tipos.id` (mesma convenção do resto da API) — resolve
   * pra `vagas.id` real e cancela a vaga inteira (todos os tipos dela),
   * nunca apaga a linha (Regra 5 da doc).
   */
  async cancelar(id: string): Promise<void> {
    const vagaTipo = await this.prisma.vagaTipo.findUnique({
      where: { id },
    });
    if (!vagaTipo) {
      throw new NotFoundException(`Vaga ${id} não encontrada.`);
    }
    await this.prisma.vaga.update({
      where: { id: vagaTipo.vagaId },
      data: { status: StatusVaga.CANCELADA },
    });
  }

  /** Toda vaga esporádica nova só pode usar tipos de trabalho existentes e ativos (TiposTrabalhoModule). */
  private async validarTiposAtivos(tipoTrabalhoIds: string[]): Promise<void> {
    const ids = [...new Set(tipoTrabalhoIds)];
    const tipos = await this.prisma.tipoTrabalho.findMany({
      where: { id: { in: ids } },
    });
    const encontrados = new Map(tipos.map((t) => [t.id, t]));
    for (const id of ids) {
      const tipo = encontrados.get(id);
      if (!tipo) {
        throw new NotFoundException(`Tipo de trabalho ${id} não encontrado.`);
      }
      if (!tipo.ativo) {
        throw new BadRequestException(`Tipo de trabalho "${tipo.nome}" está inativo.`);
      }
    }
  }

  /**
   * Garante que toda configuração fixa ativa/vigente, com operação no dia
   * da semana de `data`, já tenha uma `Vaga`+`VagaTipo` geradas —
   * idempotente (relê antes de criar), chamada sob demanda a cada consulta
   * por data (sem cron — docs/features/cadastro-vagas.md, seção 10).
   */
  private async garantirVagasFixasParaData(data: string): Promise<void> {
    const dataRef = new Date(data);
    const diaSemana = diaSemanaIso(dataRef);

    const modelos = await this.prisma.modeloVaga.findMany({
      where: {
        ativo: true,
        sede: { ativo: true },
        dias: { some: { diaSemana } },
        AND: [
          { OR: [{ dataInicio: null }, { dataInicio: { lte: dataRef } }] },
          { OR: [{ dataFim: null }, { dataFim: { gte: dataRef } }] },
        ],
      },
      include: { tipos: true },
    });

    for (const modelo of modelos) {
      const jaExiste = await this.prisma.vaga.findFirst({
        where: { sedeId: modelo.sedeId, data: dataRef, modeloVagaId: modelo.id },
        select: { id: true },
      });
      if (jaExiste) {
        continue;
      }

      await this.prisma.vaga.create({
        data: {
          sedeId: modelo.sedeId,
          modeloVagaId: modelo.id,
          data: dataRef,
          status: StatusVaga.ABERTA,
          tipos: {
            createMany: {
              data: modelo.tipos.map((t) => ({
                tipoTrabalhoId: t.tipoTrabalhoId,
                quantidade: t.quantidade,
              })),
            },
          },
        },
      });
    }
  }

  private mapear(t: VagaTipoComVaga): Vaga {
    return {
      id: t.id,
      vagaRealId: t.vagaId,
      data: t.vaga.data.toISOString().slice(0, 10),
      sedeId: t.vaga.sedeId,
      tipoId: t.tipoTrabalhoId,
      tipo: t.tipoTrabalho.nome,
      quantidade: t.quantidade,
      status: t.vaga.status,
      origem: t.vaga.modeloVagaId ? 'FIXA' : 'ESPORADICA',
    };
  }
}
