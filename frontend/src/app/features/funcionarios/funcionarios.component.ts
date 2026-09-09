import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ResponsavelPublico } from '../responsaveis/responsavel.model';
import { ResponsaveisService } from '../responsaveis/responsaveis.service';
import { AtualizarFuncionario, Funcionario, StatusFuncionario } from './funcionario.model';
import { FuncionariosService } from './funcionarios.service';

type Estado = 'carregando' | 'erro' | 'carregado';

interface FormularioEdicao {
  nome: string;
  telefone: string;
  provincia: string;
  codigoPostal: string;
  documentoFrenteUrl: string;
  documentoVersoUrl: string;
  status: StatusFuncionario;
}

/**
 * Tela de gestão "Funcionários" (docs/features/Cadastro-funcionario.md):
 * cada Responsável vê e edita os próprios funcionários (cadastrados via
 * Google Forms); Administrador pode ver/editar os de qualquer um através
 * do dropdown. Nunca apaga — só muda status (pendente/aprovado/inativo,
 * mais o legado bloqueado), mesmo princípio de histórico usado em
 * tipos-trabalho.
 */
@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './funcionarios.component.html',
  styleUrl: './funcionarios.component.scss',
})
export class FuncionariosComponent implements OnInit {
  private readonly service = inject(FuncionariosService);
  private readonly responsaveisService = inject(ResponsaveisService);
  private readonly auth = inject(AuthService);

  readonly funcionarios = signal<Funcionario[]>([]);
  readonly estado = signal<Estado>('carregando');

  /** Campo de busca no topo — filtra por nome, ignorando acentos e maiúsculas/minúsculas. */
  readonly busca = signal<string>('');
  /** Checkbox "Mostrar inativos" — por padrão, status INATIVO fica escondido da listagem. */
  readonly mostrarInativos = signal<boolean>(false);
  /** Checkbox "Somente pendentes" — mostra só status PENDENTE. */
  readonly somentePendentes = signal<boolean>(false);
  /** Checkbox "Somente sem foto" — mostra só quem não tem nenhum link de documento cadastrado. */
  readonly somenteSemFoto = signal<boolean>(false);
  readonly funcionariosFiltrados = computed(() => {
    const termo = this.normalizarTexto(this.busca());
    return this.funcionarios().filter((funcionario) => {
      if (!this.mostrarInativos() && funcionario.status === 'INATIVO') {
        return false;
      }
      if (this.somentePendentes() && funcionario.status !== 'PENDENTE') {
        return false;
      }
      if (this.somenteSemFoto() && this.documentoLinks(funcionario.documentoUrl).length > 0) {
        return false;
      }
      return !termo || this.normalizarTexto(funcionario.nome).includes(termo);
    });
  });

  readonly souAdministrador = computed(
    () => this.auth.usuario()?.perfil === 'ADMINISTRADOR',
  );

  /** Só populado/usado quando souAdministrador() — dropdown "ver funcionários de outros responsáveis". */
  readonly responsaveis = signal<ResponsavelPublico[]>([]);
  readonly responsavelSelecionadoId = signal<string>('');

  /** id do funcionário sendo editado no momento (null = nenhum em edição). */
  readonly editandoId = signal<string | null>(null);
  readonly formularioEdicao = signal<FormularioEdicao>({
    nome: '',
    telefone: '',
    provincia: '',
    codigoPostal: '',
    documentoFrenteUrl: '',
    documentoVersoUrl: '',
    status: 'PENDENTE',
  });
  readonly salvandoEdicao = signal(false);
  readonly erroEdicao = signal<string | null>(null);

  ngOnInit(): void {
    if (this.souAdministrador()) {
      this.responsaveisService.listarTodos().subscribe({
        next: (responsaveis) => this.responsaveis.set(responsaveis),
        error: () => this.responsaveis.set([]),
      });
    }
    this.carregar();
  }

  /** Dropdown de admin: vazio = todos os responsáveis. */
  selecionarResponsavel(responsavelId: string): void {
    this.responsavelSelecionadoId.set(responsavelId);
    this.carregar();
  }

  iniciarEdicao(funcionario: Funcionario): void {
    const [documentoFrenteUrl, documentoVersoUrl] = this.documentoLinks(
      funcionario.documentoUrl,
    );
    this.editandoId.set(funcionario.id);
    this.formularioEdicao.set({
      nome: funcionario.nome,
      telefone: funcionario.telefone ?? '',
      provincia: funcionario.provincia ?? '',
      codigoPostal: funcionario.codigoPostal ?? '',
      documentoFrenteUrl: documentoFrenteUrl ?? '',
      documentoVersoUrl: documentoVersoUrl ?? '',
      status: funcionario.status,
    });
    this.erroEdicao.set(null);
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.erroEdicao.set(null);
  }

  atualizarCampoEdicao<K extends keyof FormularioEdicao>(
    campo: K,
    valor: FormularioEdicao[K],
  ): void {
    this.formularioEdicao.set({ ...this.formularioEdicao(), [campo]: valor });
  }

  salvarEdicao(id: string): void {
    const form = this.formularioEdicao();
    const nome = form.nome.trim();
    if (!nome || this.salvandoEdicao()) return;

    const documentoUrl = [form.documentoFrenteUrl.trim(), form.documentoVersoUrl.trim()]
      .filter((link) => link.length > 0)
      .join(',');

    const dados: AtualizarFuncionario = {
      nome,
      telefone: form.telefone.trim(),
      provincia: form.provincia.trim(),
      codigoPostal: form.codigoPostal.trim(),
      documentoUrl,
      status: form.status,
    };

    this.salvandoEdicao.set(true);
    this.erroEdicao.set(null);
    this.service.atualizar(id, dados).subscribe({
      next: () => {
        this.salvandoEdicao.set(false);
        this.editandoId.set(null);
        this.carregar();
      },
      error: (erro) => {
        this.salvandoEdicao.set(false);
        this.erroEdicao.set(
          erro?.error?.message ?? 'Não foi possível salvar o funcionário.',
        );
      },
    });
  }

  atualizarBusca(valor: string): void {
    this.busca.set(valor);
  }

  alternarMostrarInativos(valor: boolean): void {
    this.mostrarInativos.set(valor);
  }

  alternarSomentePendentes(valor: boolean): void {
    this.somentePendentes.set(valor);
  }

  alternarSomenteSemFoto(valor: boolean): void {
    this.somenteSemFoto.set(valor);
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  documentoLinks(documentoUrl: string | null | undefined): string[] {
    if (!documentoUrl) {
      return [];
    }
    return documentoUrl
      .split(',')
      .map((link) => link.trim())
      .filter((link) => link.length > 0);
  }

  private carregar(): void {
    this.estado.set('carregando');
    const responsavelId = this.souAdministrador()
      ? this.responsavelSelecionadoId() || undefined
      : undefined;
    this.service.listarMeus(responsavelId).subscribe({
      next: (funcionarios) => {
        this.funcionarios.set(
          [...funcionarios].sort((a, b) => a.nome.localeCompare(b.nome)),
        );
        this.estado.set('carregado');
      },
      error: () => this.estado.set('erro'),
    });
  }
}
