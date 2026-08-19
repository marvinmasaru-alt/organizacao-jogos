import { Module } from '@nestjs/common';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';

@Module({
  controllers: [FaltasController],
  providers: [FaltasService],
  exports: [FaltasService],
})
export class FaltasModule {}
