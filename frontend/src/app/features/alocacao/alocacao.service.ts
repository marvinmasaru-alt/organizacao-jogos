import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  DashboardResumo,
  EscopoSedes,
  FuncionarioParaAlocacao,
  ItemAlocacao,
} from './alocacao.model';

@Injectable({ providedIn: 'root' })
export class AlocacaoService {
  private readonly http = inject(HttpClient);

  /**
   * Reaproveita GET /dashboard pra listar sedes/vagas do dia — mesma lógica
   * de agrupamento sede→vagas já implementada e testada lá, sem duplicar.
   * `escopo` é só conveniência de visualização (igual no Dashboard) — sedes
   * não têm restrição de acesso real.
   */
  resumoDoDia(
    data: string,
    escopo: EscopoSedes,
  ): Observable<DashboardResumo> {
    return this.http.get<DashboardResumo>(`${API_BASE_URL}/dashboard`, {
      params: { data, escopo },
    });
  }

  /** O interceptor já anexa o token; responsavelId vem da sessão no backend. */
  funcionariosParaVaga(
    vagaId: string,
    data: string,
  ): Observable<FuncionarioParaAlocacao[]> {
    return this.http.get<FuncionarioParaAlocacao[]>(
      `${API_BASE_URL}/funcionarios/disponiveis`,
      { params: { vagaId, data } },
    );
  }

  /** Lote tudo-ou-nada — ver AlocarService no backend. */
  criarAlocacoes(itens: ItemAlocacao[]): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/alocacoes`, { alocacoes: itens });
  }
}
