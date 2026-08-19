import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, UsuarioAutenticado } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface RequestComSessao {
  user: UsuarioAutenticado;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Login por e-mail + senha (aba RESPONSAVEIS, coluna Senha). */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ token: string; usuario: UsuarioAutenticado }> {
    const usuario = await this.authService.login(dto.email, dto.senha);
    const token = this.authService.gerarToken(usuario);
    return { token, usuario };
  }

  /** Usado pelo frontend para restaurar a sessão a partir do token salvo. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestComSessao): UsuarioAutenticado {
    return req.user;
  }
}
