import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { StatusVaga, TipoTrabalho } from '../common/types/enums';
import { Vaga, VagaComDisponibilidade } from './vaga.entity';

const SHEET_NAME = 'VAGAS';

@Injectable()
export class VagasService {
  constructor(
    private readonly sheets: GoogleSheetsService,
    private readonly alocacoesService: AlocacoesService,
  ) {}

  async listarTodas(): Promise<Vaga[]> {
    const linhas = await this.sheets.readSheet(SHEET_NAME);
    // Linha 1 é cabeçalho (ID, Data, Sede_ID, Tipo, Quantidade, Status).
    return linhas.slice(1).map((linha) => this.mapearLinha(linha));
  }

  async listarPorData(data: string): Promise<Vaga[]> {
    const todas = await this.listarTodas();
    return todas.filter((v) => v.data === data);
  }

  async buscarPorId(id: string): Promise<Vaga | null> {
    const todas = await this.listarTodas();
    return todas.find((v) => v.id === id) ?? null;
  }

  /**
   * Calcula disponibilidade real de cada vaga (quantidade - alocações que
   * ocupam a vaga, ver AlocacoesService), nunca negativo. Consumido pelo
   * DashboardModule.
   */
  async calcularDisponibilidade(
    vagas: Vaga[],
  ): Promise<VagaComDisponibilidade[]> {
    return Promise.all(
      vagas.map(async (v) => {
        const alocacoesValidas = (
          await this.alocacoesService.listarValidasPorVaga(v.id)
        ).length;
        const disponiveis = Math.max(0, v.quantidade - alocacoesValidas);
        return {
          ...v,
          alocacoesValidas,
          disponiveis,
          status: disponiveis === 0 ? StatusVaga.COMPLETA : StatusVaga.ABERTA,
        };
      }),
    );
  }

  private mapearLinha(linha: string[]): Vaga {
    const [id, data, sedeId, tipo, quantidade, status] = linha;
    return {
      id: id ?? '',
      data: data ?? '',
      sedeId: sedeId ?? '',
      tipo: (tipo as TipoTrabalho) || TipoTrabalho.AJUDANTE,
      quantidade: Number(quantidade) || 0,
      status: (status as StatusVaga) || StatusVaga.ABERTA,
    };
  }
}
