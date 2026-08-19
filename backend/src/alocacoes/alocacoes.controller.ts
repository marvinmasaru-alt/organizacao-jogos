import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AlocacoesService } from './alocacoes.service';
import { Alocacao } from './alocacao.entity';
import { CancelarAlocacaoDto, CriarAlocacaoDto } from './dto/criar-alocacao.dto';

@Controller('alocacoes')
export class AlocacoesController {
  constructor(private readonly service: AlocacoesService) {}

  @Get()
  listar(@Query('vagaId') vagaId?: string): Promise<Alocacao[]> {
    return vagaId
      ? this.service.listarValidasPorVaga(vagaId)
      : this.service.listarTodas();
  }

  @Post()
  criar(@Body() dto: CriarAlocacaoDto): Promise<Alocacao> {
    return this.service.criar(dto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarAlocacaoDto,
  ): Promise<void> {
    return this.service.cancelar(id, dto.motivoCancelamento);
  }
}
