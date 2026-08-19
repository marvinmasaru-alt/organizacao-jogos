import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PerfilUsuario } from './usuario.model';

/** Restringe uma rota a um conjunto de perfis (ex.: só ADMINISTRADOR). */
export const perfilGuard = (perfisPermitidos: PerfilUsuario[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();

    if (usuario && perfisPermitidos.includes(usuario.perfil)) {
      return true;
    }
    return router.parseUrl('/board');
  };
};
