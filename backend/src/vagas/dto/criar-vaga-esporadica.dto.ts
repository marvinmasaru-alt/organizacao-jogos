import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoTrabalho } from '@prisma/client';

export class VagaTipoDto {
  @IsEnum(TipoTrabalho)
  tipoTrabalho!: TipoTrabalho;

  @IsInt()
  @IsPositive()
  quantidade!: number;
}

/**
 * Corpo de POST /vagas — cria uma vaga ESPORADICA (docs/features/cadastro-vagas.md,
 * seção 19): não toca em nenhuma configuração fixa (Regra 2 da doc).
 */
export class CriarVagaEsporadicaDto {
  @IsString()
  @IsNotEmpty()
  sedeId!: string;

  @IsISO8601()
  data!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VagaTipoDto)
  tipos!: VagaTipoDto[];

  @IsOptional()
  @IsString()
  observacao?: string;
}
