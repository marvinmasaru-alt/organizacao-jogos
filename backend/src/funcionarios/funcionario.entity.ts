import { StatusFuncionario } from '../common/types/enums';

/**
 * Espelha a aba FUNCIONARIOS da planilha.
 * Cadastro entra via Google Forms — tratar sempre como possível "insert
 * externo" e nunca presumir que todo registro novo vem pela aplicação.
 */
export interface Funcionario {
  id: string; // ex.: F0001
  nome: string;
  telefone: string;
  documento: string; // link/arquivo do documento
  provincia: string;
  codigoPostal: string;
  responsavelCadastroId: string; // Responsavel que cadastrou
  dataCadastro: string;
  status: StatusFuncionario;
}
