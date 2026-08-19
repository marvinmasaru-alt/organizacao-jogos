import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { UsuarioAutenticado } from './usuario.model';

const TOKEN_KEY = 'auth_token';

interface LoginResponse {
  token: string;
  usuario: UsuarioAutenticado;
}

/**
 * Sessão do usuário logado (e-mail + senha, validados contra a aba
 * RESPONSAVEIS / credenciais do administrador). O signal é a fonte da
 * verdade lida pelos guards/telas; o token fica em localStorage só para
 * sobreviver a um refresh de página.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usuarioAtual = signal<UsuarioAutenticado | null>(null);
  readonly usuario = this.usuarioAtual.asReadonly();

  estaAutenticado(): boolean {
    return this.usuarioAtual() !== null;
  }

  obterToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, senha: string): Observable<UsuarioAutenticado> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, senha })
      .pipe(
        tap(({ token, usuario }) => {
          localStorage.setItem(TOKEN_KEY, token);
          this.usuarioAtual.set(usuario);
        }),
        map(({ usuario }) => usuario),
      );
  }

  /** Chama GET /auth/me (o interceptor já anexa o token salvo) e popula o signal. */
  carregarUsuarioAtual(): Observable<UsuarioAutenticado> {
    return this.http
      .get<UsuarioAutenticado>(`${API_BASE_URL}/auth/me`)
      .pipe(tap((usuario) => this.usuarioAtual.set(usuario)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.usuarioAtual.set(null);
  }

  /**
   * Roda uma vez na inicialização da app (ver app.config.ts): se há um
   * token salvo de uma sessão anterior, tenta restaurá-la antes dos guards
   * de rota avaliarem — sem isso, um F5 sempre mandaria o usuário pro
   * login mesmo com token válido.
   */
  restaurarSessao(): Observable<UsuarioAutenticado | null> {
    if (!this.obterToken()) {
      return of(null);
    }
    return this.carregarUsuarioAtual().pipe(
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }
}
