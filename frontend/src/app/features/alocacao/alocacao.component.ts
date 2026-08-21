import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { paraDataIso } from '../../core/utils/data.util';
import { AlocacaoService } from './alocacao.service';
import {
  DashboardResumo,
  EscopoSedes,
  FuncionarioParaAlocacao,
  SedeComVagas,
  SituacaoParaAlocacao,
} from './alocacao.model';

type EstadoResumo = 'carregando' | 'erro' | 'carregado';
type EstadoFuncionarios = 'ocioso' | 'carregando' | 'erro' | 'carregado';

/**
 * Ordem de prioridade pra decidir qual situação mostrar quando a sede tem
 * mais de uma vaga (Ajudante + Forklift, por ex.): sempre prefere a
 * explicação mais específica/relevante — se o funcionário está disponível
 * em QUALQUER vaga da sede, ele é selecionável; senão, prefere dizer que
 * já está alocado NESTA sede a dizer genericamente "outra vaga" (que só é
 * verdade quando a alocação é em outra sede/dia, sem nenhuma relação com
 * as vagas que estão na tela).
 */
const PRIORIDADE_SITUACAO: SituacaoParaAlocacao[] = [
  'DISPONIVEL',
  'JA_ALOCADO_NESTA_VAGA',
  'CANCELOU_NESTA_VAGA',
  'FALTOU_NESTA_VAGA',
  'ALOCADO_OUTRA_VAGA',
];

/**
 * Tela de Alocação de Funcionário (docs/features/alocacao.md).
 * Fluxo em 6 passos: Data → Sede → Vagas → Funcionários → Tipo → Confirmação.
 * Alocação parcial é permitida — o botão de confirmação habilita com pelo
 * menos 1 seleção válida, não é preciso preencher a vaga inteira.
 */
