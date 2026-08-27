import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  EscopoSedes,
  NovaSituacao,
  ResumoConfirmacaoSede,
  SedeComConfirmacoes,
} from './confirmacao-dia.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoDiaService {
  private readonly http = inject(HttpClient);

  /** `data` ausente = modo "Todos" (sem filtrar por um dia específico). */
  listarSedes(data: string | null, escopo: EscopoSedes): Observable<SedeComConfirmacoes[]> {
    const params: Record<string, string> = { escopo };
    if (data) params['data'] = data;
    return this.http.get<SedeComConfirmacoes[]>(`${API_BASE_URL}/confirmacoes`, { params });
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
    necessitaSubstituicaoUrgente?: boolean,
  ): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/confirmacoes/${alocacaoId}`, {
      status,
      observacao,
      necessitaSubstituicaoUrgente,
    });
  }

  finalizar(sedeId: string, data: string): Observable<ResumoConfirmacaoSede> {
    return this.http.post<ResumoConfirmacaoSede>(`${API_BASE_URL}/confirmacoes/finalizar`, {
      sedeId,
      data,
    });
  }

  /** Só Administrador — backend rejeita pra qualquer outro perfil. */
  reabrir(sedeId: string, data: string): Observable<ResumoConfirmacaoSede> {
    return this.http.post<ResumoConfirmacaoSede>(`${API_BASE_URL}/confirmacoes/reabrir`, {
      sedeId,
      data,
    });
  }
}
