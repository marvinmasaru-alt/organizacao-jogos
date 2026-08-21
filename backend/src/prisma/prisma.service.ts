import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Camada única de acesso ao banco (substitui GoogleSheetsService).
 *
 * Todo módulo de domínio (Funcionarios, Sedes, Vagas, Alocacoes, ...) injeta
 * este serviço e usa `this.prisma.<model>.findMany/create/update/...` —
 * nunca instancia PrismaClient diretamente, pra manter uma única conexão
 * gerenciada pelo ciclo de vida do Nest.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado ao banco de dados.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
