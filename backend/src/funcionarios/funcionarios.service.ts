import { BadRequestException, Injectable } from '@nestjs/common';
import {
  StatusAlocacao,
  StatusConfirmacao,
  StatusFuncionario,
} from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PerfilUsuario } from '../common/types/enums';
import { AtualizarFuncionarioDto } from './dto/atualizar-funcionario.dto';
import { CadastrarFuncionarioDto } from './dto/cadastrar-funcionario.dto';
import { CadastrarFuncionarioExternoDto } from './dto/cadastrar-funcionario-externo.dto';
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
   * Funcionários de um responsável para a tela de gestão "Funcionários"
   * (docs/features/Cadastro-funcionario.md) — SEM filtro de status, ao
   * contrário de `listarDisponiveisParaResponsavel`: aqui o responsável
   * precisa ver e poder editar também os PENDENTE/INATIVO/BLOQUEADO, não
   * só os já APROVADO.
   */
  async listarPorResponsavel(responsavelId: string): Promise<Funcionario[]> {
    return this.prisma.funcionario.findMany({
      where: { responsavelId },
      orderBy: { nome: 'asc' },
    });
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

    // Sede/dia já finalizado: ninguém é selecionável — nem chega a rodar a
    // checagem de situação individual (AlocarService também rejeita no
    // POST, isso aqui só evita montar um lote que vai falhar no fim).
    const vagaTipo = await this.prisma.vagaTipo.findUnique({
      where: { id: vagaId },
      include: { vaga: true },
    });
    if (vagaTipo) {
      const conferencia = await this.prisma.conferenciaDia.findUnique({
        where: {
          sedeId_data: { sedeId: vagaTipo.vaga.sedeId, data: vagaTipo.vaga.data },
        },
      });
      if (conferencia?.finalizadoEm != null) {
        return permitidos.map((f) => ({
          ...f,
          situacao: SituacaoParaAlocacao.CONFERENCIA_FINALIZADA,
          selecionavel: false,
        }));
      }
    }

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
          // SUBSTITUICAO_NECESSARIA é a mesma situação de FALTOU (a pessoa
          // não compareceu), só marcada como urgente — tratar igual aqui,
          // senão o funcionário aparece como "já alocado" numa vaga que na
          // real está livre pra receber um substituto.
          if (
            confirmacaoNestaVaga?.status === StatusConfirmacao.FALTOU ||
            confirmacaoNestaVaga?.status === StatusConfirmacao.SUBSTITUICAO_NECESSARIA
          ) {
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
            (t) => t.id === vagaId && t.tipoTrabalhoId === canceladaNestaVaga.tipoTrabalhoId,
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

  /**
   * Edição de cadastro na tela de Funcionários (docs/features/Cadastro-funcionario.md)
   * — inclui a mudança de status (pendente/aprovado/inativo/bloqueado).
   * Checagem de posse (só o responsável dono ou o Administrador pode
   * editar) é feita no controller, antes de chamar este método.
   */
  async atualizar(
    id: string,
    dto: AtualizarFuncionarioDto,
  ): Promise<Funcionario> {
    return this.prisma.funcionario.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Cadastro manual pela tela de Funcionários (docs/features/Cadastro-funcionario.md)
   * — feito pelo próprio Responsável logado. `responsavelId` já validado
   * pelo controller (vem da sessão, nunca do corpo). Sempre entra
   * `PENDENTE` (default do schema), pendente de aprovação do
   * Administrador, igual ao cadastro via Google Forms.
   */
  async criar(
    dto: CadastrarFuncionarioDto,
    responsavelId: string,
  ): Promise<Funcionario> {
    const documentoUrl = [dto.documentoUrlFrente, dto.documentoUrlVerso]
      .filter((url): url is string => !!url)
      .join(',');

    return this.prisma.funcionario.create({
      data: {
        nome: dto.nome,
        telefone: dto.telefone,
        provincia: dto.provincia,
        codigoPostal: dto.codigoPostal,
        documentoUrl: documentoUrl || null,
        responsavelId,
        status: StatusFuncionario.PENDENTE,
      },
    });
  }

  /**
   * Cadastro via Google Forms (docs/features/Cadastro-funcionario.md) — o
   * Apps Script chama POST /funcionarios/externo a cada nova resposta.
   * Tratamos como "insert externo": nunca confiar no carimbo de data/hora
   * do form (created_at/updated_at usam o default `now()` do Prisma) e
   * sempre entra `PENDENTE` (default do schema), pendente de aprovação do
   * Administrador.
   *
   * `documentoUrlFrente`/`documentoUrlVerso` são duas perguntas separadas
   * no form (frente e verso do Zairyū Card) e são unidas aqui em
   * `documento_url`, separadas por vírgula.
   */
  async criarViaFormExterno(
    dto: CadastrarFuncionarioExternoDto,
  ): Promise<Funcionario> {
    const responsavel = await this.prisma.responsavel.findUnique({
      where: { id: dto.responsavelId },
    });
    if (!responsavel) {
      throw new BadRequestException('responsavelId não encontrado');
    }

    const documentoUrl = [dto.documentoUrlFrente, dto.documentoUrlVerso]
      .filter((url): url is string => !!url)
      .join(',');

    return this.prisma.funcionario.create({
      data: {
        nome: dto.nome,
        telefone: dto.telefone,
        provincia: dto.provincia,
        codigoPostal: dto.codigoPostal,
        documentoUrl: documentoUrl || null,
        responsavelId: dto.responsavelId,
        status: StatusFuncionario.PENDENTE,
      },
    });
  }
}
