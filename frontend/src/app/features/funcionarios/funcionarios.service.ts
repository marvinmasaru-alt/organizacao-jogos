import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { AtualizarFuncionario, CadastrarFuncionario, Funcionario } from './funcionario.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. */
@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private readonly http = inject(HttpClient);

  /**
   * Funcionários "meus" (tela de gestão). Responsável não passa
   * `responsavelId` — o backend resolve pela sessão. Administrador pode
   * passar pra filtrar por um responsável específico; sem isso vê todos.
   */
  listarMeus(responsavelId?: string): Observable<Funcionario[]> {
    return this.http.get<Funcionario[]>(`${API_BASE_URL}/funcionarios/meus`, {
      params: responsavelId ? { responsavelId } : {},
    });
  }

  cadastrar(dados: CadastrarFuncionario): Observable<Funcionario> {
    return this.http.post<Funcionario>(`${API_BASE_URL}/funcionarios`, dados);
  }

  atualizar(id: string, dados: AtualizarFuncionario): Observable<Funcionario> {
    return this.http.patch<Funcionario>(
      `${API_BASE_URL}/funcionarios/${id}`,
      dados,
    );
  }
}
