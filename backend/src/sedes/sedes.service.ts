import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Sede } from './sede.entity';

@Injectable()
export class SedesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarTodas(): Promise<Sede[]> {
    return this.prisma.sede.findMany({ orderBy: { nome: 'asc' } });
  }

  async buscarPorId(id: string): Promise<Sede | null> {
    return this.prisma.sede.findUnique({ where: { id } });
  }

  /** Filtro "Minhas sedes" = sedes.responsavel_id == usuário logado. */
  async listarPorResponsavel(responsavelId: string): Promise<Sede[]> {
    return this.prisma.sede.findMany({
      where: { responsavelId },
      orderBy: { nome: 'asc' },
    });
  }
}
