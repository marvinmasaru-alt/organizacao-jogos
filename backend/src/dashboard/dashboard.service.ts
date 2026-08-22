import { Injectable } from '@nestjs/common';
import { StatusVaga } from '@prisma/client';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { PerfilUsuario } from '../common/types/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SedesService } from '../sedes/sedes.service';
import { VagasService } from '../vagas/vagas.service';
import { UsuarioAutenticado } from '../auth/auth.service';

export type EscopoSedes = 'minha' | 'todas';

/**
 * Read model do Dashboard principal: resume, por sede, tipo, "X/Y" e
 * "✓ Completo" / "N vagas disponíveis" para uma data (padrão = hoje).
 * Nunca expõe nome de quem faltou — só o indicador de urgência (ver
 * AlocacoesService.listarFaltasUrgentesPorData).
 *
 * Sedes e vagas não têm restrição de acesso — qualquer usuário logado pode
 * ver todas. O filtro "Minha sede" é só uma conveniência de visualização,
 * opt-in via `escopo`: só restringe às sedes do próprio responsável quando
 * o usuário pede explicitamente. Padrão é "todas" (sem filtro nenhum).
 * Administrador não tem sede própria — "minha" nunca filtra nada pra ele.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly sedesService: SedesService,
    private readonly vagasService: VagasService,
    private readonly alocacoesService: AlocacoesService,
    private readonly prisma: PrismaService,
  ) {}

  async resumoPorData(
    data: string,
    usuario: UsuarioAutenticado,
    escopo: EscopoSedes = 'todas',
  ) {
    const filtrarPorMinhaSede =
      escopo === 'minha' &&
      usuario.perfil === PerfilUsuario.RESPONSAVEL &&
      !!usuario.responsavelId;

    const sedes = filtrarPorMinhaSede
      ? await this.sedesService.listarPorResponsavel(usuario.responsavelId!)
      : await this.sedesService.listarTodas();

    const sedeIds = new Set(sedes.map((s) => s.id));

    const vagasDoDia = (await this.vagasService.listarPorData(data)).filter(
      (v) => sedeIds.has(v.sedeId),
    );
    const todasVagasComDisponibilidade =
      await this.vagasService.calcularDisponibilidade(vagasDoDia);
    // Vaga CANCELADA nunca deve contar como pendência/disponibilidade —
    // continua existindo no banco (nunca é apagada), só some da visão
    // operacional do dia (docs/features/cadastro-vagas.md, seção 14).
    const vagasComDisponibilidade = todasVagasComDisponibilidade.filter(
      (v) => v.status !== StatusVaga.CANCELADA,
    );
    const siglaPorSedeId = new Map(sedes.map((s) => [s.id, s.sigla]));

    // Sede/dia já finalizado (docs/features/confirmacao-dia.md, seção
    // 28.1) não deve mais acender o alerta de urgência no Dashboard — a
    // tela de conferência trava ali, e mostrar "🔴 Urgente" pra uma sede
    // já dada como concluída confunde o responsável.
    const sedesFinalizadasHoje = await this.prisma.conferenciaDia.findMany({
      where: { data: new Date(data), finalizadoEm: { not: null } },
      select: { sedeId: true },
    });
    const sedeIdsFinalizadas = new Set(sedesFinalizadasHoje.map((c) => c.sedeId));

    const faltasUrgentes = (
      await this.alocacoesService.listarFaltasUrgentesPorData(data)
    ).filter((a) => {
      const vaga = vagasComDisponibilidade.find((v) => v.id === a.vagaTipoId);
      return !!vaga && !sedeIdsFinalizadas.has(vaga.sedeId);
    });

    const sedeIdsComFaltaUrgente = new Set(
      faltasUrgentes.map((a) => {
        const vaga = vagasComDisponibilidade.find((v) => v.id === a.vagaTipoId);
        return vaga?.sedeId;
      }),
    );

    const substituicoesUrgentesPorVagaId = new Map<string, number>();
    for (const falta of faltasUrgentes) {
      substituicoesUrgentesPorVagaId.set(
        falta.vagaTipoId,
        (substituicoesUrgentesPorVagaId.get(falta.vagaTipoId) ?? 0) + 1,
      );
    }

    /** Ordem de exibição no Dashboard: urgentes → normais → completas. */
    const prioridadeOrdenacao = (sede: { urgente: boolean; completa: boolean }) => {
      if (sede.urgente) return 0;
      if (sede.completa) return 2;
      return 1;
    };

    const sedesComVagas = sedes
      .map((sede) => {
        const vagas = vagasComDisponibilidade
          .filter((v) => v.sedeId === sede.id)
          .map((v) => ({
            ...v,
            substituicoesUrgentes: substituicoesUrgentesPorVagaId.get(v.id) ?? 0,
          }));
        return {
          sedeId: sede.id,
          nome: sede.nome,
          // Contrato da API mantém o nome "localizacao" pro frontend, mesmo
          // vindo de sedes.endereco (schema novo não tem coluna separada
          // de link do Maps — ver docs/SQL/create.sql).
          localizacao: sede.endereco,
          urgente: sedeIdsComFaltaUrgente.has(sede.id),
          // Só "completa" quando a sede tem vaga no dia e todas estão preenchidas.
          completa:
            vagas.length > 0 &&
            vagas.every((v) => v.status === StatusVaga.COMPLETA),
          vagas,
        };
      })
      .filter((sede) => sede.vagas.length > 0)
      .sort((a, b) => prioridadeOrdenacao(a) - prioridadeOrdenacao(b));

    const totalVagas = vagasComDisponibilidade.length;
    const vagasCompletas = vagasComDisponibilidade.filter(
      (v) => v.status === StatusVaga.COMPLETA,
    ).length;
    const vagasIncompletas = totalVagas - vagasCompletas;
    const totalNecessario = vagasComDisponibilidade.reduce(
      (acc, v) => acc + v.quantidade,
      0,
    );
    const totalAlocado = vagasComDisponibilidade.reduce(
      (acc, v) => acc + v.alocacoesValidas,
      0,
    );
    const ocupacaoPercentual =
      totalNecessario === 0
        ? 0
        : Math.round((totalAlocado / totalNecessario) * 100);

    return {
      data,
      totais: {
        totalVagas,
        vagasCompletas,
        vagasIncompletas,
        totalNecessario,
        totalAlocado,
        ocupacaoPercentual,
      },
      sedes: sedesComVagas,
      pendencias: {
        // Sede/dia já finalizado sai da lista de pendências — a vaga
        // continua aparecendo como incompleta no card "vagas de hoje"
        // (sedesComVagas, acima), só não é mais cobrada como algo a
        // resolver: a conferência daquela sede/dia já foi encerrada.
        vagasIncompletas: vagasComDisponibilidade
          .filter(
            (v) => v.status === StatusVaga.ABERTA && !sedeIdsFinalizadas.has(v.sedeId),
          )
          .map((v) => ({
            vagaId: v.id,
            sedeId: v.sedeId,
            sedeSigla: siglaPorSedeId.get(v.sedeId) ?? '',
            tipo: v.tipo,
            faltam: v.disponiveis,
          }))
          .sort((a, b) => a.sedeSigla.localeCompare(b.sedeSigla)),
        substituicoesUrgentes: faltasUrgentes
          .map((a) => {
            const vaga = vagasComDisponibilidade.find((v) => v.id === a.vagaTipoId);
            return {
              vagaId: a.vagaTipoId,
              sedeSigla: siglaPorSedeId.get(vaga?.sedeId ?? '') ?? '',
              tipo: vaga?.tipo ?? '',
              faltam: vaga?.disponiveis ?? 0,
            };
          })
          .sort((a, b) => a.sedeSigla.localeCompare(b.sedeSigla)),
      },
    };
  }
}
