/** Um tipo de trabalho e a quantidade padrão dele dentro de uma configuração. */
export interface ConfiguracaoVagaTipo {
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  quantidade: number;
}

/**
 * Visão agregada de uma "configuração de vaga fixa"
 * (docs/features/cadastro-vagas.md, seção 6) — junta `modelos_vagas` +
 * `modelo_vaga_tipos` + `modelo_vaga_dias` num único objeto, do jeito que
 * a tela de cadastro trata como "uma configuração".
 */
export interface ConfiguracaoVaga {
  id: string;
  sedeId: string;
  nome: string;
  ativo: boolean;
  observacao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  tipos: ConfiguracaoVagaTipo[];
  /** Dias da semana em que a sede opera essa configuração — 1 (segunda) a 7 (domingo). */
  diasSemana: number[];
}
