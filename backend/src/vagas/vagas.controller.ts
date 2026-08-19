import { Controller, Get, Query } from '@nestjs/common';
import { VagasService } from './vagas.service';
import { Vaga } from './vaga.entity';

@Controller('vagas')
export class VagasController {
  constructor(private readonly service: VagasService) {}

  @Get()
  listar(@Query('data') data?: string): Promise<Vaga[]> {
    return data ? this.service.listarPorData(data) : this.service.listarTodas();
  }
}
