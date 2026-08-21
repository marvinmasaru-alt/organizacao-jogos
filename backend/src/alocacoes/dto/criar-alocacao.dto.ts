import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Um item do lote: `responsavelFornecimentoId` nunca vem do body — é sempre a sessão. */
export class ItemAlocacaoDto {
  @IsString()
  @IsNotEmpty()
  vagaId!: string;

  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;
}

/**
 * Corpo de POST /alocacoes — lote "tudo ou nada" (docs/features/alocacao.md,
 * seção 28): `{ "alocacoes": [{ "vagaId": "...", "funcionarioId": "..." }] }`.
 */
export class CriarAlocacoesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemAlocacaoDto)
  alocacoes!: ItemAlocacaoDto[];
}

export class CancelarAlocacaoDto {
  @IsString()
  @IsNotEmpty()
  motivoCancelamento!: string;
}
