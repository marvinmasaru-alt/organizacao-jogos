import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarFaltaDto {
  @IsString()
  @IsNotEmpty()
  alocacaoId!: string;

  /** O responsável decide explicitamente — nunca inferir automaticamente. */
  @IsBoolean()
  necessitaSubstituicaoUrgente!: boolean;

  @IsOptional()
  @IsString()
  observacao?: string;
}
