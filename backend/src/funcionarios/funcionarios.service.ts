import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { StatusFuncionario } from '../common/types/enums';
import { Funcionario } from './funcionario.entity';

const SHEET_NAME = 'FUNCIONARIOS';

@Injectable()
export class FuncionariosService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  // TODO: mapear as linhas cruas da planilha para Funcionario[].
  async listarTodos(): Promise<Funcionario[]> {
    await this.sheets.readSheet(SHEET_NAME);
    return [];
  }

  /**
   * Funcionários disponíveis para alocação por um responsável específico.
   * Regra crítica (CLAUDE.md): só aparecem funcionários APROVADOS e
   * cadastrados por esse mesmo responsável — mesmo que outro funcionário
   * esteja livre, outro responsável não pode selecioná-lo.
   */
  async listarDisponiveisParaResponsavel(
    responsavelId: string,
  ): Promise<Funcionario[]> {
    const todos = await this.listarTodos();
    return todos.filter(
      (f) =>
        f.responsavelCadastroId === responsavelId &&
        f.status === StatusFuncionario.APROVADO,
    );
  }

  /** Só o administrador aprova. Validação de perfil fica no controller/guard. */
  async aprovar(id: string): Promise<void> {
    // TODO: reler a linha do funcionário, alterar status para APROVADO e
    // gravar de volta (nunca apagar/recriar a linha).
    void id;
  }
}
