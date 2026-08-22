import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { paraDataIso } from '../../core/utils/data.util';
import { ConfirmacaoDiaService } from './confirmacao-dia.service';
import {
  FuncionarioConfirmacao,
  NovaSituacao,
  ResumoConfirmacaoSede,
  SedeComConfirmacoes,
} from './confirmacao-dia.model';

type Estado = 'carregando' | 'erro' | 'carregado';

/**
 * Confirmação do Dia (docs/features/confirmacao-dia.md). Fluxo em 3 passos:
 * Data → Sedes (com atividade naquele dia) → Detalhe (resumo por tipo +
 * lista de funcionários, cada um marcado como Trabalhou/Cancelou/Faltou).
 * Cancelar/Faltar reaproveitam os fluxos que já existem no backend
 * (AlocacoesService.cancelar / FaltasService.registrar) — aqui só se
 * escolhe a situação, a regra de negócio mora lá.
 */
@Component({
  selector: 'app-confirmacao-dia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmacao-dia.component.html',
  styleUrl: './confirmacao-dia.component.scss',
})
export class ConfirmacaoDiaComponent implements OnInit {
  private readonly service = inject(ConfirmacaoDiaService);
  private readonly route = inject(ActivatedRoute);

  readonly data = signal(paraDataIso(new Date()));
  readonly estadoSedes = signal<Estado>('carregando');
  readonly sedes = signal<SedeComConfirmacoes[]>([]);

  readonly sedeSelecionadaId = signal<string | null>(null);
  readonly estadoDetalhe = signal<Estado>('carregando');
  readonly detalhe = signal<ResumoConfirmacaoSede | null>(null);

  /** alocacaoId -> em processamento (desabilita o próprio dropdown enquanto salva). */
  readonly salvando = signal<Set<string>>(new Set());
  readonly confirmandoTodos = signal(false);
  readonly mostrarConfirmarTodos = signal(false);
  readonly finalizando = signal(false);
  readonly erroFinalizar = signal<string | null>(null);
  readonly mensagemFinalizar = signal<string | null>(null);

  readonly sedeSelecionada = computed(() =>
    this.sedes().find((s) => s.sedeId === this.sedeSelecionadaId()) ?? null,
  );

  readonly pendentesRestantes = computed(
    () => this.detalhe()?.funcionarios.filter((f) => f.status === 'PENDENTE').length ?? 0,
  );

  readonly podeFinalizar = computed(
    () => this.estadoDetalhe() === 'carregado' && this.pendentesRestantes() === 0,
  );

  /** Funcionários agrupados por tipo de trabalho, na ordem em que aparecem no resumo. */
  readonly funcionariosPorTipo = computed(() => {
    const detalhe = this.detalhe();
    if (!detalhe) return [];
    return detalhe.resumoPorTipo.map((resumo) => ({
      resumo,
      funcionarios: detalhe.funcionarios.filter(
        (f) => f.tipoTrabalho === resumo.tipoTrabalho,
      ),
    }));
  });

  ngOnInit(): void {
    const queryData = this.route.snapshot.queryParamMap.get('data');
    if (queryData) {
      this.data.set(queryData);
    }
    this.carregarSedes();
  }

  irParaDataAnterior(): void {
    this.mudarData(-1);
  }

  irParaProximaData(): void {
    this.mudarData(1);
  }

  private mudarData(deltaDias: number): void {
    const atual = new Date(`${this.data()}T00:00:00`);
    atual.setDate(atual.getDate() + deltaDias);
    this.selecionarData(paraDataIso(atual));
  }

  selecionarData(dataIso: string): void {
    if (!dataIso) return;
    this.data.set(dataIso);
    this.voltarParaSedes();
    this.carregarSedes();
  }

  private carregarSedes(): void {
    this.estadoSedes.set('carregando');
    this.service.listarSedes(this.data()).subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        this.estadoSedes.set('carregado');
      },
      error: () => this.estadoSedes.set('erro'),
    });
  }

  selecionarSede(sede: SedeComConfirmacoes): void {
    this.sedeSelecionadaId.set(sede.sedeId);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
    this.carregarDetalhe();
  }

  voltarParaSedes(): void {
    this.sedeSelecionadaId.set(null);
    this.detalhe.set(null);
    this.mostrarConfirmarTodos.set(false);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
  }

  private carregarDetalhe(): void {
    const sedeId = this.sedeSelecionadaId();
    if (!sedeId) return;
    this.estadoDetalhe.set('carregando');
    this.service.resumoDaSede(sedeId, this.data()).subscribe({
      next: (detalhe) => {
        this.detalhe.set(detalhe);
        this.estadoDetalhe.set('carregado');
      },
      error: () => this.estadoDetalhe.set('erro'),
    });
  }

  /** Cor/rótulo consistentes com a seção 14/36 da doc. */
  corDoStatus(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'verde';
      case 'CANCELOU':
        return 'amarelo';
      case 'FALTOU':
      case 'SUBSTITUICAO_NECESSARIA':
        return 'vermelho';
      default:
        return 'azul';
    }
  }

  rotuloDoStatus(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'Trabalhou';
      case 'CANCELOU':
        return 'Cancelou';
      case 'FALTOU':
        return 'Faltou';
      case 'SUBSTITUICAO_NECESSARIA':
        return 'Faltou (urgente)';
      default:
        return 'Pendente';
    }
  }

  alterarSituacao(funcionario: FuncionarioConfirmacao, novaSituacao: string): void {
    if (!novaSituacao) return;
    this.definirSalvando(funcionario.alocacaoId, true);
    this.service
      .atualizarSituacao(funcionario.alocacaoId, novaSituacao as NovaSituacao)
      .subscribe({
        next: () => {
          this.definirSalvando(funcionario.alocacaoId, false);
          this.carregarDetalhe();
        },
        error: () => {
          this.definirSalvando(funcionario.alocacaoId, false);
          this.estadoDetalhe.set('erro');
        },
      });
  }

  private definirSalvando(alocacaoId: string, valor: boolean): void {
    const novo = new Set(this.salvando());
    valor ? novo.add(alocacaoId) : novo.delete(alocacaoId);
    this.salvando.set(novo);
  }

  abrirConfirmarTodos(): void {
    this.mostrarConfirmarTodos.set(true);
  }

  cancelarConfirmarTodos(): void {
    this.mostrarConfirmarTodos.set(false);
  }

  confirmarTodos(): void {
    const sedeId = this.sedeSelecionadaId();
    if (!sedeId) return;
    this.confirmandoTodos.set(true);
    this.service.confirmarTodos(sedeId, this.data()).subscribe({
      next: () => {
        this.confirmandoTodos.set(false);
        this.mostrarConfirmarTodos.set(false);
        this.carregarDetalhe();
      },
      error: () => {
        this.confirmandoTodos.set(false);
        this.mostrarConfirmarTodos.set(false);
        this.estadoDetalhe.set('erro');
      },
    });
  }

  finalizarConferencia(): void {
    const sedeId = this.sedeSelecionadaId();
    if (!sedeId || !this.podeFinalizar()) return;
    this.finalizando.set(true);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
    this.service.finalizar(sedeId, this.data()).subscribe({
      next: () => {
        this.finalizando.set(false);
        this.mensagemFinalizar.set('Conferência do dia finalizada.');
      },
      error: (erro) => {
        this.finalizando.set(false);
        this.erroFinalizar.set(
          erro?.error?.message ?? 'Não foi possível finalizar a conferência.',
        );
      },
    });
  }
}
