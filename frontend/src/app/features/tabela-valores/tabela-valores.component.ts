import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TabelaValoresService } from './tabela-valores.service';
import { NovaTabelaValor, TabelaValor, TipoSede } from './tabela-valores.model';
import { TiposTrabalhoService } from '../tipos-trabalho/tipos-trabalho.service';
import { TipoTrabalho } from '../tipos-trabalho/tipos-trabalho.model';

type Estado = 'carregando' | 'erro' | 'carregado';

/** Linha editável do formulário (criação e edição inline). */
interface LinhaForm {
  tipoTrabalhoId: string;
  tipoSede: TipoSede;
  valor: number | null;
  salarioBase: number | null;
  dataInicio: string;
  dataFim: string;
}

function linhaVazia(): LinhaForm {
  return { tipoTrabalhoId: '', tipoSede: 'EXTERNA', valor: null, salarioBase: null, dataInicio: '', dataFim: '' };
}

/**
 * Cadastro/gestão de valores de referência por tipo de trabalho + tipo de
 * sede (docs/features/pagamento.md, seções 4/6/7) — só Administrador
 * (perfilGuard na rota). Nunca apaga (princípio geral de histórico) — só
 * desativa/reativa.
 */
@Component({
  selector: 'app-tabela-valores',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tabela-valores.component.html',
  styleUrl: './tabela-valores.component.scss',
})
export class TabelaValoresComponent implements OnInit {
  private readonly service = inject(TabelaValoresService);
  private readonly tiposTrabalhoService = inject(TiposTrabalhoService);

  readonly linhas = signal<TabelaValor[]>([]);
  readonly estado = signal<Estado>('carregando');

  readonly tiposTrabalho = signal<TipoTrabalho[]>([]);

  readonly novaLinha = signal<LinhaForm>(linhaVazia());
  readonly criando = signal(false);
  readonly erroCriar = signal<string | null>(null);

  readonly editandoId = signal<string | null>(null);
  readonly linhaEdicao = signal<LinhaForm>(linhaVazia());
  readonly salvandoEdicao = signal(false);
  readonly erroEdicao = signal<string | null>(null);

  readonly alternandoAtivo = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.carregar();
    this.tiposTrabalhoService.listarTodos().subscribe({
      next: (tipos) => this.tiposTrabalho.set(tipos),
    });
  }

  private carregar(): void {
    this.estado.set('carregando');
    this.service.listarTodos().subscribe({
      next: (linhas) => {
        this.linhas.set(linhas);
        this.estado.set('carregado');
      },
      error: () => this.estado.set('erro'),
    });
  }

  nomeTipo(tipoTrabalhoId: string): string {
    return this.tiposTrabalho().find((t) => t.id === tipoTrabalhoId)?.nome ?? '';
  }

  // --- Criação ---

  atualizarNovaLinha<K extends keyof LinhaForm>(campo: K, valor: LinhaForm[K]): void {
    this.novaLinha.update((l) => ({ ...l, [campo]: valor }));
  }

  podeCriar(): boolean {
    const l = this.novaLinha();
    return (
      !!l.tipoTrabalhoId &&
      !!l.valor &&
      l.valor > 0 &&
      (l.tipoSede === 'HUB' || (!!l.salarioBase && l.salarioBase > 0))
    );
  }

  criar(): void {
    if (!this.podeCriar() || this.criando()) return;
    this.criando.set(true);
    this.erroCriar.set(null);
    this.service.criar(this.paraDto(this.novaLinha())).subscribe({
      next: () => {
        this.criando.set(false);
        this.novaLinha.set(linhaVazia());
        this.carregar();
      },
      error: (erro) => {
        this.criando.set(false);
        this.erroCriar.set(erro?.error?.message ?? 'Não foi possível criar a tabela de valor.');
      },
    });
  }

  // --- Edição inline ---

  iniciarEdicao(linha: TabelaValor): void {
    this.editandoId.set(linha.id);
    this.linhaEdicao.set({
      tipoTrabalhoId: linha.tipoTrabalhoId,
      tipoSede: linha.tipoSede,
      valor: linha.valor,
      salarioBase: linha.salarioBase,
      dataInicio: linha.dataInicio ?? '',
      dataFim: linha.dataFim ?? '',
    });
    this.erroEdicao.set(null);
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.erroEdicao.set(null);
  }

  atualizarLinhaEdicao<K extends keyof LinhaForm>(campo: K, valor: LinhaForm[K]): void {
    this.linhaEdicao.update((l) => ({ ...l, [campo]: valor }));
  }

  podeSalvarEdicao(): boolean {
    const l = this.linhaEdicao();
    return !!l.valor && l.valor > 0 && (l.tipoSede === 'HUB' || (!!l.salarioBase && l.salarioBase > 0));
  }

  salvarEdicao(id: string): void {
    if (!this.podeSalvarEdicao() || this.salvandoEdicao()) return;
    this.salvandoEdicao.set(true);
    this.erroEdicao.set(null);
    this.service.editar(id, this.paraDto(this.linhaEdicao())).subscribe({
      next: () => {
        this.salvandoEdicao.set(false);
        this.editandoId.set(null);
        this.carregar();
      },
      error: (erro) => {
        this.salvandoEdicao.set(false);
        this.erroEdicao.set(erro?.error?.message ?? 'Não foi possível salvar.');
      },
    });
  }

  alternarAtivo(linha: TabelaValor): void {
    const acao = linha.ativo ? this.service.desativar(linha.id) : this.service.ativar(linha.id);
    this.definirAlternando(linha.id, true);
    acao.subscribe({
      next: () => {
        this.definirAlternando(linha.id, false);
        this.carregar();
      },
      error: () => this.definirAlternando(linha.id, false),
    });
  }

  private definirAlternando(id: string, valor: boolean): void {
    const novo = new Set(this.alternandoAtivo());
    valor ? novo.add(id) : novo.delete(id);
    this.alternandoAtivo.set(novo);
  }

  private paraDto(l: LinhaForm): NovaTabelaValor {
    return {
      tipoTrabalhoId: l.tipoTrabalhoId,
      tipoSede: l.tipoSede,
      valor: l.valor!,
      salarioBase: l.tipoSede === 'EXTERNA' ? l.salarioBase ?? undefined : undefined,
      dataInicio: l.dataInicio || undefined,
      dataFim: l.dataFim || undefined,
    };
  }
}
