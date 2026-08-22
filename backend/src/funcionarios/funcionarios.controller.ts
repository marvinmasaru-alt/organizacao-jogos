import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { UsuarioAutenticado } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  // TODO: restringir esta rota ao perfil ADMINISTRADOR (PerfisGuard).
  @Patch(':id/aprovar')
  aprovar(@Param('id') id: string): Promise<void> {
    return this.service.aprovar(id);
  }
}
