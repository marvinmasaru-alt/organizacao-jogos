import { TipoSede } from '@prisma/client';

/** Espelha a tabela `sedes` (docs/SQL/create.sql). */
export interface Sede {
  id: string;
  sigla: string;
  nome: string;
  /** Reaproveitado como o campo clicável no board — o schema não tem uma coluna separada de link do Maps. */
  endereco: string | null;
  tipoSede: TipoSede;
  cluster: string | null;
  responsavelId: string | null;
  ativo: boolean;
}
