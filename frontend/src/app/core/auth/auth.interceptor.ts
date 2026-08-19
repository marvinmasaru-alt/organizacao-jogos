import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Anexa o token de sessão em toda chamada à API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).obterToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
