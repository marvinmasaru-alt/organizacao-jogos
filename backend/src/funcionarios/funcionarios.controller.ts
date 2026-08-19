import { Controller, Get, Param, Patch } from '@nestjs/common';
import { FuncionariosService } from './funcionarios.service';
import { Funcionario } from './funcionario.entity';

@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly service: FuncionariosService) {}

  @Get()
  listar(): Promise<Funcionario[]> {
    return this.service.listarTodos();
  }

  @Get('disponiveis/:responsavelId')
  listarDisponiveis(
    @Param('responsavelId') responsavelId: string,
  ): Promise<Funcionario[]> {
    return this.service.listarDisponiveisParaResponsavel(responsavelId);
  }

  // TODO: restringir esta rota ao perfil ADMINISTRADOR (PerfisGuard).
  @Patch(':id/aprovar')
  aprovar(@Param('id') id: string): Promise<void> {
    return this.service.aprovar(id);
  }
}
