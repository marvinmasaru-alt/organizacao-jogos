import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Corpo de POST /funcionarios/externo — chamado pelo Google Apps Script
 * a cada nova resposta do formulário de cadastro (docs/features/Cadastro-funcionario.md).
 * Nomes de campo já em português/camelCase: quem monta o payload no Apps
 * Script é responsável por mapear as perguntas do form (nome
 * japonês/português incluído) para estes campos.
 *
 * `documentoUrlFrente`/`documentoUrlVerso` chegam separados (upload de
 * frente e verso do Zairyū Card são duas perguntas distintas no form) e o
 * service junta os dois em `funcionarios.documento_url`, separados por
 * vírgula — ver FuncionariosService.criarViaFormExterno.
 *
 * `responsavelId` já vem como o UUID de `responsaveis.id` (resolvido pelo
 * próprio Apps Script, não um nome) — o service só valida que existe.
 *
 * Carimbo de data/hora do form NÃO é aceito aqui: `created_at`/`updated_at`
 * usam sempre a hora do servidor no momento do insert (CLAUDE.md — "Data
 * de cadastro é sempre a atual").
 */
export class CadastrarFuncionarioExternoDto {
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

  @IsUUID()
  @IsNotEmpty()
  responsavelId!: string;
}
