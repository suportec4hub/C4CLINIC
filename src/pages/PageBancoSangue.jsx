import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Animations ─────────────────────────────────────────────────────────── */
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

/* ─── Shared UI helpers ───────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const focus = e => { e.target.style.borderColor = L.teal }
const blur  = e => { e.target.style.borderColor = L.line }

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

function Row2({ cols = 2, gap = 12, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {children}
    </div>
  )
}

function Spinner({ size = 18 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2.5px solid ${L.teal}30`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
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
        color: L.white, fontWeight: 600, fontSize: 14, border: 'none',
        borderRadius: 8, padding: '10px 20px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, ...style,
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
        background: 'transparent', color: L.t2, fontWeight: 500, fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '9px 16px',
        cursor: 'pointer', ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ─── Bottom-sheet modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 600 }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
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
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const TIPOS_HEMO = [
  { value: 'concentrado_hemacias', label: 'Concentrado de Hemácias' },
  { value: 'plasma_fresco',        label: 'Plasma Fresco Congelado' },
  { value: 'plaquetas',            label: 'Plaquetas' },
  { value: 'crioprecipitado',      label: 'Crioprecipitado' },
  { value: 'sangue_total',         label: 'Sangue Total' },
  { value: 'albumina',             label: 'Albumina' },
]

const STATUS_HEMO = [
  { value: 'disponivel',   label: 'Disponível' },
  { value: 'reservado',    label: 'Reservado' },
  { value: 'transfundido', label: 'Transfundido' },
  { value: 'vencido',      label: 'Vencido' },
  { value: 'descartado',   label: 'Descartado' },
]

const URGENCIAS = [
  { value: 'eletiva',    label: 'Eletiva' },
  { value: 'urgencia',   label: 'Urgência' },
  { value: 'emergencia', label: 'Emergência' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/* Blood type compatibility matrix: recipient -> compatible donors */
const COMPATIBILITY = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
}

/* Blood type badge colors */
function bloodTypeColor(bt) {
  const map = {
    'O-':  { bg: '#7f1d1d', color: '#fff' },
    'O+':  { bg: '#b91c1c', color: '#fff' },
    'A+':  { bg: '#ef4444', color: '#fff' },
    'A-':  { bg: '#fca5a5', color: '#7f1d1d' },
    'B+':  { bg: '#2563eb', color: '#fff' },
    'B-':  { bg: '#93c5fd', color: '#1e3a8a' },
    'AB+': { bg: '#7c3aed', color: '#fff' },
    'AB-': { bg: '#c4b5fd', color: '#4c1d95' },
  }
  return map[bt] || { bg: L.surface, color: L.t2 }
}

function tipoLabel(v) { return TIPOS_HEMO.find(t => t.value === v)?.label || v }
function urgLabel(v)  { return URGENCIAS.find(u => u.value === v)?.label || v }
function statusLabel(v) { return STATUS_HEMO.find(s => s.value === v)?.label || v }

function today() { return new Date().toISOString().slice(0, 10) }

function isoToDisplay(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const now = new Date(); now.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d - now) / 86400000)
}

/* ─── Badge helpers ───────────────────────────────────────────────────────── */
function StatusBadge({ value }) {
  const cfg = {
    disponivel:   { bg: L.greenBg,   color: L.green,  border: L.greenBd },
    reservado:    { bg: L.yellowBg,  color: L.yellow, border: L.yellowBd },
    transfundido: { bg: L.surface,   color: L.t3,     border: L.line },
    vencido:      { bg: L.redBg,     color: L.red,    border: L.redBd },
    descartado:   { bg: L.surface,   color: L.t4,     border: L.line },
  }[value] || { bg: L.surface, color: L.t3, border: L.line }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>{statusLabel(value)}</span>
  )
}

