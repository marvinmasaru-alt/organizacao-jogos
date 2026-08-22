import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Corpo de PATCH /confirmacoes/:alocacaoId
 * (docs/features/confirmacao-dia.md, seção 32). `TRABALHOU` é o rótulo da
 * doc pro que o banco guarda como `PRESENTE` — ver ConfirmacoesService.
 * `SUBSTITUIU` é trabalho normal (elegível a pagamento, igual TRABALHOU),
 * mas identifica quem cobriu uma vaga que estava com SUBSTITUICAO_NECESSARIA
 * — abate essa contagem urgente por tipo em vez de só somar em "trabalharam".
 */
export class AtualizarSituacaoDto {
  @IsIn(['TRABALHOU', 'CANCELOU', 'FALTOU', 'SUBSTITUIU'])
  status!: 'TRABALHOU' | 'CANCELOU' | 'FALTOU' | 'SUBSTITUIU';

  @IsOptional()
  @IsString()
  observacao?: string;

  /**
   * Só considerado quando status é FALTOU (CLAUDE.md: "o responsável
   * decide explicitamente entre FALTOU (sem urgência) ou
   * SUBSTITUICAO_NECESSARIA — nunca assumir automaticamente"). Ignorado
   * pra CANCELOU/TRABALHOU — cancelamento nunca acende o alerta de
   * urgência do Dashboard, só falta.
   */
  @IsOptional()
  @IsBoolean()
  necessitaSubstituicaoUrgente?: boolean;
}

export class SedeDataDto {
  @IsString()
  @IsNotEmpty()
  sedeId!: string;

  @IsString()
  @IsNotEmpty()
  data!: string;
}
