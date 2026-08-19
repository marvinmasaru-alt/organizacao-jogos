import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/** Fluxo de criação: data -> sede/vaga -> tipo -> funcionário -> cria alocação. */
export class CriarAlocacaoDto {
  @IsString()
  @IsNotEmpty()
  vagaId!: string;

  @IsString()
  @IsNotEmpty()
  funcionarioId!: string;

  @IsString()
  @IsNotEmpty()
  responsavelFornecimentoId!: string;
}

export class CancelarAlocacaoDto {
  @IsString()
  @IsNotEmpty()
  motivoCancelamento!: string;
}
