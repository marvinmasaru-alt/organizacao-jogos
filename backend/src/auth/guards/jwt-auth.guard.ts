import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege rotas que exigem sessão autenticada (token emitido pelo backend). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
