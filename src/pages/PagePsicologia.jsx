import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Shared style tokens ─── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }
const lbl = {
  display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
}
const btnPrimary = {
  background: L.teal, color: L.white, border: 'none', borderRadius: 8,
  padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnGhost = {
  background: 'transparent', color: L.t2, border: `1.5px solid ${L.line}`,
  borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer',
}

/* ─── Utilities ─── */
function calcAge(dob) {
  if (!dob) return '–'
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--
  return age
}
function fmtDate(s) {
  if (!s) return '–'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
function today() { return new Date().toISOString().split('T')[0] }
function addDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/* ─── Humor config ─── */
const HUMORS = [
  { key: 'otimo',   emoji: '😊', label: 'Ótimo',   color: L.green,  bg: L.greenBg  },
  { key: 'bom',     emoji: '🙂', label: 'Bom',     color: L.teal,   bg: L.tealBg   },
  { key: 'regular', emoji: '😐', label: 'Regular', color: L.yellow, bg: L.yellowBg },
  { key: 'ruim',    emoji: '😟', label: 'Ruim',    color: L.orange, bg: L.orangeBg },
  { key: 'critico', emoji: '😨', label: 'Crítico', color: L.red,    bg: L.redBg    },
]
function humorCfg(key) {
  return HUMORS.find(h => h.key === key) || HUMORS[2]
}

/* ─── Field wrapper ─── */
function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

/* ─── Bottom-sheet modal ─── */
function BottomSheet({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 800 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        {/* sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</span>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Toast ─── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: L.teal, color: '#fff', borderRadius: 10,
      padding: '12px 24px', fontSize: 13, fontWeight: 600,
      zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'up 0.2s ease',
    }}>{msg}</div>
  )
}

/* ─── SOAP Section Card ─── */
function SoapSection({ letter, label, text, borderColor }) {
  return (
    <div style={{
      borderLeft: `4px solid ${borderColor}`, borderRadius: '0 8px 8px 0',
      background: L.surface, padding: '12px 16px', marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: L.t4, marginBottom: 4 }}>
        [{letter}] {label}
      </div>
      <div style={{ fontSize: 13, color: L.t1, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {text || <span style={{ color: L.t4, fontStyle: 'italic' }}>Não preenchido</span>}
      </div>
    </div>
  )
}

/* ─── Humor picker ─── */
function HumorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {HUMORS.map(h => {
        const sel = value === h.key
        return (
          <button
            key={h.key}
            type="button"
            onClick={() => onChange(h.key)}
            style={{
              border: sel ? `2px solid ${h.color}` : `1.5px solid ${L.line}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              background: sel ? h.bg : L.bg,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: sel ? h.color : L.t2, fontWeight: sel ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{h.emoji}</span>
            {h.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Humor dot (for trend) ─── */
function HumorDot({ humor, title }) {
  const cfg = humorCfg(humor)
  return (
    <span
      title={title || cfg.label}
      style={{
        display: 'inline-block', width: 10, height: 10,
        borderRadius: '50%', background: cfg.color,
      }}
    />
  )
}

/* ─── Session Form (New / Edit) ─── */
function SessionForm({ form, setForm, pacientes, onSave, saving, onClose, editMode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="PACIENTE">
          <select
            style={inp}
            value={form.paciente_id || ''}
            onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}
          >
            <option value="">Selecionar…</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="PSICÓLOGO(A)">
          <input style={inp} value={form.psicologo || ''} placeholder="Nome do psicólogo"
            onChange={e => setForm(f => ({ ...f, psicologo: e.target.value }))} />
        </Field>
        <Field label="DATA">
          <input type="date" style={inp} value={form.data || today()}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
        </Field>
        <Field label="Nº DA SESSÃO">
          <input type="number" min={1} style={inp} value={form.numero_sessao || ''}
            placeholder="Ex: 12"
            onChange={e => setForm(f => ({ ...f, numero_sessao: e.target.value }))} />
        </Field>
      </div>

      {/* SOAP */}
      <div style={{
        borderRadius: 10, border: `1.5px solid ${L.line}`,
        padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: L.t3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
          NOTAS SOAP
        </div>
        <Field label="[S] SUBJETIVO — O que o paciente relata">
          <textarea style={ta} value={form.subjetivo || ''}
            placeholder="Relato do paciente, queixas, sentimentos expressos..."
            onChange={e => setForm(f => ({ ...f, subjetivo: e.target.value }))} />
        </Field>
        <Field label="[O] OBJETIVO — Comportamentos observáveis">
          <textarea style={ta} value={form.objetivo || ''}
            placeholder="Aparência, postura, humor observado, comportamentos na sessão..."
            onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} />
        </Field>
        <Field label="[A] AVALIAÇÃO — Impressão clínica">
          <textarea style={ta} value={form.avaliacao || ''}
            placeholder="Avaliação clínica, hipóteses diagnósticas, evolução..."
            onChange={e => setForm(f => ({ ...f, avaliacao: e.target.value }))} />
        </Field>
        <Field label="[P] PLANO — Plano terapêutico">
          <textarea style={ta} value={form.plano || ''}
            placeholder="Próximas intervenções, tarefas, encaminhamentos..."
            onChange={e => setForm(f => ({ ...f, plano: e.target.value }))} />
        </Field>
      </div>

      {/* Humor */}
      <Field label="ESTADO DE HUMOR">
        <HumorPicker value={form.humor || 'regular'} onChange={v => setForm(f => ({ ...f, humor: v }))} />
      </Field>

      {/* Risco suicídio */}
      <div style={{
        background: L.redBg, border: `1.5px solid ${L.redBd}`,
        borderRadius: 10, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <input
          type="checkbox"
          id="risco_suicidio"
          checked={!!form.risco_suicidio}
          onChange={e => setForm(f => ({ ...f, risco_suicidio: e.target.checked }))}
          style={{ width: 18, height: 18, accentColor: L.red, cursor: 'pointer' }}
        />
        <label htmlFor="risco_suicidio" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: L.red }}>⚠ Risco de Suicídio</div>
          <div style={{ fontSize: 11, color: L.red, opacity: 0.8, marginTop: 2 }}>
            Marque se há ideação, plano ou risco identificado nesta sessão
          </div>
        </label>
      </div>

      {/* Observações privadas */}
      <Field label="OBSERVAÇÕES PRIVADAS (não compartilhadas)">
        <textarea style={{ ...ta, minHeight: 70 }} value={form.observacoes_privadas || ''}
          placeholder="Anotações clínicas confidenciais..."
          onChange={e => setForm(f => ({ ...f, observacoes_privadas: e.target.value }))} />
      </Field>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={onSave} disabled={saving}>
          {saving ? 'Salvando…' : editMode ? 'Salvar Alterações' : 'Registrar Sessão'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function PagePsicologia({ profile }) {
  const clinicaId = profile?.clinica_id

  /* ─── State ─── */
  const [tab, setTab] = useState(0)
  const [sessoes, setSessoes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modals
  const [modal, setModal] = useState(null)   // 'new' | 'edit' | 'soap' | 'history'
  const [selected, setSelected] = useState(null)
  const [historyPaciente, setHistoryPaciente] = useState(null)

  // Form
  const [form, setForm] = useState({})

  // Toast
  const [toast, setToast] = useState('')

  // Search
  const [busca, setBusca] = useState('')

  /* ─── Load ─── */
  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [{ data: sess }, { data: pacs }] = await Promise.all([
      supabase
        .from('sessoes_psico')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false }),
      supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .eq('clinica_id', clinicaId)
        .order('nome'),
    ])
    setSessoes(sess || [])
    setPacientes(pacs || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* ─── Patient map ─── */
  const pacMap = {}
  pacientes.forEach(p => { pacMap[p.id] = p })

  /* ─── SOAP save ─── */
  async function saveSession() {
    if (!form.paciente_id || !form.psicologo || !form.data) {
      alert('Preencha paciente, psicólogo e data.')
      return
    }
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      psicologo: form.psicologo,
      data: form.data,
      numero_sessao: form.numero_sessao ? parseInt(form.numero_sessao) : null,
      subjetivo: form.subjetivo || '',
      objetivo: form.objetivo || '',
      avaliacao: form.avaliacao || '',
      plano: form.plano || '',
      humor: form.humor || 'regular',
      risco_suicidio: !!form.risco_suicidio,
      observacoes_privadas: form.observacoes_privadas || '',
    }
    if (modal === 'edit' && selected?.id) {
      await supabase.from('sessoes_psico').update(payload).eq('id', selected.id)
    } else {
      await supabase.from('sessoes_psico').insert(payload)
    }
    setSaving(false)
    setModal(null)
    setForm({})
    setSelected(null)
    load()
  }

  /* ─── KPIs ─── */
  const todayStr = today()
  const weekEnd = addDays(7)

  // Unique patients in acompanhamento
  const pacientesAtivos = [...new Set(sessoes.map(s => s.paciente_id))].length

  // Sessions today
  const sessoesHoje = sessoes.filter(s => s.data === todayStr).length

  // Sessions this week (from today to +7)
  const sessoesSemana = sessoes.filter(s => s.data >= todayStr && s.data <= weekEnd).length

  // Latest session per patient
  const latestByPac = {}
  sessoes.forEach(s => {
    if (!latestByPac[s.paciente_id] || s.data > latestByPac[s.paciente_id].data) {
      latestByPac[s.paciente_id] = s
    }
  })

  // Risk alerts
  const riskPacientes = Object.values(latestByPac).filter(s => s.risco_suicidio)
  const alertCount = riskPacientes.length

  /* ─── Filtered sessions for tab 0 ─── */
  const filtered = sessoes.filter(s => {
    if (!busca) return true
    const pac = pacMap[s.paciente_id]
    const nome = pac?.nome?.toLowerCase() || ''
    return nome.includes(busca.toLowerCase()) || (s.psicologo || '').toLowerCase().includes(busca.toLowerCase())
  })

  /* ─── Patient evolution data for tab 1 ─── */
  const patientEvolution = Object.keys(latestByPac).map(pacId => {
    const pac = pacMap[pacId]
    if (!pac) return null
    const all = sessoes.filter(s => s.paciente_id === pacId).sort((a, b) => a.data > b.data ? 1 : -1)
    const last5 = all.slice(-5)
    const latest = latestByPac[pacId]
    return {
      paciente: pac,
      latest,
      all,
      last5,
      sessionCount: all.length,
      psicologo: latest.psicologo,
      lastDate: latest.data,
      hasRisk: !!latest.risco_suicidio,
    }
  }).filter(Boolean).sort((a, b) => a.paciente.nome.localeCompare(b.paciente.nome))

  /* ─── Agenda tab data ─── */
  const upcomingSessions = sessoes.filter(s => s.data >= todayStr && s.data <= weekEnd)
    .sort((a, b) => a.data > b.data ? 1 : -1)

  const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14)
  const cutoff14Str = cutoff14.toISOString().split('T')[0]
  const droppedOut = Object.values(latestByPac).filter(s => s.data < cutoff14Str)
  const droppedOutWithPac = droppedOut.map(s => ({
    sessao: s, paciente: pacMap[s.paciente_id],
  })).filter(x => x.paciente)

  /* ─── Render ─── */
  return (
    <div style={{ padding: '24px', fontFamily: 'inherit', color: L.t1 }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(32px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: L.t1 }}>Psicologia</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: L.t4 }}>Gestão de sessões e notas SOAP</p>
        </div>
        <button style={btnPrimary} onClick={() => { setForm({ data: today(), humor: 'regular' }); setModal('new') }}>
          + Nova Sessão
        </button>
      </div>

      {/* ── Risk alert banner ── */}
      {alertCount > 0 && (
        <div style={{
          background: L.redBg, border: `1.5px solid ${L.redBd}`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: L.red, fontSize: 14 }}>
              Alerta: Risco de Suicídio — {alertCount} paciente{alertCount > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: L.red, marginTop: 4 }}>
              {riskPacientes.map(s => pacMap[s.paciente_id]?.nome).filter(Boolean).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pacientes em acompanhamento', value: loading ? '…' : pacientesAtivos, color: L.teal },
          { label: 'Sessões hoje', value: loading ? '…' : sessoesHoje, color: L.blue },
          { label: 'Sessões esta semana', value: loading ? '…' : sessoesSemana, color: L.purple },
          { label: 'Alertas de risco', value: loading ? '…' : alertCount, color: alertCount > 0 ? L.red : L.green },
        ].map((k, i) => (
          <div key={i} style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '18px 20px',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${L.line}`, marginBottom: 24 }}>
        {['Sessões', 'Pacientes & Evolução', 'Agenda & Lembretes'].map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 20px', fontSize: 13, fontWeight: tab === i ? 700 : 400,
            color: tab === i ? L.teal : L.t3,
            borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* ══ TAB 0: SESSÕES ══ */}
      {tab === 0 && (
        <div>
          <input
            style={{ ...inp, maxWidth: 320, marginBottom: 16 }}
            placeholder="Buscar paciente ou psicólogo…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: L.t4 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
              Nenhuma sessão encontrada
            </div>
          ) : (
            <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: L.hover }}>
                    {['Paciente', 'Psicólogo(a)', 'Data', 'Sessão', 'Humor', 'Risco', 'Ações'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const pac = pacMap[s.paciente_id]
                    const age = calcAge(pac?.data_nascimento)
                    const h = humorCfg(s.humor)
                    return (
                      <tr key={s.id} style={{
                        borderTop: `1px solid ${L.lineSoft}`,
                        background: idx % 2 === 0 ? 'transparent' : L.hover,
                      }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{pac?.nome || '–'}</div>
                          <div style={{ fontSize: 11, color: L.t4 }}>{age !== '–' ? `${age} anos` : ''}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: L.t2 }}>{s.psicologo || '–'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: L.t2 }}>{fmtDate(s.data)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: L.t2, textAlign: 'center' }}>
                          {s.numero_sessao ? `#${s.numero_sessao}` : '–'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: h.bg, color: h.color,
                            borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                          }}>
                            {h.emoji} {h.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {s.risco_suicidio && (
                            <span style={{
                              background: L.redBg, color: L.red,
                              borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                            }}>⚠ Risco</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              style={{ ...btnGhost, padding: '5px 12px', fontSize: 12 }}
                              onClick={() => { setSelected(s); setModal('soap') }}
                            >Ver SOAP</button>
                            <button
                              style={{ ...btnGhost, padding: '5px 12px', fontSize: 12 }}
                              onClick={() => {
                                setSelected(s)
                                setForm({
                                  paciente_id: s.paciente_id,
                                  psicologo: s.psicologo,
                                  data: s.data,
                                  numero_sessao: s.numero_sessao,
                                  subjetivo: s.subjetivo,
                                  objetivo: s.objetivo,
                                  avaliacao: s.avaliacao,
                                  plano: s.plano,
                                  humor: s.humor,
                                  risco_suicidio: s.risco_suicidio,
                                  observacoes_privadas: s.observacoes_privadas,
                                })
                                setModal('edit')
                              }}
                            >Editar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 1: PACIENTES & EVOLUÇÃO ══ */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>Carregando…</div>
          ) : patientEvolution.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: L.t4 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
              Nenhum paciente com sessões registradas
            </div>
          ) : patientEvolution.map(pe => (
            <PatientCard
              key={pe.paciente.id}
              pe={pe}
              isExpanded={historyPaciente === pe.paciente.id}
              onToggle={() => setHistoryPaciente(prev => prev === pe.paciente.id ? null : pe.paciente.id)}
            />
          ))}
        </div>
      )}

      {/* ══ TAB 2: AGENDA & LEMBRETES ══ */}
      {tab === 2 && (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: L.t1, margin: '0 0 14px' }}>
              Próximas sessões — 7 dias
            </h3>
            {upcomingSessions.length === 0 ? (
              <div style={{
                background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
                padding: '24px', textAlign: 'center', color: L.t4, fontSize: 13,
              }}>Nenhuma sessão agendada nos próximos 7 dias.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingSessions.map(s => {
                  const pac = pacMap[s.paciente_id]
                  const h = humorCfg(s.humor)
                  return (
                    <div key={s.id} style={{
                      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
                      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{
                        background: L.tealBg, color: L.teal, borderRadius: 8,
                        padding: '6px 12px', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                      }}>{fmtDate(s.data)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{pac?.nome || '–'}</div>
                        <div style={{ fontSize: 11, color: L.t4 }}>{s.psicologo} · Sessão #{s.numero_sessao || '?'}</div>
                      </div>
                      <span style={{
                        background: h.bg, color: h.color, borderRadius: 20,
                        padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>{h.emoji} {h.label}</span>
                      {s.risco_suicidio && (
                        <span style={{ background: L.redBg, color: L.red, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                          ⚠ Risco
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: L.t1, margin: '0 0 6px' }}>
              Possíveis desistências — sem sessão há +14 dias
            </h3>
            <p style={{ fontSize: 12, color: L.t4, margin: '0 0 14px' }}>
              Pacientes que não tiveram sessão registrada nos últimos 14 dias.
            </p>
            {droppedOutWithPac.length === 0 ? (
              <div style={{
                background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
                padding: '24px', textAlign: 'center', color: L.t4, fontSize: 13,
              }}>Todos os pacientes tiveram sessão recente. ✓</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {droppedOutWithPac.map(({ sessao, paciente }) => (
                  <div key={sessao.id} style={{
                    background: L.yellowBg, border: `1px solid ${L.yellowBd}`, borderRadius: 10,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span style={{ fontSize: 20 }}>📅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{paciente.nome}</div>
                      <div style={{ fontSize: 11, color: L.t4 }}>
                        Última sessão: {fmtDate(sessao.data)} · {sessao.psicologo}
                      </div>
                    </div>
                    <button
                      style={{ ...btnGhost, fontSize: 12, padding: '6px 14px' }}
                      onClick={() => setToast(`Contato registrado para ${paciente.nome}`)}
                    >
                      Contatar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: Nova / Editar Sessão ══ */}
      {(modal === 'new' || modal === 'edit') && (
        <BottomSheet
          title={modal === 'edit' ? 'Editar Sessão' : 'Nova Sessão'}
          onClose={() => { setModal(null); setForm({}); setSelected(null) }}
          wide
        >
          <SessionForm
            form={form}
            setForm={setForm}
            pacientes={pacientes}
            onSave={saveSession}
            saving={saving}
            onClose={() => { setModal(null); setForm({}); setSelected(null) }}
            editMode={modal === 'edit'}
          />
        </BottomSheet>
      )}

      {/* ══ MODAL: Ver SOAP ══ */}
      {modal === 'soap' && selected && (
        <BottomSheet
          title={`SOAP — ${pacMap[selected.paciente_id]?.nome || 'Paciente'} · ${fmtDate(selected.data)}`}
          onClose={() => { setModal(null); setSelected(null) }}
          wide
        >
          <div>
            {/* Header info */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20,
              background: L.surface, borderRadius: 10, padding: '14px 16px',
            }}>
              <div>
                <div style={lbl}>PSICÓLOGO(A)</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.psicologo || '–'}</div>
              </div>
              <div>
                <div style={lbl}>DATA</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(selected.data)}</div>
              </div>
              <div>
                <div style={lbl}>SESSÃO Nº</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.numero_sessao ? `#${selected.numero_sessao}` : '–'}</div>
              </div>
            </div>

            {/* Humor */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={lbl}>HUMOR:</div>
              {(() => {
                const h = humorCfg(selected.humor)
                return (
                  <span style={{
                    background: h.bg, color: h.color, borderRadius: 20,
                    padding: '4px 12px', fontSize: 13, fontWeight: 700,
                  }}>{h.emoji} {h.label}</span>
                )
              })()}
              {selected.risco_suicidio && (
                <span style={{ background: L.redBg, color: L.red, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  ⚠ RISCO DE SUICÍDIO
                </span>
              )}
            </div>

            {/* SOAP sections */}
            <SoapSection letter="S" label="Subjetivo — Relato do paciente" text={selected.subjetivo} borderColor={L.blue} />
            <SoapSection letter="O" label="Objetivo — Comportamentos observáveis" text={selected.objetivo} borderColor={L.green} />
            <SoapSection letter="A" label="Avaliação — Impressão clínica" text={selected.avaliacao} borderColor={L.yellow} />
            <SoapSection letter="P" label="Plano — Plano terapêutico" text={selected.plano} borderColor={L.teal} />

            {selected.observacoes_privadas && (
              <div style={{
                borderLeft: `4px solid ${L.purple}`, borderRadius: '0 8px 8px 0',
                background: L.purpleBg, padding: '12px 16px', marginTop: 4,
              }}>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: L.t4, marginBottom: 4 }}>
                  [PRIVADO] Observações confidenciais
                </div>
                <div style={{ fontSize: 13, color: L.t1, whiteSpace: 'pre-wrap' }}>{selected.observacoes_privadas}</div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  )
}

/* ─── Patient Evolution Card (Tab 1) ─── */
function PatientCard({ pe, isExpanded, onToggle }) {
  const { paciente, latest, all, last5, sessionCount, psicologo, lastDate, hasRisk } = pe

  return (
    <div style={{
      background: L.surface, border: `1.5px solid ${hasRisk ? L.redBd : L.line}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 20px', cursor: 'pointer',
      }} onClick={onToggle}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: hasRisk ? L.redBg : L.tealBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {hasRisk ? '⚠' : '🧠'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>{paciente.nome}</span>
            {paciente.data_nascimento && (
              <span style={{ fontSize: 11, color: L.t4 }}>{calcAge(paciente.data_nascimento)} anos</span>
            )}
            {hasRisk && (
              <span style={{
                background: L.redBg, color: L.red, borderRadius: 20,
                padding: '2px 8px', fontSize: 11, fontWeight: 700,
              }}>⚠ Risco</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: L.t4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span>Psicólogo: {psicologo}</span>
            <span>{sessionCount} sessão{sessionCount !== 1 ? 'ões' : ''}</span>
            <span>Última: {fmtDate(lastDate)}</span>
          </div>
        </div>

        {/* Humor trend */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>últimas sessões</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {last5.map((s, i) => (
              <HumorDot key={i} humor={s.humor} title={`${fmtDate(s.data)}: ${humorCfg(s.humor).label}`} />
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <div style={{
          fontSize: 18, color: L.t3, marginLeft: 8,
          transform: isExpanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</div>
      </div>

      {/* Expanded history */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${L.line}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: L.t3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            HISTÓRICO COMPLETO — {all.length} sessão{all.length !== 1 ? 'ões' : ''}
          </div>
          {[...all].reverse().map(s => {
            const h = humorCfg(s.humor)
            return (
              <div key={s.id} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 10,
                padding: '14px 16px',
              }}>
                {/* Session meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: L.teal }}>{fmtDate(s.data)}</span>
                  <span style={{ fontSize: 11, color: L.t4 }}>Sessão #{s.numero_sessao || '?'}</span>
                  <span style={{ background: h.bg, color: h.color, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {h.emoji} {h.label}
                  </span>
                  {s.risco_suicidio && (
                    <span style={{ background: L.redBg, color: L.red, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>⚠ Risco</span>
                  )}
                </div>
                {/* Compact SOAP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { letter: 'S', label: 'Subjetivo', text: s.subjetivo, color: L.blue },
                    { letter: 'O', label: 'Objetivo', text: s.objetivo, color: L.green },
                    { letter: 'A', label: 'Avaliação', text: s.avaliacao, color: L.yellow },
                    { letter: 'P', label: 'Plano', text: s.plano, color: L.teal },
                  ].map(sec => (
                    <div key={sec.letter} style={{
                      borderLeft: `3px solid ${sec.color}`, borderRadius: '0 6px 6px 0',
                      background: L.surface, padding: '8px 12px',
                    }}>
                      <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: L.t4, marginBottom: 3 }}>
                        [{sec.letter}] {sec.label}
                      </div>
                      <div style={{ fontSize: 12, color: L.t1, whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 64, overflow: 'hidden' }}>
                        {sec.text || <span style={{ color: L.t5, fontStyle: 'italic' }}>–</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
