import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilUsuario } from '../../common/types/enums';

export const PERFIS_KEY = 'perfisPermitidos';

/** Decorator para marcar quais perfis podem acessar uma rota. */
export const PerfisPermitidos = (...perfis: PerfilUsuario[]) =>
  SetMetadata(PERFIS_KEY, perfis);

/**
 * Guard de autorização por perfil (Administrador vs Responsável).
 *
 * TODO: extrair o usuário autenticado da requisição (a partir do JWT
 * validado por um AuthGuard anterior na cadeia) em vez de assumir a forma
 * de `request.user`.
 */
@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfisPermitidos = this.reflector.get<PerfilUsuario[]>(
      PERFIS_KEY,
      context.getHandler(),
    );
    if (!perfisPermitidos || perfisPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;
    return !!usuario && perfisPermitidos.includes(usuario.perfil);
  }
}
