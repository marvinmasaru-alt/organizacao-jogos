import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '../auth.service';

/**
 * Valida o JWT de sessão emitido pelo backend (não o token do Google) em
 * toda requisição autenticada. O payload já é o UsuarioAutenticado
 * completo (perfil + responsavelId), então não precisa reconsultar a
 * planilha a cada requisição.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: UsuarioAutenticado): UsuarioAutenticado {
    return payload;
  }
}
