import { StatusAlocacao } from '@prisma/client';

/**
 * Espelha a tabela `alocacoes` (docs/SQL/create.sql), com três campos
 * calculados na leitura (nunca gravados na própria linha):
 *  - `data`: dia do trabalho, vem de `vagas.data` (join) — a tabela não
 *    tem coluna própria de data, só `data_alocacao` (timestamp de quando o
 *    registro foi criado, não o dia trabalhado).
 *  - `responsavelSedeId`: vem de `vagas.sede_id -> sedes.responsavel_id`
 *    (join). `responsavelId` (coluna real da tabela) é sempre o
 *    responsável pelo FORNECIMENTO (quem alocou) — decisão confirmada, já
 *    que o schema só tem uma FK de responsável na tabela.
 *  - `tipoTrabalhoNome`: vem de `tipo_trabalho_id -> tipos_trabalho.nome`
 *    (join) — tipo de trabalho é dinâmico (tabela `tipos_trabalho`, ver
 *    TiposTrabalhoModule), não mais um enum fixo MANPOWER/FORKLIFT.
 *
 * Falta/cancelamento não vivem mais aqui — ver `Confirmacao`
 * (tabela `confirmacoes`, 1:1 com esta), que guarda status
 * PENDENTE/PRESENTE/FALTOU/CANCELOU/SUBSTITUICAO_NECESSARIA + observação.
 */
export interface Alocacao {
  id: string;
  vagaId: string; // vagas.id real
  vagaTipoId: string; // vaga_tipos.id — o "vagaId" usado no resto da API
  funcionarioId: string;
  responsavelFornecimentoId: string;
  responsavelSedeId: string;
  tipoTrabalhoId: string;
  tipoTrabalhoNome: string;
  data: string; // ISO date, de vagas.data
  status: StatusAlocacao;
}
