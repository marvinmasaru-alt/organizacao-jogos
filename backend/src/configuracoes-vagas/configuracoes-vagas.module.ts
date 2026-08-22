import { Module } from '@nestjs/common';
import { ConfiguracoesVagasController } from './configuracoes-vagas.controller';
import { ConfiguracoesVagasService } from './configuracoes-vagas.service';

@Module({
  controllers: [ConfiguracoesVagasController],
  providers: [ConfiguracoesVagasService],
  exports: [ConfiguracoesVagasService],
})
export class ConfiguracoesVagasModule {}
