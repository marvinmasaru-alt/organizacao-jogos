import { Injectable } from '@nestjs/common';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { UsuarioAutenticado } from '../auth/auth.service';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import {
  PerfilUsuario,
  StatusAlocacao,
  StatusFuncionario,
} from '../common/types/enums';
import {
  Funcionario,
  FuncionarioAlocadoNaVaga,
  FuncionarioParaAlocacao,
  SituacaoParaAlocacao,
} from './funcionario.entity';

const SHEET_NAME = 'FUNCIONARIOS';

@Injectable()
export class FuncionariosService {
  constructor(
    private readonly sheets: GoogleSheetsService,
    private readonly alocacoesService: AlocacoesService,
  ) {}

  async listarTodos(): Promise<Funcionario[]> {
    const linhas = await this.sheets.readSheet(SHEET_NAME);
    // Linha 1 é cabeçalho — ver funcionario.entity.ts pra ordem das colunas.
    return linhas.slice(1).map((linha) => this.mapearLinha(linha));
  }

  async buscarPorId(id: string): Promise<Funcionario | null> {
    const todos = await this.listarTodos();
    return todos.find((f) => f.id === id) ?? null;
  }

  /**
   * Funcionários disponíveis para alocação por um responsável específico.
   * Regra crítica (CLAUDE.md): só aparecem funcionários ATIVOS e
   * cadastrados por esse mesmo responsável — mesmo que outro funcionário
   * esteja livre, outro responsável não pode selecioná-lo.
   */
  async listarDisponiveisParaResponsavel(
    responsavelId: string,
  ): Promise<Funcionario[]> {
    const todos = await this.listarTodos();
    return todos.filter(
      (f) =>
        f.responsavelCadastroId === responsavelId &&
        f.status === StatusFuncionario.ATIVO,
    );
  }

  /**
   * Funcionários do responsável, com a situação de cada um em relação a
   * uma vaga/data específica (docs/features/alocacao.md, seções 6/11/12).
   * Conflito é sempre por dia — `ALOCADO` em outra vaga na MESMA data.
   */
  async listarParaAlocacao(
    responsavelId: string,
    vagaId: string,
    data: string,
  ): Promise<FuncionarioParaAlocacao[]> {
    const permitidos =
      await this.listarDisponiveisParaResponsavel(responsavelId);
    const alocacoesDoDia = (
      await this.alocacoesService.listarTodas()
    ).filter((a) => a.data === data);

    return permitidos.map((f) => {
      const alocacoesDoFuncionario = alocacoesDoDia.filter(
        (a) => a.funcionarioId === f.id,
      );
      const nestaVaga = alocacoesDoFuncionario.find(
        (a) => a.vagaId === vagaId,
      );

      let situacao = SituacaoParaAlocacao.DISPONIVEL;
      if (nestaVaga?.status === StatusAlocacao.ALOCADO) {
        situacao = SituacaoParaAlocacao.JA_ALOCADO_NESTA_VAGA;
      } else if (nestaVaga?.status === StatusAlocacao.CANCELADO) {
        situacao = SituacaoParaAlocacao.CANCELOU_NESTA_VAGA;
      } else if (nestaVaga?.status === StatusAlocacao.FALTOU) {
        situacao = SituacaoParaAlocacao.FALTOU_NESTA_VAGA;
      } else if (
        alocacoesDoFuncionario.some(
          (a) => a.vagaId !== vagaId && a.status === StatusAlocacao.ALOCADO,
        )
      ) {
        situacao = SituacaoParaAlocacao.ALOCADO_OUTRA_VAGA;
      }

      return {
        ...f,
        situacao,
        selecionavel: situacao === SituacaoParaAlocacao.DISPONIVEL,
      };
    });
  }

  /**
   * Funcionários alocados (Status = ALOCADO) numa vaga, pra seção
   * recolhível "Ver funcionários alocados" da tela de Alocação. Mostra o
   * nome real quando o usuário logado é Administrador, OU o responsável
   * que cadastrou aquele funcionário, OU o responsável pela SEDE daquela
   * alocação (`Responsavel_Sede_ID`) — quem administra a sede precisa
   * saber quem está trabalhando nela, mesmo quando foi outro responsável
   * que forneceu o funcionário (CLAUDE.md: responsável pela sede ≠
   * responsável pelo fornecimento são papéis independentes). Qualquer
   * outro caso mascara o nome.
   */
  async listarAlocadosParaVaga(
    vagaId: string,
    usuario: UsuarioAutenticado,
  ): Promise<FuncionarioAlocadoNaVaga[]> {
    const alocacoesValidas =
      await this.alocacoesService.listarValidasPorVaga(vagaId);
    const todosFuncionarios = await this.listarTodos();

    return alocacoesValidas.map((a) => {
      const funcionario = todosFuncionarios.find(
        (f) => f.id === a.funcionarioId,
      );
      const ehDono = funcionario?.responsavelCadastroId === usuario.responsavelId;
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
    // TODO: reler a linha do funcionário, alterar status para ATIVO e
    // gravar de volta (nunca apagar/recriar a linha).
    void id;
  }

  private mapearLinha(linha: string[]): Funcionario {
    const [
      id,
      nome,
      telefone,
      provincia,
      codigoPostal,
      documento,
      responsavelCadastroId,
      status,
      dataCadastro,
      dataAprovacao,
    ] = linha;

    return {
      id: id ?? '',
      nome: nome ?? '',
      telefone: telefone ?? '',
      provincia: provincia ?? '',
      codigoPostal: codigoPostal ?? '',
      documento: documento ?? '',
      responsavelCadastroId: responsavelCadastroId ?? '',
      status: (status as StatusFuncionario) || StatusFuncionario.PENDENTE,
      dataCadastro: dataCadastro ?? '',
      dataAprovacao: dataAprovacao || null,
    };
  }
}
