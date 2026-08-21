# Setup do projeto

Este repositório é um monorepo com dois workspaces:

```
backend/    API NestJS (TypeScript) — lê/escreve no PostgreSQL via Prisma
frontend/   SPA Angular (TypeScript) — client-side puro, mobile-first
```

As regras de negócio completas estão em [README.md](README.md) e as
decisões de arquitetura/stack em [CLAUDE.md](CLAUDE.md).

## Pré-requisitos

- Node.js LTS (18+) e npm.
- Um banco PostgreSQL acessível (local ou hospedado, ex.: Railway).

## Instalação

Na raiz do repositório (usa npm workspaces, instala backend e frontend juntos):

```bash
npm install
```

## Configuração (fora do código)

Copie o arquivo de exemplo e preencha os valores:

```bash
cp backend/.env.example backend/.env
```

Preencha pelo menos `DATABASE_URL` (string de conexão do Postgres) e
`JWT_SECRET`. `.env` nunca deve ser commitado — já está no `.gitignore`.

Depois, aplique o schema no banco e crie o Administrador:

```bash
npm run prisma:migrate --workspace=backend   # cria/atualiza as tabelas (dev)
npm run prisma:seed --workspace=backend      # cria o usuário Administrador
                                              # (usa ADMIN_EMAIL/ADMIN_PASSWORD do .env)
```

Em produção, o start do backend já roda `prisma migrate deploy` antes de
subir (ver `backend/package.json`, script `start:prod`) — só é preciso
rodar o seed manualmente uma vez.

O login dos usuários é sempre e-mail + senha (tabela `usuarios`), nunca
depende de credencial Google — a única integração com Google que resta é o
Forms de cadastro de funcionários, que grava direto na tabela
`funcionarios`.

## Rodando em desenvolvimento

```bash
npm run backend:dev    # API em http://localhost:3000
npm run frontend:dev   # SPA em http://localhost:4200
```

## Estado atual

Backend e frontend implementam os módulos descritos no CLAUDE.md
(Autenticação, Funcionários, Responsáveis, Sedes, Vagas, Dashboard,
Alocações, Faltas/Confirmações, Histórico) sobre PostgreSQL via Prisma.
Cálculo de comissão e geração automática de vagas fixas (`modelos_vagas`)
ainda não estão implementados — ver "Pontos ainda em aberto" no CLAUDE.md.
