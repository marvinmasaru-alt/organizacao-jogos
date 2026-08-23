/** Espelha backend/src/tipos-trabalho/tipo-trabalho.entity.ts — dinâmico, cadastrado pelo Administrador. */
export interface TipoTrabalho {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Sede {
  id: string;
  sigla: string;
  nome: string;
  endereco: string | null;
  tipoSede: 'HUB' | 'EXTERNA';
  ativo: boolean;
}

export interface ConfiguracaoVagaTipo {
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  quantidade: number;
}

/** Corpo enviado ao criar — só o id, o nome vem do backend na resposta. */
export interface NovoConfiguracaoVagaTipo {
  tipoTrabalhoId: string;
  quantidade: number;
}

/** Espelha backend/src/configuracoes-vagas/configuracao-vaga.entity.ts. */
export interface ConfiguracaoVaga {
  id: string;
  sedeId: string;
  nome: string;
  ativo: boolean;
  observacao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  tipos: ConfiguracaoVagaTipo[];
  diasSemana: number[];
}

export interface CriarConfiguracaoVaga {
  sedeId: string;
  nome: string;
  tipos: NovoConfiguracaoVagaTipo[];
  diasSemana: number[];
  dataInicio?: string;
  dataFim?: string;
  observacao?: string;
}

export interface CriarVagaEsporadica {
  sedeId: string;
  data: string;
  tipos: NovoConfiguracaoVagaTipo[];
  observacao?: string;
}

/** Espelha backend/src/vagas/vaga.entity.ts (id = vaga_tipos.id). */
export interface Vaga {
  id: string;
  data: string;
  sedeId: string;
  tipoId: string;
  tipo: string;
  quantidade: number;
  status: 'ABERTA' | 'INCOMPLETA' | 'COMPLETA' | 'CANCELADA';
  origem: 'FIXA' | 'ESPORADICA';
}

export const DIAS_SEMANA: { valor: number; label: string }[] = [
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
  { valor: 7, label: 'Domingo' },
];
