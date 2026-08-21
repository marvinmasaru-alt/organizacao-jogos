import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Responsavel } from './responsavel.entity';

@Injectable()
export class ResponsaveisService {
  constructor(private readonly prisma: PrismaService) {}

  /** Nunca lista responsáveis com exclusão lógica (`deletedAt` preenchido). */
  async listarTodos(): Promise<Responsavel[]> {
    return this.prisma.responsavel.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
    });
  }

  async buscarPorId(id: string): Promise<Responsavel | null> {
    return this.prisma.responsavel.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
