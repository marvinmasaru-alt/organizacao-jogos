#!/usr/bin/env node
/**
 * Gera src/environments/environment.prod.ts a partir da variável de
 * ambiente API_URL (configurada no Railway, não commitada no repo).
 * Rodar sempre ANTES de `ng build --configuration production` / `ng serve
 * --configuration production` — ver package.json (build:prod, start:prod).
 */
const fs = require('fs');
const path = require('path');

const URL_PADRAO_LOCAL = 'http://localhost:3000';

let apiUrl = process.env.API_URL;

if (!apiUrl) {
  console.warn(
    `[set-env] Variável de ambiente API_URL não definida — usando "${URL_PADRAO_LOCAL}". ` +
      'Configure API_URL nas variáveis de ambiente do Railway pra apontar pro backend real.',
  );
  apiUrl = URL_PADRAO_LOCAL;
} else if (!/^https?:\/\//i.test(apiUrl)) {
  // Railway costuma expor só o host (sem protocolo) em variáveis de referência entre serviços.
  apiUrl = `https://${apiUrl}`;
}

const conteudo = `// Gerado automaticamente por scripts/set-env.js a partir da variável de
// ambiente API_URL — não editar à mão, a próxima build sobrescreve este arquivo.
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;

const destino = path.join(
  __dirname,
  '..',
  'src',
  'environments',
  'environment.prod.ts',
);
fs.writeFileSync(destino, conteudo);
console.log(`[set-env] environment.prod.ts gerado com apiUrl = ${apiUrl}`);
