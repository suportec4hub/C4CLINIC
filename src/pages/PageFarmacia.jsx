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
`

/* ─── Shared helpers ──────────────────────────────────────────────────────── */
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

function Row({ gap = 12, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))`, gap }}>{children}</div>
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: `2.5px solid ${L.teal}30`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
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
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

/* ─── Bottom-sheet modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 560 }) {
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
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
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
const FORMAS = [
  { value: 'comprimido',  label: 'Comprimido' },
  { value: 'capsula',     label: 'Cápsula' },
  { value: 'solucao',     label: 'Solução' },
  { value: 'suspensao',   label: 'Suspensão' },
  { value: 'injetavel',   label: 'Injetável' },
  { value: 'creme',       label: 'Creme' },
  { value: 'pomada',      label: 'Pomada' },
  { value: 'spray',       label: 'Spray' },
  { value: 'outro',       label: 'Outro' },
]

const CONTROLES = [
  { value: 'lista_a1', label: 'Lista A1' },
  { value: 'lista_a2', label: 'Lista A2' },
  { value: 'lista_b1', label: 'Lista B1' },
  { value: 'lista_b2', label: 'Lista B2' },
  { value: 'lista_c1', label: 'Lista C1' },
  { value: 'nenhum',   label: 'Nenhum' },
]

function formaLabel(v) { return FORMAS.find(f => f.value === v)?.label || v }
function controleLabel(v) { return CONTROLES.find(c => c.value === v)?.label || v }

function isoToDisplay(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysToExpiry(dateStr) {
  if (!dateStr) return Infinity
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  return Math.ceil(diff)
}

function medStatus(m) {
  const days = daysToExpiry(m.validade)
  if (days <= 0) return 'Vencido'
  if (days <= 30) return 'Vencendo'
  if (m.quantidade <= 0) return 'Crítico'
  if (m.quantidade_minima && m.quantidade < m.quantidade_minima) return 'Baixo'
  return 'OK'
}

function StatusBadge({ status }) {
  const map = {
    OK:       { bg: L.greenBg,  color: L.green,  bd: L.greenBd },
    Baixo:    { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
    Crítico:  { bg: L.redBg,    color: L.red,    bd: L.redBd },
    Vencendo: { bg: L.orangeBg, color: L.orange, bd: L.orangeBd },
    Vencido:  { bg: L.redBg,    color: L.red,    bd: L.redBd },
  }
  const s = map[status] || map.OK
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
    }}>{status}</span>
  )
}

function ControlBadge({ controlado, tipo }) {
  if (!controlado) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
      background: L.purpleBg, color: L.purple, border: `1px solid ${L.purpleBd}`,
    }}>CTRL {tipo !== 'nenhum' ? controleLabel(tipo) : ''}</span>
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: L.surface, borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${L.line}`, flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.teal, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 – ESTOQUE
══════════════════════════════════════════════════════════════════════════ */
function TabEstoque({ clinicaId }) {
  const [meds, setMeds]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [busca, setBusca]         = useState('')
  const [filtCtrl, setFiltCtrl]   = useState('todos')
  const [filtForma, setFiltForma] = useState('')

  // Modals
  const [showNovo, setShowNovo]         = useState(false)
  const [showEdit, setShowEdit]         = useState(null)   // med object
  const [showEntrada, setShowEntrada]   = useState(null)   // med object
  const [showDispensa, setShowDispensa] = useState(null)   // med object — quick dispensation shortcut

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('medicamentos_farmacia')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setMeds(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const filtered = meds.filter(m => {
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase()) &&
        !(m.principio_ativo || '').toLowerCase().includes(busca.toLowerCase())) return false
    if (filtCtrl === 'controlado' && !m.controlado) return false
    if (filtCtrl === 'comum'      &&  m.controlado) return false
    if (filtForma && m.forma_farmaceutica !== filtForma) return false
    return true
  })

  const total         = meds.length
  const controlados   = meds.filter(m => m.controlado).length
  const alertas       = meds.filter(m => ['Baixo','Crítico','Vencendo','Vencido'].includes(medStatus(m))).length

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="TOTAL MEDICAMENTOS" value={total} />
        <KpiCard label="CONTROLADOS" value={controlados} color={L.purple} />
        <KpiCard label="ALERTAS" value={alertas} color={alertas > 0 ? L.red : L.green}
          sub="vencendo em 30d ou abaixo do mínimo" />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar por nome ou princípio ativo…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onFocus={focus} onBlur={blur}
          style={{ ...inp, flex: 1, minWidth: 200, maxWidth: 340 }}
        />
        <select value={filtCtrl} onChange={e => setFiltCtrl(e.target.value)}
          onFocus={focus} onBlur={blur} style={{ ...inp, width: 'auto' }}>
          <option value="todos">Todos</option>
          <option value="controlado">Controlados</option>
          <option value="comum">Comuns</option>
        </select>
        <select value={filtForma} onChange={e => setFiltForma(e.target.value)}
          onFocus={focus} onBlur={blur} style={{ ...inp, width: 'auto' }}>
          <option value="">Todas as formas</option>
          {FORMAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button
          onClick={() => setShowNovo(true)}
          style={{
            background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
            border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >+ Novo Medicamento</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4, fontSize: 14 }}>Nenhum medicamento encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => {
            const status = medStatus(m)
            const days   = daysToExpiry(m.validade)
            const qtdRed = m.quantidade_minima && m.quantidade < m.quantidade_minima
            return (
              <div key={m.id} style={{
                background: L.surface, borderRadius: 10, padding: '14px 16px',
                border: `1px solid ${L.line}`, display: 'flex', alignItems: 'center',
                gap: 12, flexWrap: 'wrap',
              }}>
                {/* Name + principio */}
                <div style={{ flex: '2 1 160px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {m.nome}
                    <ControlBadge controlado={m.controlado} tipo={m.tipo_controle} />
                  </div>
                  {m.principio_ativo && (
                    <div style={{ fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{m.principio_ativo}</div>
                  )}
                </div>

                {/* Forma + concentração */}
                <div style={{ flex: '1 1 120px', fontSize: 13, color: L.t2 }}>
                  <div>{formaLabel(m.forma_farmaceutica)}</div>
                  {m.concentracao && <div style={{ fontSize: 12, color: L.t4 }}>{m.concentracao}</div>}
                </div>

                {/* Lote */}
                <div style={{ flex: '0 1 100px', fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ fontSize: 10, color: L.t4, marginBottom: 2 }}>LOTE</div>
                  {m.lote || '—'}
                </div>

                {/* Validade */}
                <div style={{ flex: '0 1 90px', fontSize: 13, color: days <= 30 ? L.red : L.t2 }}>
                  <div style={{ fontSize: 10, color: L.t4, marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>VALIDADE</div>
                  {isoToDisplay(m.validade)}
                </div>

                {/* Quantidade */}
                <div style={{ flex: '0 1 80px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: L.t4, marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>QTDE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: qtdRed ? L.red : L.t1 }}>{m.quantidade}</div>
                  {m.quantidade_minima ? <div style={{ fontSize: 10, color: L.t4 }}>mín {m.quantidade_minima}</div> : null}
                </div>

                {/* Status */}
                <div style={{ flex: '0 1 80px', display: 'flex', justifyContent: 'center' }}>
                  <StatusBadge status={status} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <ActionBtn label="Editar"    onClick={() => setShowEdit(m)} />
                  <ActionBtn label="Dispensar" onClick={() => setShowDispensa(m)} color={L.teal} />
                  <ActionBtn label="+ Entrada" onClick={() => setShowEntrada(m)} color={L.green} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showNovo && (
        <MedModal
          clinicaId={clinicaId}
          onClose={() => setShowNovo(false)}
          onSaved={() => { setShowNovo(false); load() }}
        />
      )}
      {showEdit && (
        <MedModal
          clinicaId={clinicaId}
          initial={showEdit}
          onClose={() => setShowEdit(null)}
          onSaved={() => { setShowEdit(null); load() }}
        />
      )}
      {showEntrada && (
        <EntradaModal
          med={showEntrada}
          onClose={() => setShowEntrada(null)}
          onSaved={() => { setShowEntrada(null); load() }}
        />
      )}
      {showDispensa && (
        <DispensacaoModal
          clinicaId={clinicaId}
          initialMed={showDispensa}
          onClose={() => setShowDispensa(null)}
          onSaved={() => { setShowDispensa(null); load() }}
        />
      )}
    </div>
  )
}

function ActionBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
      border: `1.5px solid ${color || L.line}`, background: 'transparent',
      color: color || L.t2, cursor: 'pointer',
    }}>{label}</button>
  )
}

/* ─── Novo / Editar Medicamento ──────────────────────────────────────────── */
const BLANK_MED = {
  nome: '', principio_ativo: '', forma_farmaceutica: 'comprimido', concentracao: '',
  controlado: false, tipo_controle: 'nenhum', lote: '', validade: '',
  quantidade: '', quantidade_minima: 10,
}

function MedModal({ clinicaId, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_MED })
  const [saving, setSaving] = useState(false)
  const [err, setErr]   = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    if (!form.nome.trim()) { setErr('Nome é obrigatório.'); return }
    setSaving(true); setErr('')
    const payload = {
      clinica_id: clinicaId,
      nome: form.nome.trim(),
      principio_ativo: form.principio_ativo || null,
      forma_farmaceutica: form.forma_farmaceutica,
      concentracao: form.concentracao || null,
      controlado: !!form.controlado,
      tipo_controle: form.controlado ? form.tipo_controle : 'nenhum',
      lote: form.lote || null,
      validade: form.validade || null,
      quantidade: Number(form.quantidade) || 0,
      quantidade_minima: Number(form.quantidade_minima) || 10,
    }
    let error
    if (initial) {
      ({ error } = await supabase.from('medicamentos_farmacia').update(payload).eq('id', initial.id))
    } else {
      ({ error } = await supabase.from('medicamentos_farmacia').insert(payload))
    }
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={initial ? 'Editar Medicamento' : 'Novo Medicamento'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Row>
          <Field label="NOME *">
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Ex: Dipirona" />
          </Field>
          <Field label="PRINCÍPIO ATIVO">
            <input value={form.principio_ativo} onChange={e => set('principio_ativo', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Ex: Metamizol sódico" />
          </Field>
        </Row>
        <Row>
          <Field label="FORMA FARMACÊUTICA">
            <select value={form.forma_farmaceutica} onChange={e => set('forma_farmaceutica', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              {FORMAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
          <Field label="CONCENTRAÇÃO">
            <input value={form.concentracao} onChange={e => set('concentracao', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Ex: 500mg" />
          </Field>
        </Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="ctrl" checked={!!form.controlado}
            onChange={e => set('controlado', e.target.checked)} style={{ width: 16, height: 16 }} />
          <label htmlFor="ctrl" style={{ fontSize: 13, color: L.t1, cursor: 'pointer' }}>Medicamento Controlado</label>
        </div>
        {form.controlado && (
          <Field label="TIPO DE CONTROLE">
            <select value={form.tipo_controle} onChange={e => set('tipo_controle', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              {CONTROLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        )}
        <Row>
          <Field label="LOTE">
            <input value={form.lote} onChange={e => set('lote', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Ex: 2024001" />
          </Field>
          <Field label="VALIDADE">
            <input type="date" value={form.validade} onChange={e => set('validade', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} />
          </Field>
        </Row>
        <Row>
          <Field label="QUANTIDADE ATUAL">
            <input type="number" min="0" value={form.quantidade} onChange={e => set('quantidade', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="0" />
          </Field>
          <Field label="QUANTIDADE MÍNIMA">
            <input type="number" min="0" value={form.quantidade_minima} onChange={e => set('quantidade_minima', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="10" />
          </Field>
        </Row>
        {err && <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1.5px solid ${L.line}`, color: L.t2, borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <BtnPrimary onClick={save} loading={saving}>Salvar</BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Entrada de Estoque ─────────────────────────────────────────────────── */
function EntradaModal({ med, onClose, onSaved }) {
  const [qtd, setQtd]     = useState('')
  const [obs, setObs]     = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')

  async function save() {
    const n = Number(qtd)
    if (!n || n <= 0) { setErr('Informe uma quantidade válida.'); return }
    setSaving(true); setErr('')
    const { error } = await supabase
      .from('medicamentos_farmacia')
      .update({ quantidade: med.quantidade + n })
      .eq('id', med.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Entrada de Estoque" onClose={onClose} maxWidth={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="MEDICAMENTO">
          <div style={{ ...inp, background: L.hover, color: L.t2, cursor: 'not-allowed' }}>{med.nome}</div>
        </Field>
        <Field label="ESTOQUE ATUAL">
          <div style={{ fontSize: 24, fontWeight: 700, color: L.teal }}>{med.quantidade} unidades</div>
        </Field>
        <Field label="QUANTIDADE A ADICIONAR *">
          <input type="number" min="1" value={qtd} onChange={e => setQtd(e.target.value)}
            onFocus={focus} onBlur={blur} style={inp} placeholder="Ex: 50" autoFocus />
        </Field>
        {qtd && Number(qtd) > 0 && (
          <div style={{ fontSize: 13, color: L.t3, background: L.surface, borderRadius: 8, padding: '10px 14px', border: `1px solid ${L.line}` }}>
            Novo estoque: <strong style={{ color: L.teal }}>{med.quantidade + Number(qtd)}</strong> unidades
          </div>
        )}
        <Field label="OBSERVAÇÃO">
          <input value={obs} onChange={e => setObs(e.target.value)}
            onFocus={focus} onBlur={blur} style={inp} placeholder="Nota fiscal, fornecedor…" />
        </Field>
        {err && <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: `1.5px solid ${L.line}`, color: L.t2, borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <BtnPrimary onClick={save} loading={saving}>Confirmar Entrada</BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DISPENSAÇÃO MODAL (reused in Tab 1 shortcut + Tab 2)
══════════════════════════════════════════════════════════════════════════ */
const nowLocal = () => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function DispensacaoModal({ clinicaId, initialMed, onClose, onSaved }) {
  const [meds, setMeds]         = useState([])
  const [pacientes, setPacientes] = useState([])
  const [internacoes, setInternacoes] = useState([])
  const [loading, setLoading]   = useState(true)

  const [form, setForm] = useState({
    medicamento_id: initialMed?.id || '',
    paciente_id: '',
    internacao_id: '',
    prescricao_id: '',
    quantidade: '',
    profissional_id: '',
    data_hora: nowLocal(),
    observacao: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]   = useState('')
  const [warn, setWarn] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [mRes, pRes, iRes] = await Promise.all([
        supabase.from('medicamentos_farmacia').select('id,nome,quantidade,controlado,tipo_controle').eq('clinica_id', clinicaId).order('nome'),
        supabase.from('pacientes').select('id,nome').eq('clinica_id', clinicaId).order('nome'),
        supabase.from('internacoes').select('id,status,paciente_id,pacientes(nome)').eq('clinica_id', clinicaId).eq('status', 'ativo').order('id', { ascending: false }),
      ])
      setMeds(mRes.data || [])
      setPacientes(pRes.data || [])
      setInternacoes(iRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [clinicaId])

  const selectedMed = meds.find(m => m.id === form.medicamento_id)

  useEffect(() => {
    if (!selectedMed) { setWarn(''); return }
    if (form.quantidade && Number(form.quantidade) > selectedMed.quantidade) {
      setErr('Estoque insuficiente para essa quantidade.')
    } else {
      setErr('')
    }
    if (selectedMed.controlado && !form.paciente_id && !form.observacao) {
      setWarn('Medicamento controlado — requer identificação do paciente ou observação justificando.')
    } else {
      setWarn('')
    }
  }, [form.medicamento_id, form.quantidade, form.paciente_id, form.observacao, selectedMed])

  async function save() {
    if (!form.medicamento_id) { setErr('Selecione um medicamento.'); return }
    const n = Number(form.quantidade)
    if (!n || n <= 0) { setErr('Informe a quantidade.'); return }
    if (selectedMed && n > selectedMed.quantidade) { setErr('Estoque insuficiente.'); return }
    if (!form.profissional_id.trim()) { setErr('Informe o profissional responsável.'); return }
    setSaving(true); setErr('')

    const payload = {
      clinica_id: clinicaId,
      medicamento_id: form.medicamento_id,
      paciente_id: form.paciente_id || null,
      internacao_id: form.internacao_id || null,
      prescricao_id: form.prescricao_id || null,
      quantidade: n,
      profissional_id: form.profissional_id.trim(),
      data_hora: form.data_hora ? new Date(form.data_hora).toISOString() : new Date().toISOString(),
      observacao: form.observacao || null,
    }

    const { error: insErr } = await supabase.from('dispensacoes').insert(payload)
    if (insErr) { setSaving(false); setErr(insErr.message); return }

    const { error: updErr } = await supabase
      .from('medicamentos_farmacia')
      .update({ quantidade: selectedMed.quantidade - n })
      .eq('id', form.medicamento_id)
    setSaving(false)
    if (updErr) { setErr(updErr.message); return }
    onSaved()
  }

  return (
    <Modal title="Registrar Dispensação" onClose={onClose} maxWidth={560}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="MEDICAMENTO *">
            <select value={form.medicamento_id} onChange={e => set('medicamento_id', e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              <option value="">Selecione…</option>
              {meds.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} — estoque: {m.quantidade}{m.controlado ? ' [CTRL]' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Row>
            <Field label="PACIENTE AMBULATORIAL">
              <select value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp}>
                <option value="">— Nenhum —</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="INTERNAÇÃO ATIVA">
              <select value={form.internacao_id} onChange={e => set('internacao_id', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp}>
                <option value="">— Nenhuma —</option>
                {internacoes.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.pacientes?.nome || `Internação #${i.id}`}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="ID PRESCRIÇÃO">
              <input value={form.prescricao_id} onChange={e => set('prescricao_id', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp} placeholder="Opcional" />
            </Field>
            <Field label="QUANTIDADE *">
              <input type="number" min="1"
                max={selectedMed ? selectedMed.quantidade : undefined}
                value={form.quantidade} onChange={e => set('quantidade', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp} placeholder="0" />
            </Field>
          </Row>
          <Row>
            <Field label="PROFISSIONAL RESPONSÁVEL *">
              <input value={form.profissional_id} onChange={e => set('profissional_id', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp} placeholder="Nome do profissional" />
            </Field>
            <Field label="DATA / HORA">
              <input type="datetime-local" value={form.data_hora} onChange={e => set('data_hora', e.target.value)}
                onFocus={focus} onBlur={blur} style={inp} />
            </Field>
          </Row>
          <Field label="OBSERVAÇÃO">
            <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, minHeight: 64, resize: 'vertical' }}
              placeholder="Anotações, justificativas para controlados…" />
          </Field>
          {warn && !err && (
            <div style={{ background: L.yellowBg, color: L.yellow, border: `1px solid ${L.yellowBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              ⚠ {warn}
            </div>
          )}
          {err && (
            <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{err}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'none', border: `1.5px solid ${L.line}`, color: L.t2, borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <BtnPrimary onClick={save} loading={saving}>Dispensar</BtnPrimary>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 – DISPENSAÇÃO
══════════════════════════════════════════════════════════════════════════ */
function TabDispensacao({ clinicaId }) {
  const [showForm, setShowForm] = useState(false)
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dispensacoes')
      .select(`
        id, quantidade, profissional_id, data_hora, observacao,
        medicamentos_farmacia(nome, controlado),
        pacientes(nome)
      `)
      .eq('clinica_id', clinicaId)
      .order('data_hora', { ascending: false })
      .limit(20)
    setRecentes(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function fmtDt(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Dispensação de Medicamentos</div>
          <div style={{ fontSize: 13, color: L.t4, marginTop: 2 }}>Registre saídas de medicamentos do estoque</div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: L.teal, color: L.white, fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}
        >+ Nova Dispensação</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* Recent dispensations */}
        <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${L.line}`, fontWeight: 600, fontSize: 14, color: L.t1 }}>
            Últimas 20 Dispensações
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          ) : recentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: L.t4, fontSize: 14 }}>Nenhuma dispensação registrada.</div>
          ) : (
            <div>
              {recentes.map(d => {
                const ctrl = d.medicamentos_farmacia?.controlado
                return (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px',
                    borderBottom: `1px solid ${L.line}`,
                    background: ctrl ? `${L.purpleBg}` : 'transparent',
                  }}>
                    <div style={{ flex: '2 1 140px', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: ctrl ? L.purple : L.t1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {d.medicamentos_farmacia?.nome || '—'}
                        {ctrl && <span style={{ fontSize: 10, background: L.purpleBg, color: L.purple, border: `1px solid ${L.purpleBd}`, borderRadius: 20, padding: '1px 6px', fontWeight: 700 }}>CTRL</span>}
                      </div>
                      {d.pacientes?.nome && <div style={{ fontSize: 12, color: L.t4, marginTop: 1 }}>Paciente: {d.pacientes.nome}</div>}
                      {d.observacao && <div style={{ fontSize: 12, color: L.t3, marginTop: 2, fontStyle: 'italic' }}>{d.observacao}</div>}
                    </div>
                    <div style={{ flex: '0 0 48px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: L.t1 }}>{d.quantidade}</div>
                      <div style={{ fontSize: 10, color: L.t4 }}>un.</div>
                    </div>
                    <div style={{ flex: '1 1 120px', fontSize: 12, color: L.t3, textAlign: 'right' }}>
                      <div>{d.profissional_id}</div>
                      <div style={{ marginTop: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmtDt(d.data_hora)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <DispensacaoModal
          clinicaId={clinicaId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 3 – RELATÓRIO
══════════════════════════════════════════════════════════════════════════ */
function TabRelatorio({ clinicaId }) {
  const [periodo, setPeriodo] = useState('today')
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  const [filtMed, setFiltMed]   = useState('')
  const [filtPac, setFiltPac]   = useState('')
  const [filtProf, setFiltProf] = useState('')

  function periodRange() {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
    if (periodo === 'today') {
      return { from: `${today}T00:00:00`, to: `${today}T23:59:59` }
    } else if (periodo === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00:00`
      return { from, to: `${today}T23:59:59` }
    } else {
      const d = new Date(now)
      d.setDate(1)
      const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00:00`
      return { from, to: `${today}T23:59:59` }
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { from, to } = periodRange()
    const { data } = await supabase
      .from('dispensacoes')
      .select(`
        id, quantidade, profissional_id, data_hora, observacao,
        medicamentos_farmacia(id, nome, principio_ativo, controlado),
        pacientes(nome)
      `)
      .eq('clinica_id', clinicaId)
      .gte('data_hora', from)
      .lte('data_hora', to)
      .order('data_hora', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [clinicaId, periodo])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r => {
    const mn = (r.medicamentos_farmacia?.nome || '').toLowerCase()
    const pn = (r.pacientes?.nome || '').toLowerCase()
    const pr = (r.profissional_id || '').toLowerCase()
    if (filtMed  && !mn.includes(filtMed.toLowerCase())) return false
    if (filtPac  && !pn.includes(filtPac.toLowerCase())) return false
    if (filtProf && !pr.includes(filtProf.toLowerCase())) return false
    return true
  })

  const totalDisp   = filtered.length
  const totalCtrl   = filtered.filter(r => r.medicamentos_farmacia?.controlado).length

  // top 5 medicamentos
  const countMap = {}
  filtered.forEach(r => {
    const key = r.medicamentos_farmacia?.nome || 'Desconhecido'
    countMap[key] = (countMap[key] || 0) + r.quantidade
  })
  const top5 = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  function fmtDt(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function exportCSV() {
    const header = 'Data/Hora,Medicamento,Princípio Ativo,Controlado,Quantidade,Paciente,Profissional,Observação'
    const lines = filtered.map(r => {
      const cols = [
        fmtDt(r.data_hora),
        r.medicamentos_farmacia?.nome || '',
        r.medicamentos_farmacia?.principio_ativo || '',
        r.medicamentos_farmacia?.controlado ? 'Sim' : 'Não',
        r.quantidade,
        r.pacientes?.nome || '',
        r.profissional_id || '',
        (r.observacao || '').replace(/,/g, ' ').replace(/\n/g, ' '),
      ]
      return cols.map(c => `"${c}"`).join(',')
    })
    const csv = [header, ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `dispensacoes_${periodo}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Period + export */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'today', l: 'Hoje' },
            { v: 'week',  l: 'Semana' },
            { v: 'month', l: 'Mês' },
          ].map(p => (
            <button key={p.v} onClick={() => setPeriodo(p.v)} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${periodo === p.v ? L.teal : L.line}`,
              background: periodo === p.v ? L.tealBg : 'transparent',
              color: periodo === p.v ? L.teal : L.t3,
              cursor: 'pointer',
            }}>{p.l}</button>
          ))}
        </div>
        <button onClick={exportCSV} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
          border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
        }}>⬇ Exportar CSV</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="TOTAL DISPENSAÇÕES" value={totalDisp} />
        <KpiCard label="CONTROLADOS DISPENSADOS" value={totalCtrl} color={L.purple} />
        <div style={{ background: L.surface, borderRadius: 12, padding: '16px 20px', border: `1px solid ${L.line}`, flex: 2, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>TOP 5 MEDICAMENTOS</div>
          {top5.length === 0
            ? <div style={{ fontSize: 13, color: L.t4 }}>Sem dados</div>
            : top5.map(([nome, qtd], i) => (
              <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: L.t2 }}>{i + 1}. {nome}</span>
                <span style={{ fontWeight: 700, color: L.teal }}>{qtd} un.</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="Filtrar medicamento…" value={filtMed} onChange={e => setFiltMed(e.target.value)}
          onFocus={focus} onBlur={blur} style={{ ...inp, flex: 1, minWidth: 140 }} />
        <input placeholder="Filtrar paciente…" value={filtPac} onChange={e => setFiltPac(e.target.value)}
          onFocus={focus} onBlur={blur} style={{ ...inp, flex: 1, minWidth: 140 }} />
        <input placeholder="Filtrar profissional…" value={filtProf} onChange={e => setFiltProf(e.target.value)}
          onFocus={focus} onBlur={blur} style={{ ...inp, flex: 1, minWidth: 140 }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4, fontSize: 14 }}>Nenhuma dispensação no período.</div>
      ) : (
        <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 80px 130px 130px 1fr',
            gap: 8, padding: '10px 16px',
            borderBottom: `1px solid ${L.line}`,
            background: L.hover,
          }}>
            {['DATA/HORA','MEDICAMENTO','QTDE','PACIENTE','PROFISSIONAL','OBS'].map(h => (
              <div key={h} style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{h}</div>
            ))}
          </div>
          {filtered.map(r => {
            const ctrl = r.medicamentos_farmacia?.controlado
            return (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 80px 130px 130px 1fr',
                gap: 8, padding: '10px 16px',
                borderBottom: `1px solid ${L.line}`,
                background: ctrl ? `${L.purpleBg}` : 'transparent',
                alignItems: 'start',
              }}>
                <div style={{ fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDt(r.data_hora)}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ctrl ? L.purple : L.t1 }}>{r.medicamentos_farmacia?.nome || '—'}</div>
                  {r.medicamentos_farmacia?.principio_ativo && (
                    <div style={{ fontSize: 11, color: L.t4 }}>{r.medicamentos_farmacia.principio_ativo}</div>
                  )}
                  {ctrl && <span style={{ fontSize: 10, fontWeight: 700, color: L.purple }}>CONTROLADO</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: L.t1 }}>{r.quantidade}</div>
                <div style={{ fontSize: 13, color: L.t2 }}>{r.pacientes?.nome || '—'}</div>
                <div style={{ fontSize: 13, color: L.t2 }}>{r.profissional_id || '—'}</div>
                <div style={{ fontSize: 12, color: L.t3, fontStyle: r.observacao ? 'italic' : 'normal' }}>{r.observacao || '—'}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function PageFarmacia({ profile }) {
  const [tab, setTab] = useState(0)
  const clinicaId = profile?.clinica_id

  const TABS = [
    { label: 'Estoque de Medicamentos' },
    { label: 'Dispensação' },
    { label: 'Relatório de Dispensações' },
  ]

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: L.t1 }}>Farmácia</div>
        <div style={{ fontSize: 13, color: L.t4, marginTop: 3 }}>Gestão de estoque e dispensação de medicamentos</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${L.line}`, marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 400,
            color: tab === i ? L.teal : L.t3,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
            marginBottom: -2, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabEstoque clinicaId={clinicaId} />}
      {tab === 1 && <TabDispensacao clinicaId={clinicaId} />}
      {tab === 2 && <TabRelatorio clinicaId={clinicaId} />}
    </div>
  )
}
