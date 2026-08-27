import { Module } from '@nestjs/common';
import { TabelaValoresController } from './tabela-valores.controller';
import { TabelaValoresService } from './tabela-valores.service';

@Module({
  controllers: [TabelaValoresController],
  providers: [TabelaValoresService],
  exports: [TabelaValoresService],
})
export class TabelaValoresModule {}
