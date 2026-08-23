import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoModeloVaga } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracaoVaga } from './configuracao-vaga.entity';
import { CriarConfiguracaoVagaDto } from './dto/criar-configuracao-vaga.dto';

const INCLUDE = {
  tipos: { include: { tipoTrabalho: true } },
  dias: true,
} satisfies Prisma.ModeloVagaInclude;
type ModeloVagaComRelacoes = Prisma.ModeloVagaGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class ConfiguracoesVagasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarTodas(): Promise<ConfiguracaoVaga[]> {
    const modelos = await this.prisma.modeloVaga.findMany({
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return modelos.map((m) => this.mapear(m));
  }

  async listarPorSede(sedeId: string): Promise<ConfiguracaoVaga[]> {
    const modelos = await this.prisma.modeloVaga.findMany({
      where: { sedeId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return modelos.map((m) => this.mapear(m));
  }

  /**
   * Cria uma configuração de vaga fixa (Regra 1 da doc: configuração ≠
   * vaga do dia — só grava o padrão, nenhuma `Vaga` é criada aqui).
   */
  async criar(dto: CriarConfiguracaoVagaDto): Promise<ConfiguracaoVaga> {
    const sede = await this.prisma.sede.findUnique({
      where: { id: dto.sedeId },
    });
    if (!sede) {
      throw new NotFoundException(`Sede ${dto.sedeId} não encontrada.`);
    }
    if (!sede.ativo) {
      throw new BadRequestException('Sede não está ativa.');
    }

    if (dto.dataInicio && dto.dataFim && dto.dataFim < dto.dataInicio) {
      throw new BadRequestException('dataFim não pode ser anterior a dataInicio.');
    }

    await this.validarTiposAtivos(dto.tipos.map((t) => t.tipoTrabalhoId));

    const diasUnicos = [...new Set(dto.diasSemana)];

    const criado = await this.prisma.modeloVaga.create({
      data: {
        sedeId: dto.sedeId,
        nome: dto.nome,
        tipo: TipoModeloVaga.FIXA,
        ativo: true,
        observacao: dto.observacao ?? null,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
        tipos: {
          createMany: {
            data: dto.tipos.map((t) => ({
              tipoTrabalhoId: t.tipoTrabalhoId,
              quantidade: t.quantidade,
            })),
          },
        },
        dias: {
          createMany: { data: diasUnicos.map((diaSemana) => ({ diaSemana })) },
        },
      },
      include: INCLUDE,
    });

    return this.mapear(criado);
  }

  /** Nunca deleta (Regra 4 da doc): configuração usada vira INATIVA, não some. */
  async inativar(id: string): Promise<void> {
    const modelo = await this.prisma.modeloVaga.findUnique({ where: { id } });
    if (!modelo) {
      throw new NotFoundException(`Configuração ${id} não encontrada.`);
    }
    await this.prisma.modeloVaga.update({
      where: { id },
      data: { ativo: false },
    });
  }

  private mapear(m: ModeloVagaComRelacoes): ConfiguracaoVaga {
    return {
      id: m.id,
      sedeId: m.sedeId,
      nome: m.nome,
      ativo: m.ativo,
      observacao: m.observacao,
      dataInicio: m.dataInicio ? m.dataInicio.toISOString().slice(0, 10) : null,
      dataFim: m.dataFim ? m.dataFim.toISOString().slice(0, 10) : null,
      tipos: m.tipos.map((t) => ({
        tipoTrabalhoId: t.tipoTrabalhoId,
        tipoTrabalhoNome: t.tipoTrabalho.nome,
        quantidade: t.quantidade,
      })),
      diasSemana: m.dias.map((d) => d.diaSemana).sort((a, b) => a - b),
    };
  }

  /** Toda configuração de vaga fixa nova só pode usar tipos de trabalho existentes e ativos (TiposTrabalhoModule). */
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
}
