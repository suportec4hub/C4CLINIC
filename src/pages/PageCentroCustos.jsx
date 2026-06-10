import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = v =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const pct = (a, b) =>
  b === 0 ? '—' : ((a / b) * 100).toFixed(1) + '%'

const today = () => new Date().toISOString().slice(0, 10)

const nowYM = () => {
  const d = new Date()
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

const TIPO_META = {
  medico:         { label: 'Médico',          color: L.teal,   bg: L.tealBg },
  setor:          { label: 'Setor',           color: L.blue,   bg: L.blueBg },
  produto:        { label: 'Produto',         color: L.purple, bg: L.purpleBg },
  administrativo: { label: 'Administrativo',  color: L.t3,     bg: L.surface },
}

const CATEGORIAS_DATALIST = [
  'Honorários', 'Medicamentos', 'Material', 'Aluguel',
  'Pessoal', 'Marketing', 'Manutenção', 'Outros',
]

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

// ─── shared styles ───────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}

const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
}

const btnSecondary = {
  background: L.surface, color: L.t2, fontWeight: 500, fontSize: 13,
  padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${L.line}`,
  cursor: 'pointer',
}

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────
function BottomSheet({ title, onClose, children }) {
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
        background: L.bg,
        borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.surface, borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${L.line}`, flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontSize: 11, color: L.t4, marginBottom: 6,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || L.t1 }}>{value}</div>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `3px solid ${L.line}`,
        borderTopColor: L.teal,
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

// ─── Badge tipo ──────────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const m = TIPO_META[tipo] || { label: tipo, color: L.t3, bg: L.surface }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: m.color, background: m.bg,
      borderRadius: 6, padding: '2px 8px', letterSpacing: '0.3px',
    }}>
      {m.label.toUpperCase()}
    </span>
  )
}

