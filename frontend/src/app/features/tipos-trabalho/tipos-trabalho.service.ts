import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { TipoTrabalho } from './tipos-trabalho.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. Só Administrador (PerfisGuard no backend). */
@Injectable({ providedIn: 'root' })
export class TiposTrabalhoService {
  private readonly http = inject(HttpClient);

  /** `incluirInativos: true` é o que esta tela de gestão usa — os formulários de cadastro de vaga usam o padrão (só ativos). */
  listarTodos(incluirInativos = true): Observable<TipoTrabalho[]> {
    return this.http.get<TipoTrabalho[]>(`${API_BASE_URL}/tipos-trabalho`, {
      params: { incluirInativos: String(incluirInativos) },
    });
  }

  criar(nome: string): Observable<TipoTrabalho> {
    return this.http.post<TipoTrabalho>(`${API_BASE_URL}/tipos-trabalho`, { nome });
  }

  editar(id: string, nome: string): Observable<TipoTrabalho> {
    return this.http.patch<TipoTrabalho>(`${API_BASE_URL}/tipos-trabalho/${id}`, { nome });
  }

  desativar(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/tipos-trabalho/${id}/desativar`, {});
  }

  ativar(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/tipos-trabalho/${id}/ativar`, {});
  }
}
