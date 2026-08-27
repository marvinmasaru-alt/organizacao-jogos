import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { NovaTabelaValor, TabelaValor } from './tabela-valores.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. Só Administrador (PerfisGuard no backend). */
@Injectable({ providedIn: 'root' })
export class TabelaValoresService {
  private readonly http = inject(HttpClient);

  listarTodos(incluirInativos = true): Observable<TabelaValor[]> {
    return this.http.get<TabelaValor[]>(`${API_BASE_URL}/tabela-valores`, {
      params: { incluirInativos: String(incluirInativos) },
    });
  }

  criar(dto: NovaTabelaValor): Observable<TabelaValor> {
    return this.http.post<TabelaValor>(`${API_BASE_URL}/tabela-valores`, dto);
  }

  editar(id: string, dto: NovaTabelaValor): Observable<TabelaValor> {
    return this.http.patch<TabelaValor>(`${API_BASE_URL}/tabela-valores/${id}`, dto);
  }

  desativar(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/tabela-valores/${id}/desativar`, {});
  }

  ativar(id: string): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/tabela-valores/${id}/ativar`, {});
  }
}
