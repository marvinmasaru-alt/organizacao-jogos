import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusVaga } from '../common/types/enums';
import { Vaga, VagaComDisponibilidade } from './vaga.entity';

const SHEET_NAME = 'VAGAS';

@Injectable()
export class VagasService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  // TODO: mapear as linhas cruas da planilha para Vaga[].
  async listarTodas(): Promise<Vaga[]> {
    await this.sheets.readSheet(SHEET_NAME);
    return [];
  }

  async listarPorData(data: string): Promise<Vaga[]> {
    const todas = await this.listarTodas();
    return todas.filter((v) => v.data === data);
  }

  /**
   * Calcula disponibilidade real de cada vaga (quantidade - alocações com
   * Status = ALOCADO), nunca negativo. Consumido pelo BoardModule.
   *
   * TODO: injetar/consultar AlocacoesService para contar alocações válidas
   * por vaga em vez de deixar o cálculo zerado.
   */
  async calcularDisponibilidade(
    vagas: Vaga[],
  ): Promise<VagaComDisponibilidade[]> {
    return vagas.map((v) => {
      const alocacoesValidas = 0; // TODO
      const disponiveis = Math.max(0, v.quantidade - alocacoesValidas);
      return {
        ...v,
        alocacoesValidas,
        disponiveis,
        status: disponiveis === 0 ? StatusVaga.COMPLETA : StatusVaga.ABERTA,
      };
    });
  }
}
