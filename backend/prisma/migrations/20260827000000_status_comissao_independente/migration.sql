-- Status de recebimento da comissão passa a ser independente do
-- StatusPagamento do funcionário (decisão do usuário): pagar o
-- funcionário e receber a comissão são dois eventos financeiros
-- distintos. Cada perna (sede/fornecimento) tem seu próprio status,
-- porque pode ser gente diferente recebendo em momentos diferentes.

CREATE TYPE "status_comissao" AS ENUM ('PENDENTE', 'RECEBIDA', 'CANCELADA');

ALTER TABLE "comissoes"
  ADD COLUMN "status_sede" "status_comissao" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "recebido_sede_em" TIMESTAMP,
  ADD COLUMN "status_fornecimento" "status_comissao" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "recebido_fornecimento_em" TIMESTAMP;
