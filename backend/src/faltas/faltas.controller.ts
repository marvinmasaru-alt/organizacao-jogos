import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FaltasService } from './faltas.service';
import { RegistrarFaltaDto } from './dto/registrar-falta.dto';

@Controller('faltas')
export class FaltasController {
  constructor(private readonly service: FaltasService) {}

  // TODO: restringir esta rota ao perfil ADMINISTRADOR (área restrita).
  @Get()
  listarDetalhado() {
    return this.service.listarDetalhado();
  }

  @Get('board')
  listarResumoBoard(@Query('data') data: string) {
    return this.service.listarResumoBoard(data);
  }

  @Post()
  registrar(@Body() dto: RegistrarFaltaDto) {
    return this.service.registrar(dto);
  }
}
