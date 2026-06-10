import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Global styles ──────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@keyframes up {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}
`

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

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

function Row2({ children, gap = 12 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18,
      border: `2.5px solid ${L.teal}30`,
      borderTopColor: L.teal,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

function BtnPrimary({ onClick, disabled, loading, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? L.line : L.teal,
        color: L.white, fontWeight: 600, fontSize: 14,
        border: 'none', borderRadius: 8, padding: '10px 20px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        ...style,
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function BtnSecondary({ onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', color: L.t2, fontWeight: 500, fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '8px 16px',
        cursor: 'pointer', ...style,
      }}
    >
      {children}
    </button>
  )
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 140,
    }}>
      <div style={{
        fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.3px', marginBottom: 8,
      }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 580 }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none',
            border: 'none', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Badge helpers ──────────────────────────────────────────────────────── */
const METODO_MAP = {
  autoclave_vapor:    { label: 'Autoclave Vapor', bg: L.blueBg,   color: L.blue,   bd: L.blueBd },
  oxido_etileno:      { label: 'Óxido Etileno',   bg: L.orangeBg, color: L.orange, bd: L.orangeBd },
  plasma_hidrogenio:  { label: 'Plasma H₂O₂',     bg: L.purpleBg, color: L.purple, bd: L.purpleBd },
  calor_seco:         { label: 'Calor Seco',       bg: L.redBg,    color: L.red,    bd: L.redBd },
}

const STATUS_CICLO_MAP = {
  em_andamento: { label: 'Em Andamento', bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, pulse: true },
  concluido:    { label: 'Concluído',    bg: L.greenBg,  color: L.green,  bd: L.greenBd,  pulse: false },
  falha:        { label: 'Falha',        bg: L.redBg,    color: L.red,    bd: L.redBd,    pulse: false },
  cancelado:    { label: 'Cancelado',    bg: L.surface,  color: L.t3,     bd: L.line,     pulse: false },
}

const STATUS_MATERIAL_MAP = {
  embalado:     { label: 'Embalado',    bg: L.surface,  color: L.t3,    bd: L.line },
  esterilizado: { label: 'Esterilizado', bg: L.blueBg,  color: L.blue,  bd: L.blueBd },
  distribuido:  { label: 'Distribuído', bg: L.tealBg,   color: L.teal,  bd: `${L.teal}40` },
  usado:        { label: 'Usado',       bg: L.greenBg,  color: L.green, bd: L.greenBd },
  vencido:      { label: 'Vencido',     bg: L.redBg,    color: L.red,   bd: L.redBd },
}

const INDICADOR_MAP = {
  aprovado:  { label: 'Aprov.', bg: L.greenBg,  color: L.green,  bd: L.greenBd },
  reprovado: { label: 'Reprov.', bg: L.redBg,   color: L.red,    bd: L.redBd },
  pendente:  { label: 'Pend.',  bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
}

function MetodoBadge({ metodo }) {
  const s = METODO_MAP[metodo] || { label: metodo, bg: L.surface, color: L.t3, bd: L.line }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function StatusCicloBadge({ status }) {
  const s = STATUS_CICLO_MAP[status] || STATUS_CICLO_MAP.cancelado
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      animation: s.pulse ? 'pulse 1.6s ease-in-out infinite' : 'none',
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function StatusMaterialBadge({ status }) {
  const s = STATUS_MATERIAL_MAP[status] || STATUS_MATERIAL_MAP.embalado
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function IndicadorBadge({ label, value }) {
  if (!value) return null
  const s = INDICADOR_MAP[value] || INDICADOR_MAP.pendente
  return (
    <span style={{
      padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }} title={label}>{label.charAt(0).toUpperCase()}: {s.label}</span>
  )
}

/* ─── Duration helper ────────────────────────────────────────────────────── */
function calcDuracao(inicio, fim) {
  if (!inicio) return '—'
  const start = new Date(inicio)
  const end = fim ? new Date(fim) : new Date()
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? `${m}m` : ''}`
}

function fmtDT(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, da] = d.split('-')
  return `${da}/${m}/${y}`
}

function isVencido(dataValidade) {
  if (!dataValidade) return false
  return new Date(dataValidade) < new Date(new Date().toDateString())
}

/* ─── Today ISO ──────────────────────────────────────────────────────────── */
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function suggestNumero(ciclos) {
  const today = todayISO().replace(/-/g, '')
  const todayCiclos = ciclos.filter(c => c.numero_ciclo && c.numero_ciclo.startsWith(today))
  const seq = String(todayCiclos.length + 1).padStart(2, '0')
  return `${today}-${seq}`
}

