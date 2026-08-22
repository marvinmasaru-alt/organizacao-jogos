import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { paraDataIso } from '../../core/utils/data.util';
import { ConfiguracoesVagasService } from './configuracoes-vagas.service';
import {
  ConfiguracaoVaga,
  ConfiguracaoVagaTipo,
  DIAS_SEMANA,
  Sede,
  TipoTrabalho,
  Vaga,
} from './configuracoes-vagas.model';

type Estado = 'carregando' | 'erro' | 'carregado';

/** Linha editável de tipo+quantidade nos dois formulários (config. fixa e vaga esporádica). */
interface LinhaTipo {
  tipoTrabalho: TipoTrabalho;
  quantidade: number;
}

function novaLinhaTipo(): LinhaTipo {
  return { tipoTrabalho: 'MANPOWER', quantidade: 1 };
}

/**
 * Cadastro e gestão de vagas (docs/features/cadastro-vagas.md) — só
 * Administrador (perfilGuard na rota). Duas seções: configurações fixas
 * (padrão recorrente por sede) e vagas esporádicas (necessidade pontual
 * de uma data, sem alterar a configuração fixa — Regra 2 da doc).
 */
@Component({
  selector: 'app-configuracoes-vagas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './configuracoes-vagas.component.html',
  styleUrl: './configuracoes-vagas.component.scss',
})
export class ConfiguracoesVagasComponent implements OnInit {
  private readonly service = inject(ConfiguracoesVagasService);

  readonly diasSemana = DIAS_SEMANA;

  // --- Sedes (usadas nos dois formulários) ---
  readonly sedes = signal<Sede[]>([]);
  readonly estadoSedes = signal<Estado>('carregando');

  // --- Configurações fixas ---
  readonly configuracoes = signal<ConfiguracaoVaga[]>([]);
  readonly estadoConfiguracoes = signal<Estado>('carregando');
  readonly filtroSedeId = signal('');
  /** Cada item começa fechado, só mostrando o resumo — expande ao clicar. */
  readonly configuracoesExpandidas = signal<Set<string>>(new Set());

  readonly novaConfigSedeId = signal('');
  readonly novaConfigNome = signal('');
  readonly novaConfigTipos = signal<LinhaTipo[]>([novaLinhaTipo()]);
  readonly novaConfigDias = signal<Set<number>>(new Set());
  readonly novaConfigDataInicio = signal('');
  readonly novaConfigDataFim = signal('');
  readonly novaConfigObservacao = signal('');
  readonly enviandoConfig = signal(false);
  readonly erroConfig = signal<string | null>(null);

  // --- Vaga esporádica ---
  readonly esporadicaSedeId = signal('');
  readonly esporadicaData = signal(paraDataIso(new Date()));
  readonly esporadicaTipos = signal<LinhaTipo[]>([novaLinhaTipo()]);
  readonly esporadicaObservacao = signal('');
  readonly enviandoEsporadica = signal(false);
  readonly erroEsporadica = signal<string | null>(null);
  readonly mensagemEsporadica = signal<string | null>(null);