@Component({
  selector: 'app-alocacao',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './alocacao.component.html',
  styleUrl: './alocacao.component.scss',
})
export class AlocacaoComponent implements OnInit {
  private readonly service = inject(AlocacaoService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly data = signal(paraDataIso(new Date()));
  readonly escopo = signal<EscopoSedes>('minha');
  readonly estadoResumo = signal<EstadoResumo>('carregando');
  readonly resumo = signal<DashboardResumo | null>(null);

  /** Administrador não tem "minha sede" — o filtro não faz sentido pra ele. */
  readonly mostrarSeletorDeEscopo = computed(
    () => this.auth.usuario()?.perfil !== 'ADMINISTRADOR',
  );

  readonly sedeSelecionada = signal<SedeComVagas | null>(null);
  readonly estadoFuncionarios = signal<EstadoFuncionarios>('ocioso');
  /** Situação de cada funcionário POR VAGA da sede — nunca uma única "âncora". */
  readonly situacoesPorVaga = signal<Map<string, FuncionarioParaAlocacao[]>>(
    new Map(),
  );
  readonly busca = signal('');

  /** funcionarioId -> vagaId escolhido no dropdown de tipo. */
  readonly selecoes = signal<Map<string, string>>(new Map());

  readonly enviando = signal(false);
  readonly erroEnvio = signal<string | null>(null);
  readonly mensagemSucesso = signal<string | null>(null);

  /**
   * Um funcionário por linha, com a situação mais relevante entre todas as
   * vagas da sede (ver PRIORIDADE_SITUACAO) — corrige o bug de mostrar
   * "alocado em outra vaga" pra alguém que acabou de ser alocado na
   * segunda vaga da mesma sede.
   */
  readonly funcionarios = computed<FuncionarioParaAlocacao[]>(() => {
    const sede = this.sedeSelecionada();
    const mapa = this.situacoesPorVaga();
    if (!sede || sede.vagas.length === 0) return [];

    const primeiraLista = mapa.get(sede.vagas[0].id) ?? [];
    return primeiraLista.map((base) => {
      const porVaga = sede.vagas
        .map((v) => mapa.get(v.id)?.find((f) => f.id === base.id))
        .filter((f): f is FuncionarioParaAlocacao => !!f);

      const melhor = porVaga.reduce((atual, candidato) =>
        PRIORIDADE_SITUACAO.indexOf(candidato.situacao) <
        PRIORIDADE_SITUACAO.indexOf(atual.situacao)
          ? candidato
          : atual,
      );

      return {
        ...base,
        situacao: melhor.situacao,
        selecionavel: melhor.situacao === 'DISPONIVEL',
      };
    });
  });

  readonly funcionariosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.funcionarios();
    return this.funcionarios().filter((f) =>
      f.nome.toLowerCase().includes(termo),
    );
  });

  /** Quantos já foram escolhidos, por vaga (tipo), considerando a seleção atual. */
  readonly contagemPorVaga = computed(() => {
    const contagem = new Map<string, number>();
    for (const vagaId of this.selecoes().values()) {
      contagem.set(vagaId, (contagem.get(vagaId) ?? 0) + 1);
    }
    return contagem;
  });

  /** ≥1 selecionado já é suficiente pra confirmar — alocação parcial é permitida. */
  readonly podeConfirmar = computed(() => this.selecoes().size > 0);

  ngOnInit(): void {
    const queryData = this.route.snapshot.queryParamMap.get('data');
    if (queryData) {
      this.data.set(queryData);
    }
    this.carregarResumo();
  }

  selecionarData(dataIso: string): void {
    if (!dataIso) return;
    this.data.set(dataIso);
    this.voltarParaSedes();
    this.carregarResumo();
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

  selecionarEscopo(escopo: string): void {
    this.escopo.set(escopo === 'todas' ? 'todas' : 'minha');
    this.voltarParaSedes();
    this.carregarResumo();
  }

  selecionarSede(sede: SedeComVagas): void {
    this.sedeSelecionada.set(sede);
    this.selecoes.set(new Map());
    this.mensagemSucesso.set(null);
    this.erroEnvio.set(null);
    this.carregarSituacoes(sede);
  }

  voltarParaSedes(): void {
    this.sedeSelecionada.set(null);
    this.situacoesPorVaga.set(new Map());
    this.selecoes.set(new Map());
    this.busca.set('');
    this.estadoFuncionarios.set('ocioso');
  }

  /** Situação de um funcionário especificamente numa vaga (pra habilitar opção do dropdown). */
  situacaoNaVaga(
    funcionarioId: string,
    vagaId: string,
  ): FuncionarioParaAlocacao | undefined {
    return this.situacoesPorVaga()
      .get(vagaId)
      ?.find((f) => f.id === funcionarioId);
  }

  /** Capacidade restante de uma vaga, já contando a seleção atual (exceto a do próprio funcionário, se já estava nela). */
  capacidadeRestante(vagaId: string, funcionarioId?: string): number {
    const sede = this.sedeSelecionada();
    const vaga = sede?.vagas.find((v) => v.id === vagaId);
    if (!vaga) return 0;
    const jaEscolhidoParaEstaVaga =
      funcionarioId && this.selecoes().get(funcionarioId) === vagaId ? 1 : 0;
    return (
      vaga.disponiveis -
      (this.contagemPorVaga().get(vagaId) ?? 0) +
      jaEscolhidoParaEstaVaga
    );
  }

  /** Uma opção do dropdown de tipo só fica habilitada se o funcionário está
   *  disponível PARA AQUELA vaga específica e ainda há espaço nela. */
  opcaoDesabilitada(funcionarioId: string, vagaId: string): boolean {
    const disponivelNessaVaga =
      this.situacaoNaVaga(funcionarioId, vagaId)?.situacao === 'DISPONIVEL';
    return !disponivelNessaVaga || this.capacidadeRestante(vagaId, funcionarioId) <= 0;
  }

  /** Existe alguma vaga da sede onde ESTE funcionário está disponível e ainda há espaço? */
  private vagaDisponivelPara(funcionarioId: string): string | undefined {
    const sede = this.sedeSelecionada();
    if (!sede) return undefined;
    return sede.vagas.find((v) => !this.opcaoDesabilitada(funcionarioId, v.id))
      ?.id;
  }

  /** Checkbox fica desabilitado se o funcionário não é selecionável em
   *  nenhuma vaga da sede. Um funcionário já marcado nunca fica
   *  desabilitado (senão não dá pra desmarcar). */
  checkboxDesabilitado(f: FuncionarioParaAlocacao): boolean {
    if (this.selecoes().has(f.id)) return false;
    return !f.selecionavel || !this.vagaDisponivelPara(f.id);
  }

  alternarSelecao(funcionario: FuncionarioParaAlocacao, marcado: boolean): void {
    const novaSelecao = new Map(this.selecoes());

    if (!marcado) {
      novaSelecao.delete(funcionario.id);
      this.selecoes.set(novaSelecao);
      return;
    }

    const vagaDisponivel = this.vagaDisponivelPara(funcionario.id);
    if (!vagaDisponivel) {
      return; // sem vaga onde ele esteja disponível — checkbox não deveria nem estar habilitado
    }
    novaSelecao.set(funcionario.id, vagaDisponivel);
    this.selecoes.set(novaSelecao);
  }

  selecionarTipo(funcionarioId: string, vagaId: string): void {
    if (this.opcaoDesabilitada(funcionarioId, vagaId)) {
      return; // sem espaço ou funcionário indisponível nesse tipo, ignora a troca
    }
    const novaSelecao = new Map(this.selecoes());
    novaSelecao.set(funcionarioId, vagaId);
    this.selecoes.set(novaSelecao);
  }

  confirmarAlocacoes(): void {
    const sede = this.sedeSelecionada();
    if (!sede || !this.podeConfirmar()) return;

    const itens = [...this.selecoes().entries()].map(
      ([funcionarioId, vagaId]) => ({ vagaId, funcionarioId }),
    );

    this.enviando.set(true);
    this.erroEnvio.set(null);
    this.mensagemSucesso.set(null);

    this.service.criarAlocacoes(itens).subscribe({
      next: () => {
        this.enviando.set(false);
        this.mensagemSucesso.set(
          `${itens.length} funcionário(s) alocado(s) com sucesso.`,
        );
        this.selecoes.set(new Map());
        this.atualizarDepoisDaAlocacao(sede.sedeId);
      },
      error: (erro) => {
        this.enviando.set(false);
        this.erroEnvio.set(this.extrairMensagemErro(erro));
      },
    });
  }

  private atualizarDepoisDaAlocacao(sedeId: string): void {
    this.service.resumoDoDia(this.data(), this.escopo()).subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        const sedeAtualizada = resumo.sedes.find((s) => s.sedeId === sedeId);
        if (sedeAtualizada) {
          this.sedeSelecionada.set(sedeAtualizada);
          this.carregarSituacoes(sedeAtualizada);
        }
      },
    });
  }

  private carregarResumo(): void {
    this.estadoResumo.set('carregando');
    this.service.resumoDoDia(this.data(), this.escopo()).subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.estadoResumo.set('carregado');

        const sedeIdDaUrl = this.route.snapshot.queryParamMap.get('sedeId');
        if (sedeIdDaUrl && !this.sedeSelecionada()) {
          const sede = resumo.sedes.find((s) => s.sedeId === sedeIdDaUrl);
          if (sede) this.selecionarSede(sede);
        }
      },
      error: () => {
        this.resumo.set(null);
        this.estadoResumo.set('erro');
      },
    });
  }

  /** Busca a situação em TODAS as vagas da sede (uma chamada por vaga), nunca só na primeira. */
  private carregarSituacoes(sede: SedeComVagas): void {
    if (sede.vagas.length === 0) {
      this.situacoesPorVaga.set(new Map());
      this.estadoFuncionarios.set('carregado');
      return;
    }

    this.estadoFuncionarios.set('carregando');
    forkJoin(
      sede.vagas.map((v) =>
        this.service.funcionariosParaVaga(v.id, this.data()),
      ),
    ).subscribe({
      next: (listas) => {
        const mapa = new Map<string, FuncionarioParaAlocacao[]>();
        sede.vagas.forEach((v, indice) => mapa.set(v.id, listas[indice]));
        this.situacoesPorVaga.set(mapa);
        this.estadoFuncionarios.set('carregado');
      },
      error: () => {
        this.situacoesPorVaga.set(new Map());
        this.estadoFuncionarios.set('erro');
      },
    });
  }

  private extrairMensagemErro(erro: unknown): string {
    const mensagem = (erro as { error?: { message?: string | string[] } })
      ?.error?.message;
    if (Array.isArray(mensagem)) return mensagem.join(' ');
    return mensagem ?? 'Não foi possível realizar a alocação. Tente novamente.';
  }
}
