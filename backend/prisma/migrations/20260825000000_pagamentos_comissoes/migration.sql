-- Módulo de Pagamentos e Comissões (docs/features/pagamento.md). Escrita
-- à mão (em vez de `prisma migrate diff`), como as migrations anteriores
-- desta série, porque envolve renomear/converter colunas com semântica
-- nova, não só alterar estrutura.

-- tabela_valores: salario_base (obrigatório em EXTERNA, sempre null em
-- HUB — validado no service, não aqui).
ALTER TABLE "tabela_valores" ADD COLUMN "salario_base" DECIMAL(10,2);

-- pagamentos: valor -> valor_previsto (nullable — sede HUB só define na
-- hora de registrar o pagamento), + valor_pago (nunca sobrescreve
-- valor_previsto), + valor_gerado (congelado no momento da confirmação,
-- backfill a partir do valor_previsto que já existia), + comprovante_url
-- (link do Google Drive, nunca o binário).
ALTER TABLE "pagamentos" RENAME COLUMN "valor" TO "valor_previsto";
ALTER TABLE "pagamentos" ALTER COLUMN "valor_previsto" DROP NOT NULL;
ALTER TABLE "pagamentos" ADD COLUMN "valor_pago" DECIMAL(10,2);
ALTER TABLE "pagamentos" ADD COLUMN "valor_gerado" DECIMAL(10,2);
UPDATE "pagamentos" SET "valor_gerado" = COALESCE("valor_previsto", 0) WHERE "valor_gerado" IS NULL;
ALTER TABLE "pagamentos" ALTER COLUMN "valor_gerado" SET NOT NULL;
ALTER TABLE "pagamentos" ADD COLUMN "comprovante_url" TEXT;

-- comissoes: split entre dono da sede e dono do funcionário, 1:1 com
-- alocacoes (mesma âncora de idempotência de pagamentos). Sem status
-- próprio — deriva do status de pagamentos pela mesma alocacao_id.
CREATE TABLE "comissoes" (
  "id"                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "alocacao_id"                   UUID UNIQUE NOT NULL REFERENCES "alocacoes"("id"),
  "valor_gerado"                  DECIMAL(10,2) NOT NULL,
  "valor_funcionario"             DECIMAL(10,2),
  "resultado_calculado"           DECIMAL(10,2),
  "responsavel_sede_id"           UUID NOT NULL REFERENCES "responsaveis"("id"),
  "valor_comissao_sede"           DECIMAL(10,2),
  "responsavel_fornecimento_id"   UUID NOT NULL REFERENCES "responsaveis"("id"),
  "valor_comissao_fornecimento"   DECIMAL(10,2),
  "created_at"                    TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at"                    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "idx_comissoes_responsavel_sede" ON "comissoes"("responsavel_sede_id");
CREATE INDEX "idx_comissoes_responsavel_fornecimento" ON "comissoes"("responsavel_fornecimento_id");
