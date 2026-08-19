import { Controller, Get, Query } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';

@Controller('pagamentos')
export class PagamentosController {
  constructor(private readonly service: PagamentosService) {}

  @Get('status-prazo')
  statusPrazo(@Query('data') data: string) {
    return { status: this.service.calcularStatusPrazo(data) };
  }
}
