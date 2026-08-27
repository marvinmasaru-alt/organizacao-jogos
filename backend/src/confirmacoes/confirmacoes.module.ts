import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { FaltasModule } from '../faltas/faltas.module';
import { PagamentosModule } from '../pagamentos/pagamentos.module';
import { ConfirmacoesController } from './confirmacoes.controller';
import { ConfirmacoesService } from './confirmacoes.service';

@Module({
  imports: [AlocacoesModule, FaltasModule, PagamentosModule],
  controllers: [ConfirmacoesController],
  providers: [ConfirmacoesService],
})
export class ConfirmacoesModule {}
