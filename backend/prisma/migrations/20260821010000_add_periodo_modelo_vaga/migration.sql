-- Período de vigência da configuração de vaga fixa (docs/features/cadastro-vagas.md, seção 9).
-- Escrita a mão (em vez de `prisma migrate diff` puro) para conter só essa
-- mudança — o diff automático também tentava adicionar NOT NULL/mudar
-- comportamento de FKs em colunas que já existiam desde o create.sql
-- original, fora do escopo desta migration.
ALTER TABLE "modelos_vagas"
  ADD COLUMN "data_inicio" DATE,
  ADD COLUMN "data_fim" DATE;
