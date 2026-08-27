/**
 * Enums de negócio que não vêm do Prisma (não existem como coluna/enum no
 * banco). Os enums que espelham `docs/SQL/create.sql`
 * (StatusFuncionario, StatusVaga, StatusAlocacao, StatusConfirmacao,
 * TipoUsuario, TipoSede, StatusPagamento, ...) vêm direto de
 * `@prisma/client` — nunca duplicar aqui, pra não ter duas fontes de
 * verdade divergindo. `TipoTrabalho` NÃO é mais um enum — é uma tabela
 * dinâmica (`tipos_trabalho`, ver TiposTrabalhoModule), cadastrável pelo
 * Administrador.
 */

/** Perfil resolvido no login (JWT claim) — não é uma tabela, é derivado de `usuarios.tipo`. */
export enum PerfilUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  RESPONSAVEL = 'RESPONSAVEL',
}
