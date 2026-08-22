-- =====================================
-- EXTENSÃO UUID
-- =====================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================
-- ENUMS
-- =====================================

CREATE TYPE tipo_usuario AS ENUM (
    'ADMIN',
    'RESPONSAVEL'
);

CREATE TYPE status_funcionario AS ENUM (
    'PENDENTE',
    'APROVADO',
    'BLOQUEADO',
    'INATIVO'
);

CREATE TYPE tipo_sede AS ENUM (
    'HUB',
    'EXTERNA'
);

CREATE TYPE tipo_modelo_vaga AS ENUM (
    'FIXA',
    'ESPORADICA'
);

CREATE TYPE status_vaga AS ENUM (
    'ABERTA',
    'INCOMPLETA',
    'COMPLETA',
    'CANCELADA'
);

CREATE TYPE tipo_trabalho AS ENUM (
    'MANPOWER',
    'FORKLIFT'
);

CREATE TYPE status_alocacao AS ENUM (
    'ATIVA',
    'CANCELADA'
);

CREATE TYPE status_confirmacao AS ENUM (
    'PENDENTE',
    'PRESENTE',
    'FALTOU',
    'CANCELOU',
    'SUBSTITUICAO_NECESSARIA',
    -- Trabalhou cobrindo uma vaga marcada SUBSTITUICAO_NECESSARIA. Conta
    -- como trabalho normal (elegível a pagamento, igual PRESENTE), mas
    -- abate a contagem de substituições urgentes daquele tipo e tem rótulo
    -- próprio na tela (docs/features/confirmacao-dia.md).
    'SUBSTITUIU'
);

CREATE TYPE status_pagamento AS ENUM (
    'PENDENTE',
    'PAGO',
    'CANCELADO'
);



-- =====================================
-- USUARIOS
-- =====================================

CREATE TABLE usuarios (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nome VARCHAR(255) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    senha_hash TEXT NOT NULL,

    tipo tipo_usuario NOT NULL,

    ativo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);



-- =====================================
-- RESPONSAVEIS
-- =====================================

CREATE TABLE responsaveis (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    usuario_id UUID UNIQUE,

    nome VARCHAR(255) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    senha_distribuicao VARCHAR(255) NOT NULL,

    ativo BOOLEAN DEFAULT TRUE,

    deleted_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(usuario_id)
        REFERENCES usuarios(id)
);



-- =====================================
-- FUNCIONARIOS
-- =====================================

CREATE TABLE funcionarios (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    responsavel_id UUID NOT NULL,

    nome VARCHAR(255) NOT NULL,

    telefone VARCHAR(50),

    provincia VARCHAR(100),

    codigo_postal VARCHAR(20),

    documento_url TEXT,

    status status_funcionario DEFAULT 'PENDENTE',

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(responsavel_id)
        REFERENCES responsaveis(id)
);



-- =====================================
-- SEDES
-- =====================================

CREATE TABLE sedes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sigla VARCHAR(50) UNIQUE NOT NULL,

    nome VARCHAR(255) NOT NULL,

    endereco TEXT,

    tipo_sede tipo_sede NOT NULL,

    cluster TEXT,

    responsavel_id UUID,

    ativo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(responsavel_id)
        REFERENCES responsaveis(id)
);



-- =====================================
-- MODELOS DE VAGAS
-- =====================================

CREATE TABLE modelos_vagas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sede_id UUID NOT NULL,

    nome VARCHAR(255) NOT NULL,

    tipo tipo_modelo_vaga NOT NULL,

    ativo BOOLEAN DEFAULT TRUE,

    observacao TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(sede_id)
        REFERENCES sedes(id)
);



-- =====================================
-- DIAS DOS MODELOS DE VAGA
-- =====================================

CREATE TABLE modelo_vaga_dias (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    modelo_vaga_id UUID NOT NULL,

    dia_semana INTEGER NOT NULL
        CHECK (dia_semana BETWEEN 1 AND 7),

    FOREIGN KEY(modelo_vaga_id)
        REFERENCES modelos_vagas(id)
        ON DELETE CASCADE
);



-- =====================================
-- TIPOS DOS MODELOS DE VAGA
-- =====================================

CREATE TABLE modelo_vaga_tipos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    modelo_vaga_id UUID NOT NULL,

    tipo_trabalho tipo_trabalho NOT NULL,

    quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),

    FOREIGN KEY(modelo_vaga_id)
        REFERENCES modelos_vagas(id)
        ON DELETE CASCADE
);



