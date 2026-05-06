-- =============================================
-- C4CLINIC v2 — MIGRATION: Multi-tenant SaaS
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Adiciona tipo e campos extras em clinicas
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'clinica',
  ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Atualiza roles disponíveis no campo cargo de usuarios
-- (sem enum para flexibilidade)
-- Roles: c4hub_admin, c4hub, admin_clinica, medico, recepcionista, atendente, financeiro

-- 3. Insere a C4HUB como empresa master
INSERT INTO clinicas (id, nome, email, telefone, cidade, estado, tipo, is_master, ativo)
VALUES (
  'c4hub000-0000-0000-0000-000000000000',
  'C4 HUB',
  'suporte.c4hub@gmail.com',
  '(11) 9000-0000',
  'São Paulo',
  'SP',
  'c4hub',
  true,
  true
)
ON CONFLICT (id) DO UPDATE
  SET nome = 'C4 HUB', tipo = 'c4hub', is_master = true;

-- 4. Vincula o usuário admin à C4HUB
-- Substitua o UUID abaixo pelo UUID real do seu usuário no Auth:
-- UPDATE usuarios SET clinica_id = 'c4hub000-0000-0000-0000-000000000000', cargo = 'c4hub_admin'
-- WHERE id = 'SEU-UUID-AQUI';

-- 5. Remove policies antigas e cria novas com suporte a c4hub_admin
DROP POLICY IF EXISTS "clinicas_acesso" ON clinicas;
DROP POLICY IF EXISTS "pacientes_clinica" ON pacientes;
DROP POLICY IF EXISTS "medicos_clinica" ON medicos;
DROP POLICY IF EXISTS "convenios_clinica" ON convenios;
DROP POLICY IF EXISTS "agendamentos_clinica" ON agendamentos;
DROP POLICY IF EXISTS "consultas_clinica" ON consultas;
DROP POLICY IF EXISTS "financeiro_clinica" ON financeiro_lancamentos;
DROP POLICY IF EXISTS "usuarios_self_clinica" ON usuarios;

-- Helper function: verifica se o usuário é c4hub_admin
CREATE OR REPLACE FUNCTION is_c4hub_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND cargo IN ('c4hub_admin', 'c4hub')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- CLINICAS: c4hub_admin vê tudo; outros só veem a própria
CREATE POLICY "clinicas_v2" ON clinicas
  FOR ALL USING (
    is_c4hub_admin()
    OR id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- USUARIOS: c4hub_admin vê todos; clinic admin vê os da sua clínica
CREATE POLICY "usuarios_v2" ON usuarios
  FOR ALL USING (
    id = auth.uid()
    OR is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- PACIENTES
CREATE POLICY "pacientes_v2" ON pacientes
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- MEDICOS
CREATE POLICY "medicos_v2" ON medicos
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- CONVENIOS
CREATE POLICY "convenios_v2" ON convenios
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- AGENDAMENTOS
CREATE POLICY "agendamentos_v2" ON agendamentos
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- CONSULTAS
CREATE POLICY "consultas_v2" ON consultas
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- FINANCEIRO
CREATE POLICY "financeiro_v2" ON financeiro_lancamentos
  FOR ALL USING (
    is_c4hub_admin()
    OR clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
  );

-- 6. Dados demo: clínica cliente de exemplo
INSERT INTO clinicas (id, nome, email, telefone, cidade, estado, tipo, plano, ativo)
VALUES (
  'clinica1-0000-0000-0000-000000000001',
  'Clínica São Lucas',
  'contato@saolucas.com',
  '(11) 3100-0000',
  'São Paulo',
  'SP',
  'clinica',
  'profissional',
  true
),
(
  'hospital1-0000-0000-0000-000000000001',
  'Hospital Santa Maria',
  'contato@santamaria.com',
  '(11) 3200-0000',
  'Campinas',
  'SP',
  'hospital',
  'enterprise',
  true
)
ON CONFLICT (id) DO NOTHING;
