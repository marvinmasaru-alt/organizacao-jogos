import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import { DashboardResumo, EscopoSedes } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** O interceptor já anexa o token de sessão salvo. */
  resumoPorData(
    data: string,
    escopo: EscopoSedes,
  ): Observable<DashboardResumo> {
    return this.http.get<DashboardResumo>(`${API_BASE_URL}/dashboard`, {
      params: { data, escopo },
    });
  }
}
