import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TiposTrabalhoService } from '../tipos-trabalho/tipos-trabalho.service';
import { TipoTrabalho } from '../tipos-trabalho/tipos-trabalho.model';
import { PagamentosService } from './pagamentos.service';
import {
  FiltrosPagamentos,
  ItemComissaoAReceber,
  ItemPagamentoFuncionario,
  ResumoComissoes,
  ResumoPagamentosFuncionarios,
} from './pagamentos.model';

type Aba = 'receber' | 'funcionarios';
type Estado = 'carregando' | 'erro' | 'carregado';

/**
 * Espelha a convenção `item__status--{{cor}}` usada em confirmacao-dia.
 * Cobre os dois conjuntos de status (Pagamento: PAGO/CANCELADO; Comissão:
 * RECEBIDA/CANCELADA, independente um do outro) — as chaves nunca colidem,
 * então um mapa só serve pras duas abas.
 */
const CORES_STATUS: Record<string, string> = {
  A_VENCER: 'azul',
  VENCENDO: 'amarelo',
  ATRASADO: 'vermelho',
  PAGO: 'verde',
  CANCELADO: 'roxo',
  RECEBIDA: 'verde',
  CANCELADA: 'roxo',
};

interface FormularioRegistro {
  valorPago: number | null;
  dataPagamento: string;
  observacao: string;
  comprovante: File | null;
}

function formularioVazio(): FormularioRegistro {
  return { valorPago: null, dataPagamento: '', observacao: '', comprovante: null };
}

/**
 * Tela financeira (docs/features/pagamento.md) — duas abas em vez de duas
 * rotas porque compartilham os mesmos filtros. "Pagamentos a Receber" é a
 * comissão projetada do responsável; "Pagamentos de Funcionários" é o que
 * ele deve pagar a quem alocou. Backend já aplica a fronteira de
 * segurança (Responsável só vê o que é dele) — não há toggle "minha
 * sede"/"todas" aqui como em Sedes, porque não existe visão "de terceiros"
 * pra Responsável neste módulo.
 */
@Component({
  selector: 'app-pagamentos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pagamentos.component.html',
  styleUrl: './pagamentos.component.scss',
})
export class PagamentosComponent implements OnInit {
  private readonly service = inject(PagamentosService);
  private readonly tiposTrabalhoService = inject(TiposTrabalhoService);
  private readonly auth = inject(AuthService);

  readonly abaAtiva = signal<Aba>('receber');
  readonly estado = signal<Estado>('carregando');
  readonly tiposTrabalho = signal<TipoTrabalho[]>([]);

  readonly dataInicio = signal('');
  readonly dataFim = signal('');
  readonly status = signal('');
  readonly tipoTrabalhoId = signal('');
  readonly tipoSede = signal('');

  readonly comissoes = signal<ItemComissaoAReceber[]>([]);
  readonly resumoComissoes = signal<ResumoComissoes | null>(null);

  readonly pagamentosFuncionarios = signal<ItemPagamentoFuncionario[]>([]);
  readonly resumoFuncionarios = signal<ResumoPagamentosFuncionarios | null>(null);

  /**
   * "Total de pagamentos a receber" (aba "receber") — o valor que o
   * responsável tem que pagar do funcionário (o que ele adianta pra quem
   * alocou) + a comissão que ele tem a receber. Precisa dos dois resumos
   * (comissões e funcionários) carregados juntos nessa aba, mesmo a lista
   * de funcionários não aparecendo aqui.
   */
  readonly totalPagamentosAReceber = computed(
    () => (this.resumoFuncionarios()?.totalAPagar ?? 0) + (this.resumoComissoes()?.totalAReceber ?? 0),
  );

  /** Expansão inline de "Registrar pagamento" — sem modal, id da linha aberta. */
  readonly linhaExpandida = signal<string | null>(null);
  readonly formularioRegistro = signal<FormularioRegistro>(formularioVazio());
  readonly registrando = signal(false);
  readonly erroRegistro = signal<string | null>(null);

  /** "Marcar como recebida" (aba "receber") — id da comissão -> em processamento/erro, sem formulário (é só um clique de confirmação). */
  readonly marcandoComissao = signal<Set<string>>(new Set());
  readonly errosComissao = signal<Map<string, string>>(new Map());

  souAdministrador(): boolean {
    return this.auth.usuario()?.perfil === 'ADMINISTRADOR';
  }

  ngOnInit(): void {
    this.tiposTrabalhoService.listarTodos().subscribe({
      next: (tipos) => this.tiposTrabalho.set(tipos),
    });
    this.carregar();
  }

  corStatus(status: string): string {
    return CORES_STATUS[status] ?? 'azul';
  }

  selecionarAba(aba: Aba): void {
    if (this.abaAtiva() === aba) return;
    this.abaAtiva.set(aba);
    // Os valores de status são diferentes em cada aba (Pagamento:
    // PENDENTE/PAGO/CANCELADO; Comissão: PENDENTE/RECEBIDA/CANCELADA) —
    // um filtro escolhido numa aba não faz sentido na outra.
    this.status.set('');
    this.linhaExpandida.set(null);
    this.carregar();
  }

  aplicarFiltros(): void {
    this.carregar();
  }

  private filtrosAtuais(): FiltrosPagamentos {
    const filtros: FiltrosPagamentos = {};
    if (this.dataInicio()) filtros.dataInicio = this.dataInicio();
    if (this.dataFim()) filtros.dataFim = this.dataFim();
    if (this.status()) filtros.status = this.status();
    if (this.tipoTrabalhoId()) filtros.tipoTrabalhoId = this.tipoTrabalhoId();
    if (this.tipoSede()) filtros.tipoSede = this.tipoSede();
    return filtros;
  }

