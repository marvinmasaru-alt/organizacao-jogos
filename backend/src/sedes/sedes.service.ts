import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { Sede } from './sede.entity';

const SHEET_NAME = 'SEDES';

@Injectable()
export class SedesService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  // TODO: mapear as linhas cruas da planilha para Sede[].
  async listarTodas(): Promise<Sede[]> {
    await this.sheets.readSheet(SHEET_NAME);
    return [];
  }

  /** Filtro "Minhas sedes" = Sedes.Responsavel_ID == usuário logado. */
  async listarPorResponsavel(responsavelId: string): Promise<Sede[]> {
    const todas = await this.listarTodas();
    return todas.filter((s) => s.responsavelId === responsavelId);
  }
}
