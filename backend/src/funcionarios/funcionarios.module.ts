import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { FuncionariosController } from './funcionarios.controller';
import { FuncionariosService } from './funcionarios.service';

@Module({
  imports: [AlocacoesModule],
  controllers: [FuncionariosController],
  providers: [FuncionariosService],
  exports: [FuncionariosService],
})
export class FuncionariosModule {}
