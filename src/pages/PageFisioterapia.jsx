import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─────────────────────────── helpers ─────────────────────────── */
function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function painColor(v) {
  if (v == null || v === '') return L.t3
  const n = Number(v)
  if (n < 3) return L.green
  if (n <= 6) return L.yellow
  return L.red
}
function painBg(v) {
  if (v == null || v === '') return L.surface
  const n = Number(v)
  if (n < 3) return L.greenBg
  if (n <= 6) return L.yellowBg
  return L.redBg
}

/* ─────────────────────────── shared UI ─────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px'
      }}>{label}</label>
      {children}
    </div>
  )
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', boxShadow: L.shadow, flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.teal, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function BottomSheet({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg,
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: wide ? 780 : 580,
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</span>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────── pain chart (SVG) ─────────────────────── */
function PainChart({ sessions }) {
  const W = 600, H = 180, PL = 32, PR = 16, PT = 16, PB = 36
  const gW = W - PL - PR
  const gH = H - PT - PB

  if (!sessions || sessions.length === 0) return (
    <div style={{ textAlign: 'center', color: L.t4, fontSize: 13, padding: 32 }}>Nenhuma sessão registrada ainda</div>
  )

  const pts = sessions.slice().sort((a, b) => a.numero_sessao - b.numero_sessao)
  const n = pts.length
  const xs = i => PL + (n === 1 ? gW / 2 : (i / (n - 1)) * gW)
  const ys = v => PT + gH - (v / 10) * gH

  const preLine = pts.map((s, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(s.dor_pre ?? 0)}`).join(' ')
  const posLine = pts.map((s, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(s.dor_pos ?? 0)}`).join(' ')

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 280, display: 'block' }}>
        {/* grid lines */}
        {[0, 2, 4, 6, 8, 10].map(v => (
          <g key={v}>
            <line x1={PL} y1={ys(v)} x2={W - PR} y2={ys(v)}
              stroke={L.line} strokeWidth={0.8} strokeDasharray="4 4" />
            <text x={PL - 6} y={ys(v) + 4} fontSize={9} fill={L.t4} textAnchor="end">{v}</text>
          </g>
        ))}
        {/* x-axis labels */}
        {pts.map((s, i) => (
          <text key={i} x={xs(i)} y={H - 6} fontSize={9} fill={L.t4} textAnchor="middle">
            S{s.numero_sessao}
          </text>
        ))}
        {/* lines */}
        <path d={preLine} fill="none" stroke={L.red} strokeWidth={2} strokeLinejoin="round" />
        <path d={posLine} fill="none" stroke={L.blue} strokeWidth={2} strokeLinejoin="round" />
        {/* dots */}
        {pts.map((s, i) => (
          <g key={i}>
            <circle cx={xs(i)} cy={ys(s.dor_pre ?? 0)} r={4} fill={L.red} />
            <circle cx={xs(i)} cy={ys(s.dor_pos ?? 0)} r={4} fill={L.blue} />
          </g>
        ))}
      </svg>
      {/* legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: L.t3 }}>
          <div style={{ width: 20, height: 3, background: L.red, borderRadius: 2 }} />
          Dor pré-sessão
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: L.t3 }}>
          <div style={{ width: 20, height: 3, background: L.blue, borderRadius: 2 }} />
          Dor pós-sessão
        </div>
      </div>
    </div>
  )
}

/* ──────────────────── avaliacao form ──────────────────── */
function AvaliacaoForm({ pacientes, clinicaId, onSaved, onClose }) {
  const [form, setForm] = useState({
    paciente_id: '', fisioterapeuta: '', data: todayStr(),
    diagnostico: '', objetivo: '', queixa_principal: '',
    historico_clinico: '', mobilidade: '', forca_muscular: '',
    postura: '', dor_escala: 5, observacoes: '', total_sessoes_previstas: 10,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.paciente_id || !form.fisioterapeuta || !form.data) return
    setSaving(true)
    const { error } = await supabase.from('avaliacoes_fisio').insert({
      ...form, clinica_id: clinicaId,
      dor_escala: Number(form.dor_escala),
      total_sessoes_previstas: Number(form.total_sessoes_previstas),
    })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
    else alert('Erro ao salvar: ' + error.message)
  }

  const grd2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="PACIENTE *">
        <select value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)} style={inp}>
          <option value="">Selecione…</option>
          {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <div style={grd2}>
        <Field label="FISIOTERAPEUTA *">
          <input value={form.fisioterapeuta} onChange={e => set('fisioterapeuta', e.target.value)} style={inp} placeholder="Nome do fisioterapeuta" />
        </Field>
        <Field label="DATA *">
          <input type="date" value={form.data} onChange={e => set('data', e.target.value)} style={inp} />
        </Field>
      </div>
      <Field label="QUEIXA PRINCIPAL">
        <textarea value={form.queixa_principal} onChange={e => set('queixa_principal', e.target.value)} style={ta} placeholder="Descreva a queixa principal…" />
      </Field>
      <Field label="DIAGNÓSTICO">
        <textarea value={form.diagnostico} onChange={e => set('diagnostico', e.target.value)} style={ta} placeholder="Diagnóstico clínico/funcional…" />
      </Field>
      <Field label="OBJETIVO DO TRATAMENTO">
        <textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)} style={ta} placeholder="Objetivos terapêuticos…" />
      </Field>
      <Field label="HISTÓRICO CLÍNICO">
        <textarea value={form.historico_clinico} onChange={e => set('historico_clinico', e.target.value)} style={ta} placeholder="Histórico de saúde relevante…" />
      </Field>
      <div style={grd2}>
        <Field label="MOBILIDADE">
          <input value={form.mobilidade} onChange={e => set('mobilidade', e.target.value)} style={inp} placeholder="Ex: ADM reduzida em flexão" />
        </Field>
        <Field label="FORÇA MUSCULAR">
          <input value={form.forca_muscular} onChange={e => set('forca_muscular', e.target.value)} style={inp} placeholder="Ex: Grau 3 MMII" />
        </Field>
      </div>
      <Field label="POSTURA">
        <input value={form.postura} onChange={e => set('postura', e.target.value)} style={inp} placeholder="Avaliação postural…" />
      </Field>
      <div style={grd2}>
        <Field label={`ESCALA DE DOR INICIAL: ${form.dor_escala}/10`}>
          <input type="range" min={0} max={10} value={form.dor_escala}
            onChange={e => set('dor_escala', e.target.value)}
            style={{ width: '100%', accentColor: painColor(form.dor_escala) }} />
        </Field>
        <Field label="TOTAL DE SESSÕES PREVISTAS">
          <input type="number" min={1} max={200} value={form.total_sessoes_previstas}
            onChange={e => set('total_sessoes_previstas', e.target.value)} style={inp} />
        </Field>
      </div>
      <Field label="OBSERVAÇÕES">
        <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} style={ta} placeholder="Observações gerais…" />
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button onClick={onClose} style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          border: `1.5px solid ${L.line}`, color: L.t2, background: 'transparent', cursor: 'pointer'
        }}>Cancelar</button>
        <button onClick={save} disabled={saving} style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: L.teal, color: L.white, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1
        }}>{saving ? 'Salvando…' : 'Salvar Avaliação'}</button>
      </div>
    </div>
  )
}

