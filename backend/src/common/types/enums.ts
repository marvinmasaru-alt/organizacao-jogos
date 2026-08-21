/**
 * Enums de negócio que não vêm do Prisma (não existem como coluna/enum no
 * banco). Os enums que espelham `docs/SQL/create.sql`
 * (StatusFuncionario, TipoTrabalho, StatusVaga, StatusAlocacao,
 * StatusConfirmacao, TipoUsuario, TipoSede, StatusPagamento, ...) vêm
 * direto de `@prisma/client` — nunca duplicar aqui, pra não ter duas
 * fontes de verdade divergindo.
 */

/** Perfil resolvido no login (JWT claim) — não é uma tabela, é derivado de `usuarios.tipo`. */
export enum PerfilUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  RESPONSAVEL = 'RESPONSAVEL',
}

/**
 * Indicador visual de prazo de pagamento (🟢/🟡/🔴 — CLAUDE.md). Calculado
 * em memória a partir da data do trabalho, nunca gravado no banco — não
 * confundir com `StatusPagamento` do Prisma (PENDENTE/PAGO/CANCELADO), que
 * é o status persistido em `pagamentos.status`.
 */
export enum StatusPrazoPagamento {
  NO_PRAZO = 'NO_PRAZO',
  PROXIMO_VENCIMENTO = 'PROXIMO_VENCIMENTO',
  VENCIDO = 'VENCIDO',
}
