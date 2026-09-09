/** Espelha backend/src/responsaveis/responsavel.entity.ts (ResponsavelPublico, sem senha). */
export interface ResponsavelPublico {
  id: string;
  usuarioId: string | null;
  nome: string;
  email: string;
  ativo: boolean;
}
