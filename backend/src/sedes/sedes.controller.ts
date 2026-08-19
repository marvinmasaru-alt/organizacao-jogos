import { Controller, Get, Param, Query } from '@nestjs/common';
import { SedesService } from './sedes.service';
import { Sede } from './sede.entity';

@Controller('sedes')
export class SedesController {
  constructor(private readonly service: SedesService) {}

  @Get()
  listar(@Query('responsavelId') responsavelId?: string): Promise<Sede[]> {
    return responsavelId
      ? this.service.listarPorResponsavel(responsavelId)
      : this.service.listarTodas();
  }

  @Get('responsavel/:responsavelId')
  listarPorResponsavel(
    @Param('responsavelId') responsavelId: string,
  ): Promise<Sede[]> {
    return this.service.listarPorResponsavel(responsavelId);
  }
}
