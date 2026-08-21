import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ResponsaveisModule } from './responsaveis/responsaveis.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { SedesModule } from './sedes/sedes.module';
import { VagasModule } from './vagas/vagas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlocacoesModule } from './alocacoes/alocacoes.module';
import { AlocarModule } from './alocar/alocar.module';
import { FaltasModule } from './faltas/faltas.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { HistoricoModule } from './historico/historico.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ResponsaveisModule,
    FuncionariosModule,
    SedesModule,
    VagasModule,
    DashboardModule,
    AlocacoesModule,
    AlocarModule,
    FaltasModule,
    PagamentosModule,
    HistoricoModule,
  ],
})
export class AppModule {}
