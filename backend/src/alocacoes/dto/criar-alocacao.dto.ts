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

/**
 * Corpo de PATCH /alocacoes/:id/tipo — troca o tipo de trabalho (cargo) de
 * uma alocação já existente (ex.: escolhida como Forklift, corrigir pra
 * Manpower) sem cancelar/recriar o registro. `vagaId` aqui é o
 * `vaga_tipos.id` de DESTINO, mesma convenção usada em ItemAlocacaoDto —
 * precisa ser outra linha de `vaga_tipos` da MESMA vaga (dia+sede) da
 * alocação original.
 */
export class TrocarTipoAlocacaoDto {
  @IsString()
  @IsNotEmpty()
  vagaId!: string;
}
