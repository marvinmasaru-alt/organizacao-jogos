import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfisGuard, PerfisPermitidos } from '../auth/guards/perfis.guard';
import { PerfilUsuario } from '../common/types/enums';
import { CriarVagaEsporadicaDto } from './dto/criar-vaga-esporadica.dto';
import { VagasService } from './vagas.service';
import { Vaga } from './vaga.entity';

@Controller('vagas')
export class VagasController {
  constructor(private readonly service: VagasService) {}

  @Get()
  listar(@Query('data') data?: string): Promise<Vaga[]> {
    return data ? this.service.listarPorData(data) : this.service.listarTodas();
  }

  /** Cria vaga ESPORADICA (docs/features/cadastro-vagas.md, seção 19) — só Administrador. */
  @Post()
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
  criarEsporadica(@Body() dto: CriarVagaEsporadicaDto): Promise<Vaga[]> {
    return this.service.criarEsporadica(dto);
  }

  @Patch(':id/cancelar')
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
  cancelar(@Param('id') id: string): Promise<void> {
    return this.service.cancelar(id);
  }
}
