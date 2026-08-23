import { StatusVaga } from '@prisma/client';

/**
 * No banco, `vagas` (um dia+sede) e `vaga_tipos` (tipo+quantidade daquele
 * dia) são tabelas separadas — uma vaga pode ter várias linhas de tipo
 * (ex.: 4 Manpower + 2 Forklift no mesmo dia/sede). O resto do app (e o
 * frontend) sempre tratou "vaga" como um par único sede+data+tipo+
 * quantidade com um `id` só — pra não precisar reescrever essas camadas,
 * cada linha de `vaga_tipos` é exposta aqui como se fosse a antiga `Vaga`
 * plana: `id` = `vaga_tipos.id` (é o identificador usado em toda a API,
 * inclusive nas rotas de alocação). `vagaRealId` é o `vagas.id` de
 * verdade, usado só internamente (AlocarService) pra gravar
 * `alocacoes.vaga_id`.
 */
/** Origem da vaga (docs/features/cadastro-vagas.md, seção 12) — derivado de `modeloVagaId` ser nulo ou não, sem coluna própria. */
export type OrigemVaga = 'FIXA' | 'ESPORADICA';

export interface Vaga {
  id: string; // vaga_tipos.id
  vagaRealId: string; // vagas.id
  data: string; // ISO date (vagas.data)
  sedeId: string;
  tipoId: string; // tipos_trabalho.id — usado pra criar/filtrar alocações
  tipo: string; // tipos_trabalho.nome — usado pra exibição (era o enum antes)
  quantidade: number;
  status: StatusVaga;
  origem: OrigemVaga;
}

/** Visão calculada usada pelo Board (nunca contar todas as linhas de ALOCACOES). */
export interface VagaComDisponibilidade extends Vaga {
  alocacoesValidas: number;
  disponiveis: number; // quantidade - alocacoesValidas, nunca negativo
}
