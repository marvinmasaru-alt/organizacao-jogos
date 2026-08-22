import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoTrabalho } from '@prisma/client';

export class ConfiguracaoVagaTipoDto {
  @IsEnum(TipoTrabalho)
  tipoTrabalho!: TipoTrabalho;

  @IsInt()
  @IsPositive()
  quantidade!: number;
}

/**
 * Corpo de POST /configuracoes-vagas
 * (docs/features/cadastro-vagas.md, seções 6 e 9-10).
 */
export class CriarConfiguracaoVagaDto {
  @IsString()
  @IsNotEmpty()
  sedeId!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoVagaTipoDto)
  tipos!: ConfiguracaoVagaTipoDto[];

  /** 1 (segunda) a 7 (domingo) — dias em que a sede opera essa configuração. */
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([1, 2, 3, 4, 5, 6, 7], { each: true })
  diasSemana!: number[];

  @IsOptional()
  @IsISO8601()
  dataInicio?: string;

  @IsOptional()
  @IsISO8601()
  dataFim?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