// ─── Tab 0 — Centros de Custo ────────────────────────────────────────────────
function TabCentros({ clinicaId, onGoLancamentos }) {
  const [centros, setCentros] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const { month, year } = nowYM()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from('centros_custo').select('*').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('lancamentos_cc').select('*').eq('clinica_id', clinicaId)
        .gte('data', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('data', `${year}-${String(month).padStart(2, '0')}-31`),
    ])
    setCentros(cs || [])
    setLancamentos(ls || [])
    setLoading(false)
  }, [clinicaId, month, year])

  useEffect(() => { load() }, [load])

  // totals per centro
  const totals = centro => {
    const ls = lancamentos.filter(l => l.centro_custo_id === centro.id)
    const rec = ls.filter(l => l.tipo === 'receita').reduce((a, l) => a + Number(l.valor), 0)
    const des = ls.filter(l => l.tipo === 'despesa').reduce((a, l) => a + Number(l.valor), 0)
    return { rec, des, res: rec - des, margin: rec > 0 ? ((rec - des) / rec * 100) : 0 }
  }

  const allRec = lancamentos.filter(l => l.tipo === 'receita').reduce((a, l) => a + Number(l.valor), 0)
  const allDes = lancamentos.filter(l => l.tipo === 'despesa').reduce((a, l) => a + Number(l.valor), 0)
  const ativos = centros.filter(c => c.ativo).length

  const toggleAtivo = async (c) => {
    await supabase.from('centros_custo').update({ ativo: !c.ativo }).eq('id', c.id)
    setCentros(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x))
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="TOTAL CENTROS" value={centros.length} />
        <KpiCard label="ATIVOS" value={ativos} color={L.teal} />
        <KpiCard label={`RECEITA ${MONTHS[month-1].toUpperCase()}`} value={fmt(allRec)} color={L.green} />
        <KpiCard label={`DESPESA ${MONTHS[month-1].toUpperCase()}`} value={fmt(allDes)} color={L.red} />
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>
          Centros de Custo — {MONTHS[month - 1]} {year}
        </div>
        <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Novo Centro</button>
      </div>

      {loading ? <Spinner /> : (
        centros.length === 0
          ? <div style={{ textAlign: 'center', color: L.t4, padding: 40 }}>Nenhum centro de custo cadastrado.</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {centros.map(c => {
                const { rec, des, res, margin } = totals(c)
                const total = rec + des
                const recPct = total > 0 ? (rec / total) * 100 : 50
                return (
                  <div key={c.id} style={{
                    background: L.surface, borderRadius: 12,
                    border: `1px solid ${L.line}`, padding: '18px 20px',
                    opacity: c.ativo ? 1 : 0.55,
                    transition: 'box-shadow 0.15s',
                  }}>
                    {/* top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{c.nome}</div>
                      <TipoBadge tipo={c.tipo} />
                    </div>

                    {c.responsavel && (
                      <div style={{ fontSize: 12, color: L.t3, marginBottom: 10 }}>
                        Responsável: {c.responsavel}
                      </div>
                    )}

                    {/* financials */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>RECEITA</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: L.green }}>{fmt(rec)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>DESPESA</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: L.red }}>{fmt(des)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>RESULTADO</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: res >= 0 ? L.green : L.red }}>{fmt(res)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>MARGEM</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: margin >= 0 ? L.teal : L.red }}>{pct(res, rec)}</div>
                      </div>
                    </div>

                    {/* bar */}
                    <div style={{
                      height: 6, borderRadius: 3, background: L.redBg, marginBottom: 14, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${recPct}%`, background: L.green, borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    {/* actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        style={{ ...btnSecondary, fontSize: 12, padding: '7px 14px' }}
                        onClick={() => onGoLancamentos(c.id)}
                      >Lançamentos</button>
                      <button
                        style={{ ...btnSecondary, fontSize: 12, padding: '7px 14px' }}
                        onClick={() => setEditItem(c)}
                      >Editar</button>
                      <button
                        onClick={() => toggleAtivo(c)}
                        style={{
                          fontSize: 12, padding: '7px 14px', borderRadius: 8,
                          border: `1.5px solid ${c.ativo ? L.greenBd : L.line}`,
                          background: c.ativo ? L.greenBg : L.surface,
                          color: c.ativo ? L.green : L.t3,
                          cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
      )}

      {/* Bottom-sheet: novo/editar */}
      {(showNew || editItem) && (
        <FormCentro
          clinicaId={clinicaId}
          item={editItem}
          onClose={() => { setShowNew(false); setEditItem(null) }}
          onSaved={() => { setShowNew(false); setEditItem(null); load() }}
        />
      )}
    </div>
  )
}

// ─── FormCentro ───────────────────────────────────────────────────────────────
function FormCentro({ clinicaId, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: item?.nome || '',
    tipo: item?.tipo || 'setor',
    responsavel: item?.responsavel || '',
    ativo: item?.ativo !== undefined ? item.ativo : true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.nome.trim()) { setErr('Nome obrigatório'); return }
    setSaving(true)
    const payload = { ...form, clinica_id: clinicaId }
    const { error } = item
      ? await supabase.from('centros_custo').update(payload).eq('id', item.id)
      : await supabase.from('centros_custo').insert(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <BottomSheet title={item ? 'Editar Centro' : 'Novo Centro de Custo'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <div style={{ color: L.red, fontSize: 13 }}>{err}</div>}

        <Field label="NOME DO CENTRO">
          <input
            style={inp} value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="Ex: Cardiologia, Dr. Silva..."
          />
        </Field>

        <Field label="TIPO">
          <select style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="medico">Médico</option>
            <option value="setor">Setor</option>
            <option value="produto">Produto</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </Field>

        <Field label="RESPONSÁVEL">
          <input
            style={inp} value={form.responsavel}
            onChange={e => set('responsavel', e.target.value)}
            placeholder="Nome do responsável"
          />
        </Field>

        <Field label="STATUS">
          <div style={{ display: 'flex', gap: 12 }}>
            {[true, false].map(v => (
              <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: L.t2 }}>
                <input type="radio" checked={form.ativo === v} onChange={() => set('ativo', v)} />
                {v ? 'Ativo' : 'Inativo'}
              </label>
            ))}
          </div>
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button style={btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Tab 1 — Lançamentos ─────────────────────────────────────────────────────
function TabLancamentos({ clinicaId, filterCentroId, onClearFilter }) {
  const ym = nowYM()
  const [month, setMonth] = useState(ym.month)
  const [year, setYear] = useState(ym.year)
  const [centroFilter, setCentroFilter] = useState(filterCentroId || '')
  const [centros, setCentros] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  // sync external filter
  useEffect(() => { if (filterCentroId) setCentroFilter(filterCentroId) }, [filterCentroId])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from('centros_custo').select('id,nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('lancamentos_cc').select('*').eq('clinica_id', clinicaId)
        .gte('data', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('data', `${year}-${String(month).padStart(2, '0')}-31`)
        .order('data', { ascending: false }),
    ])
    setCentros(cs || [])
    setLancamentos(ls || [])
    setLoading(false)
  }, [clinicaId, month, year])

  useEffect(() => { load() }, [load])

  const visible = centroFilter
    ? lancamentos.filter(l => l.centro_custo_id === centroFilter)
    : lancamentos

  const totalRec = visible.filter(l => l.tipo === 'receita').reduce((a, l) => a + Number(l.valor), 0)
  const totalDes = visible.filter(l => l.tipo === 'despesa').reduce((a, l) => a + Number(l.valor), 0)
  const resultado = totalRec - totalDes

  const deleteLancamento = async (id) => {
    if (!window.confirm('Excluir este lançamento?')) return
    await supabase.from('lancamentos_cc').delete().eq('id', id)
    setLancamentos(prev => prev.filter(l => l.id !== id))
  }

  const centroNome = id => centros.find(c => c.id === id)?.nome || '—'

  return (
    <div>
      {/* filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <select style={{ ...inp, width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select style={{ ...inp, width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          style={{ ...inp, width: 'auto', minWidth: 180 }}
          value={centroFilter}
          onChange={e => { setCentroFilter(e.target.value); onClearFilter && onClearFilter() }}
        >
          <option value="">Todos os centros</option>
          {centros.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Novo Lançamento</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${L.line}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['DATA','CENTRO','DESCRIÇÃO','CATEGORIA','TIPO','VALOR',''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, color: L.t4, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      borderBottom: `1px solid ${L.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: L.t4 }}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                ) : visible.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>
                      {l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 500 }}>
                      {centroNome(l.centro_custo_id)}
                    </td>
                    <td style={{ padding: '10px 14px', color: L.t2 }}>{l.descricao || '—'}</td>
                    <td style={{ padding: '10px 14px', color: L.t3 }}>{l.categoria || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
                        color: l.tipo === 'receita' ? L.green : L.red,
                        background: l.tipo === 'receita' ? L.greenBg : L.redBg,
                      }}>
                        {l.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}
                      </span>
                    </td>
                    <td style={{
                      padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap',
                      color: l.tipo === 'receita' ? L.green : L.red,
                    }}>
                      {fmt(l.valor)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => deleteLancamento(l.id)}
                        style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 6,
                          border: `1px solid ${L.redBd}`, background: L.redBg,
                          color: L.red, cursor: 'pointer', fontWeight: 500,
                        }}
                      >Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: L.surface, borderTop: `2px solid ${L.line}` }}>
                  <td colSpan={4} style={{ padding: '12px 14px', fontWeight: 700, color: L.t1, fontSize: 13 }}>
                    Totais
                  </td>
                  <td />
                  <td colSpan={2} style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, color: L.green }}>Rec: {fmt(totalRec)}</div>
                    <div style={{ fontSize: 12, color: L.red }}>Des: {fmt(totalDes)}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: resultado >= 0 ? L.teal : L.red, marginTop: 2,
                    }}>
                      Res: {fmt(resultado)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {showNew && (
        <FormLancamento
          clinicaId={clinicaId}
          centros={centros}
          defaultCentroId={centroFilter}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}

// ─── FormLancamento ───────────────────────────────────────────────────────────
function FormLancamento({ clinicaId, centros, defaultCentroId, onClose, onSaved }) {
  const [form, setForm] = useState({
    centro_custo_id: defaultCentroId || (centros[0]?.id || ''),
    tipo: 'receita',
    descricao: '',
    categoria: '',
    valor: '',
    data: today(),
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.centro_custo_id) { setErr('Selecione um centro de custo'); return }
    if (!form.valor || isNaN(Number(form.valor))) { setErr('Valor inválido'); return }
    if (!form.data) { setErr('Data obrigatória'); return }
    setSaving(true)
    const { error } = await supabase.from('lancamentos_cc').insert({
      ...form,
      valor: Number(form.valor),
      clinica_id: clinicaId,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <BottomSheet title="Novo Lançamento" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <div style={{ color: L.red, fontSize: 13 }}>{err}</div>}

        <Field label="CENTRO DE CUSTO">
          <select style={inp} value={form.centro_custo_id} onChange={e => set('centro_custo_id', e.target.value)}>
            <option value="">Selecione...</option>
            {centros.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>

        <Field label="TIPO">
          <div style={{ display: 'flex', gap: 20 }}>
            {['receita', 'despesa'].map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio" name="tipo" value={t}
                  checked={form.tipo === t}
                  onChange={() => set('tipo', t)}
                />
                <span style={{ color: t === 'receita' ? L.green : L.red, fontWeight: 600 }}>
                  {t === 'receita' ? 'Receita' : 'Despesa'}
                </span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="DESCRIÇÃO">
          <input style={inp} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descrição do lançamento" />
        </Field>

        <Field label="CATEGORIA">
          <input
            style={inp} value={form.categoria}
            onChange={e => set('categoria', e.target.value)}
            list="cat-list" placeholder="Selecione ou digite..."
          />
          <datalist id="cat-list">
            {CATEGORIAS_DATALIST.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="VALOR (R$)">
            <input
              style={inp} type="number" min="0" step="0.01"
              value={form.valor} onChange={e => set('valor', e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="DATA">
            <input style={inp} type="date" value={form.data} onChange={e => set('data', e.target.value)} />
          </Field>
        </div>

        <Field label="OBSERVAÇÕES">
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 72 }}
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
            placeholder="Observações opcionais..."
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button style={btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── Tab 2 — DRE por Centro ───────────────────────────────────────────────────
function TabDRE({ clinicaId }) {
  const ym = nowYM()
  const [month, setMonth] = useState(ym.month)
  const [year, setYear] = useState(ym.year)
  const [centros, setCentros] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from('centros_custo').select('*').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('lancamentos_cc').select('*').eq('clinica_id', clinicaId)
        .gte('data', `${year}-${String(month).padStart(2, '0')}-01`)
        .lte('data', `${year}-${String(month).padStart(2, '0')}-31`),
    ])
    setCentros(cs || [])
    setLancamentos(ls || [])
    setLoading(false)
  }, [clinicaId, month, year])

  useEffect(() => { load() }, [load])

  // Build DRE rows
  const dreRows = centros.map(c => {
    const ls = lancamentos.filter(l => l.centro_custo_id === c.id)
    const rec = ls.filter(l => l.tipo === 'receita').reduce((a, l) => a + Number(l.valor), 0)
    const des = ls.filter(l => l.tipo === 'despesa').reduce((a, l) => a + Number(l.valor), 0)
    const res = rec - des
    const margem = rec > 0 ? (res / rec * 100) : 0
    return { ...c, rec, des, res, margem }
  })

  const totRec = dreRows.reduce((a, r) => a + r.rec, 0)
  const totDes = dreRows.reduce((a, r) => a + r.des, 0)
  const totRes = totRec - totDes
  const totMarg = totRec > 0 ? (totRes / totRec * 100) : 0

  // bar chart: max abs resultado
  const maxAbs = Math.max(...dreRows.map(r => Math.abs(r.res)), 1)

  const exportCSV = () => {
    const header = 'Centro,Tipo,Responsável,Receita,Despesa,Resultado,Margem %'
    const lines = dreRows.map(r =>
      [
        `"${r.nome}"`,
        r.tipo,
        `"${r.responsavel || ''}"`,
        r.rec.toFixed(2),
        r.des.toFixed(2),
        r.res.toFixed(2),
        r.margem.toFixed(1),
      ].join(',')
    )
    lines.push(`"TOTAL",,,"${totRec.toFixed(2)}","${totDes.toFixed(2)}","${totRes.toFixed(2)}","${totMarg.toFixed(1)}"`)
    const csv = [header, ...lines].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DRE_${MONTHS[month - 1]}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <select style={{ ...inp, width: 'auto' }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select style={{ ...inp, width: 'auto' }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={btnPrimary} onClick={exportCSV}>Exportar CSV</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* DRE Table */}
          <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${L.line}`, marginBottom: 32 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['CENTRO DE CUSTO','TIPO','RECEITA','DESPESA','RESULTADO','MARGEM %'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, color: L.t4, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      borderBottom: `1px solid ${L.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dreRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: L.t4 }}>
                      Nenhum dado para o período.
                    </td>
                  </tr>
                ) : dreRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: L.t1 }}>{r.nome}</td>
                    <td style={{ padding: '12px 16px' }}><TipoBadge tipo={r.tipo} /></td>
                    <td style={{ padding: '12px 16px', color: L.green, fontWeight: 500 }}>{fmt(r.rec)}</td>
                    <td style={{ padding: '12px 16px', color: L.red, fontWeight: 500 }}>{fmt(r.des)}</td>
                    <td style={{
                      padding: '12px 16px', fontWeight: 700,
                      color: r.res >= 0 ? L.teal : L.red,
                    }}>{fmt(r.res)}</td>
                    <td style={{
                      padding: '12px 16px', fontWeight: 600,
                      color: r.margem >= 0 ? L.green : L.red,
                    }}>
                      {r.rec > 0 ? r.margem.toFixed(1) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: L.surface, borderTop: `2px solid ${L.line}` }}>
                  <td colSpan={2} style={{ padding: '13px 16px', fontWeight: 700, color: L.t1 }}>TOTAL</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: L.green }}>{fmt(totRec)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: L.red }}>{fmt(totDes)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: totRes >= 0 ? L.teal : L.red }}>
                    {fmt(totRes)}
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: totMarg >= 0 ? L.green : L.red }}>
                    {totRec > 0 ? totMarg.toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bar chart — CSS only */}
          {dreRows.length > 0 && (
            <div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: L.t1, marginBottom: 16,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
              }}>
                RESULTADO POR CENTRO — {MONTHS[month - 1].toUpperCase()} {year}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dreRows
                  .slice()
                  .sort((a, b) => b.res - a.res)
                  .map(r => {
                    const barW = maxAbs > 0 ? (Math.abs(r.res) / maxAbs) * 100 : 0
                    const isPos = r.res >= 0
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* label */}
                        <div style={{
                          width: 160, flexShrink: 0,
                          fontSize: 12, color: L.t2, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }} title={r.nome}>{r.nome}</div>

                        {/* bar track */}
                        <div style={{
                          flex: 1, height: 22, background: L.surface,
                          borderRadius: 6, overflow: 'hidden',
                          border: `1px solid ${L.line}`,
                          position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: 0, bottom: 0,
                            left: isPos ? 0 : 'auto',
                            right: isPos ? 'auto' : 0,
                            width: `${barW}%`,
                            background: isPos ? L.green : L.red,
                            borderRadius: 6,
                            transition: 'width 0.5s ease',
                            opacity: 0.85,
                          }} />
                        </div>

                        {/* value */}
                        <div style={{
                          width: 100, flexShrink: 0,
                          fontSize: 12, fontWeight: 700,
                          color: isPos ? L.green : L.red,
                          textAlign: 'right',
                        }}>{fmt(r.res)}</div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PageCentroCustos({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [lancamentosFilterId, setLancamentosFilterId] = useState(null)

  const goLancamentos = (centroId) => {
    setLancamentosFilterId(centroId)
    setTab(1)
  }

  const clearFilter = () => setLancamentosFilterId(null)

  const TABS = ['Centros de Custo', 'Lançamentos', 'DRE por Centro']

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* keyframes */}
      <style>{`
        @keyframes up {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 4 }}>
          Centros de Custo
        </div>
        <div style={{ fontSize: 13, color: L.t4 }}>
          Gerencie centros de custo e acompanhe o DRE por setor ou médico
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        borderBottom: `2px solid ${L.line}`, paddingBottom: 0,
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 600,
              border: 'none', background: 'none', cursor: 'pointer',
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabCentros clinicaId={clinicaId} onGoLancamentos={goLancamentos} />
      )}
      {tab === 1 && (
        <TabLancamentos
          clinicaId={clinicaId}
          filterCentroId={lancamentosFilterId}
          onClearFilter={clearFilter}
        />
      )}
      {tab === 2 && (
        <TabDRE clinicaId={clinicaId} />
      )}
    </div>
  )
}
