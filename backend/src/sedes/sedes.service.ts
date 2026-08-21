import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { Sede } from './sede.entity';

const SHEET_NAME = 'SEDES';

@Injectable()
export class SedesService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  async listarTodas(): Promise<Sede[]> {
    const linhas = await this.sheets.readSheet(SHEET_NAME);
    // Linha 1 é cabeçalho (ID, Nome, Tipo_Sede, Responsável_ID, Status, Localizacao, Sigla).
    return linhas.slice(1).map((linha) => this.mapearLinha(linha));
  }

  async buscarPorId(id: string): Promise<Sede | null> {
    const todas = await this.listarTodas();
    return todas.find((s) => s.id === id) ?? null;
  }

  /** Filtro "Minhas sedes" = Sedes.Responsavel_ID == usuário logado. */
  async listarPorResponsavel(responsavelId: string): Promise<Sede[]> {
    const todas = await this.listarTodas();
    return todas.filter((s) => s.responsavelId === responsavelId);
  }

  private mapearLinha(linha: string[]): Sede {
    const [id, nome, tipoSede, responsavelId, status, localizacao, sigla] =
      linha;
    return {
      id: id ?? '',
      nome: nome ?? '',
      tipoSede: tipoSede ?? '',
      responsavelId: responsavelId ?? '',
      status: status ?? '',
      localizacao: localizacao ?? '',
      sigla: sigla ?? '',
    };
  }
}
