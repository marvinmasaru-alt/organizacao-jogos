import { IsIn, IsOptional } from 'class-validator';

/**
 * Corpo de PATCH /pagamentos/comissoes/:id/marcar-recebida. `leg` só é
 * obrigatório na prática pra Administrador numa linha com dois
 * responsáveis diferentes (Responsável sempre marca a própria perna,
 * resolvida automaticamente pelo service — ver
 * `PagamentosService.marcarComissaoRecebida`).
 */
export class MarcarComissaoRecebidaDto {
  @IsOptional()
  @IsIn(['SEDE', 'FORNECIMENTO'])
  leg?: 'SEDE' | 'FORNECIMENTO';
}
