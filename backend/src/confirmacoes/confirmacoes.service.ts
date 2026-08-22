import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatusAlocacao,
  StatusConfirmacao,
  StatusVaga,
  TipoTrabalho,
} from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { FaltasService } from '../faltas/faltas.service';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PerfilUsuario } from '../common/types/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  EscopoSedes,
  FuncionarioConfirmacao,
  ResumoConfirmacaoSede,
  ResumoTipoConfirmacao,
  SedeComConfirmacoes,
  StatusDia,
} from './confirmacao-dia.entity';

/**
 * Orquestra a conferência do dia (docs/features/confirmacao-dia.md) por
 * cima do que já existe: cancelamento delega pra AlocacoesService.cancelar,
 * falta delega pra FaltasService.registrar — esta camada só soma o que
 * faltava (marcar "trabalhou", resumo por sede/dia, confirmar em lote,
 * validar finalização).
 */
@Injectable()
export class ConfirmacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alocacoesService: AlocacoesService,
    private readonly faltasService: FaltasService,
  ) {}

  /**
   * Sedes com pelo menos 1 alocação na data, dentro do escopo do usuário —
   * inclusive quando TODAS as alocações daquela sede/dia já foram
   * canceladas (histórico nunca some, mesmo princípio de resumoDaSede: uma
   * sede não deve sumir da lista só porque a única pessoa alocada acabou
   * cancelando).
   */
  async listarSedesComAlocacoes(
    data: string,
    usuario: UsuarioAutenticado,
    escopo: EscopoSedes = 'todas',
  ): Promise<SedeComConfirmacoes[]> {
    const dataRef = new Date(data);
    // Responsável nunca vê sede alheia nesta tela — regra própria da
    // Confirmação do Dia (docs/features/confirmacao-dia.md, seção 5), mais
    // restritiva que a visibilidade geral de sedes. Administrador vê tudo
    // por padrão, mas pode filtrar pra "só a minha" quando ele também é
    // responsável por alguma sede (ex.: Paulo) — o filtro é só uma
    // conveniência de visualização, igual o Dashboard: o backend não some
    // com nada, só restringe o que a lista mostra.
    const filtrarPorMinhaSede =
      usuario.perfil === PerfilUsuario.RESPONSAVEL ||
      (escopo === 'minha' && !!usuario.responsavelId);

    const alocacoes = await this.prisma.alocacao.findMany({
      where: {
        vaga: {
          data: dataRef,
          sede: filtrarPorMinhaSede
            ? { responsavelId: usuario.responsavelId }
            : undefined,
        },
      },
      include: { confirmacao: true, vaga: { include: { sede: true } } },
    });

    const porSede = new Map<
      string,
      { sede: { id: string; nome: string; sigla: string }; statuses: (StatusConfirmacao | null)[] }
    >();
    for (const a of alocacoes) {
      const sede = a.vaga.sede;
      const grupo = porSede.get(sede.id) ?? {
        sede: { id: sede.id, nome: sede.nome, sigla: sede.sigla },
        statuses: [],
      };
      grupo.statuses.push(a.confirmacao?.status ?? null);
      porSede.set(sede.id, grupo);
    }

    return [...porSede.values()]
      .map(({ sede, statuses }) => ({
        sedeId: sede.id,
        nome: sede.nome,
        sigla: sede.sigla,
        totalAlocados: statuses.length,
        statusDia: this.calcularStatusDia(statuses),
      }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla));
  }

  /** Resumo por tipo + lista de funcionários de uma sede/dia (passo 3 da tela). */
  async resumoDaSede(
    sedeId: string,
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResumoConfirmacaoSede> {
    const sede = await this.validarAcessoSede(sedeId, usuario);
    const dataRef = new Date(data);

    // Necessários por tipo somam as vaga_tipos de todas as vagas ABERTAS/
    // COMPLETAS da sede/dia — vaga CANCELADA nunca conta (mesma regra do
    // Dashboard, ver VagasService.calcularDisponibilidade).
    const vagasDoDia = await this.prisma.vaga.findMany({
      where: { sedeId, data: dataRef, status: { not: StatusVaga.CANCELADA } },
      include: { tipos: true },
    });
    const necessariosPorTipo = new Map<TipoTrabalho, number>();
    for (const vaga of vagasDoDia) {
      for (const tipo of vaga.tipos) {
        necessariosPorTipo.set(
          tipo.tipoTrabalho,
          (necessariosPorTipo.get(tipo.tipoTrabalho) ?? 0) + tipo.quantidade,
        );
      }
    }

    // Traz TODAS as alocações da sede/dia (inclusive CANCELADA) — cancelar
    // libera a vaga, mas o histórico continua mostrando que a pessoa havia
    // sido alocada (ver "Princípio geral de histórico"). Quem cancelou some
    // do `disponíveis`/contagens, mas nunca da listagem desta tela.
    const alocacoes = await this.prisma.alocacao.findMany({
      where: { vaga: { sedeId, data: dataRef } },
      include: { confirmacao: true, funcionario: true },
    });

    const funcionarios: FuncionarioConfirmacao[] = alocacoes.map((a) => ({
      alocacaoId: a.id,
      funcionarioId: a.funcionarioId,
      nome: a.funcionario.nome,
      telefone: a.funcionario.telefone,
      tipoTrabalho: a.tipoTrabalho,
      status: a.confirmacao?.status ?? StatusConfirmacao.PENDENTE,
      observacao: a.confirmacao?.observacao ?? null,
      confirmadoEm: a.confirmacao?.confirmadoEm?.toISOString() ?? null,
    }));

    // Resumo por tipo (necessários/alocados/trabalharam/pendentes) só conta
    // alocações ATIVA — quem cancelou libera a posição e não deve inflar
    // essas contagens, mesmo continuando visível na lista de funcionários.
    const alocacoesAtivas = alocacoes.filter((a) => a.status === StatusAlocacao.ATIVA);
    const funcionariosAtivos = funcionarios.filter((f) =>
      alocacoesAtivas.some((a) => a.id === f.alocacaoId),
    );

    const resumoPorTipo: ResumoTipoConfirmacao[] = [
      ...new Set([...necessariosPorTipo.keys(), ...funcionarios.map((f) => f.tipoTrabalho)]),
    ].map((tipoTrabalho) => {
      const doTipo = funcionariosAtivos.filter((f) => f.tipoTrabalho === tipoTrabalho);
      // SUBSTITUIU conta como trabalho normal — quem cobriu a vaga
      // trabalhou de verdade, só tem um rótulo diferente na tela.
      const trabalharam = doTipo.filter(
        (f) =>
          f.status === StatusConfirmacao.PRESENTE ||
          f.status === StatusConfirmacao.SUBSTITUIU,
      ).length;
      const necessarios = necessariosPorTipo.get(tipoTrabalho) ?? 0;
      // "Pendentes" aqui é vagas ainda não preenchidas (necessários -
      // trabalharam, nunca negativo) — decisão revertida: não é mais
      // "aguardando confirmação" (esse conceito continua existindo, só que
      // calculado à parte no frontend a partir de `funcionarios`, pra
      // decidir se dá pra finalizar — ver pendentesRestantes/finalizar()).
      const pendentes = Math.max(0, necessarios - trabalharam);
      // Conta quem foi marcado como urgente (FALTOU + urgente — ver
      // FaltasService.registrar), abatendo uma urgência pra cada
      // SUBSTITUIU já registrado no mesmo tipo — nunca deixa passar de
      // zero. Pendente/cancelado/faltou sem urgência não acende esse
      // alerta, mesmo que a vaga siga incompleta.
      const urgentes = doTipo.filter(
        (f) => f.status === StatusConfirmacao.SUBSTITUICAO_NECESSARIA,
      ).length;
      const resolvidas = doTipo.filter(
        (f) => f.status === StatusConfirmacao.SUBSTITUIU,
      ).length;
      const substituicoesNecessarias = Math.max(0, urgentes - resolvidas);
      return {
        tipoTrabalho,
        necessarios,
        alocados: doTipo.length,
        trabalharam,
        pendentes,
        substituicoesNecessarias,
      };
    });

    const conferencia = await this.prisma.conferenciaDia.findUnique({
      where: { sedeId_data: { sedeId, data: dataRef } },
    });

    return {
      sedeId: sede.id,
      nome: sede.nome,
      data,
      statusDia: this.calcularStatusDia(funcionarios.map((f) => f.status)),
      resumoPorTipo,
      funcionarios,
      finalizado: this.estaFinalizada(conferencia),
      finalizadoEm: conferencia?.finalizadoEm?.toISOString() ?? null,
    };
  }

  private estaFinalizada(
    conferencia: { finalizadoEm: Date | null } | null,
  ): boolean {
    return conferencia?.finalizadoEm != null;
  }

  /** Lança erro se a sede/dia já foi finalizada e não foi reaberta — chamar antes de qualquer alteração de situação. */
  private async garantirNaoFinalizada(sedeId: string, dataRef: Date): Promise<void> {
    const conferencia = await this.prisma.conferenciaDia.findUnique({
      where: { sedeId_data: { sedeId, data: dataRef } },
    });
    if (this.estaFinalizada(conferencia)) {
      throw new BadRequestException(
        'A conferência deste dia já foi finalizada — reabra com um Administrador antes de alterar.',
      );
    }
  }

  /**
   * Atualiza a situação de UMA alocação. `TRABALHOU`/`SUBSTITUIU` são
   * tratados aqui; `CANCELOU`/`FALTOU` delegam pros fluxos que já existem,
   * pra não duplicar regra de negócio (histórico, liberar vaga, etc.).
   *
   * `necessitaSubstituicaoUrgente` só se aplica a `FALTOU` — cancelamento
   * já libera a vaga normalmente (aparece como pendência comum no
   * Dashboard), o alerta vermelho de urgência é exclusivo de quem faltou.
   */
  async atualizarSituacao(
    alocacaoId: string,
    status: 'TRABALHOU' | 'CANCELOU' | 'FALTOU' | 'SUBSTITUIU',
    usuario: UsuarioAutenticado,
    observacao?: string,
    necessitaSubstituicaoUrgente = false,
  ): Promise<void> {
    const alocacao = await this.prisma.alocacao.findUnique({
      where: { id: alocacaoId },
      include: { vaga: true },
    });
    if (!alocacao) {
      throw new NotFoundException(`Alocação ${alocacaoId} não encontrada.`);
    }
    await this.validarAcessoSede(alocacao.vaga.sedeId, usuario);
    await this.garantirNaoFinalizada(alocacao.vaga.sedeId, alocacao.vaga.data);

    if (alocacao.status !== StatusAlocacao.ATIVA) {
      // Alocação já CANCELADA — só reativa se a nova situação for
      // TRABALHOU/SUBSTITUIU/FALTOU ("na verdade eu vou trabalhar sim").
      // Sem isso, cair de volta pra CANCELADA numa reconfirmação deixava
      // confirmação e alocação contradizendo uma à outra (pessoa aparecia
      // "Presente" na lista mas nunca contava no resumo, porque só ATIVA
      // conta — ver resumoDaSede). Recancelar uma alocação já cancelada
      // não faz sentido, então isso continua bloqueado.
      if (status === 'CANCELOU') {
        throw new BadRequestException('Esta alocação já está cancelada.');
      }
      await this.reativarAlocacao(alocacao.id, alocacao.vagaId, alocacao.tipoTrabalho);
    }

    if (status === 'CANCELOU') {
      await this.alocacoesService.cancelar(
        alocacaoId,
        observacao ?? 'Cancelado na confirmação do dia.',
        usuario.email,
      );
      return;
    }

    if (status === 'FALTOU') {
      await this.faltasService.registrar({
        alocacaoId,
        necessitaSubstituicaoUrgente,
        observacao,
      });
      return;
    }

    // TRABALHOU -> PRESENTE / SUBSTITUIU -> SUBSTITUIU (ambos são "essa
    // pessoa trabalhou", só muda o status gravado — ver resumoDaSede pra
    // como SUBSTITUIU abate a contagem de substituições urgentes).
    await this.prisma.confirmacao.update({
      where: { alocacaoId },
      data: {
        status:
          status === 'SUBSTITUIU'
            ? StatusConfirmacao.SUBSTITUIU
            : StatusConfirmacao.PRESENTE,
        observacao: observacao ?? null,
        confirmadoEm: new Date(),
      },
    });
  }

  /**
   * Volta uma alocação CANCELADA pra ATIVA — "na verdade eu vou trabalhar
   * sim". Revalida a capacidade da vaga_tipo antes de gravar (mesma regra
   * de qualquer operação que incrementa vagas ocupadas — CLAUDE.md: ler +
   * gravar atomicamente via transação, pra não estourar `quantidade` numa
   * condição de corrida com outra alocação concorrente).
   */
  private async reativarAlocacao(
    alocacaoId: string,
    vagaId: string,
    tipoTrabalho: TipoTrabalho,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const vagaTipo = await tx.vagaTipo.findFirst({
        where: { vagaId, tipoTrabalho },
      });
      if (!vagaTipo) {
        throw new NotFoundException('Tipo de vaga não encontrado para esta alocação.');
      }
      // Mesma regra de "ocupa a vaga" que AlocacoesService.contarValidasPorVagaRealETipo
      // (ATIVA e sem confirmação FALTOU/SUBSTITUICAO_NECESSARIA — as duas
      // são "não compareceu", só uma marcada urgente) — duplicado aqui
      // porque precisa rodar dentro desta transação (tx), não da conexão
      // default.
      const preenchidas = await tx.alocacao.count({
        where: {
          vagaId,
          tipoTrabalho,
          status: StatusAlocacao.ATIVA,
          NOT: {
            confirmacao: {
              status: { in: [StatusConfirmacao.FALTOU, StatusConfirmacao.SUBSTITUICAO_NECESSARIA] },
            },
          },
        },
      });
      if (preenchidas >= vagaTipo.quantidade) {
        throw new BadRequestException(
          'Não é possível reativar: a vaga já está completa com outros funcionários.',
        );
      }
      await tx.alocacao.update({
        where: { id: alocacaoId },
        data: { status: StatusAlocacao.ATIVA },
      });
    });
  }

  /**
   * Finaliza a conferência — valida que não sobra PENDENTE e trava a
   * sede/dia contra novas alterações (docs/features/confirmacao-dia.md,
   * seção 28.1). Um Administrador pode desfazer via `reabrir`.
   */
  async finalizar(
    sedeId: string,
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResumoConfirmacaoSede> {
    await this.validarAcessoSede(sedeId, usuario);
    const dataRef = new Date(data);
    await this.garantirNaoFinalizada(sedeId, dataRef);

    const resumo = await this.resumoDaSede(sedeId, data, usuario);
    const pendentes = resumo.funcionarios.filter(
      (f) => f.status === StatusConfirmacao.PENDENTE,
    ).length;
    if (pendentes > 0) {
      throw new BadRequestException(
        `Existem ${pendentes} funcionário(s) aguardando confirmação — não é possível finalizar.`,
      );
    }

    const usuarioLogado = await this.prisma.usuario.findUnique({
      where: { email: usuario.email },
    });
    await this.prisma.conferenciaDia.upsert({
      where: { sedeId_data: { sedeId, data: dataRef } },
      create: {
        sedeId,
        data: dataRef,
        finalizadoEm: new Date(),
        finalizadoPor: usuarioLogado?.id,
      },
      update: {
        finalizadoEm: new Date(),
        finalizadoPor: usuarioLogado?.id,
      },
    });

    return { ...resumo, finalizado: true, finalizadoEm: new Date().toISOString() };
  }

  /**
   * Reabre uma sede/dia já finalizada — só o Administrador pode (garantido
   * pelo `PerfisGuard` na rota). Não é possível reabrir o que não está
   * finalizado.
   */
  async reabrir(
    sedeId: string,
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResumoConfirmacaoSede> {
    await this.validarAcessoSede(sedeId, usuario);
    const dataRef = new Date(data);

    const conferencia = await this.prisma.conferenciaDia.findUnique({
      where: { sedeId_data: { sedeId, data: dataRef } },
    });
    if (!this.estaFinalizada(conferencia)) {
      throw new BadRequestException('Esta conferência ainda não foi finalizada.');
    }

    const usuarioLogado = await this.prisma.usuario.findUnique({
      where: { email: usuario.email },
    });
    await this.prisma.conferenciaDia.update({
      where: { sedeId_data: { sedeId, data: dataRef } },
      data: {
        finalizadoEm: null,
        reabertoEm: new Date(),
        reabertoPor: usuarioLogado?.id,
      },
    });

    return this.resumoDaSede(sedeId, data, usuario);
  }

  private async validarAcessoSede(
    sedeId: string,
    usuario: UsuarioAutenticado,
  ) {
    const sede = await this.prisma.sede.findUnique({ where: { id: sedeId } });
    if (!sede) {
      throw new NotFoundException(`Sede ${sedeId} não encontrada.`);
    }
    if (
      usuario.perfil === PerfilUsuario.RESPONSAVEL &&
      sede.responsavelId !== usuario.responsavelId
    ) {
      throw new ForbiddenException(
        'Você não tem acesso a esta sede.',
      );
    }
    return sede;
  }

  private calcularStatusDia(
    statuses: (StatusConfirmacao | null)[],
  ): StatusDia {
    if (statuses.length === 0) {
      return 'PENDENTE';
    }
    const pendentes = statuses.filter(
      (s) => s === null || s === StatusConfirmacao.PENDENTE,
    ).length;
    if (pendentes === statuses.length) {
      return 'PENDENTE';
    }
    if (pendentes === 0) {
      return 'CONFERIDO';
    }
    return 'EM_CONFERENCIA';
  }
}
