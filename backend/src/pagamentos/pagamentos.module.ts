import { Module } from '@nestjs/common';
import { TabelaValoresModule } from '../tabela-valores/tabela-valores.module';
import { GoogleDriveModule } from '../integracoes/google-drive/google-drive.module';
import { PagamentosController } from './pagamentos.controller';
import { PagamentosService } from './pagamentos.service';

@Module({
  imports: [TabelaValoresModule, GoogleDriveModule],
  controllers: [PagamentosController],
  providers: [PagamentosService],
  exports: [PagamentosService],
})
export class PagamentosModule {}
