import { Injectable } from '@nestjs/common';
import { AlocacoesService } from '../alocacoes/alocacoes.service';
import { PerfilUsuario, StatusVaga } from '../common/types/enums';
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
    const vagasComDisponibilidade =
      await this.vagasService.calcularDisponibilidade(vagasDoDia);
    const vagaIdsDoDia = new Set(vagasComDisponibilidade.map((v) => v.id));

    const faltasUrgentes = (
      await this.alocacoesService.listarFaltasUrgentesPorData(data)
    ).filter((a) => vagaIdsDoDia.has(a.vagaId));

    const sedesComVagas = sedes
      .map((sede) => ({
        sedeId: sede.id,
        nome: sede.nome,
        localizacao: sede.localizacao,
        vagas: vagasComDisponibilidade.filter((v) => v.sedeId === sede.id),
      }))
      .filter((sede) => sede.vagas.length > 0);

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
        vagasIncompletas: vagasComDisponibilidade
          .filter((v) => v.status === StatusVaga.ABERTA)
          .map((v) => ({
            vagaId: v.id,
            sedeId: v.sedeId,
            tipo: v.tipo,
            faltam: v.disponiveis,
          })),
        substituicoesUrgentes: faltasUrgentes.map((a) => ({
          vagaId: a.vagaId,
        })),
      },
    };
  }
}
