import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global pra não precisar reimportar em cada *.module.ts — mesmo papel que
 * GoogleSheetsModule tinha, mas qualquer service pode injetar PrismaService
 * direto sem declarar o import aqui de novo.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
