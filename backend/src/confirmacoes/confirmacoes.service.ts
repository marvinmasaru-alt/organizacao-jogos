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

  /** Sedes com pelo menos 1 alocação ATIVA na data, dentro do escopo do usuário. */
  async listarSedesComAlocacoes(
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<SedeComConfirmacoes[]> {
    const dataRef = new Date(data);
    const alocacoes = await this.prisma.alocacao.findMany({
      where: {
        status: StatusAlocacao.ATIVA,
        vaga: {
          data: dataRef,
          sede:
            usuario.perfil === PerfilUsuario.RESPONSAVEL
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

    const alocacoes = await this.prisma.alocacao.findMany({
      where: {
        status: StatusAlocacao.ATIVA,
        vaga: { sedeId, data: dataRef },
      },
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

    const resumoPorTipo: ResumoTipoConfirmacao[] = [
      ...new Set([...necessariosPorTipo.keys(), ...funcionarios.map((f) => f.tipoTrabalho)]),
    ].map((tipoTrabalho) => {
      const doTipo = funcionarios.filter((f) => f.tipoTrabalho === tipoTrabalho);
      const trabalharam = doTipo.filter(
        (f) => f.status === StatusConfirmacao.PRESENTE,
      ).length;
      const pendentes = doTipo.filter(
        (f) => f.status === StatusConfirmacao.PENDENTE,
      ).length;
      const necessarios = necessariosPorTipo.get(tipoTrabalho) ?? 0;
      return {
        tipoTrabalho,
        necessarios,
        alocados: doTipo.length,
        trabalharam,
        pendentes,
        substituicoesNecessarias: Math.max(0, necessarios - trabalharam),
      };
    });

    return {
      sedeId: sede.id,
      nome: sede.nome,
      data,
      statusDia: this.calcularStatusDia(funcionarios.map((f) => f.status)),
      resumoPorTipo,
      funcionarios,
    };
  }

  /**
   * Atualiza a situação de UMA alocação. `TRABALHOU` é tratado aqui
   * (é novo); `CANCELOU`/`FALTOU` delegam pros fluxos que já existem, pra
   * não duplicar regra de negócio (histórico, liberar vaga, etc.).
   */
  async atualizarSituacao(
    alocacaoId: string,
    status: 'TRABALHOU' | 'CANCELOU' | 'FALTOU',
    usuario: UsuarioAutenticado,
    observacao?: string,
  ): Promise<void> {
    const alocacao = await this.prisma.alocacao.findUnique({
      where: { id: alocacaoId },
      include: { vaga: true },
    });
    if (!alocacao) {
      throw new NotFoundException(`Alocação ${alocacaoId} não encontrada.`);
    }
    await this.validarAcessoSede(alocacao.vaga.sedeId, usuario);

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
        necessitaSubstituicaoUrgente: false,
        observacao,
      });
      return;
    }

    // TRABALHOU -> PRESENTE (não existia fluxo pra isso ainda).
    await this.prisma.confirmacao.update({
      where: { alocacaoId },
      data: {
        status: StatusConfirmacao.PRESENTE,
        observacao: observacao ?? null,
        confirmadoEm: new Date(),
      },
    });
  }

  /**
   * Confirma como TRABALHOU todo mundo que ainda está PENDENTE na sede/dia
   * — nunca sobrescreve quem já tem outro status (seção 15 da doc).
   */
  async confirmarTodos(
    sedeId: string,
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<{ confirmados: number }> {
    await this.validarAcessoSede(sedeId, usuario);
    const dataRef = new Date(data);

    const pendentes = await this.prisma.alocacao.findMany({
      where: {
        status: StatusAlocacao.ATIVA,
        vaga: { sedeId, data: dataRef },
        confirmacao: { status: StatusConfirmacao.PENDENTE },
      },
      select: { id: true },
    });

    if (pendentes.length === 0) {
      return { confirmados: 0 };
    }

    await this.prisma.$transaction(
      pendentes.map((a) =>
        this.prisma.confirmacao.update({
          where: { alocacaoId: a.id },
          data: { status: StatusConfirmacao.PRESENTE, confirmadoEm: new Date() },
        }),
      ),
    );
    return { confirmados: pendentes.length };
  }

  /**
   * "Finaliza" a conferência — só valida que não sobra PENDENTE. Não grava
   * nada (o status do dia já é sempre calculado, ver calcularStatusDia) —
   * a doc só pede que a finalização não deixe passar pendência.
   */
  async finalizar(
    sedeId: string,
    data: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResumoConfirmacaoSede> {
    const resumo = await this.resumoDaSede(sedeId, data, usuario);
    const pendentes = resumo.funcionarios.filter(
      (f) => f.status === StatusConfirmacao.PENDENTE,
    ).length;
    if (pendentes > 0) {
      throw new BadRequestException(
        `Existem ${pendentes} funcionário(s) aguardando confirmação — não é possível finalizar.`,
      );
    }
    return resumo;
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
