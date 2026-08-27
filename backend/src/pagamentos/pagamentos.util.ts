import { StatusComissao, StatusPagamento } from '@prisma/client';
import { sanitizarNomePasta } from '../integracoes/google-drive/google-drive.service';
import { PRAZO_PAGAMENTO_DIAS, PRAZO_URGENTE_DIAS } from './pagamentos.constants';

/** Extensão pra reconhecer o tipo do arquivo salvo — mimetypes aceitos vêm do `fileFilter` de `PagamentosController` (só imagem). */
const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/**
 * Nome legível do comprovante no Drive (decisão do usuário) — ex.
 * "Comprovante-Adrian Shimabokuro-2026-08-27.jpg" em vez do antigo
 * `comprovante-<uuid>-<timestamp>` (só identificável abrindo o arquivo).
 */
export function montarNomeComprovante(
  nomeFuncionario: string,
  dataPagamento: string,
  mimeType: string,
): string {
  const extensao = EXTENSAO_POR_MIME[mimeType] ?? 'jpg';
  return `Comprovante-${sanitizarNomePasta(nomeFuncionario)}-${dataPagamento}.${extensao}`;
}

/** Status "rico" pra tela (docs/features/pagamento.md, seção 18) — nunca persistido, sempre calculado a partir de `StatusPagamento` + `dataPrevista`. */
export type StatusExibicaoPagamento =
  | 'A_VENCER'
  | 'VENCENDO'
  | 'ATRASADO'
  | 'PAGO'
  | 'CANCELADO';

/**
 * Status "rico" da comissão — mesmas janelas de prazo de
 * `StatusExibicaoPagamento`, mas rótulos próprios (RECEBIDA/CANCELADA em
 * vez de PAGO/CANCELADO) porque agora é um evento financeiro independente
 * do pagamento ao funcionário (decisão do usuário), não mais derivado
 * dele.
 */
export type StatusExibicaoComissao =
  | 'A_VENCER'
  | 'VENCENDO'
  | 'ATRASADO'
  | 'RECEBIDA'
  | 'CANCELADA';

export interface SplitComissao {
  resultadoCalculado: number;
  valorComissaoSede: number;
  valorComissaoFornecimento: number;
}

/**
 * Comissão = valor gerado − valor pago (previsto) ao funcionário
 * (docs/features/pagamento.md, seção 8).
 *
 * Mesmo responsável (ou sede sem responsável definido — caso não coberto
 * pela doc, tratado da mesma forma): todo o resultado fica na perna de
 * fornecimento, a perna da sede fica zerada — evita contar em dobro ao
 * somar "minha comissão" pelas duas FKs (seção 9).
 *
 * Responsáveis diferentes: dono da sede recebe sempre ¥1.000 fixo (nunca
 * 50/50, nunca condicional a comissão positiva — seções 10-12); o dono do
 * funcionário fica com o restante, que PODE ser negativo (seções 13-14).
 */
export function calcularSplitComissao(
  valorGerado: number,
  valorFuncionario: number,
  responsavelSedeId: string | null,
  responsavelFornecimentoId: string,
): SplitComissao {
  const resultadoCalculado = arredondar(valorGerado - valorFuncionario);
  const mesmoResponsavel =
    !responsavelSedeId || responsavelSedeId === responsavelFornecimentoId;

  if (mesmoResponsavel) {
    return {
      resultadoCalculado,
      valorComissaoSede: 0,
      valorComissaoFornecimento: resultadoCalculado,
    };
  }

  const COMISSAO_SEDE_FIXA = 1000;
  return {
    resultadoCalculado,
    valorComissaoSede: COMISSAO_SEDE_FIXA,
    valorComissaoFornecimento: arredondar(resultadoCalculado - COMISSAO_SEDE_FIXA),
  };
}

/** Janela de prazo compartilhada entre pagamento e comissão — só muda o rótulo de "concluído"/"cancelado" de cada um. */
function bucketPorPrazo(
  dataPrevista: Date | null,
): 'A_VENCER' | 'VENCENDO' | 'ATRASADO' {
  if (!dataPrevista) return 'A_VENCER';
  const diasRestantes = diasEntre(new Date(), dataPrevista);
  if (diasRestantes < 0) return 'ATRASADO';
  if (diasRestantes <= PRAZO_URGENTE_DIAS) return 'VENCENDO';
  return 'A_VENCER';
}

/**
 * Deriva o status de exibição a partir do status persistido +
 * `dataPrevista` — nunca gravado no banco (seção 18: "status deve ser
 * calculado/validado pelo backend").
 */
export function calcularStatusExibicao(
  status: StatusPagamento,
  dataPrevista: Date | null,
): StatusExibicaoPagamento {
  if (status === StatusPagamento.CANCELADO) return 'CANCELADO';
  if (status === StatusPagamento.PAGO) return 'PAGO';
  return bucketPorPrazo(dataPrevista);
}

/**
 * Mesma lógica de `calcularStatusExibicao`, mas pro status próprio da
 * comissão (`StatusComissao`, independente do `StatusPagamento` do
 * pagamento ligado — decisão do usuário).
 */
export function calcularStatusExibicaoComissao(
  status: StatusComissao,
  dataPrevista: Date | null,
): StatusExibicaoComissao {
  if (status === StatusComissao.CANCELADA) return 'CANCELADA';
  if (status === StatusComissao.RECEBIDA) return 'RECEBIDA';
  return bucketPorPrazo(dataPrevista);
}

/**
 * Dias restantes até `dataPrevista` (negativo = já venceu), ou `null` sem
 * data prevista — usado pros cards de resumo "próximos N dias" (seções
 * 20/23), que precisam da janela exata, diferente do bucket largo de
 * `calcularStatusExibicao` (que só distingue "vencendo" nos últimos
 * `PRAZO_URGENTE_DIAS`).
 */
export function diasRestantesAteVencimento(dataPrevista: Date | null): number | null {
  if (!dataPrevista) return null;
  return diasEntre(new Date(), dataPrevista);
}

/** Card "a receber/pagar nos próximos 7 dias" (seções 20/23) usa a mesma janela do prazo padrão de pagamento. */
export const PRAZO_PROXIMOS_DIAS = PRAZO_PAGAMENTO_DIAS;

function diasEntre(de: Date, ate: Date): number {
  const umDiaMs = 1000 * 60 * 60 * 24;
  const inicio = Date.UTC(de.getFullYear(), de.getMonth(), de.getDate());
  const fim = Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.floor((fim - inicio) / umDiaMs);
}

/** Evita erro de ponto flutuante (ex.: 0.1+0.2) nos valores em ¥ — 2 casas, igual as colunas Decimal(10,2). */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
