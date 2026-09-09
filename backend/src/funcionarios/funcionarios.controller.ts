import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsuarioAutenticado } from '../auth/auth.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfilUsuario } from '../common/types/enums';
import { AtualizarFuncionarioDto } from './dto/atualizar-funcionario.dto';
import { CadastrarFuncionarioDto } from './dto/cadastrar-funcionario.dto';
import { CadastrarFuncionarioExternoDto } from './dto/cadastrar-funcionario-externo.dto';
import { FuncionariosService } from './funcionarios.service';
import {
  Funcionario,
  FuncionarioAlocadoNaVaga,
  FuncionarioParaAlocacao,
} from './funcionario.entity';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly service: FuncionariosService) {}

  @Get()
  listar(): Promise<Funcionario[]> {
    return this.service.listarTodos();
  }

  /**
   * Funcionários do responsável logado, com situação por vaga/data
   * (docs/features/alocacao.md). responsavelId sempre vem da sessão —
   * nunca de parâmetro de URL (seção 26/27 da doc).
   *
   * Só Responsável cadastra/aloca funcionário (Administrador não tem
   * `responsavelId` — ver AlocarService); sem isso, `''` chegava até o
   * Prisma como filtro de uma coluna `uuid`, e o Postgres rejeitava com
   * "Error creating UUID, invalid length... found 0" (500 não tratado).
   */
  @Get('disponiveis')
  @UseGuards(JwtAuthGuard)
  listarDisponiveis(
    @Query('vagaId') vagaId: string,
    @Query('data') data: string,
    @Req() req: RequestComSessao,
  ): Promise<FuncionarioParaAlocacao[]> {
    if (!req.user.responsavelId) {
      return Promise.resolve([]);
    }
    return this.service.listarParaAlocacao(req.user.responsavelId, vagaId, data);
  }

  /** Seção recolhível "Ver funcionários alocados" da tela de Alocação. */
  @Get('alocados-na-vaga')
  @UseGuards(JwtAuthGuard)
  listarAlocadosNaVaga(
    @Query('vagaId') vagaId: string,
    @Req() req: RequestComSessao,
  ): Promise<FuncionarioAlocadoNaVaga[]> {
    return this.service.listarAlocadosParaVaga(vagaId, req.user);
  }

  /**
   * Tela de gestão "Funcionários" (docs/features/Cadastro-funcionario.md):
   * Responsável só vê os próprios (responsavelId sempre da sessão, nunca
   * de query param — mesma regra de /disponiveis); Administrador pode
   * filtrar por um responsável específico via `?responsavelId=`, e sem
   * esse parâmetro vê todos.
   */
  @Get('meus')
  @UseGuards(JwtAuthGuard)
  listarMeus(
    @Query('responsavelId') responsavelId: string | undefined,
    @Req() req: RequestComSessao,
  ): Promise<Funcionario[]> {
    if (req.user.perfil === PerfilUsuario.ADMINISTRADOR) {
      return responsavelId
        ? this.service.listarPorResponsavel(responsavelId)
        : this.service.listarTodos();
    }
    if (!req.user.responsavelId) {
      return Promise.resolve([]);
    }
    return this.service.listarPorResponsavel(req.user.responsavelId);
  }

  /**
   * Edição de cadastro (nome/telefone/documentoUrl/provincia/codigoPostal/status)
   * pela tela de Funcionários. Só o responsável que cadastrou o funcionário
   * (ou o Administrador, que edita qualquer um) pode alterar — checagem de
   * posse feita aqui antes de chamar o service.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarFuncionarioDto,
    @Req() req: RequestComSessao,
  ): Promise<Funcionario> {
    const funcionario = await this.service.buscarPorId(id);
    if (!funcionario) {
      throw new NotFoundException('Funcionário não encontrado.');
    }
    if (
      req.user.perfil !== PerfilUsuario.ADMINISTRADOR &&
      funcionario.responsavelId !== req.user.responsavelId
    ) {
      throw new ForbiddenException(
        'Você só pode editar funcionários que você mesmo cadastrou.',
      );
    }
    return this.service.atualizar(id, dto);
  }

  /**
   * Cadastro manual pela tela de Funcionários (docs/features/Cadastro-funcionario.md)
   * — feito pelo próprio Responsável logado, além da entrada via Google
   * Forms. responsavelId sempre vem da sessão (nunca do corpo — mesma
   * regra de /disponiveis e /meus). Administrador não tem responsavelId
   * próprio, então não cadastra por aqui.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  cadastrar(
    @Body() dto: CadastrarFuncionarioDto,
    @Req() req: RequestComSessao,
  ): Promise<Funcionario> {
    if (!req.user.responsavelId) {
      throw new ForbiddenException(
        'Só um Responsável pode cadastrar funcionários.',
      );
    }
    return this.service.criar(dto, req.user.responsavelId);
  }

  /**
   * Cadastro via Google Forms/Apps Script (docs/features/Cadastro-funcionario.md)
   * — sem sessão de usuário, protegido só pela chave de API fixa
   * (`ApiKeyGuard`, header `x-api-key`) configurável por environment.
   */
  @Post('externo')
  @UseGuards(ApiKeyGuard)
  cadastrarViaFormExterno(
    @Body() dto: CadastrarFuncionarioExternoDto,
  ): Promise<Funcionario> {
    return this.service.criarViaFormExterno(dto);
  }
}
