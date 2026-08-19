import { Controller, Get } from '@nestjs/common';
import { ResponsaveisService } from './responsaveis.service';
import { ResponsavelPublico, paraResponsavelPublico } from './responsavel.entity';

@Controller('responsaveis')
export class ResponsaveisController {
  constructor(private readonly service: ResponsaveisService) {}

  @Get()
  async listar(): Promise<ResponsavelPublico[]> {
    const todos = await this.service.listarTodos();
    return todos.map(paraResponsavelPublico);
  }
}
