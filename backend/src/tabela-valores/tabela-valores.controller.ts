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
import { TabelaValoresService } from './tabela-valores.service';
import { TabelaValor } from './tabela-valor.entity';
import { CriarTabelaValorDto, EditarTabelaValorDto } from './dto/criar-tabela-valor.dto';

/**
 * Cadastro/gestão de valores de referência por tipo de trabalho + tipo de
 * sede — administrativo, igual Tipos de Trabalho/Configurações de Vaga:
 * só o Administrador vê e mexe.
 */
@Controller('tabela-valores')
@UseGuards(JwtAuthGuard, PerfisGuard)
@PerfisPermitidos(PerfilUsuario.ADMINISTRADOR)
export class TabelaValoresController {
  constructor(private readonly service: TabelaValoresService) {}

  @Get()
  listar(@Query('incluirInativos') incluirInativos?: string): Promise<TabelaValor[]> {
    return this.service.listarTodos(incluirInativos === 'true');
  }

  @Post()
  criar(@Body() dto: CriarTabelaValorDto): Promise<TabelaValor> {
    return this.service.criar(dto);
  }

  @Patch(':id')
  editar(
    @Param('id') id: string,
    @Body() dto: EditarTabelaValorDto,
  ): Promise<TabelaValor> {
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
