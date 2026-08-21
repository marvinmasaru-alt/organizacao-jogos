import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Alocacao } from '../alocacoes/alocacao.entity';
import { CriarAlocacoesDto } from '../alocacoes/dto/criar-alocacao.dto';
import { UsuarioAutenticado } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlocarService } from './alocar.service';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

@Controller('alocacoes')
@UseGuards(JwtAuthGuard)
export class AlocarController {
  constructor(private readonly service: AlocarService) {}

  @Post()
  criar(
    @Body() dto: CriarAlocacoesDto,
    @Req() req: RequestComSessao,
  ): Promise<Alocacao[]> {
    return this.service.criarEmLote(dto.alocacoes, req.user);
  }
}
