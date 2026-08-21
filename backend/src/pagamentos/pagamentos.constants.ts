import { TipoTrabalho } from '../common/types/enums';

/** Valores fixos hoje (CLAUDE.md) — considerar mover para planilha/config se mudarem por sede/período. */
export const VALOR_FUNCIONARIO: Record<TipoTrabalho, number> = {
  [TipoTrabalho.MANPOWER]: 12_000,
  [TipoTrabalho.FORKLIFT]: 15_000,
};

export const VALOR_REFERENCIA_RESPONSAVEL: Record<TipoTrabalho, number> = {
  [TipoTrabalho.MANPOWER]: 16_000,
  [TipoTrabalho.FORKLIFT]: 18_000,
};

/** Prazo de pagamento: até 1 semana após a data do trabalho. */
export const PRAZO_PAGAMENTO_DIAS = 7;
