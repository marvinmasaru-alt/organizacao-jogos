import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusFalta } from '../common/types/enums';
import { Falta, FaltaResumoBoard } from './falta.entity';
import { RegistrarFaltaDto } from './dto/registrar-falta.dto';

const SHEET_NAME = 'FALTAS';

@Injectable()
export class FaltasService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  // TODO: mapear as linhas cruas da planilha para Falta[].
  async listarTodas(): Promise<Falta[]> {
    await this.sheets.readSheet(SHEET_NAME);
    return [];
  }

  /** Detalhes completos — área restrita (não é o que o board consome). */
  async listarDetalhado(): Promise<Falta[]> {
    return this.listarTodas();
  }

  /** Projeção segura para o board principal: nunca inclui o nome do funcionário. */
  async listarResumoBoard(data: string): Promise<FaltaResumoBoard[]> {
    const todas = await this.listarTodas();
    return todas
      .filter((f) => f.data === data)
      .map((f) => ({
        vagaId: f.vagaId,
        necessitaSubstituicaoUrgente: f.status === StatusFalta.URGENTE,
      }));
  }

  /**
   * Registra a falta (não cancela a alocação em si, mas cancela o
   * pagamento daquele dia) e, se marcada como urgente, sinaliza
   * necessidade de substituição.
   *
   * TODO: gravar a nova linha em FALTAS e cancelar o pagamento associado
   * via PagamentosService.
   */
  async registrar(dto: RegistrarFaltaDto): Promise<Falta> {
    throw new Error(
      `TODO: implementar registro de falta para alocação ${dto.alocacaoId}`,
    );
  }

  /**
   * TODO (ponto em aberto no CLAUDE.md): fluxo exato de substituição
   * urgente — provavelmente mantém o registro original da falta e cria uma
   * NOVA alocação para o substituto, em vez de sobrescrever o original.
   */
  async registrarSubstituicao(faltaId: string, funcionarioSubstitutoId: string) {
    void faltaId;
    void funcionarioSubstitutoId;
    throw new Error('TODO: fluxo de substituição ainda não definido.');
  }
}
