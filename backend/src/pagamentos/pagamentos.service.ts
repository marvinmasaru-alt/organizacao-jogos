import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusComissao, StatusPagamento, TipoSede } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TabelaValoresService } from '../tabela-valores/tabela-valores.service';
import { GoogleDriveService } from '../integracoes/google-drive/google-drive.service';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PerfilUsuario } from '../common/types/enums';
import { PRAZO_PAGAMENTO_DIAS, PRAZO_URGENTE_DIAS } from './pagamentos.constants';
import {
  calcularSplitComissao,
  calcularStatusExibicao,
  calcularStatusExibicaoComissao,
  diasRestantesAteVencimento,
  montarNomeComprovante,
  PRAZO_PROXIMOS_DIAS,
} from './pagamentos.util';
import {
  ItemComissaoAReceber,
  ItemPagamentoFuncionario,
  MarcarComissaoRecebidaInput,
  RegistrarPagamentoInput,
  ResumoComissoes,
  ResumoPagamentosFuncionarios,
} from './pagamento.entity';

/** Alocação confirmada como TRABALHOU/SUBSTITUIU — dados mínimos que `ConfirmacoesService` já tem à mão pra gerar a obrigação financeira. */
export interface AlocacaoParaPagamento {
  id: string;
  funcionarioId: string;
  responsavelId: string; // fornecimento — quem paga o funcionário
  tipoTrabalhoId: string;
  data: Date; // vaga.data
  tipoSede: TipoSede;
  responsavelSedeId: string | null;
}

export interface FiltrosPagamentos {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  sedeId?: string;
  tipoTrabalhoId?: string;
  tipoSede?: string;
}

const INCLUDE_PAGAMENTO = {
  funcionario: true,
  alocacao: {
    include: {
      vaga: { include: { sede: true } },
      tipoTrabalho: true,
      responsavel: true,
    },
  },
} satisfies Prisma.PagamentoInclude;
type PagamentoComRelacoes = Prisma.PagamentoGetPayload<{ include: typeof INCLUDE_PAGAMENTO }>;

const INCLUDE_COMISSAO = {
  alocacao: {
    include: {
      vaga: { include: { sede: true } },
      tipoTrabalho: true,
      funcionario: true,
      pagamento: true,
    },
  },
  responsavelFornecimento: true,
} satisfies Prisma.ComissaoInclude;
type ComissaoComRelacoes = Prisma.ComissaoGetPayload<{ include: typeof INCLUDE_COMISSAO }>;

/**
 * Módulo financeiro (docs/features/pagamento.md) — cria/cancela as
 * obrigações de pagar o funcionário + a comissão entre dono da sede e
 * dono do funcionário a partir de alocações confirmadas
 * (`criarObrigacoesParaAlocacao`/`cancelarObrigacoesParaAlocacao`,
 * chamadas por `ConfirmacoesService`), e expõe as duas telas financeiras
 * (Pagamentos de Funcionários / Pagamentos a Receber).
 *
 * Comissão tem status próprio por perna (sede/fornecimento) — pagar o
 * funcionário e receber a comissão são eventos financeiros independentes
 * (decisão do usuário): um não implica o outro, então não dá mais pra
 * derivar o status da comissão a partir do `Pagamento` ligado.
 */