-- =====================================
-- VAGAS REAIS
-- =====================================

CREATE TABLE vagas (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sede_id UUID NOT NULL,

    modelo_vaga_id UUID,

    data DATE NOT NULL,

    status status_vaga DEFAULT 'ABERTA',

    observacao TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(sede_id)
        REFERENCES sedes(id),

    FOREIGN KEY(modelo_vaga_id)
        REFERENCES modelos_vagas(id)
);



-- =====================================
-- TIPOS DAS VAGAS
-- =====================================

CREATE TABLE vaga_tipos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vaga_id UUID NOT NULL,

    tipo_trabalho tipo_trabalho NOT NULL,

    quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),

    FOREIGN KEY(vaga_id)
        REFERENCES vagas(id)
        ON DELETE CASCADE
);



-- =====================================
-- ALOCACOES
-- =====================================

CREATE TABLE alocacoes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vaga_id UUID NOT NULL,

    funcionario_id UUID NOT NULL,

    responsavel_id UUID NOT NULL,

    tipo_trabalho tipo_trabalho NOT NULL,

    status status_alocacao DEFAULT 'ATIVA',

    data_alocacao TIMESTAMP DEFAULT NOW(),

    observacao TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(vaga_id)
        REFERENCES vagas(id),

    FOREIGN KEY(funcionario_id)
        REFERENCES funcionarios(id),

    FOREIGN KEY(responsavel_id)
        REFERENCES responsaveis(id)
);



-- =====================================
-- CONFIRMACOES
-- =====================================

CREATE TABLE confirmacoes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    alocacao_id UUID UNIQUE NOT NULL,

    status status_confirmacao DEFAULT 'PENDENTE',

    observacao TEXT,

    confirmado_por UUID,

    confirmado_em TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(alocacao_id)
        REFERENCES alocacoes(id),

    FOREIGN KEY(confirmado_por)
        REFERENCES usuarios(id)
);



-- =====================================
-- CONFERENCIAS_DIA
-- Trava de finalização da Confirmação do Dia (docs/features/confirmacao-dia.md,
-- seção 28.1). Uma linha por sede+dia; finalizado_em preenchido bloqueia
-- novas alterações de situação naquela sede/dia até um Administrador
-- reabrir (reaberto_em/reaberto_por).
-- =====================================

CREATE TABLE conferencias_dia (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sede_id UUID NOT NULL,

    data DATE NOT NULL,

    finalizado_em TIMESTAMP,

    finalizado_por UUID,

    reaberto_em TIMESTAMP,

    reaberto_por UUID,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(sede_id, data),

    FOREIGN KEY(sede_id)
        REFERENCES sedes(id),

    FOREIGN KEY(finalizado_por)
        REFERENCES usuarios(id),

    FOREIGN KEY(reaberto_por)
        REFERENCES usuarios(id)
);



-- =====================================
-- TABELA DE VALORES
-- =====================================

CREATE TABLE tabela_valores (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo_trabalho tipo_trabalho NOT NULL,

    tipo_sede tipo_sede NOT NULL,

    valor NUMERIC(10,2) NOT NULL,

    data_inicio DATE,

    data_fim DATE,

    ativo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
);



-- =====================================
-- PAGAMENTOS
-- =====================================

CREATE TABLE pagamentos (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo VARCHAR(100),

    responsavel_id UUID NOT NULL,

    alocacao_id UUID UNIQUE NOT NULL,

    funcionario_id UUID NOT NULL,

    valor NUMERIC(10,2) NOT NULL,

    data_prevista DATE,

    data_pagamento DATE,

    status status_pagamento DEFAULT 'PENDENTE',

    status_prazo VARCHAR(50),

    observacao TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY(responsavel_id)
        REFERENCES responsaveis(id),

    FOREIGN KEY(alocacao_id)
        REFERENCES alocacoes(id),

    FOREIGN KEY(funcionario_id)
        REFERENCES funcionarios(id)
);



-- =====================================
-- INDEXES
-- =====================================

CREATE INDEX idx_funcionarios_responsavel
ON funcionarios(responsavel_id);


CREATE INDEX idx_vagas_data
ON vagas(data);


CREATE INDEX idx_vagas_sede
ON vagas(sede_id);


CREATE INDEX idx_alocacoes_funcionario
ON alocacoes(funcionario_id);


CREATE INDEX idx_alocacoes_vaga
ON alocacoes(vaga_id);


CREATE INDEX idx_pagamentos_status
ON pagamentos(status);