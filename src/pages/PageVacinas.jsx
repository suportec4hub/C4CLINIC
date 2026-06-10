import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Keyframes ───────────────────────────────────────────────────── */
const STYLE_TAG = `
  @keyframes up {
    from { transform: translateY(60px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
  }
`

/* ─── Shared style tokens ─────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }
const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
  border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
}
const btnGhost = {
  background: 'none', color: L.t3, fontWeight: 500, fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
}

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

/* ─── Field wrapper ───────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
        textTransform: 'uppercase',
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

/* ─── Helpers ─────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10)

function calcAge(dob) {
  if (!dob) return '—'
  const d = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return `${a} anos`
}

function daysDiff(dateStr) {
  const d = new Date(dateStr)
  const t = new Date(today())
  return Math.round((d - t) / 86400000)
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function nextDoseColor(dateStr) {
  if (!dateStr) return L.t3
  const diff = daysDiff(dateStr)
  if (diff < 0)  return L.red
  if (diff <= 7) return L.yellow
  return L.green
}

function nextDoseBg(dateStr) {
  if (!dateStr) return 'transparent'
  const diff = daysDiff(dateStr)
  if (diff < 0)  return L.redBg
  if (diff <= 7) return L.yellowBg
  return L.greenBg
}

/* ─── Toast ───────────────────────────────────────────────────────── */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 9999,
      background: L.teal, color: L.white, fontWeight: 600,
      borderRadius: 10, padding: '12px 22px', fontSize: 14,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)', animation: 'up 0.25s ease',
    }}>{msg}</div>
  )
}