  private carregar(): void {
    this.estado.set('carregando');
    const filtros = this.filtrosAtuais();

    if (this.abaAtiva() === 'receber') {
      this.service.listarComissoes(filtros).subscribe({
        next: (itens) => {
          this.comissoes.set(itens);
          this.estado.set('carregado');
        },
        error: () => this.estado.set('erro'),
      });
      this.service.resumoComissoes(filtros).subscribe({
        next: (resumo) => this.resumoComissoes.set(resumo),
      });
      // Precisa também do resumo de "Pagamentos de Funcionários" aqui —
      // "Total de pagamentos a receber" combina os dois (ver
      // `totalPagamentosAReceber`), mesmo essa aba não listando os itens.
      this.service.resumoPagamentosFuncionarios(filtros).subscribe({
        next: (resumo) => this.resumoFuncionarios.set(resumo),
      });
    } else {
      this.service.listarPagamentosFuncionarios(filtros).subscribe({
        next: (itens) => {
          this.pagamentosFuncionarios.set(itens);
          this.estado.set('carregado');
        },
        error: () => this.estado.set('erro'),
      });
      this.service.resumoPagamentosFuncionarios(filtros).subscribe({
        next: (resumo) => this.resumoFuncionarios.set(resumo),
      });
    }
  }

  // --- Registrar pagamento (aba "funcionarios") ---

  podeRegistrar(item: ItemPagamentoFuncionario): boolean {
    return item.status === 'PENDENTE';
  }

  abrirRegistro(item: ItemPagamentoFuncionario): void {
    this.linhaExpandida.set(item.id);
    this.erroRegistro.set(null);
    this.formularioRegistro.set({
      ...formularioVazio(),
      valorPago: item.valorPrevisto,
      dataPagamento: new Date().toISOString().slice(0, 10),
    });
  }

  fecharRegistro(): void {
    this.linhaExpandida.set(null);
    this.erroRegistro.set(null);
  }

  atualizarFormulario<K extends keyof FormularioRegistro>(campo: K, valor: FormularioRegistro[K]): void {
    this.formularioRegistro.update((f) => ({ ...f, [campo]: valor }));
  }

  selecionarComprovante(arquivo: File | null): void {
    this.atualizarFormulario('comprovante', arquivo);
  }

  podeConfirmarRegistro(): boolean {
    return this.motivoBloqueioRegistro() === null;
  }

  /**
   * Por que o botão "Confirmar pagamento" está desabilitado, ou `null` se
   * já pode enviar — mostrado na tela (ver template) porque um botão
   * desabilitado sem explicação parece "não fez nada" ao clicar, o que já
   * confundiu antes (sede HUB começa sem "Valor pago" preenchido, por
   * exemplo, e passa despercebido).
   */
  motivoBloqueioRegistro(): string | null {
    const f = this.formularioRegistro();
    if (!f.valorPago || f.valorPago <= 0) return 'Informe o valor pago (maior que zero).';
    if (!f.dataPagamento) return 'Informe a data do pagamento.';
    return null;
  }

  confirmarRegistro(item: ItemPagamentoFuncionario): void {
    if (!this.podeConfirmarRegistro() || this.registrando()) return;
    const f = this.formularioRegistro();
    this.registrando.set(true);
    this.erroRegistro.set(null);
    this.service
      .registrarPagamento(item.id, {
        valorPago: f.valorPago!,
        dataPagamento: f.dataPagamento,
        observacao: f.observacao || undefined,
        comprovante: f.comprovante ?? undefined,
      })
      .subscribe({
        next: () => {
          this.registrando.set(false);
          this.linhaExpandida.set(null);
          this.carregar();
        },
        error: (erro) => {
          this.registrando.set(false);
          this.erroRegistro.set(erro?.error?.message ?? 'Não foi possível registrar o pagamento.');
        },
      });
  }

  // --- Marcar comissão como recebida (aba "receber") ---

  podeMarcarComissaoRecebida(item: ItemComissaoAReceber): boolean {
    return item.status === 'PENDENTE';
  }

  erroComissao(item: ItemComissaoAReceber): string | null {
    return this.errosComissao().get(item.id) ?? null;
  }

  marcarComissaoRecebida(item: ItemComissaoAReceber): void {
    if (this.marcandoComissao().has(item.id)) return;
    this.definirMarcandoComissao(item.id, true);
    this.limparErroComissao(item.id);
    this.service.marcarComissaoRecebida(item.id).subscribe({
      next: () => {
        this.definirMarcandoComissao(item.id, false);
        this.carregar();
      },
      error: (erro) => {
        this.definirMarcandoComissao(item.id, false);
        this.definirErroComissao(
          item.id,
          erro?.error?.message ?? 'Não foi possível marcar a comissão como recebida.',
        );
      },
    });
  }

  private definirMarcandoComissao(id: string, valor: boolean): void {
    const novo = new Set(this.marcandoComissao());
    valor ? novo.add(id) : novo.delete(id);
    this.marcandoComissao.set(novo);
  }

  private definirErroComissao(id: string, mensagem: string): void {
    const novo = new Map(this.errosComissao());
    novo.set(id, mensagem);
    this.errosComissao.set(novo);
  }

  private limparErroComissao(id: string): void {
    const novo = new Map(this.errosComissao());
    novo.delete(id);
    this.errosComissao.set(novo);
  }
}
