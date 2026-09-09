import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { ResponsavelPublico } from './responsavel.model';

/** Usado hoje só pra popular o dropdown de Administrador na tela de Funcionários. */
@Injectable({ providedIn: 'root' })
export class ResponsaveisService {
  private readonly http = inject(HttpClient);

  listarTodos(): Observable<ResponsavelPublico[]> {
    return this.http.get<ResponsavelPublico[]>(`${API_BASE_URL}/responsaveis`);
  }
}