/* ════════════════════════════════════════════════════════════════════════════
   TAB 0 — CICLOS
   ════════════════════════════════════════════════════════════════════════════ */
function TabCiclos({ profile }) {
  const cid = profile?.clinica_id
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'novo' | 'concluir' | 'materiais-ciclo' | 'falha'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  /* form state */
  const blankCiclo = {
    numero_ciclo: '', equipamento: '', metodo: 'autoclave_vapor',
    temperatura: '', pressao: '', tempo_minutos: '', operador: '',
    data_hora_inicio: new Date().toISOString().slice(0, 16),
    status: 'em_andamento', observacoes: '',
  }
  const [form, setForm] = useState(blankCiclo)

  const blankConcluir = {
    data_hora_fim: new Date().toISOString().slice(0, 16),
    indicador_quimico: 'aprovado', indicador_biologico: 'pendente',
    observacoes: '',
  }
  const [concluirForm, setConcluirForm] = useState(blankConcluir)

  const [matCiclo, setMatCiclo] = useState([])
  const [matLoading, setMatLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    const { data } = await supabase
      .from('ciclos_esterilizacao')
      .select('*')
      .eq('clinica_id', cid)
      .order('criado_em', { ascending: false })
      .limit(200)
    setCiclos(data || [])
    setLoading(false)
  }, [cid])

  useEffect(() => { fetch() }, [fetch])

  /* KPIs */
  const today = todayISO()
  const ciclosHoje = ciclos.filter(c => c.data_hora_inicio?.startsWith(today)).length
  const emAndamento = ciclos.filter(c => c.status === 'em_andamento').length
  const thisMonth = new Date().toISOString().slice(0, 7)
  const falhasMes = ciclos.filter(c => c.status === 'falha' && c.criado_em?.startsWith(thisMonth)).length
  const concluidos = ciclos.filter(c => c.status === 'concluido').length
  const total = ciclos.filter(c => c.status !== 'em_andamento').length
  const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0

  /* save novo ciclo */
  async function saveCiclo() {
    setSaving(true)
    const payload = {
      clinica_id: cid,
      numero_ciclo: form.numero_ciclo || suggestNumero(ciclos),
      equipamento: form.equipamento,
      metodo: form.metodo,
      temperatura: form.temperatura ? Number(form.temperatura) : null,
      pressao: form.pressao ? Number(form.pressao) : null,
      tempo_minutos: form.tempo_minutos ? Number(form.tempo_minutos) : null,
      operador: form.operador,
      data_hora_inicio: form.data_hora_inicio || new Date().toISOString(),
      status: 'em_andamento',
      observacoes: form.observacoes || null,
    }
    const { error } = await supabase.from('ciclos_esterilizacao').insert(payload)
    setSaving(false)
    if (!error) { setModal(null); fetch() }
    else alert('Erro ao salvar ciclo: ' + error.message)
  }

  /* concluir ciclo */
  async function concluirCiclo() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase
      .from('ciclos_esterilizacao')
      .update({
        status: 'concluido',
        data_hora_fim: concluirForm.data_hora_fim || new Date().toISOString(),
        indicador_quimico: concluirForm.indicador_quimico,
        indicador_biologico: concluirForm.indicador_biologico,
        observacoes: concluirForm.observacoes || null,
      })
      .eq('id', selected.id)
    setSaving(false)
    if (!error) { setModal(null); setSelected(null); fetch() }
    else alert('Erro: ' + error.message)
  }

  /* registrar falha */
  async function registrarFalha() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase
      .from('ciclos_esterilizacao')
      .update({ status: 'falha', observacoes: concluirForm.observacoes || null })
      .eq('id', selected.id)
    setSaving(false)
    if (!error) { setModal(null); setSelected(null); fetch() }
    else alert('Erro: ' + error.message)
  }

  /* ver materiais do ciclo */
  async function loadMatCiclo(ciclo) {
    setSelected(ciclo)
    setMatLoading(true)
    setModal('materiais-ciclo')
    const { data } = await supabase
      .from('materiais_esterilizacao')
      .select('*')
      .eq('ciclo_id', ciclo.id)
      .order('criado_em', { ascending: false })
    setMatCiclo(data || [])
    setMatLoading(false)
  }

  function openNovo() {
    setForm({ ...blankCiclo, numero_ciclo: suggestNumero(ciclos), data_hora_inicio: new Date().toISOString().slice(0, 16) })
    setModal('novo')
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPI label="CICLOS HOJE" value={ciclosHoje} />
        <KPI label="EM ANDAMENTO" value={emAndamento} color={emAndamento > 0 ? L.yellow : L.t1} />
        <KPI label="FALHAS (MÊS)" value={falhasMes} color={falhasMes > 0 ? L.red : L.t1} />
        <KPI label="TAXA DE SUCESSO" value={`${taxa}%`} color={taxa >= 90 ? L.green : taxa >= 70 ? L.yellow : L.red} sub={`${concluidos} concluídos`} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: L.t3 }}>{ciclos.length} ciclo(s) registrado(s)</div>
        <BtnPrimary onClick={openNovo}>+ Novo Ciclo</BtnPrimary>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : ciclos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t4, fontSize: 14 }}>
          Nenhum ciclo registrado. Inicie o primeiro ciclo de esterilização.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                {['Nº Ciclo', 'Equipamento', 'Método', 'Operador', 'Início', 'Duração', 'Temp/Press', 'Status', 'Indicadores', 'Ações'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px', fontSize: 11,
                    color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ciclos.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: L.teal, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {c.numero_ciclo || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: L.t2 }}>{c.equipamento || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><MetodoBadge metodo={c.metodo} /></td>
                  <td style={{ padding: '10px 12px', color: L.t2 }}>{c.operador || '—'}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, whiteSpace: 'nowrap' }}>{fmtDT(c.data_hora_inicio)}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, whiteSpace: 'nowrap' }}>{calcDuracao(c.data_hora_inicio, c.data_hora_fim)}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    {c.temperatura ? `${c.temperatura}°C` : '—'}{c.pressao ? ` / ${c.pressao}bar` : ''}
                  </td>
                  <td style={{ padding: '10px 12px' }}><StatusCicloBadge status={c.status} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {c.indicador_quimico && <IndicadorBadge label="Quím" value={c.indicador_quimico} />}
                      {c.indicador_biologico && <IndicadorBadge label="Biol" value={c.indicador_biologico} />}
                      {!c.indicador_quimico && !c.indicador_biologico && <span style={{ color: L.t4, fontSize: 11 }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.status === 'em_andamento' && (
                        <button
                          onClick={() => { setSelected(c); setConcluirForm({ ...blankConcluir, data_hora_fim: new Date().toISOString().slice(0, 16) }); setModal('concluir') }}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`, cursor: 'pointer', fontWeight: 600 }}
                        >Concluir</button>
                      )}
                      <button
                        onClick={() => loadMatCiclo(c)}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`, cursor: 'pointer', fontWeight: 600 }}
                      >Materiais</button>
                      {c.status === 'em_andamento' && (
                        <button
                          onClick={() => { setSelected(c); setConcluirForm({ ...blankConcluir }); setModal('falha') }}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, cursor: 'pointer', fontWeight: 600 }}
                        >Falha</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Novo Ciclo */}
      {modal === 'novo' && (
        <Modal title="Novo Ciclo de Esterilização" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row2>
              <Field label="NÚMERO DO CICLO">
                <input style={inp} value={form.numero_ciclo}
                  onChange={e => setForm(f => ({ ...f, numero_ciclo: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder={suggestNumero(ciclos)}
                />
              </Field>
              <Field label="EQUIPAMENTO">
                <input style={inp} value={form.equipamento}
                  onChange={e => setForm(f => ({ ...f, equipamento: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: Autoclave 01"
                />
              </Field>
            </Row2>
            <Field label="MÉTODO DE ESTERILIZAÇÃO">
              <select style={inp} value={form.metodo}
                onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}
              >
                <option value="autoclave_vapor">Autoclave a Vapor</option>
                <option value="oxido_etileno">Óxido de Etileno</option>
                <option value="plasma_hidrogenio">Plasma de Peróxido de Hidrogênio</option>
                <option value="calor_seco">Calor Seco (Estufa)</option>
              </select>
            </Field>
            <Row2>
              <Field label="TEMPERATURA (°C)">
                <input style={inp} type="number" value={form.temperatura}
                  onChange={e => setForm(f => ({ ...f, temperatura: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: 134"
                />
              </Field>
              <Field label="PRESSÃO (bar)">
                <input style={inp} type="number" step="0.1" value={form.pressao}
                  onChange={e => setForm(f => ({ ...f, pressao: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: 2.1"
                />
              </Field>
            </Row2>
            <Row2>
              <Field label="TEMPO (minutos)">
                <input style={inp} type="number" value={form.tempo_minutos}
                  onChange={e => setForm(f => ({ ...f, tempo_minutos: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: 30"
                />
              </Field>
              <Field label="OPERADOR RESPONSÁVEL">
                <input style={inp} value={form.operador}
                  onChange={e => setForm(f => ({ ...f, operador: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Nome do operador"
                />
              </Field>
            </Row2>
            <Field label="DATA / HORA DE INÍCIO">
              <input style={inp} type="datetime-local" value={form.data_hora_inicio}
                onChange={e => setForm(f => ({ ...f, data_hora_inicio: e.target.value }))}
                onFocus={focus} onBlur={blur}
              />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                onFocus={focus} onBlur={blur}
                placeholder="Notas adicionais..."
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <BtnSecondary onClick={() => setModal(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={saveCiclo} loading={saving}
                disabled={!form.equipamento || !form.operador}
              >Iniciar Ciclo</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Concluir */}
      {modal === 'concluir' && selected && (
        <Modal title={`Concluir Ciclo ${selected.numero_ciclo}`} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: L.surface, borderRadius: 8, fontSize: 13, color: L.t2 }}>
            <b>{selected.equipamento}</b> · <MetodoBadge metodo={selected.metodo} /> · Início: {fmtDT(selected.data_hora_inicio)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="DATA / HORA DE TÉRMINO">
              <input style={inp} type="datetime-local" value={concluirForm.data_hora_fim}
                onChange={e => setConcluirForm(f => ({ ...f, data_hora_fim: e.target.value }))}
                onFocus={focus} onBlur={blur}
              />
            </Field>
            <Row2>
              <Field label="INDICADOR QUÍMICO">
                <select style={inp} value={concluirForm.indicador_quimico}
                  onChange={e => setConcluirForm(f => ({ ...f, indicador_quimico: e.target.value }))}
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                </select>
              </Field>
              <Field label="INDICADOR BIOLÓGICO">
                <select style={inp} value={concluirForm.indicador_biologico}
                  onChange={e => setConcluirForm(f => ({ ...f, indicador_biologico: e.target.value }))}
                >
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                </select>
              </Field>
            </Row2>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={concluirForm.observacoes}
                onChange={e => setConcluirForm(f => ({ ...f, observacoes: e.target.value }))}
                onFocus={focus} onBlur={blur}
                placeholder="Resultado, intercorrências..."
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <BtnSecondary onClick={() => setModal(null)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={concluirCiclo} loading={saving}>Concluir Ciclo</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Falha */}
      {modal === 'falha' && selected && (
        <Modal title={`Registrar Falha — Ciclo ${selected.numero_ciclo}`} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: L.redBg, border: `1px solid ${L.redBd}`, borderRadius: 8, fontSize: 13, color: L.red }}>
            Esta ação registrará o ciclo como FALHA. Todos os materiais associados deverão ser reavaliados.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="DESCRIÇÃO DA FALHA *">
              <textarea style={{ ...inp, minHeight: 88, resize: 'vertical' }} value={concluirForm.observacoes}
                onChange={e => setConcluirForm(f => ({ ...f, observacoes: e.target.value }))}
                onFocus={focus} onBlur={blur}
                placeholder="Descreva a falha identificada..."
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <BtnSecondary onClick={() => setModal(null)}>Cancelar</BtnSecondary>
              <BtnPrimary
                onClick={registrarFalha}
                loading={saving}
                disabled={!concluirForm.observacoes}
                style={{ background: L.red }}
              >Registrar Falha</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Materiais do Ciclo */}
      {modal === 'materiais-ciclo' && selected && (
        <Modal title={`Materiais — Ciclo ${selected.numero_ciclo}`} onClose={() => setModal(null)} maxWidth={680}>
          <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <MetodoBadge metodo={selected.metodo} />
            <StatusCicloBadge status={selected.status} />
            <span style={{ fontSize: 12, color: L.t3 }}>{selected.equipamento} · {selected.operador}</span>
          </div>
          {matLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          ) : matCiclo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: L.t4, fontSize: 13 }}>
              Nenhum material registrado neste ciclo.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                  {['Pacote', 'Descrição', 'Qtd', 'Validade', 'Setor Destino', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matCiclo.map(m => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: L.teal }}>{m.pacote_numero || '—'}</td>
                    <td style={{ padding: '8px 10px', color: L.t2 }}>{m.descricao}</td>
                    <td style={{ padding: '8px 10px', color: L.t3 }}>{m.quantidade}</td>
                    <td style={{ padding: '8px 10px', color: isVencido(m.data_validade) ? L.red : L.t3, fontWeight: isVencido(m.data_validade) ? 700 : 400 }}>
                      {fmtDate(m.data_validade)}
                    </td>
                    <td style={{ padding: '8px 10px', color: L.t3 }}>{m.setor_destino || '—'}</td>
                    <td style={{ padding: '8px 10px' }}><StatusMaterialBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   TAB 1 — MATERIAIS
   ════════════════════════════════════════════════════════════════════════════ */
function TabMateriais({ profile }) {
  const cid = profile?.clinica_id
  const [materiais, setMateriais] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)

  /* filters */
  const [fStatus, setFStatus] = useState('')
  const [fSetor, setFSetor] = useState('')
  const [fCiclo, setFCiclo] = useState('')
  const [fDataIni, setFDataIni] = useState('')
  const [fDataFim, setFDataFim] = useState('')

  const blank = {
    ciclo_id: '', descricao: '', quantidade: 1,
    pacote_numero: '', data_validade: '', setor_destino: '',
    paciente_id: '', status: 'embalado',
  }
  const [form, setForm] = useState(blank)

  const fetchAll = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    const [mRes, cRes, pRes] = await Promise.all([
      supabase.from('materiais_esterilizacao').select('*').eq('clinica_id', cid).order('criado_em', { ascending: false }).limit(500),
      supabase.from('ciclos_esterilizacao').select('id, numero_ciclo, metodo, equipamento, status').eq('clinica_id', cid).order('criado_em', { ascending: false }).limit(200),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', cid).order('nome').limit(500),
    ])
    setMateriais(mRes.data || [])
    setCiclos(cRes.data || [])
    setPacientes(pRes.data || [])
    setLoading(false)
  }, [cid])

  useEffect(() => { fetchAll() }, [fetchAll])

  const cicloMap = Object.fromEntries(ciclos.map(c => [c.id, c]))
  const pacienteMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  const setores = [...new Set(materiais.map(m => m.setor_destino).filter(Boolean))].sort()

  const filtered = materiais.filter(m => {
    if (fStatus && m.status !== fStatus) return false
    if (fSetor && m.setor_destino !== fSetor) return false
    if (fCiclo && m.ciclo_id !== fCiclo) return false
    if (fDataIni && m.data_validade && m.data_validade < fDataIni) return false
    if (fDataFim && m.data_validade && m.data_validade > fDataFim) return false
    return true
  })

  async function saveMaterial() {
    setSaving(true)
    const payload = {
      clinica_id: cid,
      ciclo_id: form.ciclo_id || null,
      descricao: form.descricao,
      quantidade: Number(form.quantidade) || 1,
      pacote_numero: form.pacote_numero || null,
      data_validade: form.data_validade || null,
      setor_destino: form.setor_destino || null,
      paciente_id: form.paciente_id || null,
      status: form.status || 'embalado',
    }
    const { error } = await supabase.from('materiais_esterilizacao').insert(payload)
    setSaving(false)
    if (!error) { setModal(false); setForm(blank); fetchAll() }
    else alert('Erro: ' + error.message)
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
        marginBottom: 16, padding: '14px 16px', background: L.surface,
        borderRadius: 10, border: `1px solid ${L.line}`,
      }}>
        <div style={{ flex: '1 1 140px' }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>STATUS</div>
          <select style={{ ...inp, padding: '7px 10px' }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="embalado">Embalado</option>
            <option value="esterilizado">Esterilizado</option>
            <option value="distribuido">Distribuído</option>
            <option value="usado">Usado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>SETOR DESTINO</div>
          <select style={{ ...inp, padding: '7px 10px' }} value={fSetor} onChange={e => setFSetor(e.target.value)}>
            <option value="">Todos</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>CICLO</div>
          <select style={{ ...inp, padding: '7px 10px' }} value={fCiclo} onChange={e => setFCiclo(e.target.value)}>
            <option value="">Todos</option>
            {ciclos.map(c => <option key={c.id} value={c.id}>{c.numero_ciclo} — {c.equipamento}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>VALIDADE DE</div>
          <input style={{ ...inp, padding: '7px 10px' }} type="date" value={fDataIni} onChange={e => setFDataIni(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>VALIDADE ATÉ</div>
          <input style={{ ...inp, padding: '7px 10px' }} type="date" value={fDataFim} onChange={e => setFDataFim(e.target.value)} />
        </div>
        {(fStatus || fSetor || fCiclo || fDataIni || fDataFim) && (
          <button
            onClick={() => { setFStatus(''); setFSetor(''); setFCiclo(''); setFDataIni(''); setFDataFim('') }}
            style={{ background: 'none', border: 'none', color: L.teal, fontSize: 13, cursor: 'pointer', fontWeight: 500, padding: '4px 6px', alignSelf: 'flex-end' }}
          >Limpar</button>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: L.t3 }}>{filtered.length} material(is)</div>
        <BtnPrimary onClick={() => { setForm(blank); setModal(true) }}>+ Registrar Material</BtnPrimary>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t4, fontSize: 14 }}>Nenhum material encontrado.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                {['Pacote', 'Descrição', 'Qtd', 'Ciclo', 'Método', 'Validade', 'Setor Destino', 'Status', 'Paciente'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const ciclo = cicloMap[m.ciclo_id]
                const pac = pacienteMap[m.paciente_id]
                const vencido = isVencido(m.data_validade)
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}
                    onMouseEnter={e => e.currentTarget.style.background = L.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: L.teal }}>{m.pacote_numero || '—'}</td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>{m.descricao}</td>
                    <td style={{ padding: '10px 12px', color: L.t3 }}>{m.quantidade}</td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      {ciclo ? ciclo.numero_ciclo : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {ciclo ? <MetodoBadge metodo={ciclo.metodo} /> : <span style={{ color: L.t4, fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: vencido ? L.red : L.t3, fontWeight: vencido ? 700 : 400 }}>
                      {fmtDate(m.data_validade)}
                      {vencido && <span style={{ marginLeft: 4, fontSize: 10, color: L.red }}>VENCIDO</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t3 }}>{m.setor_destino || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><StatusMaterialBadge status={m.status} /></td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>
                      {pac ? pac.nome : <span style={{ color: L.t4 }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Registrar Material */}
      {modal && (
        <Modal title="Registrar Material" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="CICLO DE ESTERILIZAÇÃO">
              <select style={inp} value={form.ciclo_id}
                onChange={e => setForm(f => ({ ...f, ciclo_id: e.target.value }))}
              >
                <option value="">Selecione o ciclo...</option>
                {ciclos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero_ciclo} — {c.equipamento} ({METODO_MAP[c.metodo]?.label || c.metodo})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="DESCRIÇÃO DO MATERIAL *">
              <input style={inp} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                onFocus={focus} onBlur={blur}
                placeholder="Ex: Kit cirúrgico básico"
              />
            </Field>
            <Row2>
              <Field label="QUANTIDADE">
                <input style={inp} type="number" min="1" value={form.quantidade}
                  onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                />
              </Field>
              <Field label="NÚMERO DO PACOTE">
                <input style={inp} value={form.pacote_numero}
                  onChange={e => setForm(f => ({ ...f, pacote_numero: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: PKG-001"
                />
              </Field>
            </Row2>
            <Row2>
              <Field label="DATA DE VALIDADE">
                <input style={inp} type="date" value={form.data_validade}
                  onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                />
              </Field>
              <Field label="SETOR DESTINO">
                <input style={inp} value={form.setor_destino}
                  onChange={e => setForm(f => ({ ...f, setor_destino: e.target.value }))}
                  onFocus={focus} onBlur={blur}
                  placeholder="Ex: Centro Cirúrgico"
                />
              </Field>
            </Row2>
            <Field label="STATUS">
              <select style={inp} value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="embalado">Embalado</option>
                <option value="esterilizado">Esterilizado</option>
                <option value="distribuido">Distribuído</option>
                <option value="usado">Usado</option>
                <option value="vencido">Vencido</option>
              </select>
            </Field>
            <Field label="PACIENTE VINCULADO (OPCIONAL)">
              <select style={inp} value={form.paciente_id}
                onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}
              >
                <option value="">Nenhum</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <BtnSecondary onClick={() => setModal(false)}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={saveMaterial} loading={saving}
                disabled={!form.descricao}
              >Registrar</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   TAB 2 — RASTREABILIDADE
   ════════════════════════════════════════════════════════════════════════════ */
function TabRastreabilidade({ profile }) {
  const cid = profile?.clinica_id
  const [mode, setMode] = useState('paciente') // 'paciente' | 'pacote'
  const [pacientes, setPacientes] = useState([])
  const [selectedPaciente, setSelectedPaciente] = useState('')
  const [pacoteQuery, setPacoteQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!cid) return
    supabase.from('pacientes').select('id, nome').eq('clinica_id', cid).order('nome').limit(500)
      .then(({ data }) => setPacientes(data || []))
  }, [cid])

  async function buscarPorPaciente() {
    if (!selectedPaciente) return
    setLoading(true)
    setSearched(false)
    const { data: mats } = await supabase
      .from('materiais_esterilizacao')
      .select('*')
      .eq('clinica_id', cid)
      .eq('paciente_id', selectedPaciente)
      .order('criado_em', { ascending: false })

    if (!mats || mats.length === 0) { setResults([]); setLoading(false); setSearched(true); return }

    const cicloIds = [...new Set(mats.map(m => m.ciclo_id).filter(Boolean))]
    const { data: ciclos } = cicloIds.length > 0
      ? await supabase.from('ciclos_esterilizacao').select('*').in('id', cicloIds)
      : { data: [] }

    const cicloMap = Object.fromEntries((ciclos || []).map(c => [c.id, c]))
    setResults(mats.map(m => ({ material: m, ciclo: cicloMap[m.ciclo_id] || null })))
    setLoading(false)
    setSearched(true)
  }

  async function buscarPorPacote() {
    const q = pacoteQuery.trim()
    if (!q) return
    setLoading(true)
    setSearched(false)
    const { data: mats } = await supabase
      .from('materiais_esterilizacao')
      .select('*')
      .eq('clinica_id', cid)
      .ilike('pacote_numero', `%${q}%`)
      .order('criado_em', { ascending: false })

    if (!mats || mats.length === 0) { setResults([]); setLoading(false); setSearched(true); return }

    const cicloIds = [...new Set(mats.map(m => m.ciclo_id).filter(Boolean))]
    const { data: ciclos } = cicloIds.length > 0
      ? await supabase.from('ciclos_esterilizacao').select('*').in('id', cicloIds)
      : { data: [] }

    const pacIds = [...new Set(mats.map(m => m.paciente_id).filter(Boolean))]
    const { data: pacs } = pacIds.length > 0
      ? await supabase.from('pacientes').select('id, nome').in('id', pacIds)
      : { data: [] }

    const cicloMap = Object.fromEntries((ciclos || []).map(c => [c.id, c]))
    const pacMap = Object.fromEntries((pacs || []).map(p => [p.id, p]))
    setResults(mats.map(m => ({
      material: m,
      ciclo: cicloMap[m.ciclo_id] || null,
      paciente: pacMap[m.paciente_id] || null,
    })))
    setLoading(false)
    setSearched(true)
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '16px 20px', background: L.surface, borderRadius: 10,
        border: `1px solid ${L.line}`, marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, marginBottom: 4 }}>
          Rastreabilidade de Materiais Esterilizados
        </div>
        <div style={{ fontSize: 12, color: L.t3 }}>
          Use esta ferramenta para auditorias de infecção, investigação de incidentes e conformidade com ANVISA/SOBECC.
        </div>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: `1.5px solid ${L.line}`, width: 'fit-content' }}>
        {[
          { key: 'paciente', label: 'Por Paciente' },
          { key: 'pacote',   label: 'Por Número de Pacote' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => { setMode(opt.key); setResults([]); setSearched(false) }}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 500,
              background: mode === opt.key ? L.teal : L.bg,
              color: mode === opt.key ? L.white : L.t2,
              border: 'none', cursor: 'pointer',
            }}
          >{opt.label}</button>
        ))}
      </div>

      {/* Search panel */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-end',
        marginBottom: 24, padding: '16px', background: L.surface,
        borderRadius: 10, border: `1px solid ${L.line}`,
      }}>
        {mode === 'paciente' ? (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>SELECIONAR PACIENTE</div>
              <select style={inp} value={selectedPaciente} onChange={e => setSelectedPaciente(e.target.value)}>
                <option value="">Selecione um paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <BtnPrimary onClick={buscarPorPaciente} loading={loading} disabled={!selectedPaciente}>
              Buscar
            </BtnPrimary>
          </>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>NÚMERO DO PACOTE</div>
              <input
                style={inp} value={pacoteQuery}
                onChange={e => setPacoteQuery(e.target.value)}
                onFocus={focus} onBlur={blur}
                onKeyDown={e => e.key === 'Enter' && buscarPorPacote()}
                placeholder="Ex: PKG-001"
              />
            </div>
            <BtnPrimary onClick={buscarPorPacote} loading={loading} disabled={!pacoteQuery.trim()}>
              Buscar
            </BtnPrimary>
          </>
        )}
      </div>

      {/* Results */}
      {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: L.t4, fontSize: 14 }}>
          Nenhum material encontrado para esta busca.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: L.t3, fontWeight: 500 }}>
            {results.length} resultado(s) encontrado(s)
          </div>
          {results.map(({ material: m, ciclo, paciente }) => (
            <div key={m.id} style={{
              border: `1px solid ${L.line}`, borderRadius: 12,
              overflow: 'hidden', background: L.bg,
            }}>
              {/* Material header */}
              <div style={{
                padding: '12px 16px', background: L.surface,
                borderBottom: `1px solid ${L.line}`,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: L.teal, fontWeight: 700 }}>
                  {m.pacote_numero || 'S/N'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{m.descricao}</span>
                <StatusMaterialBadge status={m.status} />
                {isVencido(m.data_validade) && (
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: L.redBg, color: L.red, border: `1px solid ${L.redBd}` }}>VENCIDO</span>
                )}
              </div>

              {/* Traceability chain */}
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Material info */}
                  <TraceBlock icon="📦" label="Material" items={[
                    { k: 'Qtd', v: m.quantidade },
                    { k: 'Validade', v: fmtDate(m.data_validade) },
                    { k: 'Setor', v: m.setor_destino || '—' },
                    { k: 'Registrado', v: fmtDT(m.criado_em) },
                  ]} />

                  {/* Ciclo info */}
                  {ciclo ? (
                    <TraceBlock icon="⚙️" label="Ciclo de Esterilização" highlight items={[
                      { k: 'Nº Ciclo', v: ciclo.numero_ciclo },
                      { k: 'Equipamento', v: ciclo.equipamento },
                      { k: 'Método', v: METODO_MAP[ciclo.metodo]?.label || ciclo.metodo },
                      { k: 'Operador', v: ciclo.operador || '—' },
                    ]} />
                  ) : (
                    <TraceBlock icon="⚙️" label="Ciclo de Esterilização" items={[{ k: 'Ciclo', v: 'Não vinculado' }]} />
                  )}

                  {/* Processo */}
                  {ciclo && (
                    <TraceBlock icon="🌡️" label="Parâmetros do Processo" items={[
                      { k: 'Temperatura', v: ciclo.temperatura ? `${ciclo.temperatura}°C` : '—' },
                      { k: 'Pressão', v: ciclo.pressao ? `${ciclo.pressao} bar` : '—' },
                      { k: 'Tempo', v: ciclo.tempo_minutos ? `${ciclo.tempo_minutos} min` : '—' },
                      { k: 'Duração real', v: calcDuracao(ciclo.data_hora_inicio, ciclo.data_hora_fim) },
                    ]} />
                  )}

                  {/* Indicadores */}
                  {ciclo && (
                    <TraceBlock icon="🧪" label="Indicadores" items={[
                      { k: 'Início', v: fmtDT(ciclo.data_hora_inicio) },
                      { k: 'Fim', v: fmtDT(ciclo.data_hora_fim) },
                      { k: 'Ind. Químico', v: ciclo.indicador_quimico ? (INDICADOR_MAP[ciclo.indicador_quimico]?.label) : '—', color: ciclo.indicador_quimico === 'aprovado' ? L.green : ciclo.indicador_quimico === 'reprovado' ? L.red : L.yellow },
                      { k: 'Ind. Biológico', v: ciclo.indicador_biologico ? (INDICADOR_MAP[ciclo.indicador_biologico]?.label) : '—', color: ciclo.indicador_biologico === 'aprovado' ? L.green : ciclo.indicador_biologico === 'reprovado' ? L.red : L.yellow },
                    ]} />
                  )}

                  {/* Paciente */}
                  {(paciente || m.paciente_id) && (
                    <TraceBlock icon="👤" label="Paciente" items={[
                      { k: 'Nome', v: paciente?.nome || m.paciente_id },
                    ]} />
                  )}

                  {/* Observações */}
                  {ciclo?.observacoes && (
                    <TraceBlock icon="📋" label="Observações do Ciclo" items={[
                      { k: 'Obs', v: ciclo.observacoes },
                    ]} />
                  )}
                </div>

                {/* Status final do ciclo */}
                {ciclo && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>STATUS DO CICLO:</span>
                    <StatusCicloBadge status={ciclo.status} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: 56, color: L.t4, fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          Selecione um paciente ou informe o número do pacote para iniciar a rastreabilidade.
        </div>
      )}
    </div>
  )
}

/* Traceability block helper */
function TraceBlock({ icon, label, items, highlight }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: highlight ? L.tealBg : L.surface,
      border: `1px solid ${highlight ? `${L.teal}30` : L.line}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: highlight ? L.teal : L.t3, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
        <span>{icon}</span> {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(({ k, v, color }) => (
          <div key={k} style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 11, color: L.t4, minWidth: 80, flexShrink: 0 }}>{k}:</span>
            <span style={{ fontSize: 12, color: color || L.t2, fontWeight: color ? 600 : 400, wordBreak: 'break-word' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT PAGE
   ════════════════════════════════════════════════════════════════════════════ */
export default function PageEsterilizacao({ profile }) {
  const [tab, setTab] = useState(0)

  const TABS = [
    { label: 'Ciclos',           icon: '⚙️' },
    { label: 'Materiais',        icon: '📦' },
    { label: 'Rastreabilidade',  icon: '🔍' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>
          Central de Esterilização
        </h1>
        <p style={{ fontSize: 13, color: L.t3, margin: '4px 0 0' }}>
          Controle de ciclos, rastreabilidade de materiais e conformidade ANVISA/SOBECC
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: `2px solid ${L.line}`,
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabCiclos profile={profile} />}
      {tab === 1 && <TabMateriais profile={profile} />}
      {tab === 2 && <TabRastreabilidade profile={profile} />}
    </div>
  )
}
