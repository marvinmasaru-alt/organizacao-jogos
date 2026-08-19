/**
 * Espelha a aba RESPONSAVEIS da planilha.
 * Colunas (linha 1 = cabeçalho): A=ID, B=Nome, C=Codigo, D=Status,
 * E=Email, F=LinkCadastro (link que o responsável manda para os
 * funcionários se cadastrarem via Google Forms), G=Senha (login do
 * sistema — texto puro na planilha, como mantido hoje na aba).
 */
export interface Responsavel {
  id: string; // ex.: R001 (coluna A)
  nome: string; // coluna B
  codigo: string; // coluna C
  status: string; // coluna D
  email: string; // coluna E — usado como login
  linkCadastro: string; // coluna F
  senha: string; // coluna G — nunca deve sair em resposta de API pública
}

/** Versão segura para expor em endpoints públicos (sem a senha). */
export type ResponsavelPublico = Omit<Responsavel, 'senha'>;

export function paraResponsavelPublico(r: Responsavel): ResponsavelPublico {
  const { senha: _senha, ...publico } = r;
  return publico;
}