@Injectable()
export class PagamentosService {
  private readonly logger = new Logger(PagamentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tabelaValoresService: TabelaValoresService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * Idempotente (docs/features/pagamento.md, seção 29): se já existe uma
   * obrigação ATIVA (PENDENTE/PAGO) pra essa alocação, não faz nada — só
   * recalcula quando não existe nenhuma ainda, ou quando a anterior foi
   * CANCELADA (reativação, ex.: faltou → reconfirmado como trabalhou).
   */
  async criarObrigacoesParaAlocacao(alocacao: AlocacaoParaPagamento): Promise<void> {
    const existente = await this.prisma.pagamento.findUnique({
      where: { alocacaoId: alocacao.id },
    });
    if (existente && existente.status !== StatusPagamento.CANCELADO) {
      return;
    }

    const dataIso = alocacao.data.toISOString().slice(0, 10);
    const vigente = await this.tabelaValoresService.valorVigente(
      alocacao.tipoTrabalhoId,
      alocacao.tipoSede,
      dataIso,
    );
    const valorGerado = vigente?.valor ?? 0;
    if (!vigente) {
      this.logger.warn(
        `Nenhum valor configurado em tabela_valores pra tipoTrabalho=${alocacao.tipoTrabalhoId} tipoSede=${alocacao.tipoSede} data=${dataIso} — obrigação criada com valorGerado=0, ajuste a tabela de valores.`,
      );
    }
    // EXTERNA: valor já sai definido (salário-base configurado). HUB: fica
    // em aberto até o responsável registrar o pagamento (seção 7).
    const valorPrevisto =
      alocacao.tipoSede === TipoSede.EXTERNA ? vigente?.salarioBase ?? null : null;

    const dataPrevista = new Date(alocacao.data);
    dataPrevista.setDate(dataPrevista.getDate() + PRAZO_PAGAMENTO_DIAS);

    // FK NOT NULL — sede sem responsável (caso não coberto pela doc) usa o
    // próprio dono do funcionário, consistente com calcularSplitComissao
    // tratando `responsavelSedeId: null` como "mesmo responsável".
    const responsavelSedeIdColuna = alocacao.responsavelSedeId ?? alocacao.responsavelId;

    await this.prisma.$transaction(async (tx) => {
      await tx.pagamento.upsert({
        where: { alocacaoId: alocacao.id },
        create: {
          alocacaoId: alocacao.id,
          funcionarioId: alocacao.funcionarioId,
          responsavelId: alocacao.responsavelId,
          valorGerado,
          valorPrevisto,
          dataPrevista,
          status: StatusPagamento.PENDENTE,
        },
        update: {
          funcionarioId: alocacao.funcionarioId,
          responsavelId: alocacao.responsavelId,
          valorGerado,
          valorPrevisto,
          valorPago: null,
          dataPagamento: null,
          comprovanteUrl: null,
          dataPrevista,
          status: StatusPagamento.PENDENTE,
        },
      });

      const split =
        valorPrevisto != null
          ? calcularSplitComissao(
              valorGerado,
              valorPrevisto,
              alocacao.responsavelSedeId,
              alocacao.responsavelId,
            )
          : null;

      await tx.comissao.upsert({
        where: { alocacaoId: alocacao.id },
        create: {
          alocacaoId: alocacao.id,
          valorGerado,
          valorFuncionario: valorPrevisto,
          resultadoCalculado: split?.resultadoCalculado ?? null,
          responsavelSedeId: responsavelSedeIdColuna,
          valorComissaoSede: split?.valorComissaoSede ?? null,
          responsavelFornecimentoId: alocacao.responsavelId,
          valorComissaoFornecimento: split?.valorComissaoFornecimento ?? null,
        },
        update: {
          valorGerado,
          valorFuncionario: valorPrevisto,
          resultadoCalculado: split?.resultadoCalculado ?? null,
          responsavelSedeId: responsavelSedeIdColuna,
          valorComissaoSede: split?.valorComissaoSede ?? null,
          responsavelFornecimentoId: alocacao.responsavelId,
          valorComissaoFornecimento: split?.valorComissaoFornecimento ?? null,
        },
      });
    });
  }

  /**
   * Falta/cancelamento cancela o pagamento E a comissão (CLAUDE.md) —
   * nunca apaga. Comissão agora tem status por perna, então cada uma é
   * cancelada independentemente: se uma perna já estava RECEBIDA (evento
   * financeiro já aconteceu), não desfaz sozinho, só avisa.
   */
  async cancelarObrigacoesParaAlocacao(alocacaoId: string): Promise<void> {
    const pagamento = await this.prisma.pagamento.findUnique({ where: { alocacaoId } });
    if (pagamento) {
      if (pagamento.status === StatusPagamento.PENDENTE) {
        await this.prisma.pagamento.update({
          where: { alocacaoId },
          data: { status: StatusPagamento.CANCELADO },
        });
      } else if (pagamento.status === StatusPagamento.PAGO) {
        this.logger.warn(
          `Alocação ${alocacaoId} teve a situação revertida (faltou/cancelou) mas já tinha pagamento PAGO — não foi cancelado automaticamente, precisa de revisão manual.`,
        );
      }
    }

    const comissao = await this.prisma.comissao.findUnique({ where: { alocacaoId } });
    if (!comissao) return;

    const atualizacao: Prisma.ComissaoUpdateInput = {};
    if (comissao.statusSede === StatusComissao.PENDENTE) {
      atualizacao.statusSede = StatusComissao.CANCELADA;
    } else if (comissao.statusSede === StatusComissao.RECEBIDA) {
      this.logger.warn(
        `Comissão (perna sede) da alocação ${alocacaoId} já estava RECEBIDA — não cancelada automaticamente.`,
      );
    }
    if (comissao.statusFornecimento === StatusComissao.PENDENTE) {
      atualizacao.statusFornecimento = StatusComissao.CANCELADA;
    } else if (comissao.statusFornecimento === StatusComissao.RECEBIDA) {
      this.logger.warn(
        `Comissão (perna fornecimento) da alocação ${alocacaoId} já estava RECEBIDA — não cancelada automaticamente.`,
      );
    }
    if (Object.keys(atualizacao).length > 0) {
      await this.prisma.comissao.update({ where: { alocacaoId }, data: atualizacao });
    }
  }

  /**
   * Marca "recebida" a perna da comissão (sede ou fornecimento) que
   * pertence a quem chama — independente do status do `Pagamento` ao
   * funcionário (decisão do usuário). Responsável sempre marca a própria
   * perna (resolvida automaticamente); Administrador precisa informar
   * `leg` quando a linha tem responsáveis diferentes nas duas pernas.
   */
  async marcarComissaoRecebida(
    comissaoId: string,
    input: MarcarComissaoRecebidaInput,
    usuario: UsuarioAutenticado,
  ): Promise<ItemComissaoAReceber> {
    const comissao = await this.prisma.comissao.findUnique({
      where: { id: comissaoId },
      include: INCLUDE_COMISSAO,
    });
    if (!comissao) {
      throw new NotFoundException(`Comissão ${comissaoId} não encontrada.`);
    }

    const perna = this.resolverPernaParaMarcar(comissao, input.leg, usuario);
    const statusAtual = perna === 'FORNECIMENTO' ? comissao.statusFornecimento : comissao.statusSede;
    if (statusAtual === StatusComissao.CANCELADA) {
      throw new BadRequestException('Esta comissão foi cancelada — não é possível marcar como recebida.');
    }
    if (statusAtual === StatusComissao.RECEBIDA) {
      throw new BadRequestException('Esta perna da comissão já foi marcada como recebida.');
    }

    const agora = new Date();
    await this.prisma.comissao.update({
      where: { id: comissaoId },
      data:
        perna === 'FORNECIMENTO'
          ? { statusFornecimento: StatusComissao.RECEBIDA, recebidoFornecimentoEm: agora }
          : { statusSede: StatusComissao.RECEBIDA, recebidoSedeEm: agora },
    });

    const atualizada = await this.prisma.comissao.findUniqueOrThrow({
      where: { id: comissaoId },
      include: INCLUDE_COMISSAO,
    });
    return this.mapearComissao(atualizada, usuario);
  }

  /** Qual perna (SEDE/FORNECIMENTO) quem chama pode marcar — nunca confia num `leg` vindo do body pra Responsável, sempre resolve pela própria identidade. */
  private resolverPernaParaMarcar(
    comissao: ComissaoComRelacoes,
    legInformado: 'SEDE' | 'FORNECIMENTO' | undefined,
    usuario: UsuarioAutenticado,
  ): 'SEDE' | 'FORNECIMENTO' {
    if (usuario.perfil === PerfilUsuario.ADMINISTRADOR) {
      if (legInformado) return legInformado;
      // Mesmo responsável nas duas pernas (ou sede sem responsável,
      // tratado como mesmo) — só a perna de fornecimento importa (ver
      // calcularSplitComissao), não precisa de escolha.
      if (comissao.responsavelSedeId === comissao.responsavelFornecimentoId) {
        return 'FORNECIMENTO';
      }
      throw new BadRequestException(
        'Essa comissão tem responsáveis diferentes na sede e no fornecimento — informe qual perna marcar (leg: "SEDE" ou "FORNECIMENTO").',
      );
    }

    const souDoFornecimento = comissao.responsavelFornecimentoId === usuario.responsavelId;
    const souDaSede = comissao.responsavelSedeId === usuario.responsavelId;
    if (souDoFornecimento) return 'FORNECIMENTO';
    if (souDaSede) return 'SEDE';
    throw new ForbiddenException('Você não é responsável por nenhuma das duas pernas desta comissão.');
  }

  /**
   * Registra o pagamento efetivo (docs/features/pagamento.md, seção 25) —
   * só o dono do funcionário (ou Administrador) pode. Em sede HUB, essa é
   * a primeira vez que `valorPrevisto` é definido (valor livre — seção
   * 7), então a comissão também é calculada aqui pela primeira vez.
   */
  async registrarPagamento(
    pagamentoId: string,
    dto: RegistrarPagamentoInput,
    comprovante: Express.Multer.File | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<ItemPagamentoFuncionario> {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: INCLUDE_PAGAMENTO,
    });
    if (!pagamento) {
      throw new NotFoundException(`Pagamento ${pagamentoId} não encontrado.`);
    }
    if (
      usuario.perfil === PerfilUsuario.RESPONSAVEL &&
      pagamento.responsavelId !== usuario.responsavelId
    ) {
      throw new ForbiddenException('Você não é o responsável por este pagamento.');
    }
    if (pagamento.status === StatusPagamento.CANCELADO) {
      throw new BadRequestException('Esta obrigação foi cancelada — não é possível registrar pagamento.');
    }
    if (pagamento.status === StatusPagamento.PAGO) {
      throw new BadRequestException('Este pagamento já foi registrado.');
    }

    let comprovanteUrl = pagamento.comprovanteUrl;
    if (comprovante) {
      // Organização das pastas (decisão do usuário): responsável do
      // fornecimento (dono do pagamento) → ano-mês do pagamento, ex.
      // "Responsavel B/2026-08" — cada segmento é criado sob demanda.
      const anoMes = dto.dataPagamento.slice(0, 7);
      const enviado = await this.googleDriveService.uploadArquivo(
        comprovante.buffer,
        montarNomeComprovante(pagamento.funcionario.nome, dto.dataPagamento, comprovante.mimetype),
        comprovante.mimetype,
        [pagamento.alocacao.responsavel.nome, anoMes],
      );
      comprovanteUrl = enviado.webViewLink;
    }

    // HUB: valorPrevisto ainda não existia (valor livre) — define agora,
    // junto com valorPago, no mesmo evento (decisão documentada no plano).
    const valorPrevistoFinal = pagamento.valorPrevisto != null ? Number(pagamento.valorPrevisto) : dto.valorPago;

    await this.prisma.$transaction(async (tx) => {
      await tx.pagamento.update({
        where: { id: pagamentoId },
        data: {
          valorPrevisto: valorPrevistoFinal,
          valorPago: dto.valorPago,
          dataPagamento: new Date(dto.dataPagamento),
          observacao: dto.observacao ?? pagamento.observacao,
          comprovanteUrl,
          status: StatusPagamento.PAGO,
        },
      });

      const comissao = await tx.comissao.findUnique({ where: { alocacaoId: pagamento.alocacaoId } });
      // Só calcula na primeira vez (HUB) — comissão nunca recalcula
      // depois de já ter um valorFuncionario definido (congelada).
      if (comissao && comissao.valorFuncionario == null) {
        const split = calcularSplitComissao(
          Number(pagamento.valorGerado),
          valorPrevistoFinal,
          pagamento.alocacao.vaga.sede.responsavelId,
          pagamento.alocacao.responsavelId,
        );
        await tx.comissao.update({
          where: { alocacaoId: pagamento.alocacaoId },
          data: {
            valorFuncionario: valorPrevistoFinal,
            resultadoCalculado: split.resultadoCalculado,
            valorComissaoSede: split.valorComissaoSede,
            valorComissaoFornecimento: split.valorComissaoFornecimento,
            responsavelSedeId:
              pagamento.alocacao.vaga.sede.responsavelId ?? pagamento.alocacao.responsavelId,
          },
        });
      }
    });

    const atualizado = await this.prisma.pagamento.findUniqueOrThrow({
      where: { id: pagamentoId },
      include: INCLUDE_PAGAMENTO,
    });
    return this.mapearPagamento(atualizado);
  }

