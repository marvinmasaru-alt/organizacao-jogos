import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusAlocacao } from '../common/types/enums';
import { Alocacao } from './alocacao.entity';

const SHEET_NAME = 'ALOCACOES';

/**
 * Status que contam como "ocupando" a vaga no cálculo de disponibilidade
 * (X/Y, "vagas preenchidas"): só ALOCADO. CANCELADO e FALTOU liberam a
 * posição — quem faltou não está mais efetivamente trabalhando ali, então
 * a vaga volta a aparecer como disponível (e some, no card da sede, o
 * indicador de urgência quando marcado — ver DashboardService).
 */
const STATUS_QUE_OCUPAM_VAGA: StatusAlocacao[] = [StatusAlocacao.ALOCADO];

/**
 * Checkbox do Google Sheets: com o valueRenderOption padrão (FORMATTED_VALUE)
 * a API devolve a string "TRUE"/"FALSE" (não "VERDADEIRO"/"FALSO", mesmo com
 * a planilha em pt-BR) — aceita as duas grafias pra não depender de qual
 * idioma o Sheets decidiu formatar.
 */
function ehVerdadeiro(valor: string | undefined): boolean {
  const normalizado = (valor ?? '').trim().toUpperCase();
  return normalizado === 'TRUE' || normalizado === 'VERDADEIRO';
}

/**
 * Dados mínimos pra criar uma alocação nova — sem valores/comissão (ver
 * docs/features/alocacao.md seção 29: pagamento é integração futura) e
 * sem `id`/`status` (gerados aqui: sempre ALOCADO, ID sequencial).
 */
export interface NovaAlocacaoInput {
  vagaId: string;
  funcionarioId: string;
  responsavelSedeId: string;
  responsavelFornecimentoId: string;
  data: string;
}

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
   * Grava um lote de alocações novas numa única chamada à planilha
   * (`appendRows` — ver GoogleSheetsService). Quem decide SE o lote pode
   * ser gravado é o chamador (AlocarService, que já revalidou tudo antes
   * de chegar aqui) — este método é só a escrita em si, sem validação de
   * regra de negócio, pra não duplicar lógica entre módulos.
   */
  async gravarEmLote(itens: NovaAlocacaoInput[]): Promise<Alocacao[]> {
    if (itens.length === 0) {
      return [];
    }

    const proximoNumeroBase = await this.proximoNumeroDeId();
    const novas: Alocacao[] = itens.map((item, indice) => ({
      id: `A${String(proximoNumeroBase + indice).padStart(4, '0')}`,
      vagaId: item.vagaId,
      funcionarioId: item.funcionarioId,
      responsavelSedeId: item.responsavelSedeId,
      responsavelFornecimentoId: item.responsavelFornecimentoId,
      data: item.data,
      valorRecebido: 0,
      valorFuncionario: 0,
      comissaoTotal: 0,
      comissaoResponsavelSede: 0,
      comissaoResponsavelFornecimento: 0,
      extraResponsavel: 0,
      status: StatusAlocacao.ALOCADO,
      dataCancelamento: null,
      motivoCancelamento: null,
      dataFalta: null,
      motivoFalta: null,
      faltaUrgente: false,
    }));

    await this.sheets.appendRows(SHEET_NAME, novas.map((a) => this.paraLinha(a)));
    return novas;
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

  private async proximoNumeroDeId(): Promise<number> {
    const todas = await this.listarTodas();
    const maiorNumero = todas.reduce((maior, a) => {
      const numero = Number(a.id.replace(/\D/g, '')) || 0;
      return Math.max(maior, numero);
    }, 0);
    return maiorNumero + 1;
  }

  private paraLinha(a: Alocacao): (string | number)[] {
    return [
      a.id,
      a.vagaId,
      a.funcionarioId,
      a.responsavelSedeId,
      a.responsavelFornecimentoId,
      a.data,
      a.valorRecebido,
      a.valorFuncionario,
      a.comissaoTotal,
      a.comissaoResponsavelSede,
      a.comissaoResponsavelFornecimento,
      a.extraResponsavel,
      a.status,
      a.dataCancelamento ?? '',
      a.motivoCancelamento ?? '',
      a.dataFalta ?? '',
      a.motivoFalta ?? '',
      a.faltaUrgente ? 'TRUE' : 'FALSE',
    ];
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
      faltaUrgente: ehVerdadeiro(faltaUrgente),
    };
  }
}
