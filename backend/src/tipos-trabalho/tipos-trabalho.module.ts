import { Module } from '@nestjs/common';
import { TiposTrabalhoController } from './tipos-trabalho.controller';
import { TiposTrabalhoService } from './tipos-trabalho.service';

@Module({
  controllers: [TiposTrabalhoController],
  providers: [TiposTrabalhoService],
  exports: [TiposTrabalhoService],
})
export class TiposTrabalhoModule {}
