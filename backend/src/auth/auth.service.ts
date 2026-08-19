import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ResponsaveisService } from '../responsaveis/responsaveis.service';
import { PerfilUsuario } from '../common/types/enums';

export interface UsuarioAutenticado {
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  /** Presente apenas quando perfil === RESPONSAVEL. */
  responsavelId?: string;
}

/**
 * Login por e-mail + senha, sem self-signup: e-mail fora da lista fechada
 * de autorizados (administrador + 7 responsáveis) é sempre negado.
 *
 * Mapeamento e-mail -> perfil / verificação de senha:
 *  - ADMIN_EMAIL + ADMIN_PASSWORD (variáveis de ambiente) -> ADMINISTRADOR,
 *    já que o admin não tem linha própria na aba RESPONSAVEIS;
 *  - aba RESPONSAVEIS: coluna Email (E) -> Responsavel_ID (coluna A),
 *    coluna Senha (G) comparada em texto puro, como a planilha já guarda
 *    hoje. ⚠️ Isso significa senha em texto plano numa planilha do Google
 *    compartilhada com a Service Account — aceitável para o uso interno
 *    atual (8 contas conhecidas), mas vale reforçar o controle de acesso
 *    à própria planilha.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly responsaveisService: ResponsaveisService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<UsuarioAutenticado> {
    const usuario = await this.autenticar(email, senha);
    if (!usuario) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    return usuario;
  }

  gerarToken(usuario: UsuarioAutenticado): string {
    return this.jwtService.sign(usuario);
  }

  private async autenticar(
    email: string,
    senha: string,
  ): Promise<UsuarioAutenticado | null> {
    const emailNormalizado = email.trim().toLowerCase();
    const adminEmail = this.config
      .get<string>('ADMIN_EMAIL', '')
      .trim()
      .toLowerCase();
    const adminSenha = this.config.get<string>('ADMIN_PASSWORD', '');

    if (adminEmail && emailNormalizado === adminEmail) {
      if (!adminSenha || senha !== adminSenha) {
        return null;
      }
      return {
        email: emailNormalizado,
        nome: 'Administrador',
        perfil: PerfilUsuario.ADMINISTRADOR,
      };
    }

    const responsavel =
      await this.responsaveisService.buscarPorEmail(emailNormalizado);
    if (!responsavel || responsavel.senha !== senha) {
      return null;
    }

    return {
      email: emailNormalizado,
      nome: responsavel.nome,
      perfil: PerfilUsuario.RESPONSAVEL,
      responsavelId: responsavel.id,
    };
  }
}
