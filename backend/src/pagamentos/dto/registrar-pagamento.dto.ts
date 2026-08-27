import { Type } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Corpo de PATCH /pagamentos/:id/registrar — multipart/form-data (o
 * comprovante vem como arquivo separado, via `FileInterceptor`, não
 * nestes campos). Números chegam como string no multipart, por isso
 * `@Type(() => Number)` — `ValidationPipe` global já roda com
 * `transform: true` (ver main.ts).
 */
export class RegistrarPagamentoDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  valorPago!: number;

  @IsISO8601()
  dataPagamento!: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
