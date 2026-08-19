import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusAlocacao } from '../common/types/enums';
import { Alocacao } from './alocacao.entity';
import { CriarAlocacaoDto } from './dto/criar-alocacao.dto';

const SHEET_NAME = 'ALOCACOES';

@Injectable()
export class AlocacoesService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  // TODO: mapear as linhas cruas da planilha para Alocacao[].
  async listarTodas(): Promise<Alocacao[]> {
    await this.sheets.readSheet(SHEET_NAME);
    return [];
  }

  /** Só contam para "preenchidas" as alocações com Status = ALOCADO. */
  async listarValidasPorVaga(vagaId: string): Promise<Alocacao[]> {
    const todas = await this.listarTodas();
    return todas.filter(
      (a) => a.vagaId === vagaId && a.status === StatusAlocacao.ALOCADO,
    );
  }

  /**
   * Cria uma alocação revalidando o estado atual da vaga imediatamente
   * antes de gravar, para evitar duas alocações simultâneas estourarem a
   * Quantidade da vaga (condição de corrida — exigência do CLAUDE.md).
   *
   * TODO: implementar a revalidação de fato (reler contagem da vaga) e a
   * gravação da nova linha via GoogleSheetsService.appendRow.
   */
  async criar(dto: CriarAlocacaoDto): Promise<Alocacao> {
    throw new Error(
      `TODO: implementar criação de alocação para vaga ${dto.vagaId}`,
    );
  }

  /**
   * Nunca apaga a linha: Status -> CANCELADO, preenche Data_Cancelamento e
   * Motivo_Cancelamento. Libera a vaga mas mantém o histórico.
   */
  async cancelar(id: string, motivo: string): Promise<void> {
    // TODO: reler a linha, atualizar status/data/motivo e gravar de volta.
    void id;
    void motivo;
  }
}
