export type TipoSede = 'HUB' | 'EXTERNA';

/** Espelha backend/src/tabela-valores/tabela-valor.entity.ts. */
export interface TabelaValor {
  id: string;
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  tipoSede: TipoSede;
  valor: number;
  /** Valor-base do funcionário — obrigatório em EXTERNA, sempre null em HUB (pagamento livre). */
  salarioBase: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  ativo: boolean;
}

export interface NovaTabelaValor {
  tipoTrabalhoId: string;
  tipoSede: TipoSede;
  valor: number;
  salarioBase?: number;
  dataInicio?: string;
  dataFim?: string;
}
