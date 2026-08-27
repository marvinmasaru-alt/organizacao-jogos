import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoSede } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TabelaValor } from './tabela-valor.entity';
import { CriarTabelaValorDto, EditarTabelaValorDto } from './dto/criar-tabela-valor.dto';

const INCLUDE = { tipoTrabalho: true } satisfies Prisma.TabelaValorInclude;
type TabelaValorComTipo = Prisma.TabelaValorGetPayload<{ include: typeof INCLUDE }>;

/**
 * CRUD de valores de referência por tipo de trabalho + tipo de sede
 * (docs/features/pagamento.md, seções 4/6/7) — só Administrador (mesmo
 * padrão de TiposTrabalhoService). Nunca apaga (princípio geral de
 * histórico) — só desativa/reativa; `PagamentosService` usa
 * `valorVigente` pra resolver o valor no momento da confirmação.
 */
@Injectable()
export class TabelaValoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Por padrão só os ativos (o que os formulários novos usam); `incluirInativos` é pra tela de gestão. */
  async listarTodos(incluirInativos = false): Promise<TabelaValor[]> {
    const linhas = await this.prisma.tabelaValor.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      include: INCLUDE,
      orderBy: [{ tipoTrabalho: { nome: 'asc' } }, { tipoSede: 'asc' }],
    });
    return linhas.map((l) => this.mapear(l));
  }

  async criar(dto: CriarTabelaValorDto): Promise<TabelaValor> {
    await this.validarTipoTrabalhoAtivo(dto.tipoTrabalhoId);
    this.validarSalarioBase(dto.tipoSede, dto.salarioBase);
    const criado = await this.prisma.tabelaValor.create({
      data: {
        tipoTrabalhoId: dto.tipoTrabalhoId,
        tipoSede: dto.tipoSede,
        valor: dto.valor,
        salarioBase: dto.tipoSede === TipoSede.EXTERNA ? dto.salarioBase : null,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
      },
      include: INCLUDE,
    });
    return this.mapear(criado);
  }

  /** Não muda `tipoTrabalhoId` (o par tipo+sede é a identidade da linha) nem `ativo` — ver ativar/desativar. */
  async editar(id: string, dto: EditarTabelaValorDto): Promise<TabelaValor> {
    await this.buscarOuFalhar(id);
    this.validarSalarioBase(dto.tipoSede, dto.salarioBase);
    const atualizado = await this.prisma.tabelaValor.update({
      where: { id },
      data: {
        tipoSede: dto.tipoSede,
        valor: dto.valor,
        salarioBase: dto.tipoSede === TipoSede.EXTERNA ? dto.salarioBase : null,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
      },
      include: INCLUDE,
    });
    return this.mapear(atualizado);
  }

  async desativar(id: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.tabelaValor.update({ where: { id }, data: { ativo: false } });
  }

  async ativar(id: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.tabelaValor.update({ where: { id }, data: { ativo: true } });
  }

  /**
   * Valor vigente na data informada para (tipoTrabalhoId, tipoSede), ou
   * `null` se nenhum estiver ativo/vigente — usado por
   * `PagamentosService.criarObrigacoesParaAlocacao` no momento da
   * confirmação.
   */
  async valorVigente(
    tipoTrabalhoId: string,
    tipoSede: TipoSede,
    data: string,
  ): Promise<{ valor: number; salarioBase: number | null } | null> {
    const dataRef = new Date(data);
    // `dataInicio`/`dataFim` nulos = sem limite naquela ponta (mesma
    // convenção de ModeloVaga) — `{ lte: dataRef }` sozinho nunca casa com
    // uma coluna NULL, por isso cada ponta precisa do seu próprio OR.
    const linha = await this.prisma.tabelaValor.findFirst({
      where: {
        tipoTrabalhoId,
        tipoSede,
        ativo: true,
        AND: [
          { OR: [{ dataInicio: null }, { dataInicio: { lte: dataRef } }] },
          { OR: [{ dataFim: null }, { dataFim: { gte: dataRef } }] },
        ],
      },
      orderBy: { dataInicio: 'desc' },
    });
    if (!linha) return null;
    return {
      valor: Number(linha.valor),
      salarioBase: linha.salarioBase != null ? Number(linha.salarioBase) : null,
    };
  }

  private async buscarOuFalhar(id: string): Promise<TabelaValorComTipo> {
    const linha = await this.prisma.tabelaValor.findUnique({ where: { id }, include: INCLUDE });
    if (!linha) {
      throw new NotFoundException(`Tabela de valor ${id} não encontrada.`);
    }
    return linha;
  }

  private async validarTipoTrabalhoAtivo(tipoTrabalhoId: string): Promise<void> {
    const tipo = await this.prisma.tipoTrabalho.findUnique({ where: { id: tipoTrabalhoId } });
    if (!tipo) {
      throw new NotFoundException(`Tipo de trabalho ${tipoTrabalhoId} não encontrado.`);
    }
    if (!tipo.ativo) {
      throw new BadRequestException(`Tipo de trabalho "${tipo.nome}" está inativo.`);
    }
  }

  /** EXTERNA exige salário-base (valor-base do funcionário); HUB não usa (pagamento livre). */
  private validarSalarioBase(tipoSede: TipoSede, salarioBase: number | undefined): void {
    if (tipoSede === TipoSede.EXTERNA && (salarioBase == null || salarioBase <= 0)) {
      throw new BadRequestException(
        'Sede EXTERNA exige um salário-base (valor-base do funcionário) maior que zero.',
      );
    }
  }

  private mapear(l: TabelaValorComTipo): TabelaValor {
    return {
      id: l.id,
      tipoTrabalhoId: l.tipoTrabalhoId,
      tipoTrabalhoNome: l.tipoTrabalho.nome,
      tipoSede: l.tipoSede,
      valor: Number(l.valor),
      salarioBase: l.salarioBase != null ? Number(l.salarioBase) : null,
      dataInicio: l.dataInicio ? l.dataInicio.toISOString().slice(0, 10) : null,
      dataFim: l.dataFim ? l.dataFim.toISOString().slice(0, 10) : null,
      ativo: l.ativo,
    };
  }
}
