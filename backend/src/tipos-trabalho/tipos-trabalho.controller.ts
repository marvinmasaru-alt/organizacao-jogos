import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PerfisGuard, PerfisPermitidos } from '../auth/guards/perfis.guard';
import { PerfilUsuario } from '../common/types/enums';
import { TiposTrabalhoService } from './tipos-trabalho.service';
import { TipoTrabalho } from './tipo-trabalho.entity';
import { CriarTipoTrabalhoDto, EditarTipoTrabalhoDto } from './dto/criar-tipo-trabalho.dto';

/**
 * Cadastro/gestão de tipos de trabalho — administrativo, igual Sedes e
 * Configurações de Vaga: só o Administrador vê e mexe (é quem decide o
 * que existe pra escolher nos formulários de vaga/alocação).
 */
@Controller('tipos-trabalho')
@UseGuards(JwtAuthGuard, PerfisGuard)
@PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
export class TiposTrabalhoController {
  constructor(private readonly service: TiposTrabalhoService) {}

  @Get()
  listar(
    @Query('incluirInativos') incluirInativos?: string,
  ): Promise<TipoTrabalho[]> {
    return this.service.listarTodos(incluirInativos === 'true');
  }

  @Post()
  criar(@Body() dto: CriarTipoTrabalhoDto): Promise<TipoTrabalho> {
    return this.service.criar(dto);
  }

  @Patch(':id')
  editar(
    @Param('id') id: string,
    @Body() dto: EditarTipoTrabalhoDto,
  ): Promise<TipoTrabalho> {
    return this.service.editar(id, dto);
  }

  @Patch(':id/desativar')
  desativar(@Param('id') id: string): Promise<void> {
    return this.service.desativar(id);
  }

  @Patch(':id/ativar')
  ativar(@Param('id') id: string): Promise<void> {
    return this.service.ativar(id);
  }
}
