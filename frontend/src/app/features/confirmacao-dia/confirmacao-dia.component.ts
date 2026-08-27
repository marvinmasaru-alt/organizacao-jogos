import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { paraDataIso } from '../../core/utils/data.util';
import { ConfirmacaoDiaService } from './confirmacao-dia.service';
import {
  EscopoSedes,
  FuncionarioConfirmacao,
  NovaSituacao,
  ResumoConfirmacaoSede,
  SedeComConfirmacoes,
} from './confirmacao-dia.model';

type Estado = 'carregando' | 'erro' | 'carregado';
/** "porDia" = comportamento de sempre (filtra por uma data); "todos" = sem filtro de data, uma linha por sede+dia pendente. */
type ModoFiltro = 'todos' | 'porDia';

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
  private readonly auth = inject(AuthService);

  readonly data = signal(paraDataIso(new Date()));
  /** "Todos" x "Por dia" (decisão do usuário) — só no modo "porDia" o seletor de data aparece/filtra. */
  readonly modoFiltro = signal<ModoFiltro>('porDia');
  /**
   * Só Administrador vê o seletor — Responsável nunca tem escolha nesta
   * tela (sempre só a própria sede, regra própria da Confirmação do Dia,
   * mais restritiva que a visibilidade geral de sedes). Padrão "minha"
   * quando o Administrador também é responsável por alguma sede (ex.:
   * Paulo) — prioridade é sempre a própria sede primeiro; cai pra "todas"
   * só quando ele não tem sede nenhuma (senão "minha" mostraria vazio).
   */
  readonly escopo = signal<EscopoSedes>(
    this.auth.usuario()?.responsavelId ? 'minha' : 'todas',
  );
  readonly estadoSedes = signal<Estado>('carregando');
  readonly sedes = signal<SedeComConfirmacoes[]>([]);

  readonly sedeSelecionadaId = signal<string | null>(null);
  /**
   * Data da sede selecionada (passo 3) — vem da própria linha escolhida em
   * `selecionarSede`, nunca de `data()` diretamente: no modo "todos" cada
   * linha da lista carrega sua própria data (a mesma sede pode aparecer
   * mais de uma vez, uma por dia pendente), então não dá pra assumir que é
   * a data do filtro global.
   */
  readonly dataDetalheSelecionada = signal<string | null>(null);
  readonly estadoDetalhe = signal<Estado>('carregando');
  readonly detalhe = signal<ResumoConfirmacaoSede | null>(null);

  /** alocacaoId -> em processamento (desabilita o próprio dropdown enquanto salva). */
  readonly salvando = signal<Set<string>>(new Set());
  readonly finalizando = signal(false);
  readonly erroFinalizar = signal<string | null>(null);
  readonly mensagemFinalizar = signal<string | null>(null);
  readonly reabrindo = signal(false);
  readonly erroReabrir = signal<string | null>(null);
  readonly erroAlterarSituacao = signal<string | null>(null);

  readonly sedeSelecionada = computed(() =>
    this.sedes().find((s) => s.sedeId === this.sedeSelecionadaId()) ?? null,
  );

  /**
   * "Aguardando confirmação" (situação nunca definida) — diferente do
   * `pendentes` de cada `resumo` (que agora é "vaga ainda não preenchida",
   * necessarios - trabalharam). Esse aqui é o que trava "Finalizar" e
   * mostra o banner ⚠, contando em TODOS os tipos/status.
   */
  readonly pendentesRestantes = computed(
    () => this.detalhe()?.funcionarios.filter((f) => f.status === 'PENDENTE').length ?? 0,
  );

  /** Conferência finalizada (docs/features/confirmacao-dia.md, seção 28.1) trava novas alterações até reabrir. */
  readonly estaFinalizada = computed(() => this.detalhe()?.finalizado ?? false);

  readonly podeFinalizar = computed(
    () =>
      this.estadoDetalhe() === 'carregado' &&
      this.pendentesRestantes() === 0 &&
      !this.estaFinalizada(),
  );

  readonly ehAdministrador = computed(() => this.auth.usuario()?.perfil === 'ADMINISTRADOR');
  /** Seletor de escopo é exclusivo do Administrador — Responsável nunca tem essa escolha aqui. */
  readonly mostrarSeletorDeEscopo = this.ehAdministrador;

  /** Funcionários agrupados por tipo de trabalho, na ordem em que aparecem no resumo. */
  readonly funcionariosPorTipo = computed(() => {
    const detalhe = this.detalhe();
    if (!detalhe) return [];
    return detalhe.resumoPorTipo.map((resumo) => ({
      resumo,
      funcionarios: detalhe.funcionarios.filter(
        (f) => f.tipoTrabalhoId === resumo.tipoTrabalhoId,
      ),
    }));
  });

  /**
   * O `sedeId` da URL (link "Visualizar" do Dashboard, pra sede já
   * finalizada) só deve auto-selecionar a sede uma vez, no carregamento
   * inicial — mesma guarda que a tela de Alocação já usa, senão qualquer
   * `carregarSedes()` seguinte (trocar data/escopo) reaplicaria a mesma
   * sede antiga mesmo depois do usuário voltar pra lista.
   */
  private sedeDaUrlJaAplicada = false;

  ngOnInit(): void {
    const queryData = this.route.snapshot.queryParamMap.get('data');
    if (queryData) {
      this.data.set(queryData);
    }
    // Vem do link "Visualizar"/"Alocar" do Dashboard — garante que a sede
    // pré-selecionada seja encontrada mesmo se não for "minha sede"
    // (padrão desta tela pra Administrador).
    const queryEscopo = this.route.snapshot.queryParamMap.get('escopo');
    if (queryEscopo === 'todas' || queryEscopo === 'minha') {
      this.escopo.set(queryEscopo);
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

  /** Só Administrador chama isso (seletor nem aparece pra Responsável). */
  selecionarEscopo(escopo: string): void {
    this.escopo.set(escopo === 'minha' ? 'minha' : 'todas');
    this.voltarParaSedes();
    this.carregarSedes();
  }

  /** Alterna entre "Todos" (sem filtro de data) e "Por dia" (mostra o seletor de data) — recarrega a lista de sedes. */
  selecionarModoFiltro(modo: string): void {
    this.modoFiltro.set(modo === 'todos' ? 'todos' : 'porDia');
    this.voltarParaSedes();
    this.carregarSedes();
  }

  private carregarSedes(): void {
    this.estadoSedes.set('carregando');
    const dataFiltro = this.modoFiltro() === 'porDia' ? this.data() : null;
    this.service.listarSedes(dataFiltro, this.escopo()).subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        this.estadoSedes.set('carregado');

        if (!this.sedeDaUrlJaAplicada) {
          this.sedeDaUrlJaAplicada = true;
          const sedeIdDaUrl = this.route.snapshot.queryParamMap.get('sedeId');
          if (sedeIdDaUrl) {
            const sede = sedes.find((s) => s.sedeId === sedeIdDaUrl);
            if (sede) this.selecionarSede(sede);
          }
        }
      },
      error: () => this.estadoSedes.set('erro'),
    });
  }

  selecionarSede(sede: SedeComConfirmacoes): void {
    this.sedeSelecionadaId.set(sede.sedeId);
    this.dataDetalheSelecionada.set(sede.data);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
    this.erroReabrir.set(null);
    this.erroAlterarSituacao.set(null);
    this.carregarDetalhe();
  }

  voltarParaSedes(): void {
    this.sedeSelecionadaId.set(null);
    this.dataDetalheSelecionada.set(null);
    this.detalhe.set(null);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
    this.erroReabrir.set(null);
    this.erroAlterarSituacao.set(null);
  }

  private carregarDetalhe(): void {
    const sedeId = this.sedeSelecionadaId();
    const dataDetalhe = this.dataDetalheSelecionada();
    if (!sedeId || !dataDetalhe) return;
    this.estadoDetalhe.set('carregando');
    this.service.resumoDaSede(sedeId, dataDetalhe).subscribe({
      next: (detalhe) => {
        this.detalhe.set(detalhe);
        this.estadoDetalhe.set('carregado');
      },
      error: () => this.estadoDetalhe.set('erro'),
    });
  }

  /**
   * Igual a carregarDetalhe(), mas sem passar por 'carregando' — evita que a
   * tela pisque pra "Carregando confirmação…" a cada troca de status
   * individual (alterarSituacao), quando o usuário já está
   * vendo a lista e só precisa que ela reflita o novo estado.
   */
  private recarregarDetalheSilencioso(): void {
    const sedeId = this.sedeSelecionadaId();
    const dataDetalhe = this.dataDetalheSelecionada();
    if (!sedeId || !dataDetalhe) return;
    this.service.resumoDaSede(sedeId, dataDetalhe).subscribe({
      next: (detalhe) => this.detalhe.set(detalhe),
      error: () => this.estadoDetalhe.set('erro'),
    });
  }

  /** Valor do `<select>` — junta PRESENTE/SUBSTITUICAO_NECESSARIA nos rótulos de tela. */
  valorSelecao(f: FuncionarioConfirmacao): string {
    if (f.status === 'PRESENTE') return 'TRABALHOU';
    if (f.status === 'SUBSTITUICAO_NECESSARIA') return 'FALTOU_URGENTE';
    return f.status;
  }

  /** Cor/rótulo consistentes com a seção 14/36 da doc. */
  corDoStatus(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'verde';
      case 'SUBSTITUIU':
        return 'roxo';
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
      case 'SUBSTITUIU':
        return 'Substituiu';
      case 'CANCELOU':
        return 'Cancelou';
      case 'FALTOU':
        return 'Faltou';
      case 'SUBSTITUICAO_NECESSARIA':
        return 'Substituição urgente';
      default:
        return 'Pendente';
    }
  }

  alterarSituacao(funcionario: FuncionarioConfirmacao, novaSituacao: string): void {
    // Reativar uma alocação cancelada é permitido (ex.: "na verdade eu vou
    // trabalhar sim") — o backend reativa e revalida a capacidade da vaga.
    // Só recancelar quem já está CANCELOU não faz sentido, mas isso nem
    // dispara aqui: o próprio <select> já parte de CANCELOU selecionado,
    // então escolher a mesma opção de novo não gera evento de change.
    if (!novaSituacao || this.estaFinalizada()) return;
    this.definirSalvando(funcionario.alocacaoId, true);
    this.erroAlterarSituacao.set(null);
    // "Faltou — substituição urgente" é só uma opção extra de tela pra
    // FALTOU — urgência não existe pra CANCELOU/TRABALHOU (ver CLAUDE.md).
    const urgente = novaSituacao === 'FALTOU_URGENTE';
    const status: NovaSituacao = urgente ? 'FALTOU' : (novaSituacao as NovaSituacao);
    this.service
      .atualizarSituacao(funcionario.alocacaoId, status, undefined, urgente)
      .subscribe({
        next: () => {
          this.definirSalvando(funcionario.alocacaoId, false);
          this.recarregarDetalheSilencioso();
        },
        error: (erro) => {
          this.definirSalvando(funcionario.alocacaoId, false);
          // Nunca troca pra estadoDetalhe 'erro' aqui — isso faria a lista
          // inteira sumir da tela por causa de UMA alteração que falhou
          // (ex.: conferência finalizada entre o carregamento e o clique).
          // Mostra o erro junto da lista e recarrega, pra refletir o
          // estado real (ex.: se finalizou nesse meio tempo, trava a tela).
          this.erroAlterarSituacao.set(
            erro?.error?.message ?? 'Não foi possível atualizar a situação do funcionário.',
          );
          this.recarregarDetalheSilencioso();
        },
      });
  }

  private definirSalvando(alocacaoId: string, valor: boolean): void {
    const novo = new Set(this.salvando());
    valor ? novo.add(alocacaoId) : novo.delete(alocacaoId);
    this.salvando.set(novo);
  }

  finalizarConferencia(): void {
    const sedeId = this.sedeSelecionadaId();
    const dataDetalhe = this.dataDetalheSelecionada();
    if (!sedeId || !dataDetalhe || !this.podeFinalizar()) return;
    this.finalizando.set(true);
    this.erroFinalizar.set(null);
    this.mensagemFinalizar.set(null);
    this.service.finalizar(sedeId, dataDetalhe).subscribe({
      next: (detalhe) => {
        this.finalizando.set(false);
        this.detalhe.set(detalhe);
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

  /** Só Administrador vê o botão (backend também rejeita pra qualquer outro perfil). */
  reabrirConferencia(): void {
    const sedeId = this.sedeSelecionadaId();
    const dataDetalhe = this.dataDetalheSelecionada();
    if (!sedeId || !dataDetalhe || !this.estaFinalizada()) return;
    this.reabrindo.set(true);
    this.erroReabrir.set(null);
    this.mensagemFinalizar.set(null);
    this.service.reabrir(sedeId, dataDetalhe).subscribe({
      next: (detalhe) => {
        this.reabrindo.set(false);
        this.detalhe.set(detalhe);
      },
      error: (erro) => {
        this.reabrindo.set(false);
        this.erroReabrir.set(
          erro?.error?.message ?? 'Não foi possível reabrir a conferência.',
        );
      },
    });
  }
}
