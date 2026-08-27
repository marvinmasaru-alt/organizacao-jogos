-- CreateEnum
CREATE TYPE "tipo_usuario" AS ENUM ('ADMIN', 'RESPONSAVEL');

-- CreateEnum
CREATE TYPE "status_funcionario" AS ENUM ('PENDENTE', 'APROVADO', 'BLOQUEADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "tipo_sede" AS ENUM ('HUB', 'EXTERNA');

-- CreateEnum
CREATE TYPE "tipo_modelo_vaga" AS ENUM ('FIXA', 'ESPORADICA');

-- CreateEnum
CREATE TYPE "status_vaga" AS ENUM ('ABERTA', 'INCOMPLETA', 'COMPLETA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "tipo_trabalho" AS ENUM ('MANPOWER', 'FORKLIFT');

-- CreateEnum
CREATE TYPE "status_alocacao" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_confirmacao" AS ENUM ('PENDENTE', 'PRESENTE', 'FALTOU', 'CANCELOU', 'SUBSTITUICAO_NECESSARIA');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "tipo" "tipo_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsaveis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_distribuicao" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responsaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "responsavel_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(50),
    "provincia" VARCHAR(100),
    "codigo_postal" VARCHAR(20),
    "documento_url" TEXT,
    "status" "status_funcionario" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sigla" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "endereco" TEXT,
    "tipo_sede" "tipo_sede" NOT NULL,
    "cluster" TEXT,
    "responsavel_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_vagas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sede_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "tipo" "tipo_modelo_vaga" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_vaga_dias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelo_vaga_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,

    CONSTRAINT "modelo_vaga_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_vaga_tipos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelo_vaga_id" UUID NOT NULL,
    "tipo_trabalho" "tipo_trabalho" NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "modelo_vaga_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sede_id" UUID NOT NULL,
    "modelo_vaga_id" UUID,
    "data" DATE NOT NULL,
    "status" "status_vaga" NOT NULL DEFAULT 'ABERTA',
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaga_tipos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vaga_id" UUID NOT NULL,
    "tipo_trabalho" "tipo_trabalho" NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "vaga_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alocacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vaga_id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "responsavel_id" UUID NOT NULL,
    "tipo_trabalho" "tipo_trabalho" NOT NULL,
    "status" "status_alocacao" NOT NULL DEFAULT 'ATIVA',
    "data_alocacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alocacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alocacao_id" UUID NOT NULL,
    "status" "status_confirmacao" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "confirmado_por" UUID,
    "confirmado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "confirmacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabela_valores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo_trabalho" "tipo_trabalho" NOT NULL,
    "tipo_sede" "tipo_sede" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_inicio" DATE,
    "data_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tabela_valores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" VARCHAR(100),
    "responsavel_id" UUID NOT NULL,
    "alocacao_id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_prevista" DATE,
    "data_pagamento" DATE,
    "status" "status_pagamento" NOT NULL DEFAULT 'PENDENTE',
    "status_prazo" VARCHAR(50),
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "responsaveis_usuario_id_key" ON "responsaveis"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsaveis_email_key" ON "responsaveis"("email");

-- CreateIndex
CREATE INDEX "idx_funcionarios_responsavel" ON "funcionarios"("responsavel_id");

-- CreateIndex
CREATE UNIQUE INDEX "sedes_sigla_key" ON "sedes"("sigla");

-- CreateIndex
CREATE INDEX "idx_vagas_data" ON "vagas"("data");

-- CreateIndex
CREATE INDEX "idx_vagas_sede" ON "vagas"("sede_id");

-- CreateIndex
CREATE INDEX "idx_alocacoes_funcionario" ON "alocacoes"("funcionario_id");

-- CreateIndex
CREATE INDEX "idx_alocacoes_vaga" ON "alocacoes"("vaga_id");

-- CreateIndex
CREATE UNIQUE INDEX "confirmacoes_alocacao_id_key" ON "confirmacoes"("alocacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_alocacao_id_key" ON "pagamentos"("alocacao_id");

-- CreateIndex
CREATE INDEX "idx_pagamentos_status" ON "pagamentos"("status");

-- AddForeignKey
ALTER TABLE "responsaveis" ADD CONSTRAINT "responsaveis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_vagas" ADD CONSTRAINT "modelos_vagas_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_vaga_dias" ADD CONSTRAINT "modelo_vaga_dias_modelo_vaga_id_fkey" FOREIGN KEY ("modelo_vaga_id") REFERENCES "modelos_vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_vaga_tipos" ADD CONSTRAINT "modelo_vaga_tipos_modelo_vaga_id_fkey" FOREIGN KEY ("modelo_vaga_id") REFERENCES "modelos_vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_modelo_vaga_id_fkey" FOREIGN KEY ("modelo_vaga_id") REFERENCES "modelos_vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaga_tipos" ADD CONSTRAINT "vaga_tipos_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmacoes" ADD CONSTRAINT "confirmacoes_alocacao_id_fkey" FOREIGN KEY ("alocacao_id") REFERENCES "alocacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmacoes" ADD CONSTRAINT "confirmacoes_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_alocacao_id_fkey" FOREIGN KEY ("alocacao_id") REFERENCES "alocacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
