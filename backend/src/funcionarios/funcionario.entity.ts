import { StatusFuncionario } from '../common/types/enums';

/**
 * Espelha a aba FUNCIONARIOS da planilha.
 * Colunas confirmadas direto na planilha (linha 1 = cabeçalho): A=Id,
 * B=Nome, C=Telefone, D=Provincia, E=codigo postal, F=Documento,
 * G=Responsável_ID, H=Status, I=Data cadastro, J=Data aprovação.
 * Cadastro entra via Google Forms — tratar sempre como possível "insert
 * externo" e nunca presumir que todo registro novo vem pela aplicação.
 */
export interface Funcionario {
  id: string; // ex.: F0001
  nome: string;
  telefone: string;
  provincia: string;
  codigoPostal: string;
  documento: string; // link/arquivo do documento
  responsavelCadastroId: string; // Responsavel que cadastrou
  status: StatusFuncionario;
  dataCadastro: string;
  dataAprovacao: string | null;
}

/**
 * Situação de um funcionário em relação a uma vaga/data específica, usada
 * na tela de Alocação (docs/features/alocacao.md, seções 6/11/12).
 * Conflito é sempre por dia: `ALOCADO` em outra vaga na MESMA data.
 */
export enum SituacaoParaAlocacao {
  DISPONIVEL = 'DISPONIVEL',
  ALOCADO_OUTRA_VAGA = 'ALOCADO_OUTRA_VAGA',
  JA_ALOCADO_NESTA_VAGA = 'JA_ALOCADO_NESTA_VAGA',
  CANCELOU_NESTA_VAGA = 'CANCELOU_NESTA_VAGA',
  FALTOU_NESTA_VAGA = 'FALTOU_NESTA_VAGA',
}

export interface FuncionarioParaAlocacao extends Funcionario {
  situacao: SituacaoParaAlocacao;
  /** true somente quando situacao === DISPONIVEL. */
  selecionavel: boolean;
}

/**
 * Um funcionário alocado numa vaga, visto por um usuário que pode não ser
 * o responsável que o cadastrou. `nome`/`telefone` vêm `null` juntos
 * quando o funcionário não pertence ao responsável logado nem à sede da
 * alocação (Administrador sempre vê) — a decisão de mascarar é sempre do
 * backend, nunca do frontend.
 *
 * `externo` só é true quando o nome ESTÁ visível mas o funcionário foi
 * cadastrado por outro responsável (o viewer só está vendo porque é
 * responsável pela sede, não porque o funcionário é dele) — sinaliza pro
 * frontend mostrar "(Externo)" ao lado do nome.
 */
export interface FuncionarioAlocadoNaVaga {
  alocacaoId: string;
  funcionarioId: string;
  nome: string | null;
  telefone: string | null;
  externo: boolean;
}
