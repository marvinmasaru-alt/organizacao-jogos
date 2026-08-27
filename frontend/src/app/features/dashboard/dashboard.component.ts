import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { paraDataIso } from '../../core/utils/data.util';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import { DashboardService } from './dashboard.service';
import { DashboardResumo, EscopoSedes } from './dashboard.model';

type EstadoTela = 'carregando' | 'erro' | 'vazio' | 'carregado';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly pagamentosService = inject(PagamentosService);

  readonly data = signal(paraDataIso(new Date()));
  /**
   * Padrão é "minha sede" pra Responsável (o que ele mais usa no dia a
   * dia); Administrador não tem sede própria, então "minha" mostraria
   * zero sedes pra ele — abre em "todas" (ele pode ver todas de qualquer
   * jeito, o seletor fica só como conveniência de navegação pra ele).
   */
  readonly escopo = signal<EscopoSedes>(
    this.auth.usuario()?.perfil === 'ADMINISTRADOR' ? 'todas' : 'minha',
  );
  readonly estado = signal<EstadoTela>('carregando');
  readonly resumo = signal<DashboardResumo | null>(null);

  /**
   * Pagamentos pendentes (independente do dia/escopo selecionado acima —
   * é sempre o total em aberto de hoje pra frente, não uma foto de um dia
   * só) — carregado uma vez, não precisa recarregar a cada troca de data.
   */
  readonly totalAPagarPendente = signal<number | null>(null);
  readonly totalAReceberPendente = signal<number | null>(null);

  /** Cadastro de vagas (docs/features/cadastro-vagas.md) é só Administrador. */
  readonly souAdministrador = computed(
    () => this.auth.usuario()?.perfil === 'ADMINISTRADOR',
  );

  ngOnInit(): void {
    this.carregar();
    this.carregarPagamentosPendentes();
  }

  irParaDataAnterior(): void {
    this.mudarData(-1);
  }

  irParaProximaData(): void {
    this.mudarData(1);
  }

  selecionarData(dataIso: string): void {
    if (!dataIso) {
      return;
    }
    this.data.set(dataIso);
    this.carregar();
  }

  selecionarEscopo(escopo: string): void {
    this.escopo.set(escopo === 'minha' ? 'minha' : 'todas');
    this.carregar();
  }

  private mudarData(deltaDias: number): void {
    const atual = new Date(`${this.data()}T00:00:00`);
    atual.setDate(atual.getDate() + deltaDias);
    this.data.set(paraDataIso(atual));
    this.carregar();
  }

  private carregarPagamentosPendentes(): void {
    this.pagamentosService.resumoPagamentosFuncionarios({}).subscribe({
      next: (resumo) => this.totalAPagarPendente.set(resumo.totalAPagar),
      error: () => this.totalAPagarPendente.set(null),
    });
    this.pagamentosService.resumoComissoes({}).subscribe({
      next: (resumo) => this.totalAReceberPendente.set(resumo.totalAReceber),
      error: () => this.totalAReceberPendente.set(null),
    });
  }

  private carregar(): void {
    this.estado.set('carregando');
    this.service.resumoPorData(this.data(), this.escopo()).subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.estado.set(resumo.sedes.length === 0 ? 'vazio' : 'carregado');
      },
      error: () => {
        this.resumo.set(null);
        this.estado.set('erro');
      },
    });
  }
}
