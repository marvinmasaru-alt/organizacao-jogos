import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusFuncionario } from '@prisma/client';

/**
 * Corpo de PATCH /funcionarios/:id — tela de gestão de Funcionários
 * (docs/features/Cadastro-funcionario.md). Todos os campos são opcionais:
 * o responsável pode corrigir só um dado (ex.: só o telefone) sem precisar
 * reenviar o cadastro inteiro. Campos ausentes não são tocados no banco
 * (o Prisma ignora `undefined` em `update`).
 *
 * `status` aceita qualquer valor do enum `StatusFuncionario` (inclusive
 * `BLOQUEADO`, legado — a doc só cita pendente/aprovado/inativo, mas o
 * enum do banco tem os quatro e a tela deve poder atribuir qualquer um).
 */
export class AtualizarFuncionarioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  documentoUrl?: string;

  @IsOptional()
  @IsEnum(StatusFuncionario)
  status?: StatusFuncionario;
}
