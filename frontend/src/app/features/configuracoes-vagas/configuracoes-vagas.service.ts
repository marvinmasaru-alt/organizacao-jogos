import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  ConfiguracaoVaga,
  CriarConfiguracaoVaga,
  CriarVagaEsporadica,
  Sede,
  Vaga,
} from './configuracoes-vagas.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. */
@Injectable({ providedIn: 'root' })
export class ConfiguracoesVagasService {
  private readonly http = inject(HttpClient);

  listarSedes(): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${API_BASE_URL}/sedes`);
  }

  listarConfiguracoes(sedeId?: string): Observable<ConfiguracaoVaga[]> {
    return this.http.get<ConfiguracaoVaga[]>(`${API_BASE_URL}/configuracoes-vagas`, {
      params: sedeId ? { sedeId } : {},
    });
  }

  criarConfiguracao(dto: CriarConfiguracaoVaga): Observable<ConfiguracaoVaga> {
    return this.http.post<ConfiguracaoVaga>(`${API_BASE_URL}/configuracoes-vagas`, dto);
  }

  inativarConfiguracao(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/configuracoes-vagas/${id}/inativar`, {});
  }

  criarVagaEsporadica(dto: CriarVagaEsporadica): Observable<Vaga[]> {
    return this.http.post<Vaga[]>(`${API_BASE_URL}/vagas`, dto);
  }

  listarVagasPorData(data: string): Observable<Vaga[]> {
    return this.http.get<Vaga[]>(`${API_BASE_URL}/vagas`, { params: { data } });
  }

  cancelarVaga(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/vagas/${id}/cancelar`, {});
  }
}
