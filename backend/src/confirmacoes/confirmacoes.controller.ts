import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfisGuard, PerfisPermitidos } from '../auth/guards/perfis.guard';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PerfilUsuario } from '../common/types/enums';
import { ConfirmacoesService } from './confirmacoes.service';
import { AtualizarSituacaoDto, SedeDataDto } from './dto/atualizar-situacao.dto';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

/**
 * Confirmação do Dia (docs/features/confirmacao-dia.md) — Responsável e
 * Administrador usam (seção 3); o serviço escopa por sede, não há
 * PerfisGuard aqui.
 */
@Controller('confirmacoes')
@UseGuards(JwtAuthGuard)
export class ConfirmacoesController {
  constructor(private readonly service: ConfirmacoesService) {}

  /** Sem `sedeId`: lista de sedes com atividade no dia. Com `sedeId`: resumo detalhado. */
  @Get()
  listar(
    @Query('data') data: string,
    @Query('sedeId') sedeId: string | undefined,
    @Req() req: RequestComSessao,
  ) {
    return sedeId
      ? this.service.resumoDaSede(sedeId, data, req.user)
      : this.service.listarSedesComAlocacoes(data, req.user);
  }

  @Patch(':alocacaoId')
  atualizarSituacao(
    @Param('alocacaoId') alocacaoId: string,
    @Body() dto: AtualizarSituacaoDto,
    @Req() req: RequestComSessao,
  ): Promise<void> {
    return this.service.atualizarSituacao(
      alocacaoId,
      dto.status,
      req.user,
      dto.observacao,
      dto.necessitaSubstituicaoUrgente,
    );
  }

  @Post('finalizar')
  finalizar(@Body() dto: SedeDataDto, @Req() req: RequestComSessao) {
    return this.service.finalizar(dto.sedeId, dto.data, req.user);
  }

  /** Só Administrador reabre uma conferência já finalizada (seção 28.1). */
  @Post('reabrir')
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
  reabrir(@Body() dto: SedeDataDto, @Req() req: RequestComSessao) {
    return this.service.reabrir(dto.sedeId, dto.data, req.user);
  }
}
