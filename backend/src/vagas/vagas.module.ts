import { Module } from '@nestjs/common';
import { AlocacoesModule } from '../alocacoes/alocacoes.module';
import { VagasController } from './vagas.controller';
import { VagasService } from './vagas.service';

@Module({
  imports: [AlocacoesModule],
  controllers: [VagasController],
  providers: [VagasService],
  exports: [VagasService],
})
export class VagasModule {}
