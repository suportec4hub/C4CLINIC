import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Utilities ──────────────────────────────────────────────────────────────

function calcRestantes(plano) {
  return (plano.total_sessoes || 0) - (plano.sessoes_realizadas || 0)
}

function calcPct(plano) {
  if (!plano.total_sessoes) return 0
  return Math.round(((plano.sessoes_realizadas || 0) / plano.total_sessoes) * 100)
}

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('pt-BR')
}

function fmtDateTime(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function initial(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

// ─── Shared style helpers ────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }
const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, borderRadius: 8,
  border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: 14,
}
const btnSecondary = {
  background: 'transparent', color: L.t2, fontWeight: 500, borderRadius: 8,
  border: `1.5px solid ${L.line}`, cursor: 'pointer', padding: '9px 18px', fontSize: 13,
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Row2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  const color = pct >= 80 ? L.green : pct >= 40 ? L.yellow : L.red
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>Progresso</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: L.line, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${pct}%`,
          background: color, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ativo: { bg: L.tealBg, color: L.teal, bd: L.teal, label: 'Ativo' },
    concluido: { bg: L.greenBg, color: L.green, bd: L.greenBd, label: 'Concluído' },
    suspenso: { bg: L.redBg, color: L.red, bd: L.redBd, label: 'Suspenso' },
  }
  const s = map[status] || { bg: L.surface, color: L.t3, bd: L.line, label: status }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
    }}>{s.label}</span>
  )
}

function SessaoStatusBadge({ status }) {
  const map = {
    realizada: { bg: L.greenBg, color: L.green, bd: L.greenBd, label: 'Realizada' },
    faltou: { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, label: 'Faltou' },
    cancelada: { bg: L.redBg, color: L.red, bd: L.redBd, label: 'Cancelada' },
  }
  const s = map[status] || { bg: L.surface, color: L.t3, bd: L.line, label: status }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
    }}>{s.label}</span>
  )
}

// ─── Bottom-sheet modal ───────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 760 : 580, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: L.t3, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none',
            border: 'none', cursor: 'pointer', lineHeight: 1, marginLeft: 16,
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1 }}>{value}</div>
    </div>
  )
}

// ─── Plano Card ───────────────────────────────────────────────────────────────

function PlanoCard({ plano, pacienteNome, medicoNome, onEdit, onVerSessoes }) {
  const pct = calcPct(plano)
  const restantes = calcRestantes(plano)
  const showAlert = plano.status === 'ativo' && restantes <= 2 && restantes >= 0

  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: L.tealBg,
          color: L.teal, fontWeight: 700, fontSize: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {initial(pacienteNome)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, lineHeight: 1.3 }}>
            {pacienteNome || '—'}
          </div>
          <div style={{
            fontSize: 13, color: L.t2, marginTop: 2, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {plano.titulo}
          </div>
        </div>
        <StatusBadge status={plano.status} />
      </div>

      {/* Objective */}
      {plano.objetivo && (
        <div style={{
          fontSize: 12, color: L.t3, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {plano.objetivo}
        </div>
      )}

      {/* Progress */}
      <div>
        <ProgressBar pct={pct} />
        <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          {plano.sessoes_realizadas || 0} / {plano.total_sessoes || 0} sessões
        </div>
      </div>

      {/* Alert */}
      {showAlert && (
        <div style={{
          fontSize: 12, fontWeight: 600, color: L.yellow,
          background: L.yellowBg, border: `1px solid ${L.yellowBd}`,
          borderRadius: 8, padding: '5px 10px', display: 'inline-flex',
          alignItems: 'center', gap: 4,
        }}>
          ⚠ {restantes} {restantes === 1 ? 'sessão restante' : 'sessões restantes'}
        </div>
      )}

      {/* Doctor & dates */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: L.t3 }}>
        {medicoNome && (
          <span>👨‍⚕️ {medicoNome}</span>
        )}
        <span>📅 {fmtDate(plano.data_inicio)} → {fmtDate(plano.data_fim_prevista)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onVerSessoes(plano)} style={{
          ...btnPrimary, fontSize: 12, padding: '7px 14px', flex: 1,
        }}>
          Ver Sessões
        </button>
        <button onClick={() => onEdit(plano)} style={{
          ...btnSecondary, fontSize: 12, padding: '7px 14px',
        }}>
          Editar
        </button>
      </div>
    </div>
  )
}

// ─── Modal: Novo / Editar Plano ───────────────────────────────────────────────

function ModalPlano({ plano, pacientes, medicos, onClose, onSaved }) {
  const isEdit = !!plano?.id
  const [form, setForm] = useState({
    paciente_id: plano?.paciente_id || '',
    medico_id: plano?.medico_id || '',
    titulo: plano?.titulo || '',
    objetivo: plano?.objetivo || '',
    total_sessoes: plano?.total_sessoes ?? 10,
    data_inicio: plano?.data_inicio || '',
    data_fim_prevista: plano?.data_fim_prevista || '',
    status: plano?.status || 'ativo',
    observacoes: plano?.observacoes || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.paciente_id) { setErr('Selecione o paciente.'); return }
    if (!form.titulo.trim()) { setErr('Título é obrigatório.'); return }
    setSaving(true)
    setErr('')
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('planos_tratamento')
          .update({ ...form, titulo: form.titulo.trim() })
          .eq('id', plano.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('planos_tratamento')
          .insert({ ...form, titulo: form.titulo.trim(), sessoes_realizadas: 0 })
        if (error) throw error
      }
      onSaved()
    } catch (e) {
      setErr(e.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Editar Plano' : 'Novo Plano de Tratamento'} onClose={onClose}>
      <Field label="PACIENTE *">
        <select value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)} style={inp}>
          <option value="">Selecione...</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>

      <Field label="MÉDICO / RESPONSÁVEL">
        <select value={form.medico_id} onChange={e => set('medico_id', e.target.value)} style={inp}>
          <option value="">Selecione...</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` — ${m.especialidade}` : ''}</option>)}
        </select>
      </Field>

      <Field label="TÍTULO *">
        <input value={form.titulo} onChange={e => set('titulo', e.target.value)} style={inp} placeholder="Ex: Fisioterapia pós-operatória" />
      </Field>

      <Field label="OBJETIVO">
        <textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)} style={ta} placeholder="Descreva o objetivo do tratamento..." />
      </Field>

      <Row2>
        <Field label="TOTAL DE SESSÕES">
          <input type="number" min={1} value={form.total_sessoes} onChange={e => set('total_sessoes', parseInt(e.target.value) || 1)} style={inp} />
        </Field>
        <Field label="STATUS">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="concluido">Concluído</option>
          </select>
        </Field>
      </Row2>

      <Row2>
        <Field label="DATA DE INÍCIO">
          <input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} style={inp} />
        </Field>
        <Field label="DATA FIM PREVISTA">
          <input type="date" value={form.data_fim_prevista} onChange={e => set('data_fim_prevista', e.target.value)} style={inp} />
        </Field>
      </Row2>

      <Field label="OBSERVAÇÕES">
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} style={ta} placeholder="Observações gerais..." />
      </Field>

      {err && <div style={{ color: L.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Plano'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Modal: Sessões do Plano ──────────────────────────────────────────────────

function ModalSessoes({ plano, pacienteNome, medicos, clinicaId, onClose, onPlanoUpdated }) {
  const [sessoes, setSessoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    data_hora: '',
    duracao_minutos: 50,
    profissional_id: '',
    evolucao: '',
    intercorrencias: '',
    status: 'realizada',
  })

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadSessoes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sessoes_plano')
      .select('*')
      .eq('plano_id', plano.id)
      .order('numero_sessao', { ascending: false })
    setSessoes(data || [])
    setLoading(false)
  }, [plano.id])

  useEffect(() => { loadSessoes() }, [loadSessoes])

  const medicoNome = (id) => medicos.find(m => m.id === id)?.nome || '—'

  async function handleSaveSessao() {
    if (!form.data_hora) { setErr('Informe a data e hora.'); return }
    setSaving(true)
    setErr('')
    try {
      const proximoNumero = (sessoes.length > 0 ? Math.max(...sessoes.map(s => s.numero_sessao || 0)) : 0) + 1

      const { error: errInsert } = await supabase.from('sessoes_plano').insert({
        clinica_id: clinicaId,
        plano_id: plano.id,
        numero_sessao: proximoNumero,
        data_hora: form.data_hora,
        duracao_minutos: form.duracao_minutos || null,
        profissional_id: form.profissional_id || null,
        evolucao: form.evolucao || null,
        intercorrencias: form.intercorrencias || null,
        status: form.status,
      })
      if (errInsert) throw errInsert

      // If realizada, increment sessoes_realizadas
      if (form.status === 'realizada') {
        const novasSessoes = (plano.sessoes_realizadas || 0) + 1
        const novoStatus = novasSessoes >= (plano.total_sessoes || 0) ? 'concluido' : plano.status

        const { error: errUpdate } = await supabase
          .from('planos_tratamento')
          .update({ sessoes_realizadas: novasSessoes, status: novoStatus })
          .eq('id', plano.id)
        if (errUpdate) throw errUpdate

        plano.sessoes_realizadas = novasSessoes
        plano.status = novoStatus
        onPlanoUpdated({ ...plano })
      }

      setForm({ data_hora: '', duracao_minutos: 50, profissional_id: '', evolucao: '', intercorrencias: '', status: 'realizada' })
      await loadSessoes()
    } catch (e) {
      setErr(e.message || 'Erro ao salvar sessão.')
    } finally {
      setSaving(false)
    }
  }

  const pct = calcPct(plano)

  return (
    <Modal
      title={plano.titulo}
      subtitle={`Paciente: ${pacienteNome}`}
      wide
      onClose={onClose}
    >
      {/* Plan progress header */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 24,
      }}>
        <ProgressBar pct={pct} />
        <div style={{ fontSize: 12, color: L.t3, marginTop: 6 }}>
          {plano.sessoes_realizadas || 0} de {plano.total_sessoes || 0} sessões realizadas
          {' · '}<StatusBadge status={plano.status} />
        </div>
      </div>

      {/* ── Nova Sessão Form ── */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 12, padding: 20, marginBottom: 28,
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
          Registrar Nova Sessão
        </div>

        <Row2>
          <Field label="DATA E HORA">
            <input type="datetime-local" value={form.data_hora} onChange={e => setF('data_hora', e.target.value)} style={inp} />
          </Field>
          <Field label="DURAÇÃO (MIN)">
            <input type="number" min={1} value={form.duracao_minutos} onChange={e => setF('duracao_minutos', parseInt(e.target.value) || '')} style={inp} />
          </Field>
        </Row2>

        <Row2>
          <Field label="PROFISSIONAL">
            <select value={form.profissional_id} onChange={e => setF('profissional_id', e.target.value)} style={inp}>
              <option value="">Selecione...</option>
              {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Field>
          <Field label="STATUS">
            <select value={form.status} onChange={e => setF('status', e.target.value)} style={inp}>
              <option value="realizada">Realizada</option>
              <option value="faltou">Faltou</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </Field>
        </Row2>

        <Field label="EVOLUÇÃO DA SESSÃO">
          <textarea value={form.evolucao} onChange={e => setF('evolucao', e.target.value)} style={ta} placeholder="Descreva a evolução observada..." />
        </Field>

        <Field label="INTERCORRÊNCIAS (OPCIONAL)">
          <textarea value={form.intercorrencias} onChange={e => setF('intercorrencias', e.target.value)} style={{ ...ta, minHeight: 60 }} placeholder="Registre intercorrências, se houver..." />
        </Field>

        {err && <div style={{ color: L.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSaveSessao} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar Sessão'}
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 14 }}>
        Histórico de Sessões
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: L.t3 }}>
          <div style={{
            width: 24, height: 24, border: `3px solid ${L.line}`,
            borderTopColor: L.teal, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Carregando...
        </div>
      ) : sessoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: L.t3, fontSize: 14 }}>
          Nenhuma sessão registrada ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessoes.map(s => {
            const expanded = expandedId === s.id
            return (
              <div key={s.id} style={{
                border: `1px solid ${L.line}`, borderRadius: 10,
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                <div
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    background: expanded ? L.hover : 'transparent',
                  }}
                >
                  {/* Session number badge */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: L.tealBg,
                    color: L.teal, fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {s.numero_sessao}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: L.t1 }}>{fmtDateTime(s.data_hora)}</span>
                      <SessaoStatusBadge status={s.status} />
                      {s.duracao_minutos && (
                        <span style={{ fontSize: 12, color: L.t3 }}>{s.duracao_minutos} min</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                      {medicoNome(s.profissional_id)}
                    </div>
                    {s.evolucao && !expanded && (
                      <div style={{
                        fontSize: 12, color: L.t4, marginTop: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: 400,
                      }}>
                        {s.evolucao}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 18, color: L.t4, flexShrink: 0 }}>
                    {expanded ? '▲' : '▼'}
                  </div>
                </div>

                {expanded && (
                  <div style={{
                    padding: '0 16px 16px', borderTop: `1px solid ${L.line}`,
                    paddingTop: 12,
                  }}>
                    {s.evolucao && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 4 }}>EVOLUÇÃO</div>
                        <div style={{ fontSize: 13, color: L.t1, lineHeight: 1.6 }}>{s.evolucao}</div>
                      </div>
                    )}
                    {s.intercorrencias && (
                      <div>
                        <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 4 }}>INTERCORRÊNCIAS</div>
                        <div style={{ fontSize: 13, color: L.red, lineHeight: 1.6 }}>{s.intercorrencias}</div>
                      </div>
                    )}
                    {!s.evolucao && !s.intercorrencias && (
                      <div style={{ fontSize: 13, color: L.t4 }}>Sem detalhes registrados.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PagePlanoTratamento({ profile }) {
  const clinicaId = profile?.clinica_id

  const [planos, setPlanos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)

  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [search, setSearch] = useState('')

  const [modalPlano, setModalPlano] = useState(null) // null | 'novo' | plano object
  const [modalSessoes, setModalSessoes] = useState(null) // null | plano object

  const loadAll = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [{ data: pl }, { data: pa }, { data: me }] = await Promise.all([
      supabase.from('planos_tratamento').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('medicos').select('id, nome, especialidade').eq('clinica_id', clinicaId).order('nome'),
    ])
    setPlanos(pl || [])
    setPacientes(pa || [])
    setMedicos(me || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { loadAll() }, [loadAll])

  function pacienteNome(id) { return pacientes.find(p => p.id === id)?.nome || '—' }
  function medicoNome(id) { return medicos.find(m => m.id === id)?.nome || '—' }

  // KPIs
  const total = planos.length
  const emAndamento = planos.filter(p => p.status === 'ativo').length
  const concluidos = planos.filter(p => p.status === 'concluido').length

  // Filters
  const filtered = planos.filter(p => {
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const pNome = pacienteNome(p.paciente_id).toLowerCase()
      if (!pNome.includes(q) && !p.titulo?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const tabs = [
    { key: 'todos', label: 'Todos' },
    { key: 'ativo', label: 'Ativo' },
    { key: 'concluido', label: 'Concluído' },
    { key: 'suspenso', label: 'Suspenso' },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Planos de Tratamento</h1>
          <div style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>Gerencie os planos e sessões dos pacientes</div>
        </div>
        <button onClick={() => setModalPlano('novo')} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Novo Plano
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiCard label="TOTAL PLANOS" value={total} />
        <KpiCard label="EM ANDAMENTO" value={emAndamento} color={L.teal} />
        <KpiCard label="CONCLUÍDOS" value={concluidos} color={L.green} />
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFiltroStatus(t.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', fontSize: 13, fontWeight: filtroStatus === t.key ? 700 : 400,
            color: filtroStatus === t.key ? L.teal : L.t3,
            borderBottom: filtroStatus === t.key ? `2px solid ${L.teal}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por paciente ou título do plano..."
          style={{ ...inp, maxWidth: 400 }}
        />
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: L.t3 }}>
          <div style={{
            width: 32, height: 32, border: `3px solid ${L.line}`,
            borderTopColor: L.teal, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          Carregando planos...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: L.t3,
          border: `1.5px dashed ${L.line}`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Nenhum plano encontrado</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {search ? 'Tente outra busca.' : 'Clique em "+ Novo Plano" para começar.'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(p => (
            <PlanoCard
              key={p.id}
              plano={p}
              pacienteNome={pacienteNome(p.paciente_id)}
              medicoNome={medicoNome(p.medico_id)}
              onEdit={plano => setModalPlano(plano)}
              onVerSessoes={plano => setModalSessoes(plano)}
            />
          ))}
        </div>
      )}

      {/* ── Modal: Novo / Editar Plano ── */}
      {modalPlano && (
        <ModalPlano
          plano={modalPlano === 'novo' ? null : modalPlano}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => setModalPlano(null)}
          onSaved={() => { setModalPlano(null); loadAll() }}
        />
      )}

      {/* ── Modal: Sessões ── */}
      {modalSessoes && (
        <ModalSessoes
          plano={modalSessoes}
          pacienteNome={pacienteNome(modalSessoes.paciente_id)}
          medicos={medicos}
          clinicaId={clinicaId}
          onClose={() => { setModalSessoes(null); loadAll() }}
          onPlanoUpdated={updated => {
            setModalSessoes(updated)
            setPlanos(prev => prev.map(p => p.id === updated.id ? updated : p))
          }}
        />
      )}
    </div>
  )
}
