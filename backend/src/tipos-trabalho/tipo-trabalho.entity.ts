/**
 * Espelha a tabela `tipos_trabalho` (docs/SQL/create.sql) — tipo de
 * trabalho dinâmico (decisão revertida: não é mais o enum fixo
 * MANPOWER/FORKLIFT), cadastrado/editado só por Administrador.
 * `ativo=false` tira o tipo dos formulários novos sem apagar nada
 * (princípio geral de histórico) — vaga_tipos/alocacoes/tabela_valores/
 * modelo_vaga_tipos que já usam esse tipo continuam mostrando o nome
 * normalmente.
 */
export interface TipoTrabalho {
  id: string;
  nome: string;
  ativo: boolean;
}
