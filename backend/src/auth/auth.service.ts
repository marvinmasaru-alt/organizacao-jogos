import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TipoUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PerfilUsuario } from '../common/types/enums';

export interface UsuarioAutenticado {
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  /**
   * Presente sempre que existe um vínculo `responsaveis.usuario_id ->
   * usuarios.id` — inclusive para Administrador, quando a mesma pessoa
   * também é um dos responsáveis (ex.: Paulo). Isso deixa esse usuário
   * cadastrar/alocar funcionários como aquele responsável, além de ter
   * acesso administrativo completo.
   */
  responsavelId?: string;
}

/**
 * Login por e-mail + senha, sem self-signup: e-mail que não existe (ou está
 * inativo) na tabela `usuarios` é sempre negado.
 *
 * `usuarios.tipo` decide o perfil (ADMIN -> Administrador, RESPONSAVEL ->
 * Responsável). `responsavelId` vem do vínculo `responsaveis.usuario_id ->
 * usuarios.id` sempre que ele existir — não é exclusivo de
 * `tipo = RESPONSAVEL` (ver comentário em `UsuarioAutenticado`).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
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

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
      include: { responsavel: true },
    });

    if (!usuario || !usuario.ativo) {
      return null;
    }

    const senhaValida = senha === usuario.senhaHash;
    if (!senhaValida) {
      return null;
    }

    // Só entra no relacionamento se o vínculo existir E estiver ativo —
    // um responsável desativado não deve conseguir alocar em nome dele,
    // mesmo que o usuário de login continue ativo.
    const responsavelId =
      usuario.responsavel && usuario.responsavel.ativo
        ? usuario.responsavel.id
        : undefined;

    if (usuario.tipo === TipoUsuario.ADMIN) {
      return {
        email: usuario.email,
        nome: usuario.nome,
        perfil: PerfilUsuario.ADMINISTRADOR,
        responsavelId,
      };
    }

    if (!responsavelId) {
      return null;
    }

    return {
      email: usuario.email,
      nome: usuario.nome,
      perfil: PerfilUsuario.RESPONSAVEL,
      responsavelId,
    };
  }
}
