# Setup do projeto

Este repositório é um monorepo com dois workspaces:

```
backend/    API NestJS (TypeScript) — lê/escreve no Google Sheets
frontend/   SPA Angular (TypeScript) — client-side puro, mobile-first
```

As regras de negócio completas estão em [README.md](README.md) e as
decisões de arquitetura/stack em [CLAUDE.md](CLAUDE.md).

## Pré-requisitos

- Node.js LTS (18+) e npm — **não detectados neste ambiente**, então as
  dependências ainda não foram instaladas nem os builds testados. Instale o
  Node antes do próximo passo.

## Instalação

Na raiz do repositório (usa npm workspaces, instala backend e frontend juntos):

```bash
npm install
```

## Configuração (fora do código)

Antes da integração com o Google Sheets funcionar, siga os passos da
seção "Setup inicial necessário" do [CLAUDE.md](CLAUDE.md#setup-inicial-necessário-fora-do-código)
(criar projeto no Google Cloud, Service Account). O login dos usuários é
e-mail + senha (aba `RESPONSAVEIS`), não depende de credencial Google.

Depois, copie o arquivo de exemplo e preencha os valores:

```bash
cp backend/.env.example backend/.env
```

`.env` nunca deve ser commitado — já está no `.gitignore`.

## Rodando em desenvolvimento

```bash
npm run backend:dev    # API em http://localhost:3000
npm run frontend:dev   # SPA em http://localhost:4200
```

## Estado atual

Este é o esqueleto inicial da estrutura (módulos, controllers, services,
rotas e entidades já organizados pelos domínios descritos no CLAUDE.md).
A maior parte dos métodos de service tem `TODO`s explícitos onde a lógica
de leitura/escrita na planilha e cálculo de comissões ainda precisa ser
implementada — várias dessas partes dependem de decisões listadas como
"pontos em aberto" no CLAUDE.md. Login (e-mail + senha) já está
implementado de ponta a ponta.
