import { environment } from '../../../environments/environment';

/**
 * URL base da API. Vem de src/environments: `environment.ts` (dev, fixo em
 * localhost) ou `environment.prod.ts` (produção, gerado por
 * scripts/set-env.js a partir da variável de ambiente API_URL do Railway
 * — nunca editar environment.prod.ts à mão, a próxima build sobrescreve).
 */
export const API_BASE_URL = environment.apiUrl;
