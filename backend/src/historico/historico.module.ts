import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { HistoricoController } from './historico.controller';
import { HistoricoService } from './historico.service';

@Module({
  imports: [AlocacoesModule],
  controllers: [HistoricoController],
  providers: [HistoricoService],
})
export class HistoricoModule {}
