import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusAlocacao } from '../common/types/enums';
import { Alocacao } from './alocacao.entity';
import { CriarAlocacaoDto } from './dto/criar-alocacao.dto';

const SHEET_NAME = 'ALOCACOES';

/**
 * Status que contam como "ocupando" a vaga no cálculo de disponibilidade:
 * o funcionário foi de fato alocado ali (ALOCADO) ou foi alocado e faltou
 * (FALTOU — falta não é cancelamento, não libera a vaga). Só CANCELADO
 * libera a posição.
 * ⚠️ Assunção sinalizada no plano da etapa — confirmar se o comportamento
 * esperado é outro antes de mudar esta lista.
 */
const STATUS_QUE_OCUPAM_VAGA: StatusAlocacao[] = [
  StatusAlocacao.ALOCADO,
  StatusAlocacao.FALTOU,
];

@Injectable()
export class AlocacoesService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  async listarTodas(): Promise<Alocacao[]> {
    const linhas = await this.sheets.readSheet(SHEET_NAME);
    // Linha 1 é cabeçalho — ver "Relação de tabelas" no CLAUDE.md pra ordem das colunas.
    return linhas.slice(1).map((linha) => this.mapearLinha(linha));
  }

  /** Só contam para "preenchidas" as alocações que ocupam a vaga (ver STATUS_QUE_OCUPAM_VAGA). */
  async listarValidasPorVaga(vagaId: string): Promise<Alocacao[]> {
    const todas = await this.listarTodas();
    return todas.filter(
      (a) => a.vagaId === vagaId && STATUS_QUE_OCUPAM_VAGA.includes(a.status),
    );
  }

  /** Alocações do dia com falta marcada como urgente — consumido pelo Dashboard. */
  async listarFaltasUrgentesPorData(data: string): Promise<Alocacao[]> {
    const todas = await this.listarTodas();
    return todas.filter(
      (a) =>
        a.data === data &&
        a.status === StatusAlocacao.FALTOU &&
        a.faltaUrgente,
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

  private mapearLinha(linha: string[]): Alocacao {
    const [
      id,
      vagaId,
      funcionarioId,
      responsavelSedeId,
      responsavelFornecimentoId,
      data,
      valorRecebido,
      valorFuncionario,
      comissaoTotal,
      comissaoResponsavelSede,
      comissaoResponsavelFornecimento,
      extraResponsavel,
      status,
      dataCancelamento,
      motivoCancelamento,
      dataFalta,
      motivoFalta,
      faltaUrgente,
    ] = linha;

    return {
      id: id ?? '',
      vagaId: vagaId ?? '',
      funcionarioId: funcionarioId ?? '',
      responsavelSedeId: responsavelSedeId ?? '',
      responsavelFornecimentoId: responsavelFornecimentoId ?? '',
      data: data ?? '',
      valorRecebido: Number(valorRecebido) || 0,
      valorFuncionario: Number(valorFuncionario) || 0,
      comissaoTotal: Number(comissaoTotal) || 0,
      comissaoResponsavelSede: Number(comissaoResponsavelSede) || 0,
      comissaoResponsavelFornecimento:
        Number(comissaoResponsavelFornecimento) || 0,
      extraResponsavel: Number(extraResponsavel) || 0,
      status: (status as StatusAlocacao) || StatusAlocacao.ALOCADO,
      dataCancelamento: dataCancelamento || null,
      motivoCancelamento: motivoCancelamento || null,
      dataFalta: dataFalta || null,
      motivoFalta: motivoFalta || null,
      faltaUrgente: (faltaUrgente ?? '').toUpperCase() === 'VERDADEIRO',
    };
  }
}
