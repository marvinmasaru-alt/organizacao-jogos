import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { TipoSede } from '@prisma/client';

/**
 * `salarioBase` é obrigatório quando `tipoSede = EXTERNA` (valor-base do
 * funcionário — docs/features/pagamento.md, seção 6) e deve vir vazio
 * quando `tipoSede = HUB` (pagamento livre, seção 7) — validado aqui com
 * `@ValidateIf` e reforçado no service (TabelaValoresService.validarSalarioBase).
 */
export class CriarTabelaValorDto {
  @IsString()
  @IsNotEmpty()
  tipoTrabalhoId!: string;

  @IsEnum(TipoSede)
  tipoSede!: TipoSede;

  @IsNumber()
  @IsPositive()
  valor!: number;

  @ValidateIf((dto) => dto.tipoSede === TipoSede.EXTERNA)
  @IsNumber()
  @IsPositive()
  salarioBase?: number;

  @IsOptional()
  @IsISO8601()
  dataInicio?: string;

  @IsOptional()
  @IsISO8601()
  dataFim?: string;
}

export class EditarTabelaValorDto {
  @IsEnum(TipoSede)
  tipoSede!: TipoSede;

  @IsNumber()
  @IsPositive()
  valor!: number;

  @ValidateIf((dto) => dto.tipoSede === TipoSede.EXTERNA)
  @IsNumber()
  @IsPositive()
  salarioBase?: number;

  @IsOptional()
  @IsISO8601()
  dataInicio?: string;

  @IsOptional()
  @IsISO8601()
  dataFim?: string;
}
