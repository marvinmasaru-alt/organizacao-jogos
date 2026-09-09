import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsuarioAutenticado } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfilUsuario } from '../common/types/enums';
import { AlocacoesService } from './alocacoes.service';
import { Alocacao } from './alocacao.entity';
import { CancelarAlocacaoDto, TrocarTipoAlocacaoDto } from './dto/criar-alocacao.dto';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

/**
 * Criação de alocação (POST) vive em AlocarModule — precisa de
 * VagasService/FuncionariosService/SedesService pra validar o lote, e
 * importar esses módulos aqui geraria dependência circular (eles já
 * importam AlocacoesModule pra usar AlocacoesService). Ver AlocarController.
 */
@Controller('alocacoes')
export class AlocacoesController {
  constructor(private readonly service: AlocacoesService) {}

  @Get()
  listar(@Query('vagaId') vagaId?: string): Promise<Alocacao[]> {
    return vagaId
      ? this.service.listarValidasPorVagaTipo(vagaId)
      : this.service.listarTodas();
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarAlocacaoDto,
    @Req() req: RequestComSessao,
  ): Promise<void> {
    return this.service.cancelar(id, dto.motivoCancelamento, req.user.email);
  }

  /**
   * Troca o tipo de trabalho (cargo) de uma alocação já feita — ex.:
   * escolhida como Forklift na tela de Alocação, corrigir pra Manpower —
   * sem precisar cancelar e criar de novo. Só o responsável que fez a
   * alocação (fornecimento) ou o Administrador pode trocar, mesma regra
   * de posse usada na edição de Funcionários.
   */
  @Patch(':id/tipo')
  @UseGuards(JwtAuthGuard)
  async trocarTipo(
    @Param('id') id: string,
    @Body() dto: TrocarTipoAlocacaoDto,
    @Req() req: RequestComSessao,
  ): Promise<Alocacao> {
    const alocacao = await this.service.buscarPorId(id);
    if (!alocacao) {
      throw new NotFoundException('Alocação não encontrada.');
    }
    if (
      req.user.perfil !== PerfilUsuario.ADMINISTRADOR &&
      alocacao.responsavelFornecimentoId !== req.user.responsavelId
    ) {
      throw new ForbiddenException(
        'Você só pode trocar o cargo de alocações que você mesmo fez.',
      );
    }
    return this.service.trocarTipo(id, dto.vagaId);
  }
}