function UrgBadge({ value }) {
  const cfg = {
    eletiva:    { bg: L.blueBg,   color: L.blue,   border: L.blueBd, pulse: false },
    urgencia:   { bg: L.orangeBg, color: L.orange, border: L.orangeBd, pulse: false },
    emergencia: { bg: L.redBg,    color: L.red,    border: L.redBd,   pulse: true },
  }[value] || { bg: L.surface, color: L.t3, border: L.line, pulse: false }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.5px',
      animation: cfg.pulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
    }}>{urgLabel(value)}</span>
  )
}

function SolStatusBadge({ value }) {
  const cfg = {
    pendente:  { bg: L.yellowBg, color: L.yellow, border: L.yellowBd },
    atendida:  { bg: L.greenBg,  color: L.green,  border: L.greenBd },
    parcial:   { bg: L.blueBg,   color: L.blue,   border: L.blueBd },
    cancelada: { bg: L.surface,  color: L.t4,     border: L.line },
  }[value] || { bg: L.surface, color: L.t3, border: L.line }
  const labels = { pendente: 'Pendente', atendida: 'Atendida', parcial: 'Parcial', cancelada: 'Cancelada' }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>{labels[value] || value}</span>
  )
}

function TipoBadge({ value }) {
  const short = {
    concentrado_hemacias: 'CH',
    plasma_fresco:        'PFC',
    plaquetas:            'PLQ',
    crioprecipitado:      'CRIO',
    sangue_total:         'ST',
    albumina:             'ALB',
  }[value] || value.slice(0,3).toUpperCase()
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}30`,
      letterSpacing: '0.4px',
    }}>{short}</span>
  )
}

/* ─── Blood Type Card ─────────────────────────────────────────────────────── */
function BloodTypeCard({ bt, items }) {
  const avail    = items.filter(i => i.status === 'disponivel').length
  const expiring = items.filter(i => { const d = daysUntil(i.data_validade); return d !== null && d >= 0 && d <= 7 && i.status === 'disponivel' }).length
  const expired  = items.filter(i => i.status === 'vencido').length
  const byTipo   = {}
  TIPOS_HEMO.forEach(t => { byTipo[t.value] = items.filter(i => i.tipo === t.value && i.status === 'disponivel').length })
  const { bg, color } = bloodTypeColor(bt)
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ background: bg, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{bt}</span>
        <span style={{ fontSize: 28, fontWeight: 900, color, opacity: 0.9 }}>{avail}</span>
      </div>
      <div style={{ padding: '10px 14px', flex: 1 }}>
        {expiring > 0 && (
          <div style={{ fontSize: 11, color: L.yellow, fontWeight: 600, marginBottom: 4 }}>
            ⚠ {expiring} venc. em 7 dias
          </div>
        )}
        {expired > 0 && (
          <div style={{ fontSize: 11, color: L.red, fontWeight: 600, marginBottom: 4 }}>
            ✕ {expired} vencido(s)
          </div>
        )}
        {Object.entries(byTipo).map(([tipo, qty]) => qty > 0 ? (
          <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: L.t3, marginBottom: 2 }}>
            <span>{TIPOS_HEMO.find(t => t.value === tipo)?.label.split(' ')[0]}</span>
            <span style={{ fontWeight: 600, color: L.t2 }}>{qty}</span>
          </div>
        ) : null)}
        {avail === 0 && expired === 0 && expiring === 0 && (
          <div style={{ fontSize: 11, color: L.t4, fontStyle: 'italic' }}>Sem estoque</div>
        )}
      </div>
    </div>
  )
}

/* ─── Tab 0 – Estoque ─────────────────────────────────────────────────────── */
function TabEstoque({ clinicaId }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [marking, setMarking]   = useState(false)
  const [form, setForm]         = useState({
    tipo: 'concentrado_hemacias', tipo_sanguineo: 'O+', quantidade: 1,
    lote: '', data_coleta: today(), data_validade: '', origem: '', status: 'disponivel',
  })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hemocomponentes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const markExpired = async () => {
    setMarking(true)
    const todayStr = today()
    const ids = items.filter(i => i.data_validade && i.data_validade < todayStr && i.status === 'disponivel').map(i => i.id)
    if (ids.length > 0) {
      await supabase.from('hemocomponentes').update({ status: 'vencido' }).in('id', ids)
      await load()
    }
    setMarking(false)
  }

  const save = async () => {
    if (!form.data_validade) { setErr('Data de validade obrigatória'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('hemocomponentes').insert({
      ...form,
      quantidade: Number(form.quantidade),
      clinica_id: clinicaId,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setShowAdd(false)
    setForm({ tipo: 'concentrado_hemacias', tipo_sanguineo: 'O+', quantidade: 1, lote: '', data_coleta: today(), data_validade: '', origem: '', status: 'disponivel' })
    load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      {/* Blood type grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {BLOOD_TYPES.map(bt => (
          <BloodTypeCard key={bt} bt={bt} items={items.filter(i => i.tipo_sanguineo === bt)} />
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <BtnPrimary onClick={() => setShowAdd(true)}>+ Entrada de Hemocomponente</BtnPrimary>
        <BtnSecondary onClick={markExpired} disabled={marking}>
          {marking ? <Spinner size={14} /> : null} Marcar Vencidos
        </BtnSecondary>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Tipo','Tipo Sang.','Qtd','Lote','Coleta','Validade','Origem','Status'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Nenhum hemocomponente cadastrado.</td></tr>
              )}
              {items.map(item => {
                const days = daysUntil(item.data_validade)
                const valColor = days === null ? L.t3 : days < 0 ? L.red : days <= 7 ? L.yellow : L.green
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '10px 12px' }}><TipoBadge value={item.tipo} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                        background: bloodTypeColor(item.tipo_sanguineo).bg,
                        color: bloodTypeColor(item.tipo_sanguineo).color,
                      }}>{item.tipo_sanguineo}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: L.t1 }}>{item.quantidade}</td>
                    <td style={{ padding: '10px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{item.lote || '—'}</td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>{isoToDisplay(item.data_coleta)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 12, color: valColor }}>{isoToDisplay(item.data_validade)}</td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>{item.origem || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge value={item.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Entrada de Hemocomponente" onClose={() => { setShowAdd(false); setErr('') }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row2>
              <Field label="Tipo de Hemocomponente">
                <select value={form.tipo} onChange={e => f('tipo', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  {TIPOS_HEMO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Tipo Sanguíneo">
                <select value={form.tipo_sanguineo} onChange={e => f('tipo_sanguineo', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </Field>
            </Row2>
            <Row2>
              <Field label="Quantidade (bolsas)">
                <input type="number" min={1} value={form.quantidade} onChange={e => f('quantidade', e.target.value)} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Lote">
                <input value={form.lote} onChange={e => f('lote', e.target.value)} style={inp} onFocus={focus} onBlur={blur} placeholder="Ex: LOT-2024-001" />
              </Field>
            </Row2>
            <Row2>
              <Field label="Data de Coleta">
                <input type="date" value={form.data_coleta} onChange={e => f('data_coleta', e.target.value)} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Data de Validade *">
                <input type="date" value={form.data_validade} onChange={e => f('data_validade', e.target.value)} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
            </Row2>
            <Field label="Origem / Procedência">
              <input value={form.origem} onChange={e => f('origem', e.target.value)} style={inp} onFocus={focus} onBlur={blur} placeholder="Hemocentro, doador, etc." />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => f('status', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                {STATUS_HEMO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <BtnSecondary onClick={() => { setShowAdd(false); setErr('') }}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={save} loading={saving}>Registrar Entrada</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─── Tab 1 – Solicitações ────────────────────────────────────────────────── */
function TabSolicitacoes({ clinicaId }) {
  const [sols, setSols]         = useState([])
  const [pacientes, setPac]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [atender, setAtender]   = useState(null) // solicitacao being served
  const [dispUnits, setDisp]    = useState([])
  const [form, setForm]         = useState({
    paciente_id: '', medico_solicitante: '', tipo_hemocomponente: 'concentrado_hemacias',
    tipo_sanguineo: 'O+', quantidade_solicitada: 1, urgencia: 'eletiva', observacoes: '',
  })
  const [atForm, setAtForm]     = useState({ hemocomponente_id: '', quantidade_atendida: 1 })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('solicitacoes_sangue').select('*, pacientes(nome)').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
    ])
    setSols(s || [])
    setPac(p || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const openAtender = async sol => {
    const { data } = await supabase
      .from('hemocomponentes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('tipo', sol.tipo_hemocomponente)
      .eq('tipo_sanguineo', sol.tipo_sanguineo)
      .eq('status', 'disponivel')
    setDisp(data || [])
    setAtForm({ hemocomponente_id: data?.[0]?.id || '', quantidade_atendida: sol.quantidade_solicitada })
    setAtender(sol)
  }

  const doAtender = async () => {
    if (!atForm.hemocomponente_id) { setErr('Selecione um hemocomponente'); return }
    setSaving(true); setErr('')
    const qty = Number(atForm.quantidade_atendida)
    const solQty = atender.quantidade_solicitada
    const newStatus = qty >= solQty ? 'atendida' : 'parcial'
    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('solicitacoes_sangue').update({
        status: newStatus,
        quantidade_atendida: qty,
        hemocomponente_id: atForm.hemocomponente_id,
        data_atendimento: now,
      }).eq('id', atender.id),
      supabase.from('hemocomponentes').update({ status: 'reservado' }).eq('id', atForm.hemocomponente_id),
    ])
    setSaving(false)
    setAtender(null)
    load()
  }

  const salvarSol = async () => {
    if (!form.paciente_id) { setErr('Selecione o paciente'); return }
    if (!form.medico_solicitante) { setErr('Informe o médico solicitante'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('solicitacoes_sangue').insert({
      ...form,
      quantidade_solicitada: Number(form.quantidade_solicitada),
      quantidade_atendida: 0,
      clinica_id: clinicaId,
      status: 'pendente',
      data_solicitacao: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setShowNew(false)
    setForm({ paciente_id: '', medico_solicitante: '', tipo_hemocomponente: 'concentrado_hemacias', tipo_sanguineo: 'O+', quantidade_solicitada: 1, urgencia: 'eletiva', observacoes: '' })
    load()
  }

  const f  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const af = (k, v) => setAtForm(p => ({ ...p, [k]: v }))

  const todayStr = today()
  const pendentes       = sols.filter(s => s.status === 'pendente').length
  const urgencias       = sols.filter(s => s.status === 'pendente' && (s.urgencia === 'urgencia' || s.urgencia === 'emergencia')).length
  const atendHoje       = sols.filter(s => s.data_atendimento?.slice(0,10) === todayStr).length
  const totalAtend      = sols.filter(s => s.status !== 'cancelada').length
  const totalAtendidas  = sols.filter(s => s.status === 'atendida').length
  const taxa            = totalAtend > 0 ? Math.round((totalAtendidas / totalAtend) * 100) : 0

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pendentes',         value: pendentes,  color: L.yellow },
          { label: 'Urgências',         value: urgencias,  color: L.red },
          { label: 'Atendidas hoje',    value: atendHoje,  color: L.green },
          { label: 'Taxa de atendimento', value: `${taxa}%`, color: L.teal },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <BtnPrimary onClick={() => setShowNew(true)}>+ Nova Solicitação</BtnPrimary>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Paciente','Médico','Tipo','Tipo Sang.','Qtd Sol./Atend.','Urgência','Status','Data','Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sols.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Nenhuma solicitação registrada.</td></tr>
              )}
              {sols.map(sol => (
                <tr key={sol.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '10px 12px', color: L.t1, fontWeight: 500 }}>{sol.pacientes?.nome || '—'}</td>
                  <td style={{ padding: '10px 12px', color: L.t2, fontSize: 12 }}>{sol.medico_solicitante}</td>
                  <td style={{ padding: '10px 12px' }}><TipoBadge value={sol.tipo_hemocomponente} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: bloodTypeColor(sol.tipo_sanguineo).bg,
                      color: bloodTypeColor(sol.tipo_sanguineo).color,
                    }}>{sol.tipo_sanguineo}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: L.t1, fontWeight: 600 }}>
                    {sol.quantidade_solicitada} / <span style={{ color: sol.quantidade_atendida >= sol.quantidade_solicitada ? L.green : L.yellow }}>{sol.quantidade_atendida || 0}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}><UrgBadge value={sol.urgencia} /></td>
                  <td style={{ padding: '10px 12px' }}><SolStatusBadge value={sol.status} /></td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontSize: 11 }}>
                    {sol.data_solicitacao ? new Date(sol.data_solicitacao).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {(sol.status === 'pendente' || sol.status === 'parcial') && (
                      <button
                        onClick={() => openAtender(sol)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                          background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}30`, cursor: 'pointer',
                        }}
                      >Atender</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nova solicitação */}
      {showNew && (
        <Modal title="Nova Solicitação de Sangue" onClose={() => { setShowNew(false); setErr('') }} maxWidth={640}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Paciente">
              <select value={form.paciente_id} onChange={e => f('paciente_id', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                <option value="">Selecione o paciente</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="Médico Solicitante">
              <input value={form.medico_solicitante} onChange={e => f('medico_solicitante', e.target.value)} style={inp} onFocus={focus} onBlur={blur} placeholder="Nome do médico" />
            </Field>
            <Row2>
              <Field label="Tipo de Hemocomponente">
                <select value={form.tipo_hemocomponente} onChange={e => f('tipo_hemocomponente', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  {TIPOS_HEMO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Tipo Sanguíneo">
                <select value={form.tipo_sanguineo} onChange={e => f('tipo_sanguineo', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </Field>
            </Row2>
            <Row2>
              <Field label="Quantidade Solicitada">
                <input type="number" min={1} value={form.quantidade_solicitada} onChange={e => f('quantidade_solicitada', e.target.value)} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Urgência">
                <select value={form.urgencia} onChange={e => f('urgencia', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  {URGENCIAS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </Field>
            </Row2>
            <Field label="Observações">
              <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} style={{ ...inp, minHeight: 72, resize: 'vertical' }} onFocus={focus} onBlur={blur} placeholder="Informações adicionais..." />
            </Field>
            {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <BtnSecondary onClick={() => { setShowNew(false); setErr('') }}>Cancelar</BtnSecondary>
              <BtnPrimary onClick={salvarSol} loading={saving}>Registrar Solicitação</BtnPrimary>
            </div>
          </div>
        </Modal>
      )}

      {/* Atender modal */}
      {atender && (
        <Modal title="Atender Solicitação" onClose={() => { setAtender(null); setErr('') }} maxWidth={560}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: L.surface, borderRadius: 10, border: `1px solid ${L.line}` }}>
            <div style={{ fontSize: 13, color: L.t2, marginBottom: 4 }}>
              <strong style={{ color: L.t1 }}>{atender.pacientes?.nome}</strong> — {tipoLabel(atender.tipo_hemocomponente)} / {atender.tipo_sanguineo}
            </div>
            <div style={{ fontSize: 12, color: L.t3 }}>Solicitado: {atender.quantidade_solicitada} bolsa(s) · <UrgBadge value={atender.urgencia} /></div>
          </div>

          {dispUnits.length === 0 ? (
            <div style={{ color: L.red, fontSize: 13, padding: '16px 0' }}>
              Nenhuma unidade compatível disponível em estoque.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Unidade a Utilizar">
                <select value={atForm.hemocomponente_id} onChange={e => af('hemocomponente_id', e.target.value)} style={inp} onFocus={focus} onBlur={blur}>
                  <option value="">Selecione</option>
                  {dispUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      Lote {u.lote || 'S/N'} — {u.tipo_sanguineo} — Val: {isoToDisplay(u.data_validade)} ({u.quantidade} bolsa(s))
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantidade Atendida">
                <input type="number" min={1} value={atForm.quantidade_atendida} onChange={e => af('quantidade_atendida', e.target.value)} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <BtnSecondary onClick={() => { setAtender(null); setErr('') }}>Cancelar</BtnSecondary>
                <BtnPrimary onClick={doAtender} loading={saving}>Confirmar Atendimento</BtnPrimary>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ─── Tab 2 – Compatibilidade ─────────────────────────────────────────────── */
function TabCompatibilidade({ clinicaId }) {
  const [selected, setSelected]   = useState('A+')
  const [stock, setStock]         = useState([])
  const [transfHist, setHist]     = useState([])
  const [loadingStock, setLS]     = useState(false)
  const [loadingHist, setLH]      = useState(true)

  useEffect(() => {
    const load = async () => {
      setLH(true)
      const { data } = await supabase
        .from('hemocomponentes')
        .select('*, solicitacoes_sangue(pacientes(nome), data_atendimento, medico_solicitante)')
        .eq('clinica_id', clinicaId)
        .eq('status', 'transfundido')
        .order('criado_em', { ascending: false })
      setHist(data || [])
      setLH(false)
    }
    load()
  }, [clinicaId])

  const consultarEstoque = async () => {
    setLS(true)
    const compatibles = COMPATIBILITY[selected] || []
    if (compatibles.length === 0) { setStock([]); setLS(false); return }
    const { data } = await supabase
      .from('hemocomponentes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('status', 'disponivel')
      .in('tipo_sanguineo', compatibles)
    setStock(data || [])
    setLS(false)
  }

  /* Group stock by tipo */
  const stockByTipo = {}
  TIPOS_HEMO.forEach(t => {
    const units = stock.filter(s => s.tipo === t.value)
    if (units.length > 0) stockByTipo[t.value] = units
  })

  return (
    <div>
      {/* Compatibility matrix */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: L.t1, marginBottom: 4 }}>Matriz de Compatibilidade Transfusional</div>
        <div style={{ fontSize: 12, color: L.t3, marginBottom: 16 }}>Linha = Receptor · Coluna = Doador</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', background: L.surface, border: `1px solid ${L.line}`, color: L.t3, fontWeight: 600, minWidth: 56 }}>Rec \ Doa</th>
                {BLOOD_TYPES.map(bt => {
                  const { bg, color } = bloodTypeColor(bt)
                  return (
                    <th key={bt} style={{
                      padding: '8px 12px', background: bg, border: `1px solid ${L.line}`,
                      color, fontWeight: 700, textAlign: 'center', minWidth: 52,
                    }}>{bt}</th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {BLOOD_TYPES.map(rec => {
                const { bg, color } = bloodTypeColor(rec)
                return (
                  <tr key={rec}>
                    <td style={{
                      padding: '8px 12px', background: bg, border: `1px solid ${L.line}`,
                      color, fontWeight: 700, textAlign: 'center',
                    }}>{rec}</td>
                    {BLOOD_TYPES.map(donor => {
                      const ok = COMPATIBILITY[rec]?.includes(donor)
                      return (
                        <td key={donor} style={{
                          padding: '8px 12px', textAlign: 'center', border: `1px solid ${L.line}`,
                          background: ok ? L.greenBg : L.redBg,
                          color: ok ? L.green : L.red,
                          fontSize: 16, fontWeight: 700,
                        }}>{ok ? '✓' : '✗'}</td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consultar estoque compatível */}
      <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 12 }}>Consultar Estoque Compatível</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: L.t4, display: 'block', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>Tipo Sanguíneo do Paciente (Receptor)</label>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              style={{ ...inp, width: 'auto', minWidth: 100 }}
              onFocus={focus} onBlur={blur}
            >
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <BtnPrimary onClick={consultarEstoque} loading={loadingStock} style={{ marginTop: 20 }}>
            Consultar
          </BtnPrimary>
        </div>

        {stock.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: L.t3, marginBottom: 12 }}>
              Tipos compatíveis: {(COMPATIBILITY[selected] || []).map(bt => (
                <span key={bt} style={{
                  display: 'inline-block', margin: '0 4px 4px 0', padding: '1px 7px', borderRadius: 6,
                  background: bloodTypeColor(bt).bg, color: bloodTypeColor(bt).color, fontSize: 11, fontWeight: 700,
                }}>{bt}</span>
              ))}
            </div>
            {Object.entries(stockByTipo).map(([tipo, units]) => (
              <div key={tipo} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: L.teal, marginBottom: 6 }}>
                  {tipoLabel(tipo)} — {units.length} unidade(s)
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {units.slice(0, 12).map(u => {
                    const { bg, color } = bloodTypeColor(u.tipo_sanguineo)
                    return (
                      <div key={u.id} style={{
                        padding: '6px 10px', borderRadius: 8, border: `1px solid ${L.line}`,
                        background: L.bg, fontSize: 11, color: L.t2,
                      }}>
                        <span style={{ fontWeight: 700, marginRight: 4, padding: '1px 5px', borderRadius: 4, background: bg, color }}>{u.tipo_sanguineo}</span>
                        Lote {u.lote || 'S/N'} · Val: {isoToDisplay(u.data_validade)}
                      </div>
                    )
                  })}
                  {units.length > 12 && <div style={{ fontSize: 11, color: L.t4, alignSelf: 'center' }}>+{units.length - 12} mais</div>}
                </div>
              </div>
            ))}
            {Object.keys(stockByTipo).length === 0 && (
              <div style={{ fontSize: 13, color: L.t4 }}>Nenhuma unidade disponível para os tipos compatíveis.</div>
            )}
          </div>
        )}
      </div>

      {/* Transfusion history */}
      <div style={{ fontSize: 15, fontWeight: 700, color: L.t1, marginBottom: 12 }}>Histórico de Transfusões</div>
      {loadingHist ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Tipo','Tipo Sang.','Lote','Qtd','Validade','Origem','Data Transfusão'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfHist.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Nenhuma transfusão registrada.</td></tr>
              )}
              {transfHist.map(item => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '10px 12px' }}><TipoBadge value={item.tipo} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: bloodTypeColor(item.tipo_sanguineo).bg,
                      color: bloodTypeColor(item.tipo_sanguineo).color,
                    }}>{item.tipo_sanguineo}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{item.lote || '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: L.t1 }}>{item.quantidade}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>{isoToDisplay(item.data_validade)}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>{item.origem || '—'}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>
                    {item.solicitacoes_sangue?.data_atendimento
                      ? new Date(item.solicitacoes_sangue.data_atendimento).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function PageBancoSangue({ profile }) {
  const [tab, setTab] = useState(0)
  const clinicaId = profile?.clinica_id

  const TABS = [
    { label: 'Estoque de Hemocomponentes', icon: '🩸' },
    { label: 'Solicitações',               icon: '📋' },
    { label: 'Compatibilidade',            icon: '🔬' },
  ]

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 4 }}>Banco de Sangue</div>
        <div style={{ fontSize: 13, color: L.t4 }}>Gestão de hemocomponentes, solicitações e compatibilidade transfusional</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
              color: tab === i ? L.teal : L.t3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? `2.5px solid ${L.teal}` : '2.5px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabEstoque    clinicaId={clinicaId} />}
      {tab === 1 && <TabSolicitacoes clinicaId={clinicaId} />}
      {tab === 2 && <TabCompatibilidade clinicaId={clinicaId} />}
    </div>
  )
}
