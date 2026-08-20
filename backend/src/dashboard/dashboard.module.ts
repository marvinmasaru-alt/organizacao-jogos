import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { SedesModule } from '../sedes/sedes.module';
import { VagasModule } from '../vagas/vagas.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SedesModule, VagasModule, AlocacoesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
