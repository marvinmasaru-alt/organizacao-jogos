import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';

/**
 * Camada única de acesso à planilha (usada como "banco de dados" hoje).
 *
 * Todo módulo de domínio (Funcionarios, Sedes, Vagas, Alocacoes, ...) deve
 * ler/escrever através deste serviço, nunca falar com a Google Sheets API
 * diretamente. Isso mantém num único lugar:
 *  - a autenticação via Service Account;
 *  - o padrão de "reler antes de escrever" exigido pelo CLAUDE.md para
 *    evitar condição de corrida em operações que alteram vagas disponíveis.
 */
@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly spreadsheetId: string;
  private sheetsClient: sheets_v4.Sheets | null = null;

  constructor(private readonly config: ConfigService) {
    this.spreadsheetId = this.config.get<string>(
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      '',
    );
  }

  private async getClient(): Promise<sheets_v4.Sheets> {
    if (this.sheetsClient) {
      return this.sheetsClient;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
        // Variáveis de ambiente costumam escapar quebras de linha da chave.
        private_key: this.config
          .get<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', '')
          .replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    return this.sheetsClient;
  }

  /** Lê todas as linhas (com cabeçalho) de uma aba. */
  async readSheet(sheetName: string): Promise<string[][]> {
    const client = await this.getClient();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: sheetName,
    });
    return response.data.values ?? [];
  }

  /** Anexa uma nova linha ao final de uma aba. */
  async appendRow(sheetName: string, row: (string | number)[]): Promise<void> {
    await this.appendRows(sheetName, [row]);
  }

  /**
   * Anexa várias linhas ao final de uma aba numa única chamada à API —
   * base da escrita "tudo ou nada" da alocação em lote: como é uma única
   * requisição HTTP, ou todas as linhas são gravadas, ou nenhuma é (em
   * caso de falha de rede/API, não há como ficar "meio gravado" no meio
   * de uma chamada só).
   *
   * ⚠️ O `range` usado pra descobrir "onde termina a tabela" é só
   * `${sheetName}!A:A` (coluna A) de propósito — nunca `sheetName` sozinho.
   * Com o range sem coluna nenhuma, a API tenta adivinhar os limites da
   * tabela varrendo a linha inteira, e se existir qualquer valor solto
   * numa coluna distante (linha "órfã", teste manual, etc.) ela confunde
   * isso com a borda direita da tabela e passa a anexar cada vez mais
   * deslocado pra direita, longe da coluna A — foi exatamente esse bug que
   * fez alocações pararem de aparecer (a linha era gravada, só que fora de
   * onde o app lê). Restringir a coluna A garante que ela sempre ache a
   * próxima linha realmente vazia ali e escreva a partir da coluna A.
   */
  async appendRows(
    sheetName: string,
    rows: (string | number)[][],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const client = await this.getClient();
    await client.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  }

  /** Sobrescreve um intervalo específico (ex.: uma linha inteira já existente). */
  async updateRange(
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    const client = await this.getClient();
    await client.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  /**
   * TODO: implementar helper de "revalidação antes de gravar" mencionado no
   * CLAUDE.md — reler a linha/contagem da vaga imediatamente antes de
   * confirmar uma alocação, e rejeitar a escrita de forma explícita se o
   * estado mudou entre a leitura original e a gravação.
   */
}
