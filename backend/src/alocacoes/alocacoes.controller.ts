import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { UsuarioAutenticado } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlocacoesService } from './alocacoes.service';
import { Alocacao } from './alocacao.entity';
import { CancelarAlocacaoDto } from './dto/criar-alocacao.dto';

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
}
