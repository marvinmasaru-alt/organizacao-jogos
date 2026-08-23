import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CriarTipoTrabalhoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nome!: string;
}

export class EditarTipoTrabalhoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nome!: string;
}
