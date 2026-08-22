import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Corpo de PATCH /confirmacoes/:alocacaoId
 * (docs/features/confirmacao-dia.md, seção 32). `TRABALHOU` é o rótulo da
 * doc pro que o banco guarda como `PRESENTE` — ver ConfirmacoesService.
 */
export class AtualizarSituacaoDto {
  @IsIn(['TRABALHOU', 'CANCELOU', 'FALTOU'])
  status!: 'TRABALHOU' | 'CANCELOU' | 'FALTOU';

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class SedeDataDto {
  @IsString()
  @IsNotEmpty()
  sedeId!: string;

  @IsString()
  @IsNotEmpty()
  data!: string;
}
