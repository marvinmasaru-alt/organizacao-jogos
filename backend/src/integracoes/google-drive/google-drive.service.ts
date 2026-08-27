import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { google } from 'googleapis';

export interface ArquivoEnviado {
  fileId: string;
  webViewLink: string;
}

/**
 * Remove caracteres que quebram nome de pasta/arquivo no Drive (`/` vira
 * separador de caminho) e normaliza espaços — usada tanto pros segmentos
 * de pasta quanto pelo nome do próprio arquivo (ver
 * `pagamentos.util.ts#montarNomeComprovante`).
 */
export function sanitizarNomePasta(nome: string): string {
  return nome.replace(/[\\/]+/g, '-').replace(/\s+/g, ' ').trim();
}

/**
 * Upload de comprovante de pagamento pro Google Drive
 * (docs/features/pagamento.md, seção 26) — o banco nunca guarda o
 * binário, só o link/referência (`Pagamento.comprovanteUrl`).
 *
 * Autentica via Service Account (conta "robô" do Google Cloud, sem
 * depender de nenhum responsável logar no Google). Precisa de duas
 * variáveis de ambiente:
 *  - `GOOGLE_SERVICE_ACCOUNT_KEY`: a chave JSON da service account,
 *    inteira (crua ou em base64 — ver `lerCredenciais`).
 *  - `GOOGLE_DRIVE_FOLDER_ID`: id da pasta raiz onde os comprovantes são
 *    salvos, dentro de um **Drive Compartilhado** (Shared Drive) que tenha
 *    o e-mail da service account (`client_email` da chave) como membro.
 *
 * ⚠️ Precisa ser um Drive Compartilhado, não uma pasta comum do Meu
 * Drive de alguém: service accounts não têm cota de armazenamento
 * própria, então gravar num Meu Drive normal falha com
 * `storageQuotaExceeded` mesmo com a pasta compartilhada com ela — só
 * funciona dentro de um Shared Drive (aí o espaço é do Drive, não da
 * conta que grava). Por isso toda chamada de `drive.files.*`/
 * `drive.permissions.*` aqui passa `supportsAllDrives: true` — sem isso a
 * API trata o arquivo como se estivesse fora de um Shared Drive e falha.
 *
 * Organização das pastas (decisão do usuário): responsável do
 * fornecimento → ano-mês, ex. `Raiz/Responsavel B/2026-08/arquivo.jpg`
 * — cada segmento é resolvido/criado sob demanda em `resolverPastaDestino`
 * e cacheado em memória pelo tempo de vida do processo (evita relistar a
 * mesma subpasta a cada comprovante).
 */
@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  /** Cache `"<paiId>/<nome>" -> id da subpasta`, só em memória — some a cada reinício do processo, sem problema (é só evitar um round-trip repetido). */
  private readonly cachePastas = new Map<string, string>();

  /**
   * Sobe um arquivo e retorna o link de visualização (compartilhado por
   * link, só leitura). `subpastas` é o caminho dentro da raiz configurada
   * (`GOOGLE_DRIVE_FOLDER_ID`), ex. `['Responsavel B', '2026-08']` — cada
   * segmento é criado automaticamente se ainda não existir.
   */
  async uploadArquivo(
    buffer: Buffer,
    nomeArquivo: string,
    mimeType: string,
    subpastas: string[] = [],
  ): Promise<ArquivoEnviado> {
    const drive = this.clienteDrive();
    const pastaDestinoId = await this.resolverPastaDestino(drive, subpastas);

    const criado = await drive.files.create({
      requestBody: {
        name: nomeArquivo,
        parents: [pastaDestinoId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    const fileId = criado.data.id;
    if (!fileId) {
      throw new InternalServerErrorException('Google Drive não retornou o id do arquivo enviado.');
    }

    // Sem isso o link só abre pra quem já tem acesso à pasta (ninguém, já
    // que ela pertence à service account) — os responsáveis não têm login
    // Google vinculado, então o comprovante precisa ser aberto só com o
    // link, sem exigir permissão adicional.
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    const arquivo = await drive.files.get({ fileId, fields: 'webViewLink', supportsAllDrives: true });
    const webViewLink = arquivo.data.webViewLink;
    if (!webViewLink) {
      throw new InternalServerErrorException('Google Drive não retornou o link do arquivo enviado.');
    }

    this.logger.log(`Comprovante enviado ao Drive: ${subpastas.join('/')}/${nomeArquivo} (${fileId})`);
    return { fileId, webViewLink };
  }

  /** Anda pelo caminho de subpastas a partir da raiz, criando cada segmento que ainda não existir. */
  private async resolverPastaDestino(
    drive: ReturnType<typeof google.drive>,
    subpastas: string[],
  ): Promise<string> {
    const raizId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!raizId) {
      throw new InternalServerErrorException(
        'GOOGLE_DRIVE_FOLDER_ID não configurado — upload de comprovante indisponível.',
      );
    }

    let pastaAtualId = raizId;
    for (const segmento of subpastas) {
      const nome = sanitizarNomePasta(segmento);
      if (!nome) continue;
      pastaAtualId = await this.obterOuCriarSubpasta(drive, nome, pastaAtualId);
    }
    return pastaAtualId;
  }

  private async obterOuCriarSubpasta(
    drive: ReturnType<typeof google.drive>,
    nome: string,
    paiId: string,
  ): Promise<string> {
    const chaveCache = `${paiId}/${nome}`;
    const emCache = this.cachePastas.get(chaveCache);
    if (emCache) return emCache;

    const nomeEscapado = nome.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const busca = await drive.files.list({
      q: `name='${nomeEscapado}' and mimeType='application/vnd.google-apps.folder' and '${paiId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    const existenteId = busca.data.files?.[0]?.id;
    if (existenteId) {
      this.cachePastas.set(chaveCache, existenteId);
      return existenteId;
    }

    const criada = await drive.files.create({
      requestBody: { name: nome, mimeType: 'application/vnd.google-apps.folder', parents: [paiId] },
      fields: 'id',
      supportsAllDrives: true,
    });
    const novaId = criada.data.id;
    if (!novaId) {
      throw new InternalServerErrorException(`Não foi possível criar a subpasta "${nome}" no Drive.`);
    }
    this.cachePastas.set(chaveCache, novaId);
    return novaId;
  }

  private clienteDrive() {
    const credenciais = this.lerCredenciais();
    const auth = new google.auth.GoogleAuth({
      credentials: credenciais,
      // Precisa de mais que `drive.file` porque agora o service também
      // *lista* subpastas que talvez não tenham sido criadas por ele
      // (ex.: alguém criou a estrutura na mão) pra decidir se cria ou
      // reaproveita — `drive.file` só enxerga o que o próprio app criou.
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  }

  /** A chave pode vir crua (JSON) ou em base64 (mais seguro pra colar numa env var de uma linha só). */
  private lerCredenciais(): Record<string, unknown> {
    const bruto = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!bruto) {
      throw new InternalServerErrorException(
        'GOOGLE_SERVICE_ACCOUNT_KEY não configurado — upload de comprovante indisponível.',
      );
    }
    try {
      return JSON.parse(bruto);
    } catch {
      try {
        return JSON.parse(Buffer.from(bruto, 'base64').toString('utf-8'));
      } catch {
        throw new InternalServerErrorException(
          'GOOGLE_SERVICE_ACCOUNT_KEY inválido — precisa ser o JSON da service account, cru ou em base64.',
        );
      }
    }
  }
}
