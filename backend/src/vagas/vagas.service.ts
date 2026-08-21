import { Injectable } from '@nestjs/common';
import { Prisma, StatusVaga } from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { Vaga, VagaComDisponibilidade } from './vaga.entity';

const INCLUDE = { vaga: true } satisfies Prisma.VagaTipoInclude;
type VagaTipoComVaga = Prisma.VagaTipoGetPayload<{ include: typeof INCLUDE }>;

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
   * DashboardModule.
   */
  async calcularDisponibilidade(
    vagas: Vaga[],
  ): Promise<VagaComDisponibilidade[]> {
    return Promise.all(
      vagas.map(async (v) => {
        const alocacoesValidas =
          await this.alocacoesService.contarValidasPorVagaRealETipo(
            v.vagaRealId,
            v.tipo,
          );
        const disponiveis = Math.max(0, v.quantidade - alocacoesValidas);
        return {
          ...v,
          alocacoesValidas,
          disponiveis,
          status: disponiveis === 0 ? StatusVaga.COMPLETA : StatusVaga.ABERTA,
        };
      }),
    );
  }

  private mapear(t: VagaTipoComVaga): Vaga {
    return {
      id: t.id,
      vagaRealId: t.vagaId,
      data: t.vaga.data.toISOString().slice(0, 10),
      sedeId: t.vaga.sedeId,
      tipo: t.tipoTrabalho,
      quantidade: t.quantidade,
      status: t.vaga.status,
    };
  }
}
