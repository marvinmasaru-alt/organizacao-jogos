/**
 * Espelha a tabela `responsaveis` (docs/SQL/create.sql). O login não mora
 * aqui — vive em `usuarios.senha_hash` (ver AuthService); `usuarioId` é só
 * o vínculo entre as duas tabelas.
 */
export interface Responsavel {
  id: string;
  usuarioId: string | null;
  nome: string;
  email: string;
  /** Código distribuído aos funcionários pro link de cadastro via Google Forms — não é senha de login. */
  senhaDistribuicao: string;
  ativo: boolean;
}

/** Versão segura para expor em endpoints públicos. */
export type ResponsavelPublico = Omit<Responsavel, 'senhaDistribuicao'>;

export function paraResponsavelPublico(r: Responsavel): ResponsavelPublico {
  const { senhaDistribuicao: _senhaDistribuicao, ...publico } = r;
  return publico;
}
