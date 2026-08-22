import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfisGuard, PerfisPermitidos } from '../auth/guards/perfis.guard';
import { PerfilUsuario } from '../common/types/enums';
import { ConfiguracoesVagasService } from './configuracoes-vagas.service';
import { ConfiguracaoVaga } from './configuracao-vaga.entity';
import { CriarConfiguracaoVagaDto } from './dto/criar-configuracao-vaga.dto';

/**
 * Cadastro/gestão de configurações de vaga fixa
 * (docs/features/cadastro-vagas.md, seção 6) — administrativo, igual
 * Sedes: só o Administrador cria/inativa.
 */
@Controller('configuracoes-vagas')
@UseGuards(JwtAuthGuard, PerfisGuard)
@PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
export class ConfiguracoesVagasController {
  constructor(private readonly service: ConfiguracoesVagasService) {}

  @Get()
  listar(@Query('sedeId') sedeId?: string): Promise<ConfiguracaoVaga[]> {
    return sedeId ? this.service.listarPorSede(sedeId) : this.service.listarTodas();
  }

  @Post()
  criar(@Body() dto: CriarConfiguracaoVagaDto): Promise<ConfiguracaoVaga> {
    return this.service.criar(dto);
  }

  @Patch(':id/inativar')
  inativar(@Param('id') id: string): Promise<void> {
    return this.service.inativar(id);
  }
}
