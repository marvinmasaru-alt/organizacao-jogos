/** Espelha a aba SEDES da planilha. */
export interface Sede {
  id: string;
  nome: string;
  tipoSede: string;
  responsavelId: string;
  status: string;
  localizacao: string; // link, deve ser exibido de forma clicável no board
  sigla: string; // coluna G — usada como prefixo nas pendências do Dashboard
}
