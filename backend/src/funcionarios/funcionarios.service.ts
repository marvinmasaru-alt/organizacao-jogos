import { Injectable } from '@nestjs/common';
import {
  StatusAlocacao,
  StatusConfirmacao,
  StatusFuncionario,
} from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerfilUsuario } from '../common/types/enums';
import {
  Funcionario,
  FuncionarioAlocadoNaVaga,
  FuncionarioParaAlocacao,
  SituacaoParaAlocacao,
} from './funcionario.entity';

@Injectable()
export class FuncionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alocacoesService: AlocacoesService,
  ) {}

  async listarTodos(): Promise<Funcionario[]> {
    return this.prisma.funcionario.findMany({ orderBy: { nome: 'asc' } });
  }

  async buscarPorId(id: string): Promise<Funcionario | null> {
    return this.prisma.funcionario.findUnique({ where: { id } });
  }

  /**
   * Funcionários disponíveis para alocação por um responsável específico.
   * Regra crítica (CLAUDE.md): só aparecem funcionários APROVADOS e
   * cadastrados por esse mesmo responsável — mesmo que outro funcionário
   * esteja livre, outro responsável não pode selecioná-lo.
   */
  async listarDisponiveisParaResponsavel(
    responsavelId: string,
  ): Promise<Funcionario[]> {
    return this.prisma.funcionario.findMany({
      where: { responsavelId, status: StatusFuncionario.APROVADO },
      orderBy: { nome: 'asc' },
    });
  }

  /**
   * Funcionários do responsável, com a situação de cada um em relação a
   * uma vaga/data específica (docs/features/alocacao.md, seções 6/11/12).
   * Conflito é sempre por dia — `ATIVA` em outra vaga na MESMA data.
   * `vagaId` recebido aqui é o `vaga_tipos.id` (identidade usada em toda a
   * API — ver vaga.entity.ts).
   */
  async listarParaAlocacao(
    responsavelId: string,
    vagaId: string,
    data: string,
  ): Promise<FuncionarioParaAlocacao[]> {
    const permitidos =
      await this.listarDisponiveisParaResponsavel(responsavelId);

    return Promise.all(
      permitidos.map(async (f) => {
        const alocacoesDoFuncionario =
          await this.alocacoesService.listarAtivasPorFuncionarioEData(
            f.id,
            data,
          );
        const nestaVaga = alocacoesDoFuncionario.find(
          (a) => a.vagaTipoId === vagaId,
        );

        // Falta/cancelamento não fazem mais a alocação ficar CANCELADA aqui
        // (a alocação "ativa" continua ATIVA mesmo com falta — só a
        // confirmação muda) então buscamos a confirmação junto pra saber
        // se foi cancelada/faltou nesta vaga especificamente.
        const confirmacaoNestaVaga = nestaVaga
          ? await this.prisma.confirmacao.findUnique({
              where: { alocacaoId: nestaVaga.id },
            })
          : null;

        let situacao = SituacaoParaAlocacao.DISPONIVEL;
        if (nestaVaga) {
          if (confirmacaoNestaVaga?.status === StatusConfirmacao.FALTOU) {
            situacao = SituacaoParaAlocacao.FALTOU_NESTA_VAGA;
          } else {
            situacao = SituacaoParaAlocacao.JA_ALOCADO_NESTA_VAGA;
          }
        } else {
          const canceladaNestaVaga = await this.prisma.alocacao.findFirst({
            where: {
              funcionarioId: f.id,
              status: StatusAlocacao.CANCELADA,
              vaga: { data: new Date(data) },
              confirmacao: { status: StatusConfirmacao.CANCELOU },
            },
            include: { vaga: { include: { tipos: true } } },
          });
          const canceladaEhDestaVaga = canceladaNestaVaga?.vaga.tipos.some(
            (t) => t.id === vagaId && t.tipoTrabalho === canceladaNestaVaga.tipoTrabalho,
          );
          if (canceladaNestaVaga && canceladaEhDestaVaga) {
            situacao = SituacaoParaAlocacao.CANCELOU_NESTA_VAGA;
          } else if (
            alocacoesDoFuncionario.some((a) => a.vagaTipoId !== vagaId)
          ) {
            situacao = SituacaoParaAlocacao.ALOCADO_OUTRA_VAGA;
          }
        }

        return {
          ...f,
          situacao,
          selecionavel: situacao === SituacaoParaAlocacao.DISPONIVEL,
        };
      }),
    );
  }

  /**
   * Funcionários alocados (ATIVA) numa vaga, pra seção recolhível "Ver
   * funcionários alocados" da tela de Alocação. Mostra o nome real quando
   * o usuário logado é Administrador, OU o responsável que cadastrou
   * aquele funcionário, OU o responsável pela SEDE daquela alocação
   * (derivado via `vagas.sede_id -> sedes.responsavel_id`) — quem
   * administra a sede precisa saber quem está trabalhando nela, mesmo
   * quando outro responsável forneceu o funcionário. Qualquer outro caso
   * mascara o nome.
   */
  async listarAlocadosParaVaga(
    vagaId: string,
    usuario: UsuarioAutenticado,
  ): Promise<FuncionarioAlocadoNaVaga[]> {
    const alocacoesValidas =
      await this.alocacoesService.listarValidasPorVagaTipo(vagaId);
    const funcionarios = await this.prisma.funcionario.findMany({
      where: { id: { in: alocacoesValidas.map((a) => a.funcionarioId) } },
    });
    const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));

    return alocacoesValidas.map((a) => {
      const funcionario = funcionarioPorId.get(a.funcionarioId);
      const ehDono = funcionario?.responsavelId === usuario.responsavelId;
      const pertenceAoResponsavel =
        usuario.perfil === PerfilUsuario.ADMINISTRADOR ||
        ehDono ||
        a.responsavelSedeId === usuario.responsavelId;

      // Só marca "externo" quando o nome está VISÍVEL mas não é dono do
      // cadastro — está vendo só porque é responsável pela sede.
      const externo =
        pertenceAoResponsavel &&
        usuario.perfil !== PerfilUsuario.ADMINISTRADOR &&
        !ehDono;

      return {
        alocacaoId: a.id,
        funcionarioId: a.funcionarioId,
        nome: pertenceAoResponsavel ? (funcionario?.nome ?? a.funcionarioId) : null,
        telefone: pertenceAoResponsavel ? (funcionario?.telefone ?? null) : null,
        externo,
      };
    });
  }

  /** Só o administrador aprova. Validação de perfil fica no controller/guard. */
  async aprovar(id: string): Promise<void> {
    await this.prisma.funcionario.update({
      where: { id },
      data: { status: StatusFuncionario.APROVADO },
    });
  }
}
