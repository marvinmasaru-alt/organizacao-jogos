import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { FuncionariosModule } from '../funcionarios/funcionarios.module';
import { VagasModule } from '../vagas/vagas.module';
import { AlocarController } from './alocar.controller';
import { AlocarService } from './alocar.service';

/**
 * Módulo orquestrador da criação de alocações (POST /alocacoes) — compõe
 * Alocacoes/Vagas/Funcionarios sem nenhum deles precisar importar este de
 * volta (evita ciclo, mesmo padrão do DashboardModule). Não precisa mais
 * de SedesModule: `responsavelSedeId` é sempre derivado por join dentro de
 * AlocacoesService, nunca resolvido aqui.
 */
@Module({
  imports: [AlocacoesModule, VagasModule, FuncionariosModule],
  controllers: [AlocarController],
  providers: [AlocarService],
})
export class AlocarModule {}
