import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Protege rotas chamadas por integrações externas (ex.: Google Apps Script
 * do formulário de cadastro de funcionário — docs/features/Cadastro-funcionario.md)
 * que não têm sessão de usuário (sem JWT). Em vez de login, exigimos uma
 * chave fixa no header `x-api-key`, comparada contra a variável de
 * ambiente `FORMS_API_KEY`.
 *
 * Se `FORMS_API_KEY` não estiver configurada, a rota fica bloqueada pra
 * todo mundo (falha fechada) em vez de aceitar qualquer chamada.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const chaveEsperada = process.env.FORMS_API_KEY;
    if (!chaveEsperada) {
      throw new UnauthorizedException('FORMS_API_KEY não configurada');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const chaveRecebida = request.headers['x-api-key'];

    if (chaveRecebida !== chaveEsperada) {
      throw new UnauthorizedException('Chave de API inválida');
    }

    return true;
  }
}
