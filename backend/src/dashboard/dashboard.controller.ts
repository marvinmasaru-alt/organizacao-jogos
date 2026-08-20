import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioAutenticado } from '../auth/auth.service';
import { DashboardService } from './dashboard.service';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  resumo(
    @Query('data') data: string | undefined,
    @Req() req: RequestComSessao,
  ) {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.service.resumoPorData(data ?? hoje, req.user);
  }
}
