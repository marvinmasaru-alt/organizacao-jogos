import { Controller, Get } from '@nestjs/common';
import { HistoricoService } from './historico.service';

// TODO: restringir todo este controller ao perfil ADMINISTRADOR (PerfisGuard).
@Controller('historico')
export class HistoricoController {
  constructor(private readonly service: HistoricoService) {}

  @Get('cancelamentos')
  listarCancelamentos() {
    return this.service.listarCancelamentos();
  }
}
