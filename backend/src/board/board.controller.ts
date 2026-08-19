import { Controller, Get, Query } from '@nestjs/common';
import { BoardService } from './board.service';

@Controller('board')
export class BoardController {
  constructor(private readonly service: BoardService) {}

  @Get()
  resumo(@Query('data') data?: string) {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.service.resumoPorData(data ?? hoje);
  }
}
