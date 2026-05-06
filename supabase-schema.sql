-- C4CLINIC — Schema SQL
-- Execute este arquivo no Supabase SQL Editor

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLÍNICAS (tenant raiz)
-- =============================================
CREATE TABLE IF NOT EXISTS clinicas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  cnpj          TEXT,
  telefone      TEXT,
  email         TEXT,
  endereco      TEXT,
  cidade        TEXT,
  estado        TEXT,
  cep           TEXT,
  logo_url      TEXT,
  ativo         BOOLEAN DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USUÁRIOS (auth + perfil)
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id    UUID REFERENCES clinicas(id) ON DELETE SET NULL,
  nome          TEXT,
  cargo         TEXT DEFAULT 'recepcionista',
  crm           TEXT,
  especialidade TEXT,
  telefone      TEXT,
  avatar_url    TEXT,
  ativo         BOOLEAN DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVÊNIOS
-- =============================================
CREATE TABLE IF NOT EXISTS convenios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id      UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  codigo          TEXT,
  tipo            TEXT DEFAULT 'plano_saude',
  telefone        TEXT,
  email           TEXT,
  prazo_pagamento INTEGER,
  ativo           BOOLEAN DEFAULT true,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PACIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS pacientes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id          UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  cpf                 TEXT,
  data_nascimento     DATE,
  sexo                TEXT,
  telefone            TEXT,
  email               TEXT,
  endereco            TEXT,
  cidade              TEXT,
  estado              TEXT,
  cep                 TEXT,
  convenio_id         UUID REFERENCES convenios(id) ON DELETE SET NULL,
  numero_carteirinha  TEXT,
  observacoes         TEXT,
  foto_url            TEXT,
  ativo               BOOLEAN DEFAULT true,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MÉDICOS
-- =============================================
CREATE TABLE IF NOT EXISTS medicos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id    UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL,
  crm           TEXT NOT NULL,
  especialidade TEXT,
  telefone      TEXT,
  email         TEXT,
  foto_url      TEXT,
  ativo         BOOLEAN DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AGENDAMENTOS
-- =============================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id    UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id   UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  medico_id     UUID REFERENCES medicos(id) ON DELETE SET NULL,
  data_hora     TIMESTAMPTZ NOT NULL,
  duracao_min   INTEGER DEFAULT 30,
  tipo          TEXT DEFAULT 'consulta',
  status        TEXT DEFAULT 'agendado',
  convenio_id   UUID REFERENCES convenios(id) ON DELETE SET NULL,
  sala          TEXT,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONSULTAS / PRONTUÁRIO
-- =============================================
CREATE TABLE IF NOT EXISTS consultas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id            UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  agendamento_id        UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
  paciente_id           UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  medico_id             UUID REFERENCES medicos(id) ON DELETE SET NULL,
  data_hora             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo                  TEXT DEFAULT 'consulta',
  queixa_principal      TEXT,
  anamnese              TEXT,
  exame_fisico          TEXT,
  hipotese_diagnostica  TEXT,
  cid_principal         TEXT,
  cid_secundario        TEXT,
  conduta               TEXT,
  evolucao              TEXT,
  prescricao            TEXT,
  encaminhamento        TEXT,
  retorno_em            DATE,
  convenio_id           UUID REFERENCES convenios(id) ON DELETE SET NULL,
  valor                 DECIMAL(10,2),
  status                TEXT DEFAULT 'realizada',
  criado_em             TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FINANCEIRO
-- =============================================
CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinica_id       UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
  categoria        TEXT,
  descricao        TEXT NOT NULL,
  valor            DECIMAL(10,2) NOT NULL,
  data_vencimento  DATE,
  data_pagamento   DATE,
  status           TEXT DEFAULT 'pendente',
  paciente_id      UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  consulta_id      UUID REFERENCES consultas(id) ON DELETE SET NULL,
  convenio_id      UUID REFERENCES convenios(id) ON DELETE SET NULL,
  forma_pagamento  TEXT,
  observacoes      TEXT,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES de performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON agendamentos(clinica_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_consultas_clinica_data ON consultas(clinica_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_financeiro_clinica ON financeiro_lancamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver sua própria clínica
CREATE POLICY "usuarios_clinica" ON usuarios
  FOR ALL USING (id = auth.uid() OR clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "clinicas_acesso" ON clinicas
  FOR ALL USING (id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "pacientes_clinica" ON pacientes
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "medicos_clinica" ON medicos
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "convenios_clinica" ON convenios
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "agendamentos_clinica" ON agendamentos
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "consultas_clinica" ON consultas
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "financeiro_clinica" ON financeiro_lancamentos
  FOR ALL USING (clinica_id IN (
    SELECT clinica_id FROM usuarios WHERE id = auth.uid()
  ));

-- =============================================
-- DADOS INICIAIS DE EXEMPLO
-- =============================================
-- Após criar o primeiro usuário no Auth, execute:
-- INSERT INTO clinicas (nome, email, telefone, cidade, estado)
-- VALUES ('Clínica Exemplo', 'clinica@exemplo.com', '(11) 3000-0000', 'São Paulo', 'SP');
--
-- INSERT INTO usuarios (id, clinica_id, nome, cargo)
-- VALUES ('<UUID do auth.users>', '<UUID da clinica>', 'Administrador', 'admin');
