import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Shared styles ─────────────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}
const ta = { ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }
const focus = e => (e.target.style.borderColor = L.teal)
const blur  = e => (e.target.style.borderColor = L.line)

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
  fontFamily: 'inherit',
}
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
  background: 'transparent', color: L.t2, cursor: 'pointer',
  border: `1px solid ${L.line}`, fontFamily: 'inherit',
}

/* ─── Field ─────────────────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

/* ─── Modal (bottom-sheet) ───────────────────────────────────────────────────── */
function Modal({ title, onClose, wide, children }) {
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
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 800 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: L.t1, color: L.white, padding: '10px 22px', borderRadius: 10,
      fontSize: 13, fontWeight: 500, zIndex: 999, animation: 'up 0.2s ease',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>{msg}</div>
  )
}

/* ─── Status badge ────────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = {
    agendada:     { label: 'Agendada',    bg: L.blueBg,  color: L.blue,  pulse: false },
    em_andamento: { label: 'Em andamento',bg: L.greenBg, color: L.green, pulse: true  },
    concluida:    { label: 'Concluída',   bg: L.surface, color: L.t3,    pulse: false },
    cancelada:    { label: 'Cancelada',   bg: L.redBg,   color: L.red,   pulse: false },
  }[status] || { label: status, bg: L.surface, color: L.t3, pulse: false }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      animation: cfg.pulse ? 'pulse 1.8s ease infinite' : 'none',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  )
}

/* ─── KPI card ────────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`,
      borderRadius: 14, padding: '18px 20px',
      boxShadow: L.shadow, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: L.t3, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

/* ─── Countdown ───────────────────────────────────────────────────────────────── */
function Countdown({ dataHora }) {
  const [mins, setMins] = useState(null)
  useEffect(() => {
    function calc() {
      const diff = Math.round((new Date(dataHora) - new Date()) / 60000)
      setMins(diff)
    }
    calc()
    const iv = setInterval(calc, 30000)
    return () => clearInterval(iv)
  }, [dataHora])

  if (mins === null) return null
  if (mins < 0) return <span style={{ fontSize: 11, color: L.red, fontWeight: 600 }}>Atrasado {Math.abs(mins)}min</span>
  if (mins === 0) return <span style={{ fontSize: 11, color: L.green, fontWeight: 600 }}>Agora!</span>
  return <span style={{ fontSize: 11, color: mins <= 5 ? L.yellow : L.t3, fontWeight: 600 }}>em {mins}min</span>
}

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */
function fmtDT(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function initials(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
}
function todayRange() {
  const s = new Date(); s.setHours(0, 0, 0, 0)
  const e = new Date(); e.setHours(23, 59, 59, 999)
  return [s.toISOString(), e.toISOString()]
}
function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function PageTelemedicina({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [teleconsultas, setTeleconsultas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // 'nova' | 'detalhe'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [detalheRow, setDetalheRow] = useState(null)
  const [filtroData, setFiltroData] = useState('')
  const autoRef = useRef(null)

  /* ── Load ── */
  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [tcs, pacs, meds] = await Promise.all([
      supabase
        .from('teleconsultas')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('data_hora', { ascending: false }),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('medicos').select('id, nome, especialidade').eq('clinica_id', clinicaId).order('nome'),
    ])
    setTeleconsultas(tcs.data || [])
    setPacientes(pacs.data || [])
    setMedicos(meds.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* ── Auto-refresh (Sala de Espera) ── */
  useEffect(() => {
    if (tab === 1) {
      autoRef.current = setInterval(load, 30000)
    } else {
      clearInterval(autoRef.current)
    }
    return () => clearInterval(autoRef.current)
  }, [tab, load])

  /* ── Helpers ── */
  function pNome(id) { return pacientes.find(p => p.id === id)?.nome || '—' }
  function mNome(id) { return medicos.find(m => m.id === id)?.nome || '—' }

  function showToast(msg) { setToast(msg) }

  async function setStatus(id, status) {
    await supabase.from('teleconsultas').update({ status }).eq('id', id)
    setTeleconsultas(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function iniciar(row) {
    await setStatus(row.id, 'em_andamento')
    if (row.link_sala) window.open(row.link_sala, '_blank')
  }

  function copiarLink(row) {
    const link = row.link_paciente || ''
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {})
    else { const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
    showToast('Link copiado!')
  }

  /* ── Nova teleconsulta ── */
  function openNova() {
    setForm({ duracao_min: 30, status: 'agendada' })
    setModal('nova')
  }

  async function salvar() {
    if (!form.paciente_id || !form.medico_id || !form.data_hora) {
      showToast('Preencha paciente, médico e data/hora.')
      return
    }
    setSaving(true)
    const uuid1 = genUUID()
    const uuid2 = genUUID()
    const link_sala = `https://meet.c4clinic.app/sala/${uuid1}`
    const link_paciente = `https://meet.c4clinic.app/paciente/${uuid2}`
    const { error } = await supabase.from('teleconsultas').insert({
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      medico_id: form.medico_id,
      data_hora: form.data_hora,
      duracao_min: Number(form.duracao_min) || 30,
      status: 'agendada',
      link_sala,
      link_paciente,
      observacoes: form.observacoes || null,
    })
    setSaving(false)
    if (!error) { setModal(null); load(); showToast('Teleconsulta agendada!') }
    else showToast('Erro ao salvar.')
  }

  /* ── KPIs ── */
  const [hoje0, hoje1] = todayRange()
  const hoje = teleconsultas.filter(t => t.data_hora >= hoje0 && t.data_hora <= hoje1)
  const kpis = {
    totalHoje: hoje.length,
    emAndamento: teleconsultas.filter(t => t.status === 'em_andamento').length,
    agendadas: teleconsultas.filter(t => t.status === 'agendada').length,
    concluidasHoje: hoje.filter(t => t.status === 'concluida').length,
  }

  /* ── Sala de espera ── */
  const espera = teleconsultas.filter(t =>
    t.status === 'agendada' &&
    t.data_hora >= hoje0 && t.data_hora <= hoje1
  ).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))

  /* ── Histórico ── */
  const historico = teleconsultas.filter(t =>
    (t.status === 'concluida' || t.status === 'cancelada') &&
    (!filtroData || t.data_hora?.startsWith(filtroData))
  )

  /* ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
        @keyframes tpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,.35); } 70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); } }
        .tc-row:hover td { background: ${L.hover} !important; }
        .tc-act-btn:hover { opacity: .82; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Telemedicina</h1>
          <p style={{ fontSize: 13, color: L.t3, margin: '3px 0 0' }}>Gestão de consultas virtuais e sala de espera</p>
        </div>
        <button style={btnPrimary} onClick={openNova}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Teleconsulta
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}` }}>
        {['Consultas Virtuais', 'Sala de Espera Virtual', 'Histórico'].map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '9px 18px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600,
            background: tab === i ? L.teal : 'transparent',
            color: tab === i ? L.white : L.t3,
            border: 'none', cursor: 'pointer', transition: 'all .15s',
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: L.t3 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${L.line}`, borderTopColor: L.teal, animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
          Carregando...
        </div>
      ) : (
        <>
          {/* ════ TAB 0 — Consultas Virtuais ════ */}
          {tab === 0 && (
            <div style={{ animation: 'up .25s ease' }}>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                <KpiCard label="Total hoje"       value={kpis.totalHoje}      icon="📅" color={L.teal}  />
                <KpiCard label="Em andamento"     value={kpis.emAndamento}    icon="🟢" color={L.green} />
                <KpiCard label="Agendadas"        value={kpis.agendadas}      icon="🔵" color={L.blue}  />
                <KpiCard label="Concluídas hoje"  value={kpis.concluidasHoje} icon="✅" color={L.t2}   />
              </div>

              {/* Table */}
              <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: L.shadow }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: L.surface }}>
                        {['Paciente','Médico','Data / Hora','Duração','Status','Ações'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: L.t3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.3px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teleconsultas.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: L.t3, fontSize: 13 }}>Nenhuma teleconsulta encontrada.</td></tr>
                      ) : teleconsultas.map((t, i) => (
                        <tr key={t.id} className="tc-row" style={{ borderTop: i > 0 ? `1px solid ${L.line}` : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t1, fontWeight: 500 }}>{pNome(t.paciente_id)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>{mNome(t.medico_id)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2, whiteSpace: 'nowrap' }}>{fmtDT(t.data_hora)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t3 }}>{t.duracao_min || '—'}min</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                              {t.status === 'agendada' && (
                                <button className="tc-act-btn" onClick={() => iniciar(t)} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px', color: L.green, borderColor: L.greenBd }}>Iniciar</button>
                              )}
                              {(t.status === 'agendada' || t.status === 'em_andamento') && (
                                <button className="tc-act-btn" onClick={() => copiarLink(t)} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px', color: L.blue, borderColor: L.blueBd }}>Enviar Link</button>
                              )}
                              {t.status === 'em_andamento' && (
                                <button className="tc-act-btn" onClick={() => setStatus(t.id, 'concluida')} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px', color: L.teal, borderColor: L.line }}>Concluir</button>
                              )}
                              {(t.status === 'agendada' || t.status === 'em_andamento') && (
                                <button className="tc-act-btn" onClick={() => setStatus(t.id, 'cancelada')} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px', color: L.red, borderColor: L.redBd }}>Cancelar</button>
                              )}
                              {(t.status === 'concluida' || t.status === 'cancelada') && (
                                <button className="tc-act-btn" onClick={() => { setDetalheRow(t); setModal('detalhe') }} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px' }}>Ver Detalhes</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 1 — Sala de Espera Virtual ════ */}
          {tab === 1 && (
            <div style={{ animation: 'up .25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: L.t3 }}>
                  {espera.length} paciente{espera.length !== 1 ? 's' : ''} aguardando hoje · atualiza automaticamente a cada 30s
                </div>
                <button style={btnGhost} onClick={load}>↻ Atualizar</button>
              </div>

              {espera.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: L.t3, fontSize: 14 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                  Nenhum paciente aguardando no momento.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {espera.map(t => (
                    <div key={t.id} style={{
                      background: L.bg, border: `1px solid ${L.line}`,
                      borderRadius: 16, padding: 20, boxShadow: L.shadow,
                      animation: 'up .25s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                          background: L.tealGrad,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: L.white, fontWeight: 700, fontSize: 16,
                        }}>{initials(pNome(t.paciente_id))}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{pNome(t.paciente_id)}</div>
                          <div style={{ fontSize: 12, color: L.t3 }}>Dr. {mNome(t.medico_id)}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: L.t2 }}>
                            {new Date(t.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <Countdown dataHora={t.data_hora} />
                        </div>
                      </div>

                      {t.observacoes && (
                        <div style={{ fontSize: 12, color: L.t3, marginBottom: 14, padding: '8px 10px', background: L.surface, borderRadius: 8 }}>
                          {t.observacoes}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => copiarLink(t)} style={{
                          flex: 1, ...btnGhost, fontSize: 12, padding: '8px 10px',
                          color: L.blue, borderColor: L.blueBd,
                        }}>📋 Chamar Paciente</button>
                        <button onClick={() => iniciar(t)} style={{
                          flex: 1, ...btnPrimary, fontSize: 12, padding: '8px 10px',
                          background: L.green,
                        }}>▶ Iniciar Consulta</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 2 — Histórico ════ */}
          {tab === 2 && (
            <div style={{ animation: 'up .25s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <Field label="Filtrar por data">
                  <input
                    type="date" value={filtroData}
                    onChange={e => setFiltroData(e.target.value)}
                    onFocus={focus} onBlur={blur}
                    style={{ ...inp, width: 180 }}
                  />
                </Field>
                {filtroData && (
                  <button style={{ ...btnGhost, marginTop: 16 }} onClick={() => setFiltroData('')}>Limpar</button>
                )}
                <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3, marginTop: 16 }}>
                  {historico.length} registro{historico.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: L.shadow }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: L.surface }}>
                        {['Paciente','Médico','Data / Hora','Duração','Status',''].map((h, i) => (
                          <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: L.t3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.3px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historico.length === 0 ? (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: L.t3, fontSize: 13 }}>Nenhum registro encontrado.</td></tr>
                      ) : historico.map((t, i) => (
                        <tr key={t.id} className="tc-row" style={{ borderTop: i > 0 ? `1px solid ${L.line}` : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t1, fontWeight: 500 }}>{pNome(t.paciente_id)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>{mNome(t.medico_id)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2, whiteSpace: 'nowrap' }}>{fmtDT(t.data_hora)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: L.t3 }}>{t.duracao_min || '—'}min</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <button className="tc-act-btn" onClick={() => { setDetalheRow(t); setModal('detalhe') }} style={{ ...btnGhost, fontSize: 11, padding: '5px 10px' }}>Ver Detalhes</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ MODAL — Nova Teleconsulta ════ */}
      {modal === 'nova' && (
        <Modal title="Nova Teleconsulta" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="PACIENTE *">
                <select
                  value={form.paciente_id || ''}
                  onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  style={inp}
                >
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="MÉDICO *">
                <select
                  value={form.medico_id || ''}
                  onChange={e => setForm(f => ({ ...f, medico_id: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  style={inp}
                >
                  <option value="">Selecione...</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` — ${m.especialidade}` : ''}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="DATA / HORA *">
                <input
                  type="datetime-local"
                  value={form.data_hora || ''}
                  onChange={e => setForm(f => ({ ...f, data_hora: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  style={inp}
                />
              </Field>
              <Field label="DURAÇÃO (MIN)">
                <input
                  type="number" min={5} max={240}
                  value={form.duracao_min ?? 30}
                  onChange={e => setForm(f => ({ ...f, duracao_min: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  style={inp}
                />
              </Field>
            </div>

            <Field label="OBSERVAÇÕES">
              <textarea
                value={form.observacoes || ''}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                onFocus={focus} onBlur={blur}
                placeholder="Informações adicionais..."
                style={ta}
              />
            </Field>

            <div style={{ background: L.tealBg, borderRadius: 10, padding: '12px 14px', fontSize: 12, color: L.teal }}>
              🔗 Os links de sala e para o paciente serão gerados automaticamente ao salvar.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setModal(null)}>Cancelar</button>
              <button
                style={{ ...btnPrimary, opacity: saving ? .6 : 1 }}
                onClick={salvar}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Agendar Teleconsulta'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════ MODAL — Detalhes ════ */}
      {modal === 'detalhe' && detalheRow && (
        <Modal title="Detalhes da Teleconsulta" onClose={() => { setModal(null); setDetalheRow(null) }} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Info label="PACIENTE"   value={pNome(detalheRow.paciente_id)} />
              <Info label="MÉDICO"     value={mNome(detalheRow.medico_id)} />
              <Info label="DATA / HORA" value={fmtDT(detalheRow.data_hora)} />
              <Info label="DURAÇÃO"    value={`${detalheRow.duracao_min || '—'} minutos`} />
              <Info label="STATUS"     value={<StatusBadge status={detalheRow.status} />} />
              <Info label="CRIADO EM"  value={fmtDT(detalheRow.criado_em)} />
            </div>

            {detalheRow.observacoes && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>OBSERVAÇÕES</label>
                <div style={{ fontSize: 13, color: L.t2, background: L.surface, borderRadius: 8, padding: '10px 14px' }}>
                  {detalheRow.observacoes}
                </div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${L.line}`, paddingTop: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>LINKS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <LinkRow label="Sala do médico" url={detalheRow.link_sala} onCopy={() => { navigator.clipboard?.writeText(detalheRow.link_sala || ''); showToast('Link copiado!') }} />
                <LinkRow label="Link do paciente" url={detalheRow.link_paciente} onCopy={() => { navigator.clipboard?.writeText(detalheRow.link_paciente || ''); showToast('Link copiado!') }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnGhost} onClick={() => { setModal(null); setDetalheRow(null) }}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

/* ─── Info row helper ────────────────────────────────────────────────────────── */
function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, letterSpacing: '.3px' }}>{label}</div>
      <div style={{ fontSize: 13, color: L.t1, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

/* ─── Link row helper ────────────────────────────────────────────────────────── */
function LinkRow({ label, url, onCopy }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: L.surface, borderRadius: 8, padding: '8px 12px' }}>
      <span style={{ fontSize: 12, color: L.t3, flex: '0 0 110px' }}>{label}</span>
      <span style={{ fontSize: 12, color: L.teal, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
        {url || '—'}
      </span>
      {url && (
        <button onClick={onCopy} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>Copiar</button>
      )}
    </div>
  )
}