/* ──────────────────── sessao form ──────────────────── */
function SessaoForm({ pacientes, avaliacoes, clinicaId, prePatient, preSessoes, onSaved, onClose }) {
  const defaultPac = prePatient || ''
  const filteredAvals = useMemo(() => avaliacoes.filter(a => a.paciente_id === defaultPac), [avaliacoes, defaultPac])
  const firstAval = filteredAvals[0]?.id || ''

  const nextSessao = useMemo(() => {
    const ps = (preSessoes || []).filter(s => s.paciente_id === defaultPac)
    return ps.length > 0 ? Math.max(...ps.map(s => s.numero_sessao)) + 1 : 1
  }, [preSessoes, defaultPac])

  const [form, setForm] = useState({
    paciente_id: defaultPac,
    avaliacao_id: firstAval,
    fisioterapeuta: '',
    data: todayStr(),
    numero_sessao: nextSessao,
    tecnicas_usadas: '',
    dor_pre: 5,
    dor_pos: 3,
    exercicios: '',
    evolucao: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When paciente changes, update avaliacao options and numero_sessao
  useEffect(() => {
    const avals = avaliacoes.filter(a => a.paciente_id === form.paciente_id)
    const ns = (preSessoes || []).filter(s => s.paciente_id === form.paciente_id)
    setForm(f => ({
      ...f,
      avaliacao_id: avals[0]?.id || '',
      numero_sessao: ns.length > 0 ? Math.max(...ns.map(s => s.numero_sessao)) + 1 : 1
    }))
  }, [form.paciente_id])

  const curAvals = avaliacoes.filter(a => a.paciente_id === form.paciente_id)

  async function save() {
    if (!form.paciente_id || !form.fisioterapeuta || !form.data) return
    setSaving(true)
    const { error } = await supabase.from('sessoes_fisio').insert({
      ...form, clinica_id: clinicaId,
      dor_pre: Number(form.dor_pre),
      dor_pos: Number(form.dor_pos),
      numero_sessao: Number(form.numero_sessao),
      avaliacao_id: form.avaliacao_id || null,
    })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
    else alert('Erro ao salvar: ' + error.message)
  }

  const grd2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={grd2}>
        <Field label="PACIENTE *">
          <select value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)} style={inp}>
            <option value="">Selecione…</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
        <Field label="AVALIAÇÃO VINCULADA">
          <select value={form.avaliacao_id} onChange={e => set('avaliacao_id', e.target.value)} style={inp}>
            <option value="">Sem avaliação</option>
            {curAvals.map(a => (
              <option key={a.id} value={a.id}>{fmtDate(a.data)} — {(a.diagnostico || '').slice(0, 30)}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={grd2}>
        <Field label="FISIOTERAPEUTA *">
          <input value={form.fisioterapeuta} onChange={e => set('fisioterapeuta', e.target.value)} style={inp} placeholder="Nome do fisioterapeuta" />
        </Field>
        <Field label="DATA *">
          <input type="date" value={form.data} onChange={e => set('data', e.target.value)} style={inp} />
        </Field>
      </div>
      <Field label="NÚMERO DA SESSÃO">
        <input type="number" min={1} value={form.numero_sessao} onChange={e => set('numero_sessao', e.target.value)} style={inp} />
      </Field>
      <Field label="TÉCNICAS USADAS">
        <textarea value={form.tecnicas_usadas} onChange={e => set('tecnicas_usadas', e.target.value)} style={ta} placeholder="Ex: TENS, ultrassom, RPG…" />
      </Field>
      <div style={grd2}>
        <Field label={`DOR PRÉ-SESSÃO: ${form.dor_pre}/10`}>
          <input type="range" min={0} max={10} value={form.dor_pre}
            onChange={e => set('dor_pre', e.target.value)}
            style={{ width: '100%', accentColor: painColor(form.dor_pre) }} />
          <div style={{ fontSize: 11, color: painColor(form.dor_pre), marginTop: 2 }}>{form.dor_pre}/10</div>
        </Field>
        <Field label={`DOR PÓS-SESSÃO: ${form.dor_pos}/10`}>
          <input type="range" min={0} max={10} value={form.dor_pos}
            onChange={e => set('dor_pos', e.target.value)}
            style={{ width: '100%', accentColor: painColor(form.dor_pos) }} />
          <div style={{ fontSize: 11, color: painColor(form.dor_pos), marginTop: 2 }}>{form.dor_pos}/10</div>
        </Field>
      </div>
      <Field label="EXERCÍCIOS REALIZADOS">
        <textarea value={form.exercicios} onChange={e => set('exercicios', e.target.value)} style={ta} placeholder="Descreva os exercícios realizados…" />
      </Field>
      <Field label="EVOLUÇÃO / ANOTAÇÕES">
        <textarea value={form.evolucao} onChange={e => set('evolucao', e.target.value)} style={{ ...ta, minHeight: 90 }} placeholder="Como foi a sessão? Evolução observada…" />
      </Field>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button onClick={onClose} style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          border: `1.5px solid ${L.line}`, color: L.t2, background: 'transparent', cursor: 'pointer'
        }}>Cancelar</button>
        <button onClick={save} disabled={saving} style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: L.teal, color: L.white, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1
        }}>{saving ? 'Salvando…' : 'Registrar Sessão'}</button>
      </div>
    </div>
  )
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function PageFisioterapia({ profile }) {
  const clinicaId = profile?.clinica_id

  const [tab, setTab] = useState(0)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [showAvalModal, setShowAvalModal] = useState(false)
  const [showSessaoModal, setShowSessaoModal] = useState(false)
  const [preselectPatient, setPreselectPatient] = useState('')

  // tab 1 patient selector
  const [selectedPatient, setSelectedPatient] = useState('')

  // tab 2 in-progress tracking
  const [inProgress, setInProgress] = useState({})

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [{ data: avs }, { data: ses }, { data: pacs }] = await Promise.all([
      supabase.from('avaliacoes_fisio').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('sessoes_fisio').select('*').eq('clinica_id', clinicaId).order('data', { ascending: true }),
      supabase.from('pacientes').select('id, nome, data_nascimento').eq('clinica_id', clinicaId).order('nome'),
    ])
    setAvaliacoes(avs || [])
    setSessoes(ses || [])
    setPacientes(pacs || [])
    setLoading(false)
  }

  function openNovaSessao(patientId) {
    setPreselectPatient(patientId || '')
    setShowSessaoModal(true)
  }

  function goToEvolution(patientId) {
    setSelectedPatient(patientId)
    setTab(1)
  }

  /* ── derived data ── */
  const pacMap = useMemo(() => Object.fromEntries(pacientes.map(p => [p.id, p])), [pacientes])

  // Unique patients in avaliacoes
  const activePacIds = useMemo(() => [...new Set(avaliacoes.map(a => a.paciente_id))], [avaliacoes])

  // KPIs tab 0
  const today = todayStr()
  const sessoesHoje = sessoes.filter(s => s.data === today).length
  const weekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10)
  })()
  const sessoesSemana = sessoes.filter(s => s.data >= weekStart).length

  // "Alta dada" = patients whose done sessions >= total_sessoes_previstas
  const altaCount = useMemo(() => {
    return activePacIds.filter(pid => {
      const aval = avaliacoes.find(a => a.paciente_id === pid)
      if (!aval) return false
      const done = sessoes.filter(s => s.paciente_id === pid).length
      return aval.total_sessoes_previstas && done >= aval.total_sessoes_previstas
    }).length
  }, [activePacIds, avaliacoes, sessoes])

  // Today's sessions (tab 2)
  const todaySessions = useMemo(() => sessoes.filter(s => s.data === today), [sessoes, today])

  // Selected patient sessions (tab 1)
  const patientSessions = useMemo(() =>
    sessoes.filter(s => s.paciente_id === selectedPatient)
      .sort((a, b) => a.numero_sessao - b.numero_sessao),
    [sessoes, selectedPatient])

  const patientAvals = useMemo(() =>
    avaliacoes.filter(a => a.paciente_id === selectedPatient),
    [avaliacoes, selectedPatient])

  // Pain KPIs for selected patient
  const firstDorPre = patientSessions.length > 0 ? patientSessions[0].dor_pre : null
  const lastDorPos = patientSessions.length > 0 ? patientSessions[patientSessions.length - 1].dor_pos : null
  const melhora = firstDorPre > 0 && lastDorPos != null
    ? Math.round(((firstDorPre - lastDorPos) / firstDorPre) * 100) : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ width: 32, height: 32, border: `3px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: L.t4 }}>Carregando fisioterapia…</div>
    </div>
  )

  /* ── tabs ── */
  const TABS = ['Pacientes em Tratamento', 'Sessões & Evolução', 'Agenda do Dia']

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Fisioterapia</h1>
          <div style={{ fontSize: 13, color: L.t3, marginTop: 2 }}>Avaliações, sessões e evolução dos pacientes</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setPreselectPatient(''); setShowSessaoModal(true) }} style={{
            padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: `1.5px solid ${L.line}`, color: L.t2, background: L.bg, cursor: 'pointer'
          }}>+ Registrar Sessão</button>
          <button onClick={() => setShowAvalModal(true)} style={{
            padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
          }}>+ Nova Avaliação</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${L.line}`, marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 600 : 400,
            color: tab === i ? L.teal : L.t3, background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
            marginBottom: -2, borderRadius: '6px 6px 0 0',
            transition: 'color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* ════════════════ TAB 0 — Pacientes em Tratamento ════════════════ */}
      {tab === 0 && (
        <div style={{ animation: 'up 0.25s ease' }}>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <KPI label="PACIENTES ATIVOS" value={activePacIds.length} />
            <KPI label="SESSÕES HOJE" value={sessoesHoje} />
            <KPI label="SESSÕES ESTA SEMANA" value={sessoesSemana} />
            <KPI label="ALTA DADA" value={altaCount} color={L.green} />
          </div>

          {activePacIds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: L.t4, fontSize: 14 }}>
              Nenhum paciente em tratamento.<br />
              <button onClick={() => setShowAvalModal(true)} style={{
                marginTop: 12, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
              }}>+ Nova Avaliação</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {activePacIds.map(pid => {
                const pac = pacMap[pid]
                const aval = avaliacoes.find(a => a.paciente_id === pid)
                const patSess = sessoes.filter(s => s.paciente_id === pid)
                const done = patSess.length
                const planned = aval?.total_sessoes_previstas || 0
                const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0
                const initDor = patSess.length > 0 ? patSess[0].dor_pre : (aval?.dor_escala ?? null)
                const lastDor = patSess.length > 0 ? patSess[patSess.length - 1].dor_pos : null
                const isAlta = planned > 0 && done >= planned

                return (
                  <div key={pid} style={{
                    background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                    boxShadow: L.shadow, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
                    opacity: isAlta ? 0.75 : 1,
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{pac?.nome || '—'}</div>
                        <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                          {pac?.data_nascimento ? `${calcAge(pac.data_nascimento)} anos` : ''}
                        </div>
                      </div>
                      {isAlta && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: L.green, background: L.greenBg,
                          border: `1px solid ${L.greenBd}`, borderRadius: 6, padding: '2px 8px'
                        }}>ALTA</span>
                      )}
                    </div>

                    {/* Diagnosis */}
                    {aval?.diagnostico && (
                      <div style={{ fontSize: 12, color: L.t2, lineHeight: 1.5 }}>
                        <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>DIAGNÓSTICO </span><br />
                        {aval.diagnostico.length > 80 ? aval.diagnostico.slice(0, 80) + '…' : aval.diagnostico}
                      </div>
                    )}

                    {/* Physiotherapist */}
                    {aval?.fisioterapeuta && (
                      <div style={{ fontSize: 12, color: L.t3 }}>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: L.t4 }}>FISIO </span>
                        {aval.fisioterapeuta}
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>SESSÕES</span>
                        <span>{done}/{planned}</span>
                      </div>
                      <div style={{ height: 6, background: L.line, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: 4,
                          background: isAlta ? L.green : L.teal, transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: L.t4, marginTop: 3, textAlign: 'right' }}>{pct}%</div>
                    </div>

                    {/* Pain scale */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        flex: 1, borderRadius: 8, padding: '8px 10px',
                        background: painBg(initDor), textAlign: 'center',
                        border: `1px solid ${L.line}`
                      }}>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>DOR INICIAL</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: painColor(initDor) }}>{initDor ?? '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', color: L.t4, fontSize: 16 }}>→</div>
                      <div style={{
                        flex: 1, borderRadius: 8, padding: '8px 10px',
                        background: painBg(lastDor), textAlign: 'center',
                        border: `1px solid ${L.line}`
                      }}>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>DOR ATUAL</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: painColor(lastDor) }}>{lastDor ?? '—'}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={() => goToEvolution(pid)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        border: `1.5px solid ${L.teal}`, color: L.teal, background: L.tealBg, cursor: 'pointer'
                      }}>Ver Evolução</button>
                      <button onClick={() => openNovaSessao(pid)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
                      }}>Nova Sessão</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAB 1 — Sessões & Evolução ════════════════ */}
      {tab === 1 && (
        <div style={{ animation: 'up 0.25s ease' }}>
          {/* Patient selector */}
          <div style={{ marginBottom: 20 }}>
            <Field label="SELECIONE O PACIENTE">
              <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} style={{ ...inp, maxWidth: 380 }}>
                <option value="">Selecione um paciente…</option>
                {activePacIds.map(pid => (
                  <option key={pid} value={pid}>{pacMap[pid]?.nome || pid}</option>
                ))}
              </select>
            </Field>
          </div>

          {!selectedPatient ? (
            <div style={{ textAlign: 'center', color: L.t4, padding: 60, fontSize: 14 }}>
              Selecione um paciente para ver sua evolução
            </div>
          ) : (
            <>
              {/* Mini KPIs */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <KPI label="SESSÕES REALIZADAS" value={patientSessions.length} />
                <KPI label="DOR INICIAL" value={firstDorPre ?? '—'} color={painColor(firstDorPre)} sub="pré 1ª sessão" />
                <KPI label="DOR ATUAL" value={lastDorPos ?? '—'} color={painColor(lastDorPos)} sub="pós última sessão" />
                <KPI label="MELHORA" value={melhora != null ? `${melhora}%` : '—'} color={melhora > 0 ? L.green : L.t3} />
              </div>

              {/* Pain chart */}
              <div style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                boxShadow: L.shadow, padding: 20, marginBottom: 24
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>Evolução da Dor</div>
                <PainChart sessions={patientSessions} />
              </div>

              {/* Session timeline */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>
                  Linha do Tempo das Sessões
                </div>
                <button onClick={() => openNovaSessao(selectedPatient)} style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
                }}>+ Registrar Sessão</button>
              </div>

              {patientSessions.length === 0 ? (
                <div style={{ textAlign: 'center', color: L.t4, fontSize: 13, padding: 32 }}>Nenhuma sessão registrada para este paciente.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {patientSessions.slice().reverse().map(s => (
                    <div key={s.id} style={{
                      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                      boxShadow: L.shadow, padding: '16px 20px',
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 16px', alignItems: 'start'
                    }}>
                      {/* Session badge */}
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: L.tealBg,
                        border: `2px solid ${L.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14, color: L.teal, flexShrink: 0
                      }}>S{s.numero_sessao}</div>

                      {/* Content */}
                      <div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>Sessão {s.numero_sessao}</span>
                          <span style={{ fontSize: 12, color: L.t3 }}>{fmtDate(s.data)}</span>
                          {s.fisioterapeuta && <span style={{ fontSize: 12, color: L.t3 }}>• {s.fisioterapeuta}</span>}
                        </div>
                        {s.tecnicas_usadas && (
                          <div style={{ fontSize: 12, color: L.t2, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>TÉCNICAS </span>
                            {s.tecnicas_usadas}
                          </div>
                        )}
                        {s.exercicios && (
                          <div style={{ fontSize: 12, color: L.t2, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>EXERCÍCIOS </span>
                            {s.exercicios}
                          </div>
                        )}
                        {s.evolucao && (
                          <div style={{ fontSize: 12, color: L.t2, fontStyle: 'italic', lineHeight: 1.5 }}>"{s.evolucao}"</div>
                        )}
                      </div>

                      {/* Pain delta */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          fontSize: 16, fontWeight: 700, color: painColor(s.dor_pre),
                          background: painBg(s.dor_pre), borderRadius: 8, padding: '4px 8px', minWidth: 36, textAlign: 'center'
                        }}>{s.dor_pre ?? '?'}</div>
                        <div style={{ fontSize: 12, color: L.t4 }}>→</div>
                        <div style={{
                          fontSize: 16, fontWeight: 700, color: painColor(s.dor_pos),
                          background: painBg(s.dor_pos), borderRadius: 8, padding: '4px 8px', minWidth: 36, textAlign: 'center'
                        }}>{s.dor_pos ?? '?'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════ TAB 2 — Agenda do Dia ════════════════ */}
      {tab === 2 && (
        <div style={{ animation: 'up 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Sessões de Hoje</div>
              <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            <button onClick={() => openNovaSessao('')} style={{
              padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
            }}>+ Registrar Sessão</button>
          </div>

          {todaySessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: 60 }}>
              Nenhuma sessão registrada para hoje.<br />
              <button onClick={() => openNovaSessao('')} style={{
                marginTop: 12, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
              }}>+ Registrar Sessão</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todaySessions.map(s => {
                const pac = pacMap[s.paciente_id]
                const ip = inProgress[s.id]
                return (
                  <div key={s.id} style={{
                    background: L.bg, border: `1px solid ${ip ? L.teal : L.line}`,
                    borderRadius: 12, boxShadow: L.shadow, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    transition: 'border-color 0.2s',
                  }}>
                    {/* Status dot */}
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                      background: ip ? L.teal : L.line,
                      boxShadow: ip ? `0 0 0 4px ${L.tealBg}` : 'none',
                      transition: 'all 0.2s'
                    }} />

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 4 }}>
                        {pac?.nome || 'Paciente desconhecido'}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: L.t3 }}>
                        {s.fisioterapeuta && <span>👤 {s.fisioterapeuta}</span>}
                        <span>Sessão Nº {s.numero_sessao}</span>
                        {ip && <span style={{ color: L.teal, fontWeight: 600 }}>● Em andamento</span>}
                      </div>
                    </div>

                    {/* Pain display */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: painColor(s.dor_pre),
                        background: painBg(s.dor_pre), borderRadius: 8, padding: '3px 9px'
                      }}>{s.dor_pre ?? '?'} → {s.dor_pos ?? '?'}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!ip ? (
                        <button onClick={() => setInProgress(p => ({ ...p, [s.id]: true }))} style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                          border: `1.5px solid ${L.teal}`, color: L.teal, background: L.tealBg, cursor: 'pointer'
                        }}>Iniciar</button>
                      ) : (
                        <button onClick={() => setInProgress(p => ({ ...p, [s.id]: false }))} style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                          border: `1.5px solid ${L.line}`, color: L.t3, background: L.surface, cursor: 'pointer'
                        }}>Pausar</button>
                      )}
                      <button onClick={() => openNovaSessao(s.paciente_id)} style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: L.teal, color: L.white, border: 'none', cursor: 'pointer'
                      }}>Registrar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════ MODALS ════════ */}
      {showAvalModal && (
        <BottomSheet title="Nova Avaliação Fisioterapêutica" onClose={() => setShowAvalModal(false)} wide>
          <AvaliacaoForm
            pacientes={pacientes}
            clinicaId={clinicaId}
            onSaved={load}
            onClose={() => setShowAvalModal(false)}
          />
        </BottomSheet>
      )}

      {showSessaoModal && (
        <BottomSheet title="Registrar Sessão de Fisioterapia" onClose={() => setShowSessaoModal(false)} wide>
          <SessaoForm
            pacientes={pacientes}
            avaliacoes={avaliacoes}
            clinicaId={clinicaId}
            prePatient={preselectPatient}
            preSessoes={sessoes}
            onSaved={load}
            onClose={() => setShowSessaoModal(false)}
          />
        </BottomSheet>
      )}
    </div>
  )
}
