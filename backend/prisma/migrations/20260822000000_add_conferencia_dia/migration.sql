-- Trava de finalização da Confirmação do Dia (docs/features/confirmacao-dia.md,
-- seção 28.1). Uma linha por sede+dia; `finalizado_em` preenchido = tela
-- bloqueia novas alterações de situação para aquela sede/dia até um
-- Administrador reabrir (`reaberto_em`/`reaberto_por`).
CREATE TABLE "conferencias_dia" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sede_id"        UUID NOT NULL REFERENCES "sedes"("id"),
  "data"           DATE NOT NULL,
  "finalizado_em"  TIMESTAMP,
  "finalizado_por" UUID REFERENCES "usuarios"("id"),
  "reaberto_em"    TIMESTAMP,
  "reaberto_por"   UUID REFERENCES "usuarios"("id"),
  "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("sede_id", "data")
);
