import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiposTrabalhoService } from './tipos-trabalho.service';
import { TipoTrabalho } from './tipos-trabalho.model';

type Estado = 'carregando' | 'erro' | 'carregado';

/**
 * Cadastro/gestão de tipos de trabalho — decisão revertida: deixou de ser
 * um enum fixo MANPOWER/FORKLIFT pra virar cadastro dinâmico. Só
 * Administrador (perfilGuard na rota, PerfisGuard no backend). Nunca
 * apaga (princípio geral de histórico) — só desativa/reativa.
 */
@Component({
  selector: 'app-tipos-trabalho',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tipos-trabalho.component.html',
  styleUrl: './tipos-trabalho.component.scss',
})
export class TiposTrabalhoComponent implements OnInit {
  private readonly service = inject(TiposTrabalhoService);

  readonly tipos = signal<TipoTrabalho[]>([]);
  readonly estado = signal<Estado>('carregando');

  readonly novoNome = signal('');
  readonly criando = signal(false);
  readonly erroCriar = signal<string | null>(null);

  /** id do tipo sendo renomeado no momento (null = nenhum em edição). */
  readonly editandoId = signal<string | null>(null);
  readonly nomeEdicao = signal('');
  readonly salvandoEdicao = signal(false);
  readonly erroEdicao = signal<string | null>(null);

  /** ids em processamento de ativar/desativar — desabilita o próprio botão. */
  readonly alternandoAtivo = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.carregar();
  }

  private carregar(): void {
    this.estado.set('carregando');
    this.service.listarTodos().subscribe({
      next: (tipos) => {
        this.tipos.set([...tipos].sort((a, b) => a.nome.localeCompare(b.nome)));
        this.estado.set('carregado');
      },
      error: () => this.estado.set('erro'),
    });
  }

  criar(): void {
    const nome = this.novoNome().trim();
    if (!nome || this.criando()) return;
    this.criando.set(true);
    this.erroCriar.set(null);
    this.service.criar(nome).subscribe({
      next: () => {
        this.criando.set(false);
        this.novoNome.set('');
        this.carregar();
      },
      error: (erro) => {
        this.criando.set(false);
        this.erroCriar.set(
          erro?.error?.message ?? 'Não foi possível criar o tipo de trabalho.',
        );
      },
    });
  }

  iniciarEdicao(tipo: TipoTrabalho): void {
    this.editandoId.set(tipo.id);
    this.nomeEdicao.set(tipo.nome);
    this.erroEdicao.set(null);
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.nomeEdicao.set('');
    this.erroEdicao.set(null);
  }

  salvarEdicao(id: string): void {
    const nome = this.nomeEdicao().trim();
    if (!nome || this.salvandoEdicao()) return;
    this.salvandoEdicao.set(true);
    this.erroEdicao.set(null);
    this.service.editar(id, nome).subscribe({
      next: () => {
        this.salvandoEdicao.set(false);
        this.editandoId.set(null);
        this.carregar();
      },
      error: (erro) => {
        this.salvandoEdicao.set(false);
        this.erroEdicao.set(
          erro?.error?.message ?? 'Não foi possível renomear o tipo de trabalho.',
        );
      },
    });
  }

  alternarAtivo(tipo: TipoTrabalho): void {
    const acao = tipo.ativo ? this.service.desativar(tipo.id) : this.service.ativar(tipo.id);
    this.definirAlternando(tipo.id, true);
    acao.subscribe({
      next: () => {
        this.definirAlternando(tipo.id, false);
        this.carregar();
      },
      error: () => this.definirAlternando(tipo.id, false),
    });
  }

  private definirAlternando(id: string, valor: boolean): void {
    const novo = new Set(this.alternandoAtivo());
    valor ? novo.add(id) : novo.delete(id);
    this.alternandoAtivo.set(novo);
  }
}
