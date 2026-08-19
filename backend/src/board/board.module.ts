import { Module } from '@nestjs/common';
import { SedesModule } from '../sedes/sedes.module';
import { VagasModule } from '../vagas/vagas.module';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

@Module({
  imports: [SedesModule, VagasModule],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
