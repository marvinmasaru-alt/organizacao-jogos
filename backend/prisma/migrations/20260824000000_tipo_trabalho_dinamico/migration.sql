-- Tipo de trabalho deixa de ser um enum fixo (MANPOWER/FORKLIFT) e vira
-- tabela dinâmica (tipos_trabalho), cadastrável/editável pelo
-- Administrador — decisão revertida em relação ao schema original.
-- Escrita à mão (em vez de `prisma migrate diff`) porque envolve migrar
-- dados existentes (as 4 colunas de enum viram FK), não só alterar
-- estrutura.

CREATE TABLE "tipos_trabalho" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome"       VARCHAR(50) UNIQUE NOT NULL,
  "ativo"      BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed com os dois valores que já existiam como enum — preserva os dados
-- atuais de vaga_tipos/alocacoes/tabela_valores/modelo_vaga_tipos.
INSERT INTO "tipos_trabalho" ("nome") VALUES ('MANPOWER'), ('FORKLIFT');

-- vaga_tipos
ALTER TABLE "vaga_tipos" ADD COLUMN "tipo_trabalho_id" UUID;
UPDATE "vaga_tipos" vt
  SET "tipo_trabalho_id" = tt."id"
  FROM "tipos_trabalho" tt
  WHERE tt."nome" = vt."tipo_trabalho"::text;
ALTER TABLE "vaga_tipos" ALTER COLUMN "tipo_trabalho_id" SET NOT NULL;
ALTER TABLE "vaga_tipos" ADD CONSTRAINT "vaga_tipos_tipo_trabalho_id_fkey"
  FOREIGN KEY ("tipo_trabalho_id") REFERENCES "tipos_trabalho"("id");
ALTER TABLE "vaga_tipos" DROP COLUMN "tipo_trabalho";

-- alocacoes
ALTER TABLE "alocacoes" ADD COLUMN "tipo_trabalho_id" UUID;
UPDATE "alocacoes" a
  SET "tipo_trabalho_id" = tt."id"
  FROM "tipos_trabalho" tt
  WHERE tt."nome" = a."tipo_trabalho"::text;
ALTER TABLE "alocacoes" ALTER COLUMN "tipo_trabalho_id" SET NOT NULL;
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_tipo_trabalho_id_fkey"
  FOREIGN KEY ("tipo_trabalho_id") REFERENCES "tipos_trabalho"("id");
ALTER TABLE "alocacoes" DROP COLUMN "tipo_trabalho";

-- modelo_vaga_tipos
ALTER TABLE "modelo_vaga_tipos" ADD COLUMN "tipo_trabalho_id" UUID;
UPDATE "modelo_vaga_tipos" mvt
  SET "tipo_trabalho_id" = tt."id"
  FROM "tipos_trabalho" tt
  WHERE tt."nome" = mvt."tipo_trabalho"::text;
ALTER TABLE "modelo_vaga_tipos" ALTER COLUMN "tipo_trabalho_id" SET NOT NULL;
ALTER TABLE "modelo_vaga_tipos" ADD CONSTRAINT "modelo_vaga_tipos_tipo_trabalho_id_fkey"
  FOREIGN KEY ("tipo_trabalho_id") REFERENCES "tipos_trabalho"("id");
ALTER TABLE "modelo_vaga_tipos" DROP COLUMN "tipo_trabalho";

-- tabela_valores
ALTER TABLE "tabela_valores" ADD COLUMN "tipo_trabalho_id" UUID;
UPDATE "tabela_valores" tv
  SET "tipo_trabalho_id" = tt."id"
  FROM "tipos_trabalho" tt
  WHERE tt."nome" = tv."tipo_trabalho"::text;
ALTER TABLE "tabela_valores" ALTER COLUMN "tipo_trabalho_id" SET NOT NULL;
ALTER TABLE "tabela_valores" ADD CONSTRAINT "tabela_valores_tipo_trabalho_id_fkey"
  FOREIGN KEY ("tipo_trabalho_id") REFERENCES "tipos_trabalho"("id");
ALTER TABLE "tabela_valores" DROP COLUMN "tipo_trabalho";

-- O enum não é mais usado por nenhuma coluna — remove.
DROP TYPE "tipo_trabalho";
