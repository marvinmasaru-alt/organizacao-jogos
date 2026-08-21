import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from './dashboard.service';
import { DashboardResumo, EscopoSedes } from './dashboard.model';

type EstadoTela = 'carregando' | 'erro' | 'vazio' | 'carregado';

/**
 * Formata em YYYY-MM-DD usando os componentes LOCAIS da data — nunca usar
 * toISOString() aqui, porque ele converte pra UTC e desalinha o dia em
 * qualquer fuso diferente de UTC+0 (ex.: JST é UTC+9, então
 * toISOString() "puxava" a data pro dia anterior).
 */
function paraDataIso(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);

  readonly data = signal(paraDataIso(new Date()));
  readonly escopo = signal<EscopoSedes>('minha');
  readonly estado = signal<EstadoTela>('carregando');
  readonly resumo = signal<DashboardResumo | null>(null);

  /** Administrador não tem "minha sede" — o filtro não faz sentido pra ele. */
  readonly mostrarSeletorDeEscopo = computed(
    () => this.auth.usuario()?.perfil !== 'ADMINISTRADOR',
  );

  ngOnInit(): void {
    this.carregar();
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
