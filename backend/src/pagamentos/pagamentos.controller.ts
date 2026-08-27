import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioAutenticado } from '../auth/auth.service';
import { PagamentosService, FiltrosPagamentos } from './pagamentos.service';
import { RegistrarPagamentoDto } from './dto/registrar-pagamento.dto';
import { MarcarComissaoRecebidaDto } from './dto/marcar-comissao-recebida.dto';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

/**
 * Módulo financeiro (docs/features/pagamento.md) — Responsável e
 * Administrador usam, cada um vendo só o que lhe cabe (o serviço escopa
 * por responsável, não há PerfisGuard aqui — ver
 * PagamentosService.montarWhere/montarWhereComissao).
 */
@Controller('pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentosController {
  constructor(private readonly service: PagamentosService) {}

  @Get('funcionarios')
  listarFuncionarios(@Query() query: Record<string, string>, @Req() req: RequestComSessao) {
    return this.service.listarPagamentosFuncionarios(req.user, this.extrairFiltros(query));
  }

  @Get('funcionarios/resumo')
  resumoFuncionarios(@Query() query: Record<string, string>, @Req() req: RequestComSessao) {
    return this.service.resumoPagamentosFuncionarios(req.user, this.extrairFiltros(query));
  }

  @Get('comissoes')
  listarComissoes(@Query() query: Record<string, string>, @Req() req: RequestComSessao) {
    return this.service.listarComissoes(req.user, this.extrairFiltros(query));
  }

  @Get('comissoes/resumo')
  resumoComissoes(@Query() query: Record<string, string>, @Req() req: RequestComSessao) {
    return this.service.resumoComissoes(req.user, this.extrairFiltros(query));
  }

  /**
   * Marca a comissão como recebida — independente do pagamento ao
   * funcionário (decisão do usuário). Sem arquivo, sem valor: é só um
   * evento de confirmação, o valor já está calculado desde a criação.
   */
  @Patch('comissoes/:id/marcar-recebida')
  marcarComissaoRecebida(
    @Param('id') id: string,
    @Body() dto: MarcarComissaoRecebidaDto,
    @Req() req: RequestComSessao,
  ) {
    return this.service.marcarComissaoRecebida(id, dto, req.user);
  }

  /** multipart/form-data — campo `comprovante` é o arquivo (opcional, só imagem, até 5MB), o resto vem em `RegistrarPagamentoDto`. */
  @Patch(':id/registrar')
  @UseInterceptors(
    FileInterceptor('comprovante', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
      },
    }),
  )
  registrar(
    @Param('id') id: string,
    @Body() dto: RegistrarPagamentoDto,
    @UploadedFile() comprovante: Express.Multer.File | undefined,
    @Req() req: RequestComSessao,
  ) {
    return this.service.registrarPagamento(id, dto, comprovante, req.user);
  }

  private extrairFiltros(query: Record<string, string>): FiltrosPagamentos {
    return {
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
      status: query.status,
      sedeId: query.sedeId,
      tipoTrabalhoId: query.tipoTrabalhoId,
      tipoSede: query.tipoSede,
    };
  }
}
