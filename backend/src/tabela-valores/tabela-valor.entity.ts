import { TipoSede } from '@prisma/client';

/**
 * Espelha a tabela `tabela_valores` (docs/SQL/create.sql) — valor de
 * referência por tipo de trabalho + tipo de sede, com vigência
 * (docs/features/pagamento.md, seções 4/6/7). Cadastrado/editado só por
 * Administrador (TabelaValoresModule).
 *
 * `valor` = "valor gerado" (o que a sede paga pelo trabalho). `salarioBase`
 * = valor-base do funcionário, obrigatório só quando `tipoSede = EXTERNA`
 * — em sede HUB o pagamento ao funcionário é livre (definido na hora de
 * registrar o pagamento, não configurado aqui), então fica sempre `null`.
 */
export interface TabelaValor {
  id: string;
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  tipoSede: TipoSede;
  valor: number;
  salarioBase: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  ativo: boolean;
}