  async listarPagamentosFuncionarios(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Promise<ItemPagamentoFuncionario[]> {
    const linhas = await this.prisma.pagamento.findMany({
      where: this.montarWhere(usuario, filtros),
      include: INCLUDE_PAGAMENTO,
      orderBy: { dataPrevista: 'asc' },
    });
    return linhas.map((l) => this.mapearPagamento(l));
  }

  async resumoPagamentosFuncionarios(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Promise<ResumoPagamentosFuncionarios> {
    const itens = await this.listarPagamentosFuncionarios(usuario, filtros);
    return this.calcularResumo(
      itens,
      (i) => i.status === StatusPagamento.PENDENTE,
      (i) => i.status === StatusPagamento.PAGO,
      (i) => i.valorPrevisto ?? i.valorGerado,
      (i) => i.valorPago,
    );
  }

  async listarComissoes(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Promise<ItemComissaoAReceber[]> {
    const linhas = await this.prisma.comissao.findMany({
      where: this.montarWhereComissao(usuario, filtros),
      include: INCLUDE_COMISSAO,
      orderBy: { alocacao: { vaga: { data: 'asc' } } },
    });
    return linhas.map((l) => this.mapearComissao(l, usuario));
  }

  async resumoComissoes(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Promise<ResumoComissoes> {
    const itens = await this.listarComissoes(usuario, filtros);
    const resumo = this.calcularResumo(
      itens,
      (i) => i.status === StatusComissao.PENDENTE,
      (i) => i.status === StatusComissao.RECEBIDA,
      (i) => i.minhaComissao ?? 0,
      (i) => i.minhaComissao,
    );
    return {
      totalAReceber: resumo.totalAPagar,
      proximos7Dias: resumo.proximos7Dias,
      urgente2Dias: resumo.urgente2Dias,
      emAtraso: resumo.emAtraso,
      recebidoNoPeriodo: resumo.pagoNoPeriodo,
    };
  }

  private montarWhere(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Prisma.PagamentoWhereInput {
    const where: Prisma.PagamentoWhereInput = {};
    // Fronteira de segurança — sempre aplicado pra RESPONSAVEL, nunca um
    // toggle de conveniência (diferente do "minha/todas sedes" de outras
    // telas): um responsável só pode ver os próprios pagamentos.
    if (usuario.perfil === PerfilUsuario.RESPONSAVEL) {
      where.responsavelId = usuario.responsavelId;
    }
    if (filtros.status) {
      where.status = filtros.status as StatusPagamento;
    }

    const alocacao = this.montarFiltroAlocacao(filtros);
    if (alocacao) {
      where.alocacao = alocacao;
    }
    return where;
  }

  /** Filtro de sede/tipo/período comum às duas telas — sempre em cima da alocação (data do trabalho, sede, tipo). */
  private montarFiltroAlocacao(filtros: FiltrosPagamentos): Prisma.AlocacaoWhereInput | undefined {
    const vaga: Prisma.VagaWhereInput = {};
    if (filtros.dataInicio || filtros.dataFim) {
      vaga.data = {
        gte: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
        lte: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
      };
    }
    if (filtros.sedeId) {
      vaga.sedeId = filtros.sedeId;
    }
    if (filtros.tipoSede) {
      vaga.sede = { tipoSede: filtros.tipoSede as TipoSede };
    }

    const alocacao: Prisma.AlocacaoWhereInput = {};
    if (Object.keys(vaga).length > 0) {
      alocacao.vaga = vaga;
    }
    if (filtros.tipoTrabalhoId) {
      alocacao.tipoTrabalhoId = filtros.tipoTrabalhoId;
    }
    return Object.keys(alocacao).length > 0 ? alocacao : undefined;
  }

  /**
   * `filtros.status` agora filtra pelo status PRÓPRIO da comissão (não
   * mais o do Pagamento ligado) — como cada linha tem duas pernas
   * possivelmente com status diferentes, o filtro casa a linha se A
   * PERNA DE QUEM CONSULTA estiver nesse status (Responsável) ou se
   * QUALQUER UMA DAS DUAS pernas estiver (Administrador, que não tem
   * perna própria).
   */
  private montarWhereComissao(
    usuario: UsuarioAutenticado,
    filtros: FiltrosPagamentos,
  ): Prisma.ComissaoWhereInput {
    const where: Prisma.ComissaoWhereInput = {};
    const statusFiltro = filtros.status as StatusComissao | undefined;

    if (usuario.perfil === PerfilUsuario.RESPONSAVEL) {
      where.OR = statusFiltro
        ? [
            { responsavelSedeId: usuario.responsavelId, statusSede: statusFiltro },
            { responsavelFornecimentoId: usuario.responsavelId, statusFornecimento: statusFiltro },
          ]
        : [
            { responsavelSedeId: usuario.responsavelId },
            { responsavelFornecimentoId: usuario.responsavelId },
          ];
    } else if (statusFiltro) {
      where.OR = [{ statusSede: statusFiltro }, { statusFornecimento: statusFiltro }];
    }

    const alocacao = this.montarFiltroAlocacao(filtros);
    if (alocacao) {
      where.alocacao = alocacao;
    }
    return where;
  }

  /**
   * Cards de resumo (docs/features/pagamento.md, seções 20/23) — soma em
   * cima da lista já filtrada por `montarWhere`/`montarWhereComissao`
   * (que já respeita `dataInicio`/`dataFim` pela data do trabalho, se
   * informados); sem filtro de período, "pago/recebido no período" soma
   * tudo que já foi pago. `totalAPagar`/`emAtraso` nunca dependem de
   * período — são sempre o estado atual.
   */
  private calcularResumo<T extends { dataPrevista: string | null }>(
    itens: T[],
    ehPendente: (item: T) => boolean,
    ehConcluido: (item: T) => boolean,
    valorPendente: (item: T) => number,
    valorConcluido: (item: T) => number | null,
  ): ResumoPagamentosFuncionarios {
    const pendentes = itens.filter(ehPendente);
    const somaSe = (lista: T[], selecionar: (i: T) => number) =>
      lista.reduce((acc, i) => acc + selecionar(i), 0);
    const diasRestantes = (i: T) =>
      diasRestantesAteVencimento(i.dataPrevista ? new Date(i.dataPrevista) : null);

    const totalAPagar = somaSe(pendentes, valorPendente);
    // "Próximos N dias" e "urgente" usam a janela exata em dias até o
    // vencimento (não o bucket largo de statusExibicao, que só marca
    // "vencendo" nos últimos PRAZO_URGENTE_DIAS) — sections 20/23.
    const proximos7Dias = somaSe(
      pendentes.filter((i) => {
        const d = diasRestantes(i);
        return d != null && d >= 0 && d <= PRAZO_PROXIMOS_DIAS;
      }),
      valorPendente,
    );
    const urgente2Dias = somaSe(
      pendentes.filter((i) => {
        const d = diasRestantes(i);
        return d != null && d >= 0 && d <= PRAZO_URGENTE_DIAS;
      }),
      valorPendente,
    );
    const emAtraso = somaSe(
      pendentes.filter((i) => {
        const d = diasRestantes(i);
        return d != null && d < 0;
      }),
      valorPendente,
    );
    const pagoNoPeriodo = somaSe(itens.filter(ehConcluido), (i) => valorConcluido(i) ?? 0);

    return { totalAPagar, proximos7Dias, urgente2Dias, emAtraso, pagoNoPeriodo };
  }

  private mapearPagamento(p: PagamentoComRelacoes): ItemPagamentoFuncionario {
    return {
      id: p.id,
      alocacaoId: p.alocacaoId,
      funcionarioId: p.funcionarioId,
      funcionarioNome: p.funcionario.nome,
      data: p.alocacao.vaga.data.toISOString().slice(0, 10),
      sedeId: p.alocacao.vaga.sedeId,
      sedeNome: p.alocacao.vaga.sede.nome,
      tipoSede: p.alocacao.vaga.sede.tipoSede,
      tipoTrabalhoNome: p.alocacao.tipoTrabalho.nome,
      valorGerado: Number(p.valorGerado),
      valorPrevisto: p.valorPrevisto != null ? Number(p.valorPrevisto) : null,
      valorPago: p.valorPago != null ? Number(p.valorPago) : null,
      dataPrevista: p.dataPrevista ? p.dataPrevista.toISOString().slice(0, 10) : null,
      dataPagamento: p.dataPagamento ? p.dataPagamento.toISOString().slice(0, 10) : null,
      status: p.status,
      statusExibicao: calcularStatusExibicao(p.status, p.dataPrevista),
      observacao: p.observacao,
      comprovanteUrl: p.comprovanteUrl,
    };
  }

  private mapearComissao(c: ComissaoComRelacoes, usuario: UsuarioAutenticado): ItemComissaoAReceber {
    // Quando o mesmo responsável é dono da sede E do fornecimento (caso
    // comum — cada um prioriza a própria sede antes de ajudar em vaga
    // alheia), o resultado inteiro mora na perna de fornecimento (ver
    // calcularSplitComissao) — por isso a checagem de fornecimento vem
    // primeiro. Checar a sede primeiro faria a comissão dessa pessoa
    // aparecer zerada (a perna de sede fica 0 nesse cenário), mesmo ela
    // tendo direito ao valor inteiro.
    const souDoFornecimento = c.responsavelFornecimentoId === usuario.responsavelId;
    const souDaSede = c.responsavelSedeId === usuario.responsavelId;
    const usaPernaFornecimento = usuario.perfil === PerfilUsuario.ADMINISTRADOR || souDoFornecimento;

    const minhaComissao = usaPernaFornecimento
      ? c.valorComissaoFornecimento != null
        ? Number(c.valorComissaoFornecimento)
        : null
      : souDaSede
        ? c.valorComissaoSede != null
          ? Number(c.valorComissaoSede)
          : null
        : null;

    // Status próprio da perna de quem consulta — independente do
    // Pagamento ligado (decisão do usuário). `dataPrevista` continua
    // herdada do Pagamento só como referência de prazo (mesma janela de
    // 7 dias do trabalho), não como fonte do status.
    const meuStatus = usaPernaFornecimento
      ? c.statusFornecimento
      : souDaSede
        ? c.statusSede
        : StatusComissao.PENDENTE;

    const pagamento = c.alocacao.pagamento;
    return {
      id: c.id,
      alocacaoId: c.alocacaoId,
      data: c.alocacao.vaga.data.toISOString().slice(0, 10),
      dataPrevista: pagamento?.dataPrevista ? pagamento.dataPrevista.toISOString().slice(0, 10) : null,
      sedeId: c.alocacao.vaga.sedeId,
      sedeNome: c.alocacao.vaga.sede.nome,
      tipoTrabalhoNome: c.alocacao.tipoTrabalho.nome,
      funcionarioNome: c.alocacao.funcionario.nome,
      responsavelPagadorNome: c.responsavelFornecimento.nome,
      valorGerado: Number(c.valorGerado),
      valorFuncionario: c.valorFuncionario != null ? Number(c.valorFuncionario) : null,
      comissaoCalculada: c.resultadoCalculado != null ? Number(c.resultadoCalculado) : null,
      minhaComissao,
      status: meuStatus,
      statusExibicao: calcularStatusExibicaoComissao(meuStatus, pagamento?.dataPrevista ?? null),
    };
  }
}
