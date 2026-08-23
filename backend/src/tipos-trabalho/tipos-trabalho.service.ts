import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoTrabalho } from './tipo-trabalho.entity';
import { CriarTipoTrabalhoDto, EditarTipoTrabalhoDto } from './dto/criar-tipo-trabalho.dto';

/**
 * CRUD de tipos de trabalho (docs/SQL/create.sql, tabela `tipos_trabalho`)
 * — decisão revertida: deixou de ser um enum fixo MANPOWER/FORKLIFT pra
 * virar cadastro dinâmico, só editável por Administrador (mesmo padrão de
 * Sedes/Configurações de Vaga). Nunca apaga (princípio geral de
 * histórico) — só desativa/reativa.
 */
@Injectable()
export class TiposTrabalhoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Por padrão só os ativos (o que os formulários de cadastro usam); `incluirInativos` é pra tela de gestão. */
  async listarTodos(incluirInativos = false): Promise<TipoTrabalho[]> {
    return this.prisma.tipoTrabalho.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async criar(dto: CriarTipoTrabalhoDto): Promise<TipoTrabalho> {
    await this.validarNomeDisponivel(dto.nome);
    return this.prisma.tipoTrabalho.create({
      data: { nome: dto.nome },
    });
  }

  /** Renomeia um tipo existente — não mexe em `ativo` (ver ativar/desativar). */
  async editar(id: string, dto: EditarTipoTrabalhoDto): Promise<TipoTrabalho> {
    await this.buscarOuFalhar(id);
    await this.validarNomeDisponivel(dto.nome, id);
    return this.prisma.tipoTrabalho.update({
      where: { id },
      data: { nome: dto.nome },
    });
  }

  /** Tira o tipo dos formulários novos — vaga_tipos/alocacoes/tabela_valores/modelo_vaga_tipos que já usam continuam intactos. */
  async desativar(id: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.tipoTrabalho.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async ativar(id: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.tipoTrabalho.update({
      where: { id },
      data: { ativo: true },
    });
  }

  private async buscarOuFalhar(id: string): Promise<TipoTrabalho> {
    const tipo = await this.prisma.tipoTrabalho.findUnique({ where: { id } });
    if (!tipo) {
      throw new NotFoundException(`Tipo de trabalho ${id} não encontrado.`);
    }
    return tipo;
  }

  private async validarNomeDisponivel(nome: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.tipoTrabalho.findUnique({ where: { nome } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe um tipo de trabalho chamado "${nome}".`);
    }
  }
}
