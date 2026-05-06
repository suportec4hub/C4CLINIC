-- =============================================
-- C4CLINIC — SETUP INICIAL
-- Execute DEPOIS do supabase-schema.sql
-- =============================================

-- PASSO 1: Criar a clínica
-- Substitua os dados pela sua clínica real

INSERT INTO clinicas (id, nome, cnpj, telefone, email, cidade, estado)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'C4CLINIC Demo',
  '00.000.000/0001-00',
  '(11) 3000-0000',
  'clinica@c4hub.com',
  'São Paulo',
  'SP'
)
ON CONFLICT (id) DO NOTHING;


-- PASSO 2: Criar usuário no Supabase Auth
-- Vá em: Authentication → Users → Add User
-- Email: admin@c4clinic.com  |  Senha: Admin@2026
-- Copie o UUID gerado e substitua abaixo


-- PASSO 3: Criar perfil do admin (substitua o UUID do usuário criado no Auth)
-- INSERT INTO usuarios (id, clinica_id, nome, cargo)
-- VALUES (
--   '<UUID-DO-AUTH-USER>',
--   'a1b2c3d4-0000-0000-0000-000000000001',
--   'Administrador',
--   'admin'
-- );


-- PASSO 4: Dados de exemplo — Médicos
INSERT INTO medicos (clinica_id, nome, crm, especialidade, telefone, email, ativo)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Ana Paula Silva', 'CRM/SP 123456', 'Clínica Geral', '(11) 91234-5678', 'ana@clinica.com', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Carlos Eduardo Melo', 'CRM/SP 654321', 'Cardiologia', '(11) 98765-4321', 'carlos@clinica.com', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Fernanda Costa', 'CRM/SP 111222', 'Pediatria', '(11) 97654-3210', 'fernanda@clinica.com', true)
ON CONFLICT DO NOTHING;


-- PASSO 5: Dados de exemplo — Convênios
INSERT INTO convenios (clinica_id, nome, codigo, tipo, prazo_pagamento, ativo)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Unimed', '999999', 'plano_saude', 30, true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Bradesco Saúde', '888888', 'plano_saude', 30, true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Particular', NULL, 'particular', 0, true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'SUS', NULL, 'sus', 0, true)
ON CONFLICT DO NOTHING;


-- PASSO 6: Dados de exemplo — Pacientes
INSERT INTO pacientes (clinica_id, nome, cpf, data_nascimento, sexo, telefone, email, cidade, estado, ativo)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001', 'João da Silva', '000.111.222-33', '1980-05-15', 'Masculino', '(11) 91111-1111', 'joao@email.com', 'São Paulo', 'SP', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Maria Oliveira', '111.222.333-44', '1975-08-22', 'Feminino', '(11) 92222-2222', 'maria@email.com', 'São Paulo', 'SP', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Pedro Santos', '222.333.444-55', '1995-03-10', 'Masculino', '(11) 93333-3333', 'pedro@email.com', 'São Paulo', 'SP', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Luciana Ferreira', '333.444.555-66', '1988-11-30', 'Feminino', '(11) 94444-4444', 'luciana@email.com', 'São Paulo', 'SP', true),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Roberto Lima', '444.555.666-77', '1965-07-04', 'Masculino', '(11) 95555-5555', 'roberto@email.com', 'São Paulo', 'SP', true)
ON CONFLICT DO NOTHING;
