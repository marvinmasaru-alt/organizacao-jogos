import { StatusVaga, TipoTrabalho } from '../common/types/enums';

/** Espelha a aba VAGAS da planilha. */
export interface Vaga {
  id: string;
  data: string; // ISO date
  sedeId: string;
  tipo: TipoTrabalho;
  quantidade: number;
  status: StatusVaga;
}

/** Visão calculada usada pelo Board (nunca contar todas as linhas de ALOCACOES). */
export interface VagaComDisponibilidade extends Vaga {
  alocacoesValidas: number;
  disponiveis: number; // quantidade - alocacoesValidas, nunca negativo
}
