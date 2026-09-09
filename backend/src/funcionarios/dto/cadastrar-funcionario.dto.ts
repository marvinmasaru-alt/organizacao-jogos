import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Corpo de POST /funcionarios — cadastro manual feito pelo próprio
 * Responsável logado, direto pela tela de Funcionários
 * (docs/features/Cadastro-funcionario.md). Diferente de
 * CadastrarFuncionarioExternoDto (Google Forms/Apps Script): aqui
 * `responsavelId` nunca vem do corpo — é sempre o responsável da sessão
 * (JwtAuthGuard), resolvido no controller antes de chamar o service.
 *
 * `documentoUrlFrente`/`documentoUrlVerso` chegam separados (frente e
 * verso do documento são dois campos distintos na tela) e o service junta
 * os dois em `funcionarios.documento_url`, separados por vírgula — mesmo
 * tratamento do cadastro externo.
 */
export class CadastrarFuncionarioDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

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
  documentoUrlFrente?: string;

  @IsOptional()
  @IsString()
  documentoUrlVerso?: string;
}
