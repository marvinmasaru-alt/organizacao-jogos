import { Injectable } from '@nestjs/common';
import { GoogleSheetsService } from '../common/google-sheets/google-sheets.service';
import { Responsavel } from './responsavel.entity';

const SHEET_NAME = 'RESPONSAVEIS';

@Injectable()
export class ResponsaveisService {
  constructor(private readonly sheets: GoogleSheetsService) {}

  async listarTodos(): Promise<Responsavel[]> {
    const linhas = await this.sheets.readSheet(SHEET_NAME);
    // Linha 1 é cabeçalho (ID, Nome, Codigo, Status, Email, LinkCadastro).
    return linhas.slice(1).map((linha) => this.mapearLinha(linha));
  }

  async buscarPorId(id: string): Promise<Responsavel | null> {
    const todos = await this.listarTodos();
    return todos.find((r) => r.id === id) ?? null;
  }

  /** Usado pelo AuthService para mapear login Google -> Responsavel_ID. */
  async buscarPorEmail(email: string): Promise<Responsavel | null> {
    const todos = await this.listarTodos();
    const emailNormalizado = email.trim().toLowerCase();
    return (
      todos.find((r) => r.email.trim().toLowerCase() === emailNormalizado) ??
      null
    );
  }

  private mapearLinha(linha: string[]): Responsavel {
    const [id, nome, codigo, status, email, linkCadastro, senha] = linha;
    return {
      id: id ?? '',
      nome: nome ?? '',
      codigo: codigo ?? '',
      status: status ?? '',
      email: email ?? '',
      linkCadastro: linkCadastro ?? '',
      senha: senha ?? '',
    };
  }
}
