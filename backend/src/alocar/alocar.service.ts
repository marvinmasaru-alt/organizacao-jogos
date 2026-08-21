import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlocacoesService,
  NovaAlocacaoInput,
} from '../alocacoes/alocacoes.service';
import { Alocacao } from '../alocacoes/alocacao.entity';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PerfilUsuario, StatusAlocacao, StatusFuncionario } from '../common/types/enums';
import { ItemAlocacaoDto } from '../alocacoes/dto/criar-alocacao.dto';
import { FuncionariosService } from '../funcionarios/funcionarios.service';
import { SedesService } from '../sedes/sedes.service';
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
 * Lote é tudo ou nada: todo item é revalidado com dados frescos da
 * planilha antes de qualquer escrita; se um item falhar, nada é gravado
 * (AlocacoesService.gravarEmLote só é chamado depois que todo o lote passa).
 */
@Injectable()
export class AlocarService {
  constructor(
    private readonly alocacoesService: AlocacoesService,
    private readonly vagasService: VagasService,
    private readonly funcionariosService: FuncionariosService,
    private readonly sedesService: SedesService,
  ) {}

  async criarEmLote(
    itens: ItemAlocacaoDto[],
    usuario: UsuarioAutenticado,
  ): Promise<Alocacao[]> {
    if (usuario.perfil !== PerfilUsuario.RESPONSAVEL || !usuario.responsavelId) {
      throw new ForbiddenException(
        'Apenas um responsável autenticado pode criar alocações.',
      );
    }

    const vagasMap = await this.carregarVagas(itens);
    this.validarCapacidadePorVaga(itens, await this.calcularDisponibilidade(vagasMap));

    const todasAlocacoes = await this.alocacoesService.listarTodas();
    const sedesResponsavelMap = await this.carregarResponsaveisDasSedes(
      vagasMap,
    );

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
      if (funcionario.responsavelCadastroId !== usuario.responsavelId) {
        throw new ForbiddenException(
          `Você não tem permissão para usar o funcionário ${funcionario.nome}.`,
        );
      }
      if (funcionario.status !== StatusFuncionario.ATIVO) {
        throw new BadRequestException(
          `Funcionário ${funcionario.nome} não está ativo.`,
        );
      }

      const conflitoOutraVaga = todasAlocacoes.some(
        (a) =>
          a.funcionarioId === funcionario.id &&
          a.data === vaga.data &&
          a.status === StatusAlocacao.ALOCADO &&
          a.vagaId !== item.vagaId,
      );
      if (conflitoOutraVaga) {
        throw new ConflictException(
          `Este funcionário já está alocado para outra vaga nesta data.`,
        );
      }

      const jaAlocadoNestaVaga = todasAlocacoes.some(
        (a) =>
          a.funcionarioId === funcionario.id &&
          a.vagaId === item.vagaId &&
          a.status === StatusAlocacao.ALOCADO,
      );
      if (jaAlocadoNestaVaga) {
        throw new ConflictException(
          `Funcionário ${funcionario.nome} já está alocado nesta vaga.`,
        );
      }

      novasAlocacoes.push({
        vagaId: vaga.id,
        funcionarioId: funcionario.id,
        responsavelSedeId: sedesResponsavelMap.get(vaga.sedeId) ?? '',
        responsavelFornecimentoId: usuario.responsavelId,
        data: vaga.data,
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

  private async carregarResponsaveisDasSedes(
    vagasMap: Map<string, Vaga>,
  ): Promise<Map<string, string>> {
    const sedeIds = [...new Set([...vagasMap.values()].map((v) => v.sedeId))];
    const sedeResponsavelMap = new Map<string, string>();
    for (const sedeId of sedeIds) {
      const sede = await this.sedesService.buscarPorId(sedeId);
      if (!sede) {
        throw new NotFoundException(`Sede ${sedeId} não encontrada.`);
      }
      sedeResponsavelMap.set(sedeId, sede.responsavelId);
    }
    return sedeResponsavelMap;
  }
}
