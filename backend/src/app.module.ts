import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsModule } from './common/google-sheets/google-sheets.module';
import { AuthModule } from './auth/auth.module';
import { ResponsaveisModule } from './responsaveis/responsaveis.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { SedesModule } from './sedes/sedes.module';
import { VagasModule } from './vagas/vagas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlocacoesModule } from './alocacoes/alocacoes.module';
import { FaltasModule } from './faltas/faltas.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { HistoricoModule } from './historico/historico.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GoogleSheetsModule,
    AuthModule,
    ResponsaveisModule,
    FuncionariosModule,
    SedesModule,
    VagasModule,
    DashboardModule,
    AlocacoesModule,
    FaltasModule,
    PagamentosModule,
    HistoricoModule,
  ],
})
export class AppModule {}
