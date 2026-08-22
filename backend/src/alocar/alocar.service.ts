import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusFuncionario, StatusVaga } from '@prisma/client';
import {
  AlocacoesService,
  NovaAlocacaoInput,
} from '../alocacoes/alocacoes.service';
import { Alocacao } from '../alocacoes/alocacao.entity';
import { UsuarioAutenticado } from '../auth/auth.service';
import { ItemAlocacaoDto } from '../alocacoes/dto/criar-alocacao.dto';
import { FuncionariosService } from '../funcionarios/funcionarios.service';
import { Vaga } from '../vagas/vaga.entity';
import { VagasService } from '../vagas/vagas.service';

/**
 * Orquestra a criação de alocações em lote (docs/features/alocacao.md).
 * Vive num módulo à parte de AlocacoesModule porque precisa ler
 * Vagas/Funcionários/Sedes — importar esses módulos dentro de
 * AlocacoesModule criaria dependência circular, já que VagasModule e
 * FuncionariosModule importam AlocacoesModule pra usar AlocacoesService
 * (mesmo padrão que DashboardModule já usa pra compor os três).
 *
 * Lote é tudo ou nada: todo item é revalidado com dados frescos do banco
 * antes de qualquer escrita; se um item falhar, nada é gravado
 * (AlocacoesService.gravarEmLote só é chamado depois que todo o lote passa,
 * e grava tudo numa única transação Prisma).
 *
 * `item.vagaId` (do DTO) é sempre o `vaga_tipos.id` — a identidade que o
 * resto da API usa pra "vaga" (ver vaga.entity.ts). Aqui é resolvido pro
 * par real `(vagas.id, tipoTrabalho)` antes de gravar em `alocacoes`.
 */
@Injectable()
export class AlocarService {
  constructor(
    private readonly alocacoesService: AlocacoesService,
    private readonly vagasService: VagasService,
    private readonly funcionariosService: FuncionariosService,
  ) {}

  async criarEmLote(
    itens: ItemAlocacaoDto[],
    usuario: UsuarioAutenticado,
  ): Promise<Alocacao[]> {
    // `responsavelId` é quem importa aqui, não o perfil — um Administrador
    // que também é um dos responsáveis (ex.: Paulo) tem `responsavelId`
    // preenchido (ver AuthService) e aloca em nome desse responsável,
    // igual qualquer RESPONSAVEL. Sem `responsavelId`, ninguém aloca.
    if (!usuario.responsavelId) {
      throw new ForbiddenException(
        'Apenas um usuário vinculado a um responsável pode criar alocações.',
      );
    }

    const vagasMap = await this.carregarVagas(itens);
    this.validarVagasNaoCanceladas(vagasMap);
    this.validarCapacidadePorVaga(itens, await this.calcularDisponibilidade(vagasMap));

    const funcionariosUsados = new Set<string>();
    const novasAlocacoes: NovaAlocacaoInput[] = [];

    for (const item of itens) {
      if (funcionariosUsados.has(item.funcionarioId)) {
        throw new BadRequestException(
          `Funcionário ${item.funcionarioId} está duplicado no lote.`,
        );
      }
      funcionariosUsados.add(item.funcionarioId);

      const vaga = vagasMap.get(item.vagaId)!;

      const funcionario = await this.funcionariosService.buscarPorId(
        item.funcionarioId,
      );
      if (!funcionario) {
        throw new NotFoundException(
          `Funcionário ${item.funcionarioId} não encontrado.`,
        );
      }
      if (funcionario.responsavelId !== usuario.responsavelId) {
        throw new ForbiddenException(
          `Você não tem permissão para usar o funcionário ${funcionario.nome}.`,
        );
      }
      if (funcionario.status !== StatusFuncionario.APROVADO) {
        throw new BadRequestException(
          `Funcionário ${funcionario.nome} não está aprovado.`,
        );
      }

      const alocacoesDoDia =
        await this.alocacoesService.listarAtivasPorFuncionarioEData(
          funcionario.id,
          vaga.data,
        );

      const conflitoOutraVaga = alocacoesDoDia.some(
        (a) => a.vagaTipoId !== item.vagaId,
      );
      if (conflitoOutraVaga) {
        throw new ConflictException(
          `Este funcionário já está alocado para outra vaga nesta data.`,
        );
      }

      const jaAlocadoNestaVaga = alocacoesDoDia.some(
        (a) => a.vagaTipoId === item.vagaId,
      );
      if (jaAlocadoNestaVaga) {
        throw new ConflictException(
          `Funcionário ${funcionario.nome} já está alocado nesta vaga.`,
        );
      }

      novasAlocacoes.push({
        vagaId: vaga.vagaRealId,
        tipoTrabalho: vaga.tipo,
        funcionarioId: funcionario.id,
        responsavelFornecimentoId: usuario.responsavelId,
      });
    }

    return this.alocacoesService.gravarEmLote(novasAlocacoes);
  }

  private async carregarVagas(
    itens: ItemAlocacaoDto[],
  ): Promise<Map<string, Vaga>> {
    const vagaIds = [...new Set(itens.map((i) => i.vagaId))];
    const vagasMap = new Map<string, Vaga>();
    for (const vagaId of vagaIds) {
      const vaga = await this.vagasService.buscarPorId(vagaId);
      if (!vaga) {
        throw new NotFoundException(`Vaga ${vagaId} não encontrada.`);
      }
      vagasMap.set(vagaId, vaga);
    }
    return vagasMap;
  }

  private async calcularDisponibilidade(
    vagasMap: Map<string, Vaga>,
  ): Promise<Map<string, number>> {
    const vagasComDisponibilidade = await this.vagasService.calcularDisponibilidade(
      [...vagasMap.values()],
    );
    return new Map(
      vagasComDisponibilidade.map((v) => [v.id, v.disponiveis]),
    );
  }

  /** Vaga CANCELADA nunca aceita nova alocação (docs/features/cadastro-vagas.md, Regra 6/seção 14). */
  private validarVagasNaoCanceladas(vagasMap: Map<string, Vaga>): void {
    for (const vaga of vagasMap.values()) {
      if (vaga.status === StatusVaga.CANCELADA) {
        throw new BadRequestException(
          `Esta vaga foi cancelada e não aceita novas alocações.`,
        );
      }
    }
  }

  /** Nunca pode ultrapassar `faltam` de uma vaga — nem somando os itens do próprio lote. */
  private validarCapacidadePorVaga(
    itens: ItemAlocacaoDto[],
    disponibilidadeMap: Map<string, number>,
  ): void {
    const contagemPorVaga = new Map<string, number>();
    for (const item of itens) {
      contagemPorVaga.set(
        item.vagaId,
        (contagemPorVaga.get(item.vagaId) ?? 0) + 1,
      );
    }
    for (const [vagaId, contagem] of contagemPorVaga) {
      const disponiveis = disponibilidadeMap.get(vagaId) ?? 0;
      if (contagem > disponiveis) {
        throw new BadRequestException(
          `Esta vaga já está completa ou não tem espaço suficiente: ` +
            `${disponiveis} vaga(s) disponível(is), lote tentando alocar ${contagem}.`,
        );
      }
    }
  }
}
