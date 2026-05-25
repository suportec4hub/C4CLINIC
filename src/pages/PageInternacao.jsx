import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Shared styles ─────────────────────────────────────────────────────── */
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

/* ─── Field ─────────────────────────────────────────────────────────────── */
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

/* ─── Modal (bottom-sheet) ───────────────────────────────────────────────── */
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
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</span>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return '?'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}
function calcDays(from, to) {
  if (!from) return 0
  const end = to ? new Date(to) : new Date()
  return Math.max(0, Math.floor((end - new Date(from)) / 86400000))
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}
function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: color || L.teal,
      background: bg || L.tealBg, fontFamily: "'JetBrains Mono', monospace",
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

const TIPO_LEITO_COLORS = {
  enfermaria: { color: L.blue,   bg: L.blueBg },
  apartamento:{ color: L.teal,   bg: L.tealBg },
  uti:        { color: L.red,    bg: L.redBg },
  obs:        { color: L.yellow, bg: L.yellowBg },
  ps:         { color: L.orange, bg: L.orangeBg },
}
const TIPO_INTERN_COLORS = {
  clinica:    { color: L.blue,   bg: L.blueBg },
  cirurgica:  { color: L.red,    bg: L.redBg },
  obs:        { color: L.yellow, bg: L.yellowBg },
  pediatria:  { color: L.teal,   bg: L.tealBg },
  maternidade:{ color: L.purple, bg: L.purpleBg },
}
const EVOL_COLORS = {
  medica:      { color: L.blue,   bg: L.blueBg,   label: 'Médica' },
  enfermagem:  { color: L.green,  bg: L.greenBg,  label: 'Enfermagem' },
  fisioterapia:{ color: L.purple, bg: L.purpleBg, label: 'Fisioterapia' },
  nutricao:    { color: L.orange, bg: L.orangeBg, label: 'Nutrição' },
}
const VIA_COLORS = {
  oral:      { color: L.blue,   bg: L.blueBg },
  iv:        { color: L.red,    bg: L.redBg },
  im:        { color: L.yellow, bg: L.yellowBg },
  sc:        { color: L.purple, bg: L.purpleBg },
  inalatoria:{ color: L.teal,   bg: L.tealBg },
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || L.t1, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PageInternacao({ profile }) {
  const cid = profile?.clinica_id

  /* ── global data ───── */
  const [leitos,       setLeitos]       = useState([])
  const [internacoes,  setInternacoes]  = useState([])
  const [pacientes,    setPacientes]    = useState([])
  const [medicos,      setMedicos]      = useState([])
  const [evolucoes,    setEvolucoes]    = useState([])
  const [prescricoes,  setPrescricoes]  = useState([])
  const [loading,      setLoading]      = useState(true)

  /* ── UI state ────────── */
  const [tab,          setTab]          = useState(0)
  const [subTab,       setSubTab]       = useState(0)

  /* ── filters ──────────── */
  const [filterInternId, setFilterInternId] = useState('')

  /* ── modals ──────────── */
  const [showNovoLeito,     setShowNovoLeito]     = useState(false)
  const [showNovaInternacao,setShowNovaInternacao] = useState(false)
  const [showEvolucao,      setShowEvolucao]      = useState(false)
  const [showPrescricao,    setShowPrescricao]    = useState(false)
  const [showInternar,      setShowInternar]      = useState(null)  // leito obj
  const [showVerInternacao, setShowVerInternacao] = useState(null)  // internacao obj
  const [showAltaConfirm,   setShowAltaConfirm]   = useState(null)  // internacao obj

  /* ── forms ───────────── */
  const [fLeito, setFLeito] = useState({ numero:'', tipo:'enfermaria', ala:'', status:'disponivel' })
  const [fIntern, setFIntern] = useState({
    paciente_id:'', leito_id:'', medico_responsavel_id:'',
    data_entrada: nowLocal(), data_saida_prevista:'',
    diagnostico:'', tipo_internacao:'clinica', observacoes:'',
  })
  const [fEvol, setFEvol] = useState({ internacao_id:'', profissional_id:'', tipo:'medica', data_hora: nowLocal(), conteudo:'' })
  const [fPresc, setFPresc] = useState({
    internacao_id:'', medico_id:'', medicamento:'', dose:'', frequencia:'',
    via:'oral', data_inicio:'', data_fim:'', ativo: true,
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  /* ── load ────────────── */
  const load = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    const [
      { data: lts },
      { data: ints },
      { data: pacs },
      { data: meds },
      { data: evols },
      { data: prescs },
    ] = await Promise.all([
      supabase.from('leitos').select('*').eq('clinica_id', cid).order('numero'),
      supabase.from('internacoes').select(`
        *,
        paciente:pacientes(id,nome,data_nascimento),
        medico:medicos(id,nome,especialidade),
        leito:leitos(id,numero,tipo,ala)
      `).eq('clinica_id', cid).order('data_entrada', { ascending: false }).limit(200),
      supabase.from('pacientes').select('id,nome,data_nascimento').eq('clinica_id', cid).order('nome'),
      supabase.from('medicos').select('id,nome,especialidade').eq('clinica_id', cid).order('nome'),
      supabase.from('evolucao_internacao').select(`
        *,
        profissional:medicos(id,nome)
      `).eq('clinica_id', cid).order('data_hora', { ascending: false }).limit(400),
      supabase.from('prescricoes_internacao').select('*').eq('clinica_id', cid).order('data_inicio', { ascending: false }).limit(400),
    ])
    setLeitos(lts || [])
    setInternacoes(ints || [])
    setPacientes(pacs || [])
    setMedicos(meds || [])
    setEvolucoes(evols || [])
    setPrescricoes(prescs || [])
    setLoading(false)
  }, [cid])

  useEffect(() => { load() }, [load])

  /* ── derived ──────────── */
  const internAtivas = internacoes.filter(i => i.status === 'internado')
  const historico    = internacoes.filter(i => i.status !== 'internado').slice(0, 100)
  const leitosDisp   = leitos.filter(l => l.status === 'disponivel')
  const ocupados     = leitos.filter(l => l.status === 'ocupado').length
  const taxaOcup     = leitos.length ? Math.round((ocupados / leitos.length) * 100) : 0
  const dispCount    = leitos.filter(l => l.status === 'disponivel').length

  /* helper: get internacao ativa for leito */
  const internForLeito = lid => internAtivas.find(i => i.leito_id === lid)

  /* ── save leito ───────── */
  async function saveLeito() {
    if (!fLeito.numero.trim()) { setErr('Número do leito é obrigatório'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('leitos').insert({ ...fLeito, clinica_id: cid })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setShowNovoLeito(false)
    setFLeito({ numero:'', tipo:'enfermaria', ala:'', status:'disponivel' })
    load()
  }

  /* ── save internacao ──── */
  async function saveInternacao() {
    const { paciente_id, leito_id, medico_responsavel_id, data_entrada, diagnostico, tipo_internacao } = fIntern
    if (!paciente_id || !leito_id || !medico_responsavel_id || !data_entrada || !diagnostico || !tipo_internacao) {
      setErr('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true); setErr('')
    const { error: eInt } = await supabase.from('internacoes').insert({
      ...fIntern, clinica_id: cid, status: 'internado',
    })
    if (!eInt) {
      await supabase.from('leitos').update({ status: 'ocupado' }).eq('id', leito_id)
    }
    setSaving(false)
    if (eInt) { setErr(eInt.message); return }
    setShowNovaInternacao(false)
    setFIntern({
      paciente_id:'', leito_id:'', medico_responsavel_id:'',
      data_entrada: nowLocal(), data_saida_prevista:'',
      diagnostico:'', tipo_internacao:'clinica', observacoes:'',
    })
    load()
  }

  /* ── internar from mapa ─ */
  async function saveInternarFromLeito() {
    const { paciente_id, medico_responsavel_id, data_entrada, diagnostico, tipo_internacao } = fIntern
    if (!paciente_id || !medico_responsavel_id || !data_entrada || !diagnostico || !tipo_internacao) {
      setErr('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true); setErr('')
    const lid = showInternar.id
    const { error: eInt } = await supabase.from('internacoes').insert({
      ...fIntern, leito_id: lid, clinica_id: cid, status: 'internado',
    })
    if (!eInt) {
      await supabase.from('leitos').update({ status: 'ocupado' }).eq('id', lid)
    }
    setSaving(false)
    if (eInt) { setErr(eInt.message); return }
    setShowInternar(null)
    setFIntern({
      paciente_id:'', leito_id:'', medico_responsavel_id:'',
      data_entrada: nowLocal(), data_saida_prevista:'',
      diagnostico:'', tipo_internacao:'clinica', observacoes:'',
    })
    load()
  }

  /* ── alta ─────────────── */
  async function darAlta(internacao) {
    setSaving(true)
    await supabase.from('internacoes').update({
      status: 'alta', data_saida: new Date().toISOString(),
    }).eq('id', internacao.id)
    if (internacao.leito_id) {
      await supabase.from('leitos').update({ status: 'higienizacao' }).eq('id', internacao.leito_id)
    }
    setSaving(false)
    setShowAltaConfirm(null)
    load()
  }

  /* ── save evolucao ────── */
  async function saveEvolucao() {
    const { internacao_id, profissional_id, tipo, data_hora, conteudo } = fEvol
    if (!internacao_id || !profissional_id || !tipo || !data_hora || !conteudo.trim()) {
      setErr('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true); setErr('')
    const { error } = await supabase.from('evolucao_internacao').insert({
      ...fEvol, clinica_id: cid,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setShowEvolucao(false)
    setFEvol({ internacao_id: fEvol.internacao_id, profissional_id:'', tipo:'medica', data_hora: nowLocal(), conteudo:'' })
    load()
  }

  /* ── save prescricao ──── */
  async function savePrescricao() {
    const { internacao_id, medico_id, medicamento, dose, frequencia, via, data_inicio } = fPresc
    if (!internacao_id || !medico_id || !medicamento.trim() || !dose.trim() || !frequencia.trim() || !via || !data_inicio) {
      setErr('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true); setErr('')
    const { error } = await supabase.from('prescricoes_internacao').insert({
      ...fPresc, clinica_id: cid,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setShowPrescricao(false)
    setFPresc({ internacao_id: fPresc.internacao_id, medico_id:'', medicamento:'', dose:'', frequencia:'', via:'oral', data_inicio:'', data_fim:'', ativo: true })
    load()
  }

  /* ── toggle ativo prescricao */
  async function toggleAtivo(p) {
    await supabase.from('prescricoes_internacao').update({ ativo: !p.ativo }).eq('id', p.id)
    load()
  }

  /* ── filtered evols/prescs ─ */
  const evolsFilt  = filterInternId ? evolucoes.filter(e => e.internacao_id === filterInternId) : evolucoes
  const prescsFilt = filterInternId ? prescricoes.filter(p => p.internacao_id === filterInternId) : prescricoes

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes up  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .leito-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important; }
        .row-hover:hover { background: ${L.hover} !important; }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 24, flexWrap:'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Internação</h1>
          <p style={{ fontSize: 13, color: L.t3, margin: '4px 0 0' }}>Gestão de leitos e internações hospitalares</p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          {tab === 0 && (
            <button style={btnPrimary} onClick={() => { setErr(''); setShowNovoLeito(true) }}>
              + Novo Leito
            </button>
          )}
          {tab === 1 && (
            <button style={btnPrimary} onClick={() => { setErr(''); setShowNovaInternacao(true) }}>
              + Nova Internação
            </button>
          )}
          {tab === 2 && subTab === 0 && (
            <button style={btnPrimary} onClick={() => { setErr(''); setShowEvolucao(true) }}>
              + Nova Evolução
            </button>
          )}
          {tab === 2 && subTab === 1 && (
            <button style={btnPrimary} onClick={() => { setErr(''); setShowPrescricao(true) }}>
              + Nova Prescrição
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {['Mapa de Leitos','Internações Ativas','Evoluções e Prescrições','Histórico de Altas'].map((t,i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: tab===i ? 600 : 400,
            color: tab===i ? L.teal : L.t3, background: 'none', border: 'none',
            borderBottom: tab===i ? `2px solid ${L.teal}` : '2px solid transparent',
            cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding: 60, color: L.t3 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Carregando...
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 0 — MAPA DE LEITOS
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 0 && (
        <div style={{ animation: 'up 0.2s ease' }}>
          {/* KPIs */}
          <div style={{ display:'flex', gap: 12, marginBottom: 24, flexWrap:'wrap' }}>
            <KpiCard label="TOTAL DE LEITOS"   value={leitos.length} />
            <KpiCard label="OCUPADOS"           value={ocupados}     color={L.red} />
            <KpiCard label="TAXA DE OCUPAÇÃO"   value={`${taxaOcup}%`} color={taxaOcup>80?L.red:taxaOcup>60?L.yellow:L.green} />
            <KpiCard label="DISPONÍVEIS"        value={dispCount}    color={L.green} />
            <KpiCard label="HIGIENIZAÇÃO"       value={leitos.filter(l=>l.status==='higienizacao').length} color={L.yellow} />
            <KpiCard label="MANUTENÇÃO"         value={leitos.filter(l=>l.status==='manutencao').length} color={L.t3} />
          </div>

          {/* Grid */}
          {leitos.length === 0 ? (
            <div style={{ textAlign:'center', padding: 60, color: L.t4 }}>
              Nenhum leito cadastrado. Clique em "+ Novo Leito" para começar.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap: 14 }}>
              {leitos.map(l => {
                const itern = internForLeito(l.id)
                const statusColor = {
                  disponivel:    { bg: L.greenBg,  bd: L.greenBd,  tx: L.green  },
                  ocupado:       { bg: L.redBg,    bd: L.redBd,    tx: L.red    },
                  higienizacao:  { bg: L.yellowBg, bd: L.yellowBd, tx: L.yellow },
                  manutencao:    { bg: L.surface,  bd: L.line,     tx: L.t3     },
                }[l.status] || { bg: L.surface, bd: L.line, tx: L.t3 }
                const tipoC = TIPO_LEITO_COLORS[l.tipo] || {}
                return (
                  <div key={l.id} className="leito-card" style={{
                    background: statusColor.bg, border: `1.5px solid ${statusColor.bd}`,
                    borderRadius: 12, padding: '16px', transition: 'box-shadow 0.15s',
                    cursor: 'default',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: L.t1 }}>Leito {l.numero}</span>
                        <Badge label={l.tipo} color={tipoC.color} bg={tipoC.bg} />
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: statusColor.tx,
                        fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                      }}>{l.status}</span>
                    </div>
                    {l.ala && (
                      <div style={{ fontSize: 11, color: L.t4, fontFamily:"'JetBrains Mono', monospace", marginBottom: 8 }}>
                        Ala: {l.ala}
                      </div>
                    )}
                    {itern && (
                      <div style={{ borderTop: `1px solid ${statusColor.bd}`, paddingTop: 10, marginTop: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, marginBottom: 2 }}>
                          {itern.paciente?.nome || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: L.t3, marginBottom: 2 }}>
                          Entrada: {fmtDate(itern.data_entrada)} · {calcDays(itern.data_entrada)} dias
                        </div>
                        <div style={{ fontSize: 11, color: L.t3 }}>
                          Dr(a). {itern.medico?.nome || '—'}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      {l.status === 'disponivel' && (
                        <button style={{ ...btnPrimary, fontSize: 11, padding:'6px 14px', width:'100%' }}
                          onClick={() => {
                            setErr('')
                            setFIntern({ paciente_id:'', leito_id: l.id, medico_responsavel_id:'', data_entrada: nowLocal(), data_saida_prevista:'', diagnostico:'', tipo_internacao:'clinica', observacoes:'' })
                            setShowInternar(l)
                          }}>
                          Internar
                        </button>
                      )}
                      {l.status === 'ocupado' && itern && (
                        <button style={{ ...btnGhost, fontSize: 11, padding:'6px 14px', width:'100%' }}
                          onClick={() => setShowVerInternacao(itern)}>
                          Ver Internação
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 1 — INTERNAÇÕES ATIVAS
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 1 && (
        <div style={{ animation: 'up 0.2s ease' }}>
          {internAtivas.length === 0 ? (
            <div style={{ textAlign:'center', padding: 60, color: L.t4 }}>
              Nenhuma internação ativa no momento.
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${L.line}` }}>
                    {['Paciente / Idade','Leito','Médico Responsável','Entrada','Dias','Diagnóstico','Tipo','Ações'].map(h => (
                      <th key={h} style={{
                        padding:'10px 14px', textAlign:'left', fontSize: 11,
                        color: L.t4, fontFamily:"'JetBrains Mono', monospace",
                        fontWeight: 600, whiteSpace:'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {internAtivas.map(i => {
                    const tipoC = TIPO_INTERN_COLORS[i.tipo_internacao] || {}
                    const leitoC = TIPO_LEITO_COLORS[i.leito?.tipo] || {}
                    return (
                      <tr key={i.id} className="row-hover" style={{ borderBottom:`1px solid ${L.line}`, transition:'background 0.1s' }}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{i.paciente?.nome || '—'}</div>
                          <div style={{ fontSize: 11, color: L.t3 }}>{calcAge(i.paciente?.data_nascimento)} anos</div>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{i.leito?.numero || '—'}</div>
                          {i.leito?.tipo && <Badge label={i.leito.tipo} color={leitoC.color} bg={leitoC.bg} />}
                        </td>
                        <td style={{ padding:'12px 14px', fontSize: 13, color: L.t2 }}>{i.medico?.nome || '—'}</td>
                        <td style={{ padding:'12px 14px', fontSize: 12, color: L.t3, whiteSpace:'nowrap' }}>{fmtDate(i.data_entrada)}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: calcDays(i.data_entrada) > 14 ? L.red : calcDays(i.data_entrada) > 7 ? L.yellow : L.green,
                          }}>{calcDays(i.data_entrada)}d</span>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize: 12, color: L.t2, maxWidth: 180 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: 160 }} title={i.diagnostico}>{i.diagnostico || '—'}</div>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          {i.tipo_internacao && <Badge label={i.tipo_internacao} color={tipoC.color} bg={tipoC.bg} />}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
                            <button style={{ ...btnGhost, fontSize: 11, padding:'5px 10px' }}
                              onClick={() => { setTab(2); setSubTab(0); setFilterInternId(i.id) }}>
                              Evoluções
                            </button>
                            <button style={{ ...btnGhost, fontSize: 11, padding:'5px 10px' }}
                              onClick={() => { setTab(2); setSubTab(1); setFilterInternId(i.id) }}>
                              Prescrições
                            </button>
                            <button style={{
                              ...btnGhost, fontSize: 11, padding:'5px 10px',
                              color: L.red, borderColor: L.redBd,
                            }} onClick={() => setShowAltaConfirm(i)}>
                              Alta
                            </button>
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

      {/* ════════════════════════════════════════════════════════════════
          TAB 2 — EVOLUÇÕES E PRESCRIÇÕES
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 2 && (
        <div style={{ animation: 'up 0.2s ease' }}>
          {/* Sub-tabs */}
          <div style={{ display:'flex', gap: 4, marginBottom: 20, borderBottom:`1px solid ${L.line}` }}>
            {['Evoluções','Prescrições'].map((s,i) => (
              <button key={i} onClick={() => setSubTab(i)} style={{
                padding:'8px 16px', fontSize: 13, fontWeight: subTab===i ? 600 : 400,
                color: subTab===i ? L.teal : L.t3, background:'none', border:'none',
                borderBottom: subTab===i ? `2px solid ${L.teal}` : '2px solid transparent',
                cursor:'pointer', marginBottom:-1,
              }}>{s}</button>
            ))}
          </div>

          {/* Internacao filter */}
          <div style={{ marginBottom: 20, maxWidth: 400 }}>
            <Field label="FILTRAR POR INTERNAÇÃO">
              <select value={filterInternId} onChange={e => setFilterInternId(e.target.value)}
                style={inp} onFocus={focus} onBlur={blur}>
                <option value="">— Todas as internações ativas —</option>
                {internAtivas.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.paciente?.nome || '?'} — Leito {i.leito?.numero || '?'}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── EVOLUÇÕES ── */}
          {subTab === 0 && (
            <div>
              {evolsFilt.length === 0 ? (
                <div style={{ textAlign:'center', padding: 40, color: L.t4 }}>Nenhuma evolução registrada.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap: 12 }}>
                  {evolsFilt.map(ev => {
                    const ec = EVOL_COLORS[ev.tipo] || {}
                    const intern = internacoes.find(i => i.id === ev.internacao_id)
                    return (
                      <div key={ev.id} style={{
                        background: L.surface, border:`1px solid ${L.line}`, borderRadius: 12, padding: 16,
                        display:'flex', gap: 16, alignItems:'flex-start',
                      }}>
                        <div style={{
                          width: 4, borderRadius: 4, alignSelf:'stretch', flexShrink: 0,
                          background: ec.color || L.teal, minHeight: 40,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8, flexWrap:'wrap' }}>
                            <Badge label={ec.label || ev.tipo} color={ec.color} bg={ec.bg} />
                            <span style={{ fontSize: 11, color: L.t4, fontFamily:"'JetBrains Mono', monospace" }}>
                              {fmtDateTime(ev.data_hora)}
                            </span>
                            <span style={{ fontSize: 12, color: L.t3 }}>
                              {ev.profissional?.nome || '—'}
                            </span>
                            {intern && (
                              <span style={{ fontSize: 11, color: L.t4 }}>
                                · {intern.paciente?.nome} / Leito {intern.leito?.numero}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: L.t1, lineHeight: 1.6, whiteSpace:'pre-wrap', margin: 0 }}>{ev.conteudo}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PRESCRIÇÕES ── */}
          {subTab === 1 && (
            <div>
              {prescsFilt.length === 0 ? (
                <div style={{ textAlign:'center', padding: 40, color: L.t4 }}>Nenhuma prescrição registrada.</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${L.line}` }}>
                        {['Paciente / Leito','Medicamento','Dose','Frequência','Via','Início','Fim','Ativo'].map(h => (
                          <th key={h} style={{
                            padding:'10px 14px', textAlign:'left', fontSize: 11,
                            color: L.t4, fontFamily:"'JetBrains Mono', monospace", fontWeight: 600, whiteSpace:'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prescsFilt.map(p => {
                        const vc = VIA_COLORS[p.via] || {}
                        const intern = internacoes.find(i => i.id === p.internacao_id)
                        return (
                          <tr key={p.id} className="row-hover" style={{ borderBottom:`1px solid ${L.line}`, opacity: p.ativo ? 1 : 0.55 }}>
                            <td style={{ padding:'10px 14px', fontSize: 12, color: L.t2 }}>
                              {intern ? `${intern.paciente?.nome || '—'} / L.${intern.leito?.numero}` : '—'}
                            </td>
                            <td style={{ padding:'10px 14px', fontSize: 13, fontWeight: 600, color: L.t1 }}>{p.medicamento}</td>
                            <td style={{ padding:'10px 14px', fontSize: 12, color: L.t2 }}>{p.dose}</td>
                            <td style={{ padding:'10px 14px', fontSize: 12, color: L.t2 }}>{p.frequencia}</td>
                            <td style={{ padding:'10px 14px' }}>
                              <Badge label={p.via} color={vc.color} bg={vc.bg} />
                            </td>
                            <td style={{ padding:'10px 14px', fontSize: 12, color: L.t3, whiteSpace:'nowrap' }}>{fmtDate(p.data_inicio)}</td>
                            <td style={{ padding:'10px 14px', fontSize: 12, color: L.t3, whiteSpace:'nowrap' }}>{p.data_fim ? fmtDate(p.data_fim) : '—'}</td>
                            <td style={{ padding:'10px 14px' }}>
                              <button onClick={() => toggleAtivo(p)} style={{
                                ...btnGhost, fontSize: 11, padding:'4px 12px',
                                color: p.ativo ? L.green : L.t3,
                                borderColor: p.ativo ? L.greenBd : L.line,
                                background: p.ativo ? L.greenBg : 'transparent',
                              }}>
                                {p.ativo ? 'Ativo' : 'Inativo'}
                              </button>
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3 — HISTÓRICO DE ALTAS
      ════════════════════════════════════════════════════════════════ */}
      {!loading && tab === 3 && (
        <div style={{ animation: 'up 0.2s ease' }}>
          {historico.length === 0 ? (
            <div style={{ textAlign:'center', padding: 60, color: L.t4 }}>Nenhum histórico de alta registrado.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${L.line}` }}>
                    {['Paciente','Leito','Entrada','Saída','Dias','Diagnóstico','Tipo','Status'].map(h => (
                      <th key={h} style={{
                        padding:'10px 14px', textAlign:'left', fontSize: 11,
                        color: L.t4, fontFamily:"'JetBrains Mono', monospace", fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historico.map(i => {
                    const tipoC = TIPO_INTERN_COLORS[i.tipo_internacao] || {}
                    const statusC = i.status === 'alta'
                      ? { color: L.green, bg: L.greenBg }
                      : { color: L.yellow, bg: L.yellowBg }
                    const leitoC = TIPO_LEITO_COLORS[i.leito?.tipo] || {}
                    return (
                      <tr key={i.id} className="row-hover" style={{ borderBottom:`1px solid ${L.line}` }}>
                        <td style={{ padding:'10px 14px', fontSize: 13, fontWeight: 600, color: L.t1 }}>{i.paciente?.nome || '—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontSize: 13 }}>{i.leito?.numero || '—'}</div>
                          {i.leito?.tipo && <Badge label={i.leito.tipo} color={leitoC.color} bg={leitoC.bg} />}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize: 12, color: L.t3, whiteSpace:'nowrap' }}>{fmtDate(i.data_entrada)}</td>
                        <td style={{ padding:'10px 14px', fontSize: 12, color: L.t3, whiteSpace:'nowrap' }}>{fmtDate(i.data_saida)}</td>
                        <td style={{ padding:'10px 14px', fontSize: 13, fontWeight: 600, color: L.t2 }}>
                          {calcDays(i.data_entrada, i.data_saida)}d
                        </td>
                        <td style={{ padding:'10px 14px', fontSize: 12, color: L.t2, maxWidth: 180 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: 160 }} title={i.diagnostico}>{i.diagnostico || '—'}</div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {i.tipo_internacao && <Badge label={i.tipo_internacao} color={tipoC.color} bg={tipoC.bg} />}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <Badge label={i.status} color={statusC.color} bg={statusC.bg} />
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

      {/* ════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════ */}

      {/* ── Novo Leito ─────────────────────────────────────────────── */}
      {showNovoLeito && (
        <Modal title="Novo Leito" onClose={() => setShowNovoLeito(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <Field label="NÚMERO *">
              <input style={inp} value={fLeito.numero}
                onChange={e => setFLeito(p => ({...p, numero: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="ex: 101" />
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select style={inp} value={fLeito.tipo}
                  onChange={e => setFLeito(p => ({...p, tipo: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="enfermaria">Enfermaria</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="uti">UTI</option>
                  <option value="obs">Observação</option>
                  <option value="ps">Pronto-Socorro</option>
                </select>
              </Field>
              <Field label="STATUS">
                <select style={inp} value={fLeito.status}
                  onChange={e => setFLeito(p => ({...p, status: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="disponivel">Disponível</option>
                  <option value="ocupado">Ocupado</option>
                  <option value="higienizacao">Higienização</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </Field>
            </div>
            <Field label="ALA">
              <input style={inp} value={fLeito.ala}
                onChange={e => setFLeito(p => ({...p, ala: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="ex: Ala A, Cirurgia..." />
            </Field>
            {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding:'8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setShowNovoLeito(false)}>Cancelar</button>
              <button style={btnPrimary} onClick={saveLeito} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Leito'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Nova Internação ────────────────────────────────────────── */}
      {showNovaInternacao && (
        <Modal title="Nova Internação" onClose={() => setShowNovaInternacao(false)} wide>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="PACIENTE *">
                <select style={inp} value={fIntern.paciente_id}
                  onChange={e => setFIntern(p => ({...p, paciente_id: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="">Selecione o paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="LEITO (disponíveis) *">
                <select style={inp} value={fIntern.leito_id}
                  onChange={e => setFIntern(p => ({...p, leito_id: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="">Selecione o leito</option>
                  {leitosDisp.map(l => <option key={l.id} value={l.id}>{l.numero} – {l.tipo}{l.ala ? ` (${l.ala})` : ''}</option>)}
                </select>
              </Field>
            </div>
            <Field label="MÉDICO RESPONSÁVEL *">
              <select style={inp} value={fIntern.medico_responsavel_id}
                onChange={e => setFIntern(p => ({...p, medico_responsavel_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione o médico</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` – ${m.especialidade}` : ''}</option>)}
              </select>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="DATA DE ENTRADA *">
                <input type="datetime-local" style={inp} value={fIntern.data_entrada}
                  onChange={e => setFIntern(p => ({...p, data_entrada: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="PREVISÃO DE SAÍDA">
                <input type="date" style={inp} value={fIntern.data_saida_prevista}
                  onChange={e => setFIntern(p => ({...p, data_saida_prevista: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <Field label="TIPO DE INTERNAÇÃO *">
              <select style={inp} value={fIntern.tipo_internacao}
                onChange={e => setFIntern(p => ({...p, tipo_internacao: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="clinica">Clínica</option>
                <option value="cirurgica">Cirúrgica</option>
                <option value="obs">Observação</option>
                <option value="pediatria">Pediatria</option>
                <option value="maternidade">Maternidade</option>
              </select>
            </Field>
            <Field label="DIAGNÓSTICO *">
              <textarea style={ta} value={fIntern.diagnostico}
                onChange={e => setFIntern(p => ({...p, diagnostico: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="CID-10 / descrição clínica..." />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={ta} value={fIntern.observacoes}
                onChange={e => setFIntern(p => ({...p, observacoes: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="Observações adicionais..." />
            </Field>
            {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding:'8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setShowNovaInternacao(false)}>Cancelar</button>
              <button style={btnPrimary} onClick={saveInternacao} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Internação'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Internar a partir do mapa ───────────────────────────────── */}
      {showInternar && (
        <Modal title={`Internar — Leito ${showInternar.numero}`} onClose={() => setShowInternar(null)} wide>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <div style={{
              padding:'10px 14px', background: L.tealBg,
              borderRadius: 8, fontSize: 12, color: L.teal, fontWeight: 600,
              border: `1px solid ${L.tealMd}20`,
            }}>
              Leito {showInternar.numero} · {showInternar.tipo}{showInternar.ala ? ` · Ala ${showInternar.ala}` : ''}
            </div>
            <Field label="PACIENTE *">
              <select style={inp} value={fIntern.paciente_id}
                onChange={e => setFIntern(p => ({...p, paciente_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione o paciente</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="MÉDICO RESPONSÁVEL *">
              <select style={inp} value={fIntern.medico_responsavel_id}
                onChange={e => setFIntern(p => ({...p, medico_responsavel_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione o médico</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` – ${m.especialidade}` : ''}</option>)}
              </select>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="DATA DE ENTRADA *">
                <input type="datetime-local" style={inp} value={fIntern.data_entrada}
                  onChange={e => setFIntern(p => ({...p, data_entrada: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="PREVISÃO DE SAÍDA">
                <input type="date" style={inp} value={fIntern.data_saida_prevista}
                  onChange={e => setFIntern(p => ({...p, data_saida_prevista: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <Field label="TIPO DE INTERNAÇÃO *">
              <select style={inp} value={fIntern.tipo_internacao}
                onChange={e => setFIntern(p => ({...p, tipo_internacao: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="clinica">Clínica</option>
                <option value="cirurgica">Cirúrgica</option>
                <option value="obs">Observação</option>
                <option value="pediatria">Pediatria</option>
                <option value="maternidade">Maternidade</option>
              </select>
            </Field>
            <Field label="DIAGNÓSTICO *">
              <textarea style={ta} value={fIntern.diagnostico}
                onChange={e => setFIntern(p => ({...p, diagnostico: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="CID-10 / descrição clínica..." />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={ta} value={fIntern.observacoes}
                onChange={e => setFIntern(p => ({...p, observacoes: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="Observações adicionais..." />
            </Field>
            {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding:'8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setShowInternar(null)}>Cancelar</button>
              <button style={btnPrimary} onClick={saveInternarFromLeito} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Internação'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Ver Internação (read-only) ─────────────────────────────── */}
      {showVerInternacao && (
        <Modal title="Detalhes da Internação" onClose={() => setShowVerInternacao(null)} wide>
          <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            {[
              ['Paciente',        showVerInternacao.paciente?.nome],
              ['Idade',           calcAge(showVerInternacao.paciente?.data_nascimento) + ' anos'],
              ['Leito',           `${showVerInternacao.leito?.numero} – ${showVerInternacao.leito?.tipo}`],
              ['Médico Responsável', showVerInternacao.medico?.nome],
              ['Tipo',            showVerInternacao.tipo_internacao],
              ['Entrada',         fmtDateTime(showVerInternacao.data_entrada)],
              ['Previsão Saída',  fmtDate(showVerInternacao.data_saida_prevista)],
              ['Diagnóstico',     showVerInternacao.diagnostico],
              ['Observações',     showVerInternacao.observacoes],
            ].map(([label, val]) => val ? (
              <div key={label}>
                <div style={{ fontSize: 11, color: L.t4, fontFamily:"'JetBrains Mono', monospace", marginBottom: 3 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: L.t1 }}>{val}</div>
              </div>
            ) : null)}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 8, borderTop:`1px solid ${L.line}` }}>
              <button style={btnGhost} onClick={() => setShowVerInternacao(null)}>Fechar</button>
              <button style={{ ...btnGhost, color: L.red, borderColor: L.redBd, background: L.redBg }}
                onClick={() => { setShowAltaConfirm(showVerInternacao); setShowVerInternacao(null) }}>
                Dar Alta
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirmar Alta ─────────────────────────────────────────── */}
      {showAltaConfirm && (
        <Modal title="Confirmar Alta" onClose={() => setShowAltaConfirm(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: L.t2, lineHeight: 1.6 }}>
              Confirmar alta de <strong>{showAltaConfirm.paciente?.nome}</strong> do Leito{' '}
              <strong>{showAltaConfirm.leito?.numero}</strong>?
              <br />
              O leito será movido para <strong>Higienização</strong> automaticamente.
            </p>
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end' }}>
              <button style={btnGhost} onClick={() => setShowAltaConfirm(null)}>Cancelar</button>
              <button style={{ ...btnPrimary, background: L.red }} onClick={() => darAlta(showAltaConfirm)} disabled={saving}>
                {saving ? 'Processando...' : 'Confirmar Alta'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Nova Evolução ──────────────────────────────────────────── */}
      {showEvolucao && (
        <Modal title="Registrar Evolução" onClose={() => setShowEvolucao(false)} wide>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <Field label="INTERNAÇÃO *">
              <select style={inp} value={fEvol.internacao_id}
                onChange={e => setFEvol(p => ({...p, internacao_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione a internação</option>
                {internAtivas.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.paciente?.nome || '?'} — Leito {i.leito?.numero || '?'}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="PROFISSIONAL *">
                <select style={inp} value={fEvol.profissional_id}
                  onChange={e => setFEvol(p => ({...p, profissional_id: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="">Selecione</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Field>
              <Field label="TIPO *">
                <select style={inp} value={fEvol.tipo}
                  onChange={e => setFEvol(p => ({...p, tipo: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="medica">Médica</option>
                  <option value="enfermagem">Enfermagem</option>
                  <option value="fisioterapia">Fisioterapia</option>
                  <option value="nutricao">Nutrição</option>
                </select>
              </Field>
            </div>
            <Field label="DATA E HORA *">
              <input type="datetime-local" style={inp} value={fEvol.data_hora}
                onChange={e => setFEvol(p => ({...p, data_hora: e.target.value}))}
                onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="EVOLUÇÃO *">
              <textarea style={{ ...ta, minHeight: 140 }} value={fEvol.conteudo}
                onChange={e => setFEvol(p => ({...p, conteudo: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="Descreva a evolução clínica do paciente..." />
            </Field>
            {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding:'8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setShowEvolucao(false)}>Cancelar</button>
              <button style={btnPrimary} onClick={saveEvolucao} disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar Evolução'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Nova Prescrição ────────────────────────────────────────── */}
      {showPrescricao && (
        <Modal title="Nova Prescrição" onClose={() => setShowPrescricao(false)} wide>
          <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
            <Field label="INTERNAÇÃO *">
              <select style={inp} value={fPresc.internacao_id}
                onChange={e => setFPresc(p => ({...p, internacao_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione a internação</option>
                {internAtivas.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.paciente?.nome || '?'} — Leito {i.leito?.numero || '?'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="MÉDICO PRESCRITOR *">
              <select style={inp} value={fPresc.medico_id}
                onChange={e => setFPresc(p => ({...p, medico_id: e.target.value}))}
                onFocus={focus} onBlur={blur}>
                <option value="">Selecione o médico</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </Field>
            <Field label="MEDICAMENTO *">
              <input style={inp} value={fPresc.medicamento}
                onChange={e => setFPresc(p => ({...p, medicamento: e.target.value}))}
                onFocus={focus} onBlur={blur} placeholder="Nome do medicamento..." />
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12 }}>
              <Field label="DOSE *">
                <input style={inp} value={fPresc.dose}
                  onChange={e => setFPresc(p => ({...p, dose: e.target.value}))}
                  onFocus={focus} onBlur={blur} placeholder="ex: 500mg" />
              </Field>
              <Field label="FREQUÊNCIA *">
                <input style={inp} value={fPresc.frequencia}
                  onChange={e => setFPresc(p => ({...p, frequencia: e.target.value}))}
                  onFocus={focus} onBlur={blur} placeholder="ex: 8/8h" />
              </Field>
              <Field label="VIA *">
                <select style={inp} value={fPresc.via}
                  onChange={e => setFPresc(p => ({...p, via: e.target.value}))}
                  onFocus={focus} onBlur={blur}>
                  <option value="oral">Oral</option>
                  <option value="iv">IV – Intravenosa</option>
                  <option value="im">IM – Intramuscular</option>
                  <option value="sc">SC – Subcutânea</option>
                  <option value="inalatoria">Inalatória</option>
                </select>
              </Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <Field label="DATA INÍCIO *">
                <input type="date" style={inp} value={fPresc.data_inicio}
                  onChange={e => setFPresc(p => ({...p, data_inicio: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="DATA FIM">
                <input type="date" style={inp} value={fPresc.data_fim}
                  onChange={e => setFPresc(p => ({...p, data_fim: e.target.value}))}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding:'8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display:'flex', gap: 10, justifyContent:'flex-end', paddingTop: 4 }}>
              <button style={btnGhost} onClick={() => setShowPrescricao(false)}>Cancelar</button>
              <button style={btnPrimary} onClick={savePrescricao} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Prescrição'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
