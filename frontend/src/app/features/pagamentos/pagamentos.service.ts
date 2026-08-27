import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  FiltrosPagamentos,
  ItemComissaoAReceber,
  ItemPagamentoFuncionario,
  MarcarComissaoRecebidaPayload,
  RegistrarPagamentoPayload,
  ResumoComissoes,
  ResumoPagamentosFuncionarios,
} from './pagamentos.model';

/** O interceptor já anexa o token de sessão salvo em toda chamada. */
@Injectable({ providedIn: 'root' })
export class PagamentosService {
  private readonly http = inject(HttpClient);

  listarPagamentosFuncionarios(filtros: FiltrosPagamentos): Observable<ItemPagamentoFuncionario[]> {
    return this.http.get<ItemPagamentoFuncionario[]>(`${API_BASE_URL}/pagamentos/funcionarios`, {
      params: this.paramsDeFiltros(filtros),
    });
  }

  resumoPagamentosFuncionarios(filtros: FiltrosPagamentos): Observable<ResumoPagamentosFuncionarios> {
    return this.http.get<ResumoPagamentosFuncionarios>(`${API_BASE_URL}/pagamentos/funcionarios/resumo`, {
      params: this.paramsDeFiltros(filtros),
    });
  }

  listarComissoes(filtros: FiltrosPagamentos): Observable<ItemComissaoAReceber[]> {
    return this.http.get<ItemComissaoAReceber[]>(`${API_BASE_URL}/pagamentos/comissoes`, {
      params: this.paramsDeFiltros(filtros),
    });
  }

  resumoComissoes(filtros: FiltrosPagamentos): Observable<ResumoComissoes> {
    return this.http.get<ResumoComissoes>(`${API_BASE_URL}/pagamentos/comissoes/resumo`, {
      params: this.paramsDeFiltros(filtros),
    });
  }

  /** multipart/form-data — primeiro upload de arquivo do frontend, por isso monta FormData na mão (sem setar Content-Type, o browser define o boundary). */
  registrarPagamento(id: string, payload: RegistrarPagamentoPayload): Observable<ItemPagamentoFuncionario> {
    const dados = new FormData();
    dados.set('valorPago', String(payload.valorPago));
    dados.set('dataPagamento', payload.dataPagamento);
    if (payload.observacao) dados.set('observacao', payload.observacao);
    if (payload.comprovante) dados.set('comprovante', payload.comprovante);
    return this.http.patch<ItemPagamentoFuncionario>(`${API_BASE_URL}/pagamentos/${id}/registrar`, dados);
  }

  /** Independente de registrar pagamento ao funcionário (decisão do usuário) — sem arquivo, sem valor, só confirma que a comissão foi recebida. */
  marcarComissaoRecebida(
    id: string,
    payload: MarcarComissaoRecebidaPayload = {},
  ): Observable<ItemComissaoAReceber> {
    return this.http.patch<ItemComissaoAReceber>(
      `${API_BASE_URL}/pagamentos/comissoes/${id}/marcar-recebida`,
      payload,
    );
  }

  private paramsDeFiltros(filtros: FiltrosPagamentos): Record<string, string> {
    const params: Record<string, string> = {};
    if (filtros.dataInicio) params['dataInicio'] = filtros.dataInicio;
    if (filtros.dataFim) params['dataFim'] = filtros.dataFim;
    if (filtros.status) params['status'] = filtros.status;
    if (filtros.sedeId) params['sedeId'] = filtros.sedeId;
    if (filtros.tipoTrabalhoId) params['tipoTrabalhoId'] = filtros.tipoTrabalhoId;
    if (filtros.tipoSede) params['tipoSede'] = filtros.tipoSede;
    return params;
  }
}
