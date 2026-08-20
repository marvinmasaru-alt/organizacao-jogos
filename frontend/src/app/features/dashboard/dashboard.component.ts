import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { DashboardResumo } from './dashboard.model';

type EstadoTela = 'carregando' | 'erro' | 'vazio' | 'carregado';

function paraDataIso(d: Date): string {
  return d.toISOString().slice(0, 10);
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

  readonly data = signal(paraDataIso(new Date()));
  readonly estado = signal<EstadoTela>('carregando');
  readonly resumo = signal<DashboardResumo | null>(null);

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

  private mudarData(deltaDias: number): void {
    const atual = new Date(`${this.data()}T00:00:00`);
    atual.setDate(atual.getDate() + deltaDias);
    this.data.set(paraDataIso(atual));
    this.carregar();
  }

  private carregar(): void {
    this.estado.set('carregando');
    this.service.resumoPorData(this.data()).subscribe({
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
