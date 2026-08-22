import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  NovaSituacao,
  ResumoConfirmacaoSede,
  SedeComConfirmacoes,
} from './confirmacao-dia.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoDiaService {
  private readonly http = inject(HttpClient);

  listarSedes(data: string): Observable<SedeComConfirmacoes[]> {
    return this.http.get<SedeComConfirmacoes[]>(`${API_BASE_URL}/confirmacoes`, {
      params: { data },
    });
  }

  resumoDaSede(sedeId: string, data: string): Observable<ResumoConfirmacaoSede> {
    return this.http.get<ResumoConfirmacaoSede>(`${API_BASE_URL}/confirmacoes`, {
      params: { data, sedeId },
    });
  }

  atualizarSituacao(
    alocacaoId: string,
    status: NovaSituacao,
    observacao?: string,
  ): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/confirmacoes/${alocacaoId}`, {
      status,
      observacao,
    });
  }

  confirmarTodos(sedeId: string, data: string): Observable<{ confirmados: number }> {
    return this.http.post<{ confirmados: number }>(`${API_BASE_URL}/confirmacoes/todos`, {
      sedeId,
      data,
    });
  }

  finalizar(sedeId: string, data: string): Observable<ResumoConfirmacaoSede> {
    return this.http.post<ResumoConfirmacaoSede>(`${API_BASE_URL}/confirmacoes/finalizar`, {
      sedeId,
      data,
    });
  }
}