/* ─── Spinner ─────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `3px solid ${L.line}`, borderTopColor: L.teal,
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

/* ─── KPI card ────────────────────────────────────────────────────── */
function KPI({ label, value, color, bg }) {
  return (
    <div style={{
      background: bg || L.surface, borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${L.line}`, flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1 }}>{value ?? '—'}</div>
    </div>
  )
}

/* ─── Vaccine suggestions ─────────────────────────────────────────── */
const VACCINE_SUGGESTIONS = [
  'COVID-19', 'Influenza', 'Hepatite B', 'Tétano', 'HPV',
  'Pneumocócica', 'Febre Amarela', 'Varicela', 'SCR', 'DTP',
  'Meningocócica', 'Rotavírus',
]

/* ─── Bottom-sheet Modal ──────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: L.surface,
          borderRadius: '16px 16px 0 0', maxHeight: '92vh',
          overflowY: 'auto', animation: 'up 0.25s ease',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0',
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: L.t1 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: L.t3, lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>
        <div style={{ padding: '20px 24px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Register Vaccine Modal ──────────────────────────────────────── */
function ModalRegistrar({ pacientes, onClose, onSaved, clinicaId }) {
  const emptyForm = {
    paciente_id: '', vacina_nome: '', fabricante: '', lote: '', dose: '',
    data_aplicacao: today(), data_proxima_dose: '', profissional_aplicador: '',
    local_aplicacao: '', observacoes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [patSearch, setPatSearch] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredPats = pacientes.filter(p =>
    p.nome.toLowerCase().includes(patSearch.toLowerCase())
  )

  async function save() {
    if (!form.paciente_id) { setErr('Selecione o paciente'); return }
    if (!form.vacina_nome.trim()) { setErr('Informe a vacina'); return }
    if (!form.data_aplicacao) { setErr('Informe a data de aplicação'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('vacinas_registro').insert({
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      vacina_nome: form.vacina_nome.trim(),
      fabricante: form.fabricante.trim(),
      lote: form.lote.trim(),
      dose: form.dose.trim(),
      data_aplicacao: form.data_aplicacao,
      data_proxima_dose: form.data_proxima_dose || null,
      profissional_aplicador: form.profissional_aplicador.trim(),
      local_aplicacao: form.local_aplicacao.trim(),
      observacoes: form.observacoes.trim(),
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Registrar Vacina" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Patient select */}
        <Field label="Paciente *">
          <input
            style={inp} placeholder="Buscar paciente..." value={patSearch}
            onChange={e => { setPatSearch(e.target.value); set('paciente_id', '') }}
            onFocus={focus} onBlur={blur}
          />
          {patSearch && !form.paciente_id && (
            <div style={{
              border: `1.5px solid ${L.line}`, borderRadius: 8, marginTop: 4,
              background: L.surface, maxHeight: 160, overflowY: 'auto',
            }}>
              {filteredPats.length === 0
                ? <div style={{ padding: '10px 12px', color: L.t4, fontSize: 13 }}>Nenhum paciente encontrado</div>
                : filteredPats.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    onClick={() => { set('paciente_id', p.id); setPatSearch(p.nome) }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                      color: L.t1, borderBottom: `1px solid ${L.lineSoft}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = L.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{p.nome} <span style={{ color: L.t4, fontSize: 11 }}>({calcAge(p.data_nascimento)})</span></div>
                ))
              }
            </div>
          )}
        </Field>

        {/* Vaccine name with datalist */}
        <Field label="Vacina *">
          <input
            list="vaccine-list"
            style={inp} placeholder="Nome da vacina" value={form.vacina_nome}
            onChange={e => set('vacina_nome', e.target.value)}
            onFocus={focus} onBlur={blur}
          />
          <datalist id="vaccine-list">
            {VACCINE_SUGGESTIONS.map(v => <option key={v} value={v} />)}
          </datalist>
        </Field>

        <Row2>
          <Field label="Dose">
            <input style={inp} placeholder="Ex: 1ª dose" value={form.dose}
              onChange={e => set('dose', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Fabricante">
            <input style={inp} placeholder="Fabricante" value={form.fabricante}
              onChange={e => set('fabricante', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
        </Row2>

        <Row2>
          <Field label="Lote">
            <input style={inp} placeholder="Número do lote" value={form.lote}
              onChange={e => set('lote', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Local de Aplicação">
            <input style={inp} placeholder="Ex: Deltóide esquerdo" value={form.local_aplicacao}
              onChange={e => set('local_aplicacao', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
        </Row2>

        <Row2>
          <Field label="Data de Aplicação *">
            <input type="date" style={inp} value={form.data_aplicacao}
              onChange={e => set('data_aplicacao', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Próxima Dose">
            <input type="date" style={inp} value={form.data_proxima_dose}
              onChange={e => set('data_proxima_dose', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
        </Row2>

        <Field label="Profissional Aplicador">
          <input style={inp} placeholder="Nome do profissional" value={form.profissional_aplicador}
            onChange={e => set('profissional_aplicador', e.target.value)} onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Observações">
          <textarea style={ta} placeholder="Observações clínicas..." value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)} onFocus={focus} onBlur={blur} />
        </Field>

        {err && <div style={{ color: L.red, fontSize: 13, background: L.redBg,
          border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '8px 12px' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button style={btnGhost} onClick={onClose}>Cancelar</button>
          <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
            onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Vacina'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Tab 0: Registro de Vacinas ──────────────────────────────────── */
function TabRegistro({ clinicaId, pacientes, toast }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchPat, setSearchPat] = useState('')
  const [searchVac, setSearchVac] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vacinas_registro')
      .select('*, pacientes(nome, data_nascimento)')
      .eq('clinica_id', clinicaId)
      .order('data_aplicacao', { ascending: false })
    setRegistros(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* KPIs */
  const t = today()
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekStr = weekAgo.toISOString().slice(0, 10)
  const plus7 = new Date(); plus7.setDate(plus7.getDate() + 7)
  const plus7Str = plus7.toISOString().slice(0, 10)

  const kpiHoje    = registros.filter(r => r.data_aplicacao === t).length
  const kpiSemana  = registros.filter(r => r.data_aplicacao >= weekStr && r.data_aplicacao <= t).length
  const kpiAtraso  = registros.filter(r => r.data_proxima_dose && r.data_proxima_dose < t).length
  const kpiProx7   = registros.filter(r => r.data_proxima_dose && r.data_proxima_dose > t && r.data_proxima_dose <= plus7Str).length

  /* Filters */
  const filtered = registros.filter(r => {
    const nome = (r.pacientes?.nome || '').toLowerCase()
    const vac  = (r.vacina_nome || '').toLowerCase()
    if (searchPat && !nome.includes(searchPat.toLowerCase())) return false
    if (searchVac && !vac.includes(searchVac.toLowerCase())) return false
    if (dateFrom && r.data_aplicacao < dateFrom) return false
    if (dateTo   && r.data_aplicacao > dateTo)   return false
    return true
  })

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPI label="Aplicadas Hoje"    value={kpiHoje}   color={L.teal} />
        <KPI label="Esta Semana"       value={kpiSemana} color={L.blue} />
        <KPI label="Doses em Atraso"   value={kpiAtraso} color={L.red}  bg={L.redBg} />
        <KPI label="Próximas 7 dias"   value={kpiProx7}  color={L.yellow} bg={L.yellowBg} />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input style={{ ...inp, width: 200 }} placeholder="Buscar paciente..."
          value={searchPat} onChange={e => setSearchPat(e.target.value)}
          onFocus={focus} onBlur={blur} />
        <input style={{ ...inp, width: 180 }} placeholder="Buscar vacina..."
          value={searchVac} onChange={e => setSearchVac(e.target.value)}
          onFocus={focus} onBlur={blur} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="date" style={{ ...inp, width: 140 }} value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} onFocus={focus} onBlur={blur} />
          <span style={{ color: L.t4, fontSize: 12 }}>até</span>
          <input type="date" style={{ ...inp, width: 140 }} value={dateTo}
            onChange={e => setDateTo(e.target.value)} onFocus={focus} onBlur={blur} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button style={btnPrimary} onClick={() => setShowModal(true)}>+ Registrar Vacina</button>
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.hover }}>
                {['Paciente / Idade','Vacina','Dose','Fabricante','Lote','Aplicação','Próxima Dose','Profissional',''].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', color: L.t3,
                    fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                    borderBottom: `1px solid ${L.line}`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: L.t4 }}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )
                : filtered.map(r => {
                  const nc = nextDoseColor(r.data_proxima_dose)
                  const nb = nextDoseBg(r.data_proxima_dose)
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}
                      onMouseEnter={e => e.currentTarget.style.background = L.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', color: L.t1, fontWeight: 500 }}>
                        {r.pacientes?.nome || '—'}
                        <div style={{ fontSize: 11, color: L.t4 }}>{calcAge(r.pacientes?.data_nascimento)}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: L.t1 }}>{r.vacina_nome}</td>
                      <td style={{ padding: '10px 12px', color: L.t2 }}>{r.dose || '—'}</td>
                      <td style={{ padding: '10px 12px', color: L.t2 }}>{r.fabricante || '—'}</td>
                      <td style={{ padding: '10px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{r.lote || '—'}</td>
                      <td style={{ padding: '10px 12px', color: L.t2 }}>{fmtDate(r.data_aplicacao)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {r.data_proxima_dose
                          ? <span style={{
                              background: nb, color: nc, fontWeight: 600,
                              borderRadius: 6, padding: '3px 8px', fontSize: 12,
                            }}>{fmtDate(r.data_proxima_dose)}</span>
                          : <span style={{ color: L.t4 }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: L.t2, fontSize: 12 }}>{r.profissional_aplicador || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {r.local_aplicacao && (
                          <span style={{ fontSize: 11, color: L.t4 }} title={r.local_aplicacao}>📍</span>
                        )}
                        {r.observacoes && (
                          <span style={{ fontSize: 11, color: L.t4, marginLeft: 4 }} title={r.observacoes}>💬</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ModalRegistrar
          clinicaId={clinicaId}
          pacientes={pacientes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast('Vacina registrada com sucesso!') }}
        />
      )}
    </div>
  )
}

/* ─── Tab 1: Alertas e Pendências ─────────────────────────────────── */
function TabAlertas({ clinicaId, pacientes, toast }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vacinas_registro')
      .select('*, pacientes(nome, data_nascimento)')
      .eq('clinica_id', clinicaId)
      .not('data_proxima_dose', 'is', null)
    setRegistros(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const t = today()
  const plus30 = new Date(); plus30.setDate(plus30.getDate() + 30)
  const plus30Str = plus30.toISOString().slice(0, 10)

  /* Em atraso: proxima_dose < today */
  const atrasados = registros
    .filter(r => r.data_proxima_dose < t)
    .map(r => ({ ...r, diff: daysDiff(r.data_proxima_dose) }))
    .sort((a, b) => a.diff - b.diff) // most overdue first (most negative)

  /* Próximos 30 dias */
  const proximos = registros
    .filter(r => r.data_proxima_dose >= t && r.data_proxima_dose <= plus30Str)
    .map(r => ({ ...r, diff: daysDiff(r.data_proxima_dose) }))
    .sort((a, b) => a.diff - b.diff) // soonest first

  if (loading) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Em Atraso */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: L.red,
          }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: L.red }}>
            Em Atraso ({atrasados.length})
          </h3>
        </div>
        {atrasados.length === 0
          ? <div style={{ color: L.t4, fontSize: 14, padding: '12px 0' }}>Nenhuma dose em atraso. ✓</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {atrasados.map(r => (
                <div key={r.id} style={{
                  background: L.redBg, border: `1.5px solid ${L.redBd}`,
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: L.t1, fontSize: 15 }}>
                      {r.pacientes?.nome || '—'}
                      <span style={{ fontWeight: 400, color: L.t4, fontSize: 12, marginLeft: 8 }}>
                        {calcAge(r.pacientes?.data_nascimento)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: L.t2, marginTop: 2 }}>
                      {r.vacina_nome} {r.dose ? `· ${r.dose}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: L.red, fontWeight: 600, marginTop: 4 }}>
                      {Math.abs(r.diff)} {Math.abs(r.diff) === 1 ? 'dia' : 'dias'} em atraso
                      <span style={{ color: L.t4, fontWeight: 400 }}> · Prevista: {fmtDate(r.data_proxima_dose)}</span>
                    </div>
                  </div>
                  <button
                    style={{ ...btnPrimary, background: L.red, fontSize: 12, padding: '7px 14px' }}
                    onClick={() => toast(`Agendamento solicitado para ${r.pacientes?.nome}`)}
                  >Agendar</button>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Próximos 30 dias */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: L.yellow,
          }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: L.yellow }}>
            Próximos 30 dias ({proximos.length})
          </h3>
        </div>
        {proximos.length === 0
          ? <div style={{ color: L.t4, fontSize: 14, padding: '12px 0' }}>Nenhuma dose programada para os próximos 30 dias.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {proximos.map(r => (
                <div key={r.id} style={{
                  background: L.yellowBg, border: `1.5px solid ${L.yellowBd}`,
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: L.t1, fontSize: 15 }}>
                      {r.pacientes?.nome || '—'}
                      <span style={{ fontWeight: 400, color: L.t4, fontSize: 12, marginLeft: 8 }}>
                        {calcAge(r.pacientes?.data_nascimento)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: L.t2, marginTop: 2 }}>
                      {r.vacina_nome} {r.dose ? `· ${r.dose}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: L.yellow, fontWeight: 600, marginTop: 4 }}>
                      {r.diff === 0
                        ? 'Hoje!'
                        : `Em ${r.diff} ${r.diff === 1 ? 'dia' : 'dias'}`}
                      <span style={{ color: L.t4, fontWeight: 400 }}> · {fmtDate(r.data_proxima_dose)}</span>
                    </div>
                  </div>
                  <button
                    style={{ ...btnPrimary, background: L.yellow, fontSize: 12, padding: '7px 14px' }}
                    onClick={() => toast('Notificação enviada')}
                  >Notificar</button>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

/* ─── Tab 2: Cartão de Vacinas por Paciente ───────────────────────── */
function TabCartao({ clinicaId, pacientes, toast }) {
  const [selectedId, setSelectedId] = useState('')
  const [vacinas, setVacinas]       = useState([])
  const [loading, setLoading]       = useState(false)

  const selectedPat = pacientes.find(p => p.id === selectedId)

  useEffect(() => {
    if (!selectedId) { setVacinas([]); return }
    setLoading(true)
    supabase
      .from('vacinas_registro')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', selectedId)
      .order('data_aplicacao', { ascending: true })
      .then(({ data }) => { setVacinas(data || []); setLoading(false) })
  }, [selectedId, clinicaId])

  const t = today()

  return (
    <div>
      {/* Patient selector */}
      <div style={{ maxWidth: 400, marginBottom: 28 }}>
        <Field label="Selecionar Paciente">
          <select
            style={{ ...inp, cursor: 'pointer' }}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            onFocus={focus} onBlur={blur}
          >
            <option value="">— Escolha um paciente —</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Vaccination booklet */}
      {loading && <Spinner />}

      {!loading && selectedPat && (
        <div style={{
          maxWidth: 720, background: L.surface, borderRadius: 16,
          border: `2px solid ${L.teal}`, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(13,110,110,0.10)',
        }}>
          {/* Booklet header */}
          <div style={{
            background: L.tealGrad, padding: '24px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Cartão de Vacinação
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: L.white }}>
                {selectedPat.nome}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                Nascimento: {fmtDate(selectedPat.data_nascimento)} · {calcAge(selectedPat.data_nascimento)}
              </div>
            </div>
            <button
              className="no-print"
              style={{
                background: 'rgba(255,255,255,0.2)', color: L.white, border: '1.5px solid rgba(255,255,255,0.4)',
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}
              onClick={() => window.print()}
            >🖨️ Imprimir</button>
          </div>

          {/* Timeline */}
          <div style={{ padding: '24px 28px' }}>
            {vacinas.length === 0
              ? <div style={{ color: L.t4, fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                  Nenhuma vacina registrada para este paciente.
                </div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {vacinas.map((v, i) => {
                    const isLast = i === vacinas.length - 1
                    const hasNext = v.data_proxima_dose && v.data_proxima_dose > t
                    const isOverdue = v.data_proxima_dose && v.data_proxima_dose < t
                    return (
                      <div key={v.id} style={{ display: 'flex', gap: 16 }}>
                        {/* Timeline line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', marginTop: 4,
                            background: L.teal, border: `3px solid ${L.tealBg || '#e0f4f4'}`,
                            flexShrink: 0,
                          }} />
                          {!isLast && (
                            <div style={{ width: 2, flex: 1, background: L.line, minHeight: 32 }} />
                          )}
                        </div>
                        {/* Card */}
                        <div style={{
                          flex: 1, marginBottom: isLast ? 0 : 16,
                          background: L.bg, borderRadius: 10, padding: '14px 16px',
                          border: `1px solid ${L.line}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>
                                {v.vacina_nome}
                                {v.dose && <span style={{ fontWeight: 400, color: L.t3, fontSize: 13, marginLeft: 8 }}>{v.dose}</span>}
                              </div>
                              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginTop: 2 }}>
                                {fmtDate(v.data_aplicacao)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', marginTop: 10 }}>
                            {v.fabricante && (
                              <span style={{ fontSize: 12, color: L.t3 }}>
                                <span style={{ color: L.t4 }}>Fabricante:</span> {v.fabricante}
                              </span>
                            )}
                            {v.lote && (
                              <span style={{ fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>
                                <span style={{ color: L.t4 }}>Lote:</span> {v.lote}
                              </span>
                            )}
                            {v.profissional_aplicador && (
                              <span style={{ fontSize: 12, color: L.t3 }}>
                                <span style={{ color: L.t4 }}>Aplicador:</span> {v.profissional_aplicador}
                              </span>
                            )}
                            {v.local_aplicacao && (
                              <span style={{ fontSize: 12, color: L.t3 }}>
                                <span style={{ color: L.t4 }}>Local:</span> {v.local_aplicacao}
                              </span>
                            )}
                          </div>
                          {v.observacoes && (
                            <div style={{ fontSize: 12, color: L.t3, marginTop: 8, fontStyle: 'italic' }}>
                              {v.observacoes}
                            </div>
                          )}
                          {/* Next dose highlight */}
                          {v.data_proxima_dose && (
                            <div style={{
                              marginTop: 10, borderRadius: 7, padding: '7px 12px',
                              background: isOverdue ? L.redBg : (hasNext ? L.yellowBg : L.greenBg),
                              border: `1px solid ${isOverdue ? L.redBd : (hasNext ? L.yellowBd : L.greenBd)}`,
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <span style={{ fontSize: 14 }}>{isOverdue ? '⚠️' : '📅'}</span>
                              <span style={{
                                fontSize: 12, fontWeight: 600,
                                color: isOverdue ? L.red : (hasNext ? L.yellow : L.green),
                              }}>
                                Próxima dose: {fmtDate(v.data_proxima_dose)}
                                {isOverdue
                                  ? ` · ${Math.abs(daysDiff(v.data_proxima_dose))} dias em atraso`
                                  : hasNext
                                    ? ` · Em ${daysDiff(v.data_proxima_dose)} dias`
                                    : ' · Aplicada'
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Footer summary */}
          {vacinas.length > 0 && (
            <div style={{
              borderTop: `1px solid ${L.line}`, padding: '14px 28px',
              display: 'flex', gap: 24, background: L.hover,
            }}>
              <div style={{ fontSize: 12, color: L.t3 }}>
                <span style={{ fontWeight: 700, color: L.t1 }}>{vacinas.length}</span> vacina{vacinas.length !== 1 ? 's' : ''} registrada{vacinas.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: L.t3 }}>
                Última aplicação: <span style={{ fontWeight: 600, color: L.t1 }}>
                  {fmtDate(vacinas[vacinas.length - 1]?.data_aplicacao)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !selectedPat && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 16, maxWidth: 500,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💉</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.t3, marginBottom: 6 }}>
            Selecione um paciente
          </div>
          <div style={{ fontSize: 13 }}>
            O cartão de vacinação será exibido aqui.
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function PageVacinas({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab]         = useState(0)
  const [pacientes, setPacientes] = useState([])
  const [toastMsg, setToastMsg]   = useState('')

  const toast = msg => setToastMsg(msg)

  useEffect(() => {
    if (!clinicaId) return
    supabase
      .from('pacientes')
      .select('id, nome, data_nascimento')
      .eq('clinica_id', clinicaId)
      .order('nome')
      .then(({ data }) => setPacientes(data || []))
  }, [clinicaId])

  const TABS = ['Registro de Vacinas', 'Alertas e Pendências', 'Cartão por Paciente']

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: L.bg, color: L.t1 }}>
      <style>{STYLE_TAG}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: L.t1 }}>
          💉 Controle de Vacinas
        </h1>
        <p style={{ margin: '6px 0 0', color: L.t4, fontSize: 14 }}>
          Calendário vacinal e administração de doses
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `2px solid ${L.line}` }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: 14, fontWeight: tab === i ? 700 : 500,
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabRegistro clinicaId={clinicaId} pacientes={pacientes} toast={toast} />}
      {tab === 1 && <TabAlertas  clinicaId={clinicaId} pacientes={pacientes} toast={toast} />}
      {tab === 2 && <TabCartao   clinicaId={clinicaId} pacientes={pacientes} toast={toast} />}

      {/* Toast */}
      {toastMsg && <Toast msg={toastMsg} onDone={() => setToastMsg('')} />}
    </div>
  )
}
