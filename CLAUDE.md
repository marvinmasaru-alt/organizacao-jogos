# Sistema de Alocação de Funcionários

## Arquitetura e escopo

- **Estrutura de repositório**: monorepo (frontend Angular e backend Node no
  mesmo repositório).
- **Usuários**: uso interno apenas — os 7 responsáveis + administrador
  (8 contas no total, conhecidas). Não há acesso externo de funcionários ao
  sistema (cadastro deles continua via Google Forms).
- **Autenticação**: login por e-mail + senha (não é mais Google OAuth —
  decisão revertida), restrito a uma lista fechada de contas (os 8 usuários
  conhecidos). Não tem self-signup — se o e-mail não estiver cadastrado na
  tabela `usuarios`, o acesso é negado. Mapeamento:
  - tabela `usuarios`: `email` → login, `senha_hash` → senha (hash bcrypt,
    nunca texto puro), `tipo` (`ADMIN`/`RESPONSAVEL`) → perfil;
  - quando `tipo = RESPONSAVEL`, o vínculo `responsaveis.usuario_id →
    usuarios.id` dá o `Responsavel_ID` do perfil `Responsável`;
  - Administrador: uma linha `usuarios` com `tipo = ADMIN` (criada via
    `prisma/seed.ts`, a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` — essas
    variáveis só alimentam o seed, nunca são lidas em runtime).
  Backend emite um JWT de sessão após validar e-mail/senha; frontend guarda
  esse token (não guarda a senha) e o reenvia em toda chamada autenticada.
- **Deploy**: nuvem (Railway) — frontend estático + backend Node + banco
  PostgreSQL, todos hospedados lá. Credenciais (`DATABASE_URL`,
  `JWT_SECRET`) sempre em variável de ambiente / secret manager do
  provedor — nunca commitadas no repositório.

## Stack técnica

- **Frontend**: Angular (versão mais recente estável) como SPA (client-side
  puro, sem SSR). **Precisa ser responsivo** — os responsáveis acessam tanto
  por computador quanto por celular no dia a dia, então layout mobile-first
  ou ao menos totalmente adaptável é requisito, não "nice to have".
- **Backend**: Node.js com **NestJS**, em **TypeScript**. Módulos do Nest
  devem espelhar os domínios de negócio (ex.: `FuncionariosModule`,
  `SedesModule`, `VagasModule`, `AlocacoesModule`, `FaltasModule`,
  `PagamentosModule`), cada um com seu controller/service, para manter a
  regra de negócio de cada área isolada e testável.
- **Linguagem**: TypeScript de ponta a ponta (frontend e backend).
- **Banco de dados**: **PostgreSQL, acessado via Prisma** (`backend/prisma/schema.prisma`,
  espelhando `docs/SQL/create.sql`). `PrismaService` (`backend/src/prisma/`)
  é a única camada de acesso — todo módulo de domínio injeta esse serviço,
  nunca instancia `PrismaClient` diretamente. IDs são UUID (gerados por
  `gen_random_uuid()` no banco), não mais códigos sequenciais tipo `F0001`.
  ⚠️ Toda operação que decrementa/incrementa vagas disponíveis (criar
  alocação, cancelar, registrar falta) precisa **revalidar o estado atual
  do banco antes de gravar**, para evitar duas alocações simultâneas
  estourarem a `quantidade` de um `vaga_tipos` (condição de corrida) —
  preferir `prisma.$transaction` pra ler+gravar atomicamente, e tratar erro
  de forma explícita se o estado mudou entre leitura e escrita.
- Cadastro de funcionário continua entrando via Google Forms (que agora
  precisa escrever direto na tabela `funcionarios`, não mais numa planilha)
  — o backend deve tratar essa origem como um "insert externo" e não
  presumir que todo registro novo vem pela aplicação.

## Visão geral

Sistema para distribuir funcionários entre sedes e vagas de trabalho. Cobre:
cadastro de funcionários e sedes, criação de vagas, alocação de funcionários,
controle de responsáveis, cancelamentos, faltas, pagamentos, histórico e
permissões por perfil.

Banco de dados é PostgreSQL (via Prisma) — ver "Estrutura das entidades" e
`docs/SQL/create.sql` para o schema relacional completo. Cálculo de
comissão entre responsáveis é um ponto explicitamente fora de escopo por
enquanto (ver "Pontos ainda em aberto").

## Perfis de usuário

- **Administrador**: acesso total. Aprova funcionários, vê tudo (sedes, vagas,
  alocações, pagamentos, faltas, cancelamentos, histórico), administra o que
  os responsáveis não podem.
- **Responsável** (7 atualmente: Paulo, Andre, Renan, Júlio, Juninho, Lucas,
  Gregório): acesso restrito ao necessário para o trabalho dele — telas de
  Vagas, Alocação, Pagamentos, Faltas. Não tem acesso administrativo completo.

Um responsável pode:
- ser responsável por uma ou mais **sedes**;
- fornecer funcionários para vagas de sedes de **outros** responsáveis.

⚠️ Existem dois papéis distintos numa alocação — **responsável pela sede**
(administra a necessidade daquela sede) e **responsável pelo fornecimento**
(quem efetivamente aloca o funcionário). Tecnicamente são independentes, e a
tabela `ALOCACOES` sempre guarda os dois IDs separadamente
(`Responsavel_Sede_ID`, `Responsavel_Fornecimento_ID`).

Na prática atual, porém, **todo responsável exerce os dois papéis**: cada um
é responsável pela(s) própria(s) sede(s) e também pode fornecer funcionários
para sedes de outros. A prioridade de cada responsável é garantir que a(s)
própria(s) sede(s) esteja(m) devidamente preenchida(s) antes de ajudar em
vagas de sedes de terceiros. Ou seja, "responsável pela sede ≠ responsável
pelo fornecimento" é um caso que **pode acontecer** numa alocação específica
(quando alguém ajuda a preencher vaga de sede alheia), não uma divisão fixa
de papéis entre pessoas diferentes.

## Estrutura das entidades

Schema relacional completo (fonte de verdade): `docs/SQL/create.sql`,
espelhado 1:1 em `backend/prisma/schema.prisma`. Visão geral:

```
USUARIOS (login: email + senha_hash)
   └── RESPONSAVEIS (usuario_id, quando tipo=RESPONSAVEL)
          ├── FUNCIONARIOS (responsavel_id — quem cadastrou)
          └── SEDES (responsavel_id — quem administra)
                 ├── MODELOS_VAGAS (vagas fixas/recorrentes — schema pronto,
                 │      └── MODELO_VAGA_DIAS   sem geração automática ainda,
                 │      └── MODELO_VAGA_TIPOS  ver "Pontos em aberto")
                 └── VAGAS (um dia+sede)
                        └── VAGA_TIPOS (tipo+quantidade daquele dia)
                               └── ALOCACOES (vaga_id + tipo_trabalho)
                                      ├──→ CONFIRMACOES (1:1 — falta/cancelamento)
                                      └──→ PAGAMENTOS (1:1)
TABELA_VALORES (tipo_trabalho + tipo_sede + vigência → valor)
```

Duas particularidades importantes de como a API expõe esse schema (ver
`backend/src/vagas/vaga.entity.ts` e `backend/src/alocacoes/alocacao.entity.ts`
para os comentários completos):
- **"Vaga" na API é sempre uma linha de `vaga_tipos`**, não de `vagas` —
  cada combinação (dia+sede, tipo) tem seu próprio `id` (o `id` de
  `vaga_tipos`), do jeito que o frontend sempre tratou "vaga" como um par
  único sede+data+tipo+quantidade.
- **`alocacoes.responsavel_id` é sempre o responsável pelo FORNECIMENTO**
  (quem alocou). O responsável da SEDE nunca é gravado na própria linha —
  é sempre derivado via `alocacoes.vaga_id → vagas.sede_id →
  sedes.responsavel_id`. Os dois papéis continuam conceitualmente
  independentes (ver seção acima sobre responsável pela sede ≠ responsável
  pelo fornecimento), só que agora um deles é calculado, não armazenado.

## Regras de negócio críticas

### Funcionários
- Cadastro via Google Forms, gravando direto na tabela `funcionarios`.
  Campos: nome, telefone, provincia, codigo_postal, documento_url,
  responsavel_id (quem cadastrou).
- ID único: UUID (`gen_random_uuid()`).
- Status inicial: `PENDENTE`. Só o **administrador** aprova (→ `APROVADO`).
  `BLOQUEADO`/`INATIVO` existem como estados adicionais do enum
  `status_funcionario`.
- **Um funcionário só pode ser alocado pelo responsável que o cadastrou.**
  Mesmo que esteja disponível, outro responsável não pode selecioná-lo.
- Funcionário não `APROVADO` nunca aparece como disponível para alocação.
- Tipo de trabalho (`MANPOWER` / `FORKLIFT`) **não é fixo no funcionário** —
  é definido por vaga/dia (`alocacoes.tipo_trabalho`). O mesmo funcionário
  pode trabalhar como Manpower num dia e Forklift no outro.

### Sedes
- Campos: id, sigla, nome, endereco, tipo_sede (`HUB`/`EXTERNA`), cluster,
  responsavel_id, ativo. `endereco` faz as vezes do link clicável do board
  (o schema não tem uma coluna separada de "link do Google Maps").
- **Sem restrição de visibilidade**: todo usuário logado (Administrador ou
  qualquer Responsável) pode ver todas as sedes, sem limite —
  `responsavel_id` identifica quem administra a sede, não quem pode vê-la.
- Dashboard tem um filtro opt-in "Minha sede" / "Todas as sedes" — para
  Responsável, a tela abre com "Minha sede" selecionado por padrão (só
  reflete o que ele mais usa no dia a dia; ele pode trocar pra "Todas as
  sedes" a qualquer momento, é conveniência de visualização, não controle
  de acesso). Administrador não tem sede própria, então o filtro não se
  aplica a ele — sempre vê todas.
- Board deve exibir o link de localização (`endereco`) de forma clicável.

### Vagas
- `vagas` = um dia numa sede; `vaga_tipos` = tipo+quantidade necessária
  naquele dia (uma vaga pode ter várias linhas de tipo, ex.: 4 Manpower +
  2 Forklift no mesmo dia). A API expõe cada linha de `vaga_tipos` como
  "uma vaga" (ver nota acima).
- **Sem restrição de visibilidade**: mesma regra das Sedes — todo usuário
  logado vê todas as vagas, sem limite.
- `disponíveis = vaga_tipos.quantidade - alocações válidas` (nunca
  negativo). "Válida" = `alocacoes.status = ATIVA` **e** a confirmação
  associada (se houver) não é `FALTOU` — quem faltou libera a posição sem
  cancelar a alocação em si.
- Board principal deve mostrar de forma resumida por sede: tipo, `X/Y`,
  "✓ Completo" ou "N vagas disponíveis".
- Existe visão detalhada por sede mostrando, posição a posição, quem está
  alocado e quem forneceu cada um (ou "Ainda não preenchido").
- Seletor de data no Board: padrão = hoje, mas permite navegar para datas
  futuras (preparar vagas com antecedência).
- **Nunca permitir ultrapassar `vaga_tipos.quantidade`** — ao atingir o
  limite, vaga vira "✓ Completo" e não aceita nova alocação.

### Alocações
- Tabela `alocacoes`: id, vaga_id, funcionario_id, responsavel_id (sempre
  fornecimento — ver nota acima), tipo_trabalho, status (`ATIVA`/`CANCELADA`),
  data_alocacao (timestamp de criação do registro, **não** o dia
  trabalhado — esse vem de `vagas.data` via join).
- **Só contam para "preenchidas" as alocações `ATIVA` sem confirmação
  `FALTOU`.** Cálculos de vaga nunca devem simplesmente contar todas as
  linhas.
- Fluxo de criação: data → sede/vaga → tipo → funcionário → cria alocação
  **junto com uma `confirmacoes` `PENDENTE`** (1:1, criadas na mesma
  transação). O funcionário sugerido/selecionável precisa respeitar: quem
  cadastrou, status aprovado, disponibilidade, vaga e data.

### Cancelamentos e faltas (tabela `confirmacoes`)
- Falta e cancelamento **não vivem mais em `alocacoes`** — moram em
  `confirmacoes` (1:1 com `alocacoes`, criada junto com toda alocação nova),
  com `status` (`PENDENTE`/`PRESENTE`/`FALTOU`/`CANCELOU`/
  `SUBSTITUICAO_NECESSARIA`), `observacao`, `confirmado_por`,
  `confirmado_em`.
- **Nunca apagar** a linha de alocação nem a de confirmação.
- Ao cancelar: `alocacoes.status → CANCELADA` **e**
  `confirmacoes.status → CANCELOU` (+ `observacao` com o motivo,
  `confirmado_por`/`confirmado_em`), atomicamente.
- Libera uma vaga (`6/6` → `5/6`), mas o histórico continua mostrando que a
  pessoa havia sido alocada.
- Falta ≠ cancelamento antecipado — é registrada separadamente, no dia do
  trabalho, quando o funcionário estava alocado mas não compareceu:
  `alocacoes.status` continua `ATIVA`, só `confirmacoes.status` vira
  `FALTOU` (ou `SUBSTITUICAO_NECESSARIA`).
- **Falta não gera multa.** Nenhuma penalidade financeira automática.
- **Falta cancela o pagamento** daquele funcionário para aquele dia.
- Ao registrar falta, o responsável decide explicitamente entre `FALTOU`
  (sem urgência) ou `SUBSTITUICAO_NECESSARIA`. Nunca assumir
  automaticamente que é urgente.
- **Board principal nunca expõe o nome de quem faltou** — mostra apenas
  "⚠ Necessita de substituição urgente" quando `SUBSTITUICAO_NECESSARIA`.
  Detalhes completos (funcionário, sede, vaga, data, responsáveis, status,
  observação) ficam numa área restrita separada.
- Uma falta é relevante para até 3 partes ao mesmo tempo: responsável da
  sede, responsável do fornecimento (que pode ser outra pessoa, se alguém
  ajudou a preencher vaga de sede alheia) e administrador.
- Administrador deve conseguir consultar histórico completo de
  cancelamentos (funcionário, vaga, data, responsável, data/motivo do
  cancelamento — motivo/quem confirmou/quando vêm de `confirmacoes`).

### Pagamentos
- Tabela `pagamentos`: tipo, responsavel_id, alocacao_id (1:1), funcionario_id,
  valor, data_prevista, data_pagamento, status
  (`PENDENTE`/`PAGO`/`CANCELADO`), status_prazo, observacao.
- Valores de referência vêm de `tabela_valores` (tipo_trabalho + tipo_sede +
  vigência → valor), não mais hardcoded no código.
- **Prazo de pagamento: até 1 semana** após a data do trabalho. Sistema deve
  destacar visualmente o prazo (ex.: 🟢 no prazo / 🟡 próximo / 🔴 vencido) —
  a regra de negócio é sempre "1 semana", a cor é só indicador visual.
- **Comissão entre responsável da sede e responsável do fornecimento está
  fora de escopo por enquanto** — o schema não tem colunas de comissão
  (ver "Pontos ainda em aberto").

### Princípio geral de histórico
> Alterar o status de um registro é sempre preferível a apagar o registro.

Vale para alocações, confirmações (cancelamentos/faltas) e pagamentos.

## Pontos ainda em aberto (não assumir, perguntar antes de implementar)

- Fórmula de cálculo de comissão entre responsável da sede e responsável do
  fornecimento — o schema atual (`tabela_valores`/`pagamentos`) não tem
  colunas de comissão; se isso voltar a ser necessário, definir onde
  gravar antes de implementar.
- Geração automática de `vagas`/`vaga_tipos` a partir de `modelos_vagas` /
  `modelo_vaga_dias` / `modelo_vaga_tipos` (vagas fixas/recorrentes) — as
  tabelas existem no schema, mas não há serviço/rota implementando a
  geração ainda.
- Fluxo exato de substituição urgente: provavelmente mantém o registro
  original da falta (`confirmacoes.status = SUBSTITUICAO_NECESSARIA`) e
  cria uma **nova** alocação (+ confirmação) para o substituto, em vez de
  sobrescrever o registro original — mas isso ainda não está 100% fechado.

## Setup inicial necessário (fora do código)

1. Criar um banco PostgreSQL (ex.: Railway) e aplicar o schema —
   `npx prisma migrate deploy --workspace=backend` (ou, se o banco já foi
   criado manualmente a partir de `docs/SQL/create.sql`, baseline a
   migração com `prisma migrate resolve --applied <nome_da_migration>`
   antes do primeiro deploy).
2. Definir `DATABASE_URL` (string de conexão completa) como variável de
   ambiente / secret do backend — nunca commitar no repositório.
3. Definir `JWT_SECRET` (segredo pra assinar o token de sessão).
4. Rodar `npm run prisma:seed --workspace=backend` com `ADMIN_EMAIL`/
   `ADMIN_PASSWORD` definidos no `.env` — cria a linha do Administrador em
   `usuarios` (só usado no seed, nunca lido em runtime depois disso).
5. Os 7 responsáveis (e seus funcionários, sedes, etc.) precisam ser
   inseridos no banco separadamente — não há import automático dos dados
   que hoje vivem na planilha antiga.

O login dos usuários não depende de nenhuma credencial externa — é e-mail +
senha (tabela `usuarios`, `senha_hash` com bcrypt).

## Módulos planejados

Autenticação · Funcionários · Responsáveis · Sedes · Vagas · Board ·
Alocações · Cancelamentos · Faltas · Substituições · Pagamentos ·
Histórico · Permissões