  readonly vagasDoDia = signal<Vaga[]>([]);
  readonly estadoVagasDoDia = signal<Estado>('carregado');
  /** Cada vaga começa fechada, só mostrando o resumo — expande ao clicar. */
  readonly vagasExpandidas = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.carregarSedes();
    this.carregarConfiguracoes();
    this.carregarVagasDoDia();
  }

  private carregarSedes(): void {
    this.estadoSedes.set('carregando');
    this.service.listarSedes().subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        this.estadoSedes.set('carregado');
      },
      error: () => this.estadoSedes.set('erro'),
    });
  }

  carregarConfiguracoes(): void {
    this.estadoConfiguracoes.set('carregando');
    const sedeId = this.filtroSedeId() || undefined;
    this.service.listarConfiguracoes(sedeId).subscribe({
      next: (configuracoes) => {
        // Configuração inativa não deve aparecer na listagem.
        this.configuracoes.set(configuracoes.filter((c) => c.ativo));
        this.estadoConfiguracoes.set('carregado');
      },
      error: () => this.estadoConfiguracoes.set('erro'),
    });
  }

  alternarExpansaoConfig(id: string): void {
    this.configuracoesExpandidas.update((expandidas) => {
      const novo = new Set(expandidas);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  selecionarFiltroSede(sedeId: string): void {
    this.filtroSedeId.set(sedeId);
    this.carregarConfiguracoes();
  }

  // --- Formulário de nova configuração fixa ---

  adicionarLinhaConfig(): void {
    this.novaConfigTipos.update((linhas) => [...linhas, novaLinhaTipo()]);
  }

  removerLinhaConfig(indice: number): void {
    this.novaConfigTipos.update((linhas) => linhas.filter((_, i) => i !== indice));
  }

  atualizarLinhaConfig(indice: number, campo: keyof LinhaTipo, valor: string): void {
    this.novaConfigTipos.update((linhas) =>
      linhas.map((linha, i) =>
        i === indice
          ? { ...linha, [campo]: campo === 'quantidade' ? Number(valor) : valor }
          : linha,
      ),
    );
  }

  alternarDia(dia: number): void {
    this.novaConfigDias.update((dias) => {
      const novo = new Set(dias);
      novo.has(dia) ? novo.delete(dia) : novo.add(dia);
      return novo;
    });
  }

  podeCriarConfig(): boolean {
    return (
      !!this.novaConfigSedeId() &&
      !!this.novaConfigNome().trim() &&
      this.novaConfigTipos().length > 0 &&
      this.novaConfigTipos().every((l) => l.quantidade > 0) &&
      this.novaConfigDias().size > 0
    );
  }

  criarConfiguracao(): void {
    if (!this.podeCriarConfig() || this.enviandoConfig()) {
      return;
    }
    this.enviandoConfig.set(true);
    this.erroConfig.set(null);

    this.service
      .criarConfiguracao({
        sedeId: this.novaConfigSedeId(),
        nome: this.novaConfigNome().trim(),
        tipos: this.novaConfigTipos() as ConfiguracaoVagaTipo[],
        diasSemana: [...this.novaConfigDias()],
        dataInicio: this.novaConfigDataInicio() || undefined,
        dataFim: this.novaConfigDataFim() || undefined,
        observacao: this.novaConfigObservacao().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enviandoConfig.set(false);
          this.resetarFormConfig();
          this.carregarConfiguracoes();
        },
        error: (erro) => {
          this.enviandoConfig.set(false);
          this.erroConfig.set(
            erro?.error?.message ?? 'Não foi possível criar a configuração.',
          );
        },
      });
  }

  private resetarFormConfig(): void {
    this.novaConfigSedeId.set('');
    this.novaConfigNome.set('');
    this.novaConfigTipos.set([novaLinhaTipo()]);
    this.novaConfigDias.set(new Set());
    this.novaConfigDataInicio.set('');
    this.novaConfigDataFim.set('');
    this.novaConfigObservacao.set('');
  }

  inativarConfiguracao(id: string): void {
    this.service.inativarConfiguracao(id).subscribe({
      next: () => this.carregarConfiguracoes(),
    });
  }

  nomeSede(sedeId: string): string {
    return this.sedes().find((s) => s.id === sedeId)?.nome ?? sedeId;
  }

  labelDias(diasSemana: number[]): string {
    return diasSemana
      .map((d) => this.diasSemana.find((ds) => ds.valor === d)?.label ?? d)
      .join(', ');
  }

  // --- Formulário de vaga esporádica ---

  adicionarLinhaEsporadica(): void {
    this.esporadicaTipos.update((linhas) => [...linhas, novaLinhaTipo()]);
  }

  removerLinhaEsporadica(indice: number): void {
    this.esporadicaTipos.update((linhas) => linhas.filter((_, i) => i !== indice));
  }

  atualizarLinhaEsporadica(indice: number, campo: keyof LinhaTipo, valor: string): void {
    this.esporadicaTipos.update((linhas) =>
      linhas.map((linha, i) =>
        i === indice
          ? { ...linha, [campo]: campo === 'quantidade' ? Number(valor) : valor }
          : linha,
      ),
    );
  }

  podeCriarEsporadica(): boolean {
    return (
      !!this.esporadicaSedeId() &&
      !!this.esporadicaData() &&
      this.esporadicaTipos().length > 0 &&
      this.esporadicaTipos().every((l) => l.quantidade > 0)
    );
  }

  criarVagaEsporadica(): void {
    if (!this.podeCriarEsporadica() || this.enviandoEsporadica()) {
      return;
    }
    this.enviandoEsporadica.set(true);
    this.erroEsporadica.set(null);
    this.mensagemEsporadica.set(null);

    this.service
      .criarVagaEsporadica({
        sedeId: this.esporadicaSedeId(),
        data: this.esporadicaData(),
        tipos: this.esporadicaTipos() as ConfiguracaoVagaTipo[],
        observacao: this.esporadicaObservacao().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enviandoEsporadica.set(false);
          this.mensagemEsporadica.set('Vaga esporádica criada.');
          this.esporadicaTipos.set([novaLinhaTipo()]);
          this.esporadicaObservacao.set('');
          this.carregarVagasDoDia();
        },
        error: (erro) => {
          this.enviandoEsporadica.set(false);
          this.erroEsporadica.set(
            erro?.error?.message ?? 'Não foi possível criar a vaga.',
          );
        },
      });
  }

  // --- Vagas do dia (visualizar/cancelar) ---

  selecionarDataVagas(data: string): void {
    this.esporadicaData.set(data);
    this.carregarVagasDoDia();
  }

  carregarVagasDoDia(): void {
    this.estadoVagasDoDia.set('carregando');
    this.service.listarVagasPorData(this.esporadicaData()).subscribe({
      next: (vagas) => {
        this.vagasDoDia.set(vagas);
        this.estadoVagasDoDia.set('carregado');
      },
      error: () => this.estadoVagasDoDia.set('erro'),
    });
  }

  cancelarVaga(id: string): void {
    this.service.cancelarVaga(id).subscribe({
      next: () => this.carregarVagasDoDia(),
    });
  }

  alternarExpansaoVaga(id: string): void {
    this.vagasExpandidas.update((expandidas) => {
      const novo = new Set(expandidas);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }
}
