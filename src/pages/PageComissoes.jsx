import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = v =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

const fmtPct = v => `${Number(v ?? 0).toFixed(2).replace('.', ',')}%`

const todayISO = () => new Date().toISOString().slice(0, 10)

const currentYM = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = [
  '01','02','03','04','05','06','07','08','09','10','11','12'
]
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

function buildCompetencias() {
  const res = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    res.push(ym)
  }
  return res
}

const STATUS_COM = {
  pendente:  { label: 'Pendente',  color: L.yellow, bg: L.yellowBg, bd: L.yellowBd },
  aprovado:  { label: 'Aprovado',  color: L.blue,   bg: L.blueBg,   bd: L.blueBd  },
  pago:      { label: 'Pago',      color: L.green,  bg: L.greenBg,  bd: L.greenBd },
  estornado: { label: 'Estornado', color: L.red,    bg: L.redBg,    bd: L.redBd   },
}

const TIPO_REF = {
  consulta:    { label: 'Consulta',    color: L.teal,   bg: L.tealBg   },
  procedimento:{ label: 'Procedimento',color: L.purple, bg: L.purpleBg },
  cirurgia:    { label: 'Cirurgia',    color: L.orange, bg: L.orangeBg },
}

const TIPO_ATEND = ['consulta','procedimento','cirurgia','internacao','todos']
const TIPO_CALC  = ['percentual','valor_fixo','maior_dos_dois']
const TIPO_CALC_LABEL = {
  percentual:      'Percentual',
  valor_fixo:      'Valor Fixo',
  maior_dos_dois:  'Maior dos Dois',
}

// ─── reusable UI ───────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

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

function Badge({ label, color, bg, bd }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, color,
      background: bg, border: `1px solid ${bd || color + '44'}`,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{label}</span>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: `2px solid ${L.line}`, borderTopColor: L.teal,
      animation: 'spin 0.7s linear infinite', display: 'inline-block',
    }} />
  )
}

function Modal({ title, onClose, children, wide }) {
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
        width: '100%', maxWidth: wide ? 720 : 540,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, lineHeight: 1,
            width: 32, height: 32, borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '18px 20px', boxShadow: L.shadow,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || L.t1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Tab 0 — Comissões ─────────────────────────────────────────────────────

function TabComissoes({ profile, medicos, convenios, regras }) {
  const now = currentYM()
  const [filterComp, setFilterComp]     = useState(now)
  const [filterMedico, setFilterMedico] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [comissoes, setComissoes]        = useState([])
  const [loading, setLoading]            = useState(false)
  const [saving, setSaving]              = useState(false)
  const [showForm, setShowForm]          = useState(false)
  const [detail, setDetail]              = useState(null)

  const empty = {
    medico_id: '', regra_id: '', competencia: now,
    tipo_referencia: 'consulta', referencia_id: '',
    valor_base: '', percentual_aplicado: '', valor_comissao: '', observacoes: '',
  }
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('comissoes').select('*, medicos(nome)')
      .eq('clinica_id', profile.clinica_id)
      .order('criado_em', { ascending: false })
    if (filterComp)   q = q.eq('competencia', filterComp)
    if (filterMedico) q = q.eq('medico_id', filterMedico)
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data } = await q
    setComissoes(data || [])
    setLoading(false)
  }, [profile.clinica_id, filterComp, filterMedico, filterStatus])

  useEffect(() => { load() }, [load])

  // KPI aggregates
  const pendente  = comissoes.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor_comissao), 0)
  const aprovadas = comissoes.filter(c => c.status === 'aprovado').reduce((s, c) => s + Number(c.valor_comissao), 0)
  const pagas     = comissoes.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor_comissao), 0)

  // Médico com maior comissão (filtered)
  const byMedico = {}
  comissoes.forEach(c => {
    const n = c.medicos?.nome || c.medico_id
    byMedico[n] = (byMedico[n] || 0) + Number(c.valor_comissao)
  })
  const topMedico = Object.entries(byMedico).sort((a, b) => b[1] - a[1])[0]

  // auto-fill percentual + valor when regra changes
  const handleRegraChange = rId => {
    const r = regras.find(x => x.id === rId)
    if (!r) { setForm(f => ({ ...f, regra_id: rId })); return }
    const pct = r.tipo_calculo !== 'valor_fixo' ? Number(r.percentual) : 0
    const vb  = Number(form.valor_base) || 0
    const vc  = r.tipo_calculo === 'valor_fixo'
      ? Number(r.valor_fixo)
      : r.tipo_calculo === 'percentual'
        ? (vb * pct / 100)
        : Math.max(vb * pct / 100, Number(r.valor_fixo))
    setForm(f => ({
      ...f, regra_id: rId,
      percentual_aplicado: pct,
      valor_comissao: vc.toFixed(2),
    }))
  }

  const handleValorBase = vb => {
    const r = regras.find(x => x.id === form.regra_id)
    const val = Number(vb) || 0
    let vc = 0
    if (r) {
      const pct = Number(r.percentual)
      const vf  = Number(r.valor_fixo)
      vc = r.tipo_calculo === 'valor_fixo'
        ? vf
        : r.tipo_calculo === 'percentual'
          ? (val * pct / 100)
          : Math.max(val * pct / 100, vf)
    }
    setForm(f => ({
      ...f, valor_base: vb,
      valor_comissao: vc ? vc.toFixed(2) : f.valor_comissao,
    }))
  }

  const save = async () => {
    if (!form.medico_id || !form.competencia || !form.valor_base) return
    setSaving(true)
    await supabase.from('comissoes').insert({
      clinica_id: profile.clinica_id,
      medico_id: form.medico_id,
      regra_id: form.regra_id || null,
      competencia: form.competencia,
      tipo_referencia: form.tipo_referencia,
      referencia_id: form.referencia_id || null,
      valor_base: Number(form.valor_base),
      percentual_aplicado: Number(form.percentual_aplicado) || 0,
      valor_comissao: Number(form.valor_comissao) || 0,
      status: 'pendente',
      observacoes: form.observacoes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(empty)
    load()
  }

  const setStatus = async (id, status) => {
    const upd = { status }
    if (status === 'pago') upd.data_pagamento = todayISO()
    await supabase.from('comissoes').update(upd).eq('id', id)
    load()
  }

  const aprovarTodas = async () => {
    const ids = comissoes.filter(c => c.status === 'pendente').map(c => c.id)
    if (!ids.length) return
    await supabase.from('comissoes').update({ status: 'aprovado' })
      .in('id', ids)
    load()
  }

  const regrasDoMedico = regras.filter(r => r.medico_id === form.medico_id)

  return (
    <div>
      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <KPICard label="Total Pendente" value={fmt(pendente)} color={L.yellow} />
        <KPICard label="Aprovadas (filtro)" value={fmt(aprovadas)} color={L.blue} />
        <KPICard label="Pagas (filtro)" value={fmt(pagas)} color={L.green} />
        <KPICard
          label="Maior comissão"
          value={topMedico ? topMedico[0].split(' ')[0] : '—'}
          sub={topMedico ? fmt(topMedico[1]) : ''}
          color={L.teal}
        />
      </div>

      {/* Filters + actions */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        alignItems: 'center', marginBottom: 16,
      }}>
        <select
          value={filterComp} onChange={e => setFilterComp(e.target.value)}
          style={{ ...inp, width: 140 }}
        >
          {buildCompetencias().map(ym => (
            <option key={ym} value={ym}>{ym}</option>
          ))}
        </select>

        <select
          value={filterMedico} onChange={e => setFilterMedico(e.target.value)}
          style={{ ...inp, width: 160 }}
        >
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>

        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp, width: 140 }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_COM).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          onClick={aprovarTodas}
          style={{
            padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: L.blueBg, color: L.blue,
            border: `1.5px solid ${L.blueBd}`, cursor: 'pointer',
          }}
        >
          ✓ Aprovar Todas Pendentes
        </button>

        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
          }}
        >
          + Lançar Comissão
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${L.line}` }}>
              {['Médico','Competência','Tipo','Valor Base','% Aplicado','Comissão','Status','Ações'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: 'left',
                  fontSize: 11, color: L.t4, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center' }}>
                <Spinner />
              </td></tr>
            )}
            {!loading && comissoes.length === 0 && (
              <tr><td colSpan={8} style={{
                padding: 40, textAlign: 'center', color: L.t4, fontSize: 13,
              }}>Nenhuma comissão encontrada.</td></tr>
            )}
            {!loading && comissoes.map(c => {
              const st = STATUS_COM[c.status] || {}
              const tr = TIPO_REF[c.tipo_referencia] || {}
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                  <td style={{ padding: '11px 12px', color: L.t1, fontWeight: 500 }}>
                    {c.medicos?.nome || '—'}
                  </td>
                  <td style={{ padding: '11px 12px', color: L.t2,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {c.competencia}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <Badge label={tr.label || c.tipo_referencia}
                      color={tr.color || L.t3} bg={tr.bg || L.surface} />
                  </td>
                  <td style={{ padding: '11px 12px', color: L.t2,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {fmt(c.valor_base)}
                  </td>
                  <td style={{ padding: '11px 12px', color: L.t3,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {fmtPct(c.percentual_aplicado)}
                  </td>
                  <td style={{ padding: '11px 12px',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                    fontWeight: 700, color: L.green }}>
                    {fmt(c.valor_comissao)}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <Badge label={st.label || c.status}
                      color={st.color} bg={st.bg} bd={st.bd} />
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.status === 'pendente' && (
                        <ActionBtn label="Aprovar" color={L.blue} bg={L.blueBg}
                          onClick={() => setStatus(c.id, 'aprovado')} />
                      )}
                      {c.status === 'aprovado' && (
                        <ActionBtn label="Pagar" color={L.green} bg={L.greenBg}
                          onClick={() => setStatus(c.id, 'pago')} />
                      )}
                      {(c.status === 'pendente' || c.status === 'aprovado') && (
                        <ActionBtn label="Estornar" color={L.red} bg={L.redBg}
                          onClick={() => setStatus(c.id, 'estornado')} />
                      )}
                      <ActionBtn label="Detalhes" color={L.t3} bg={L.surface}
                        onClick={() => setDetail(c)} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal title="Detalhes da Comissão" onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Médico',       detail.medicos?.nome],
              ['Competência',  detail.competencia],
              ['Tipo',         detail.tipo_referencia],
              ['Referência ID',detail.referencia_id || '—'],
              ['Valor Base',   fmt(detail.valor_base)],
              ['% Aplicado',   fmtPct(detail.percentual_aplicado)],
              ['Comissão',     fmt(detail.valor_comissao)],
              ['Status',       STATUS_COM[detail.status]?.label || detail.status],
              ['Pgto',         detail.data_pagamento || '—'],
              ['Observações',  detail.observacoes || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                borderBottom: `1px solid ${L.line}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 12, color: L.t4,
                  fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                <span style={{ fontSize: 13, color: L.t1, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Launch form */}
      {showForm && (
        <Modal title="Lançar Comissão" onClose={() => { setShowForm(false); setForm(empty) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Médico *">
                <select
                  value={form.medico_id}
                  onChange={e => setForm(f => ({ ...f, medico_id: e.target.value, regra_id: '' }))}
                  style={inp}
                >
                  <option value="">Selecione...</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Field>
              <Field label="Regra de Comissão">
                <select
                  value={form.regra_id}
                  onChange={e => handleRegraChange(e.target.value)}
                  style={inp}
                  disabled={!form.medico_id}
                >
                  <option value="">Sem regra</option>
                  {regrasDoMedico.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.tipo_atendimento} — {r.tipo_calculo === 'valor_fixo'
                        ? fmt(r.valor_fixo)
                        : fmtPct(r.percentual)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Competência *">
                <select
                  value={form.competencia}
                  onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))}
                  style={inp}
                >
                  {buildCompetencias().map(ym => (
                    <option key={ym} value={ym}>{ym}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de Referência">
                <select
                  value={form.tipo_referencia}
                  onChange={e => setForm(f => ({ ...f, tipo_referencia: e.target.value }))}
                  style={inp}
                >
                  {['consulta','procedimento','cirurgia'].map(t => (
                    <option key={t} value={t}>{TIPO_REF[t]?.label || t}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="ID da Consulta / Procedimento / Cirurgia">
              <input
                value={form.referencia_id}
                onChange={e => setForm(f => ({ ...f, referencia_id: e.target.value }))}
                placeholder="UUID ou código interno"
                style={inp}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Valor Base (R$) *">
                <input
                  type="number" min="0" step="0.01"
                  value={form.valor_base}
                  onChange={e => handleValorBase(e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="% Aplicado">
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={form.percentual_aplicado}
                  onChange={e => setForm(f => ({ ...f, percentual_aplicado: e.target.value }))}
                  style={inp}
                />
              </Field>
              <Field label="Valor Comissão (R$)">
                <input
                  type="number" min="0" step="0.01"
                  value={form.valor_comissao}
                  onChange={e => setForm(f => ({ ...f, valor_comissao: e.target.value }))}
                  style={{ ...inp, fontWeight: 700, color: L.green }}
                />
              </Field>
            </div>

            <Field label="Observações">
              <textarea
                rows={3}
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                style={{ ...inp, resize: 'vertical' }}
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={() => { setShowForm(false); setForm(empty) }}
                style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: 13,
                  border: `1px solid ${L.line}`, cursor: 'pointer',
                  background: 'transparent', color: L.t2,
                }}
              >Cancelar</button>
              <button
                onClick={save} disabled={saving}
                style={{
                  padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >{saving ? 'Salvando…' : 'Lançar'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ActionBtn({ label, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
        background: bg, color, border: `1px solid ${color}33`, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  )
}

// ─── Tab 1 — Regras de Comissão ────────────────────────────────────────────

function TabRegras({ profile, medicos, convenios }) {
  const [regras, setRegras]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  const empty = {
    medico_id: '', convenio_id: '',
    tipo_atendimento: 'consulta',
    percentual: '', valor_fixo: '',
    tipo_calculo: 'percentual',
    ativo: true,
  }
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('regras_comissao')
      .select('*, medicos(nome), convenios(nome)')
      .eq('clinica_id', profile.clinica_id)
      .order('criado_em', { ascending: false })
    setRegras(data || [])
    setLoading(false)
  }, [profile.clinica_id])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.medico_id || !form.tipo_calculo) return
    setSaving(true)
    await supabase.from('regras_comissao').insert({
      clinica_id: profile.clinica_id,
      medico_id: form.medico_id,
      convenio_id: form.convenio_id || null,
      tipo_atendimento: form.tipo_atendimento,
      percentual: Number(form.percentual) || 0,
      valor_fixo: Number(form.valor_fixo) || null,
      tipo_calculo: form.tipo_calculo,
      ativo: form.ativo,
    })
    setSaving(false)
    setShowForm(false)
    setForm(empty)
    load()
  }

  const toggleAtivo = async (id, atual) => {
    await supabase.from('regras_comissao').update({ ativo: !atual }).eq('id', id)
    load()
  }

  const ATEND_LABEL = {
    consulta: 'Consulta', procedimento: 'Procedimento',
    cirurgia: 'Cirurgia', internacao: 'Internação', todos: 'Todos',
  }
  const ATEND_COLOR = {
    consulta: L.teal, procedimento: L.purple,
    cirurgia: L.orange, internacao: L.blue, todos: L.t3,
  }
  const ATEND_BG = {
    consulta: L.tealBg, procedimento: L.purpleBg,
    cirurgia: L.orangeBg, internacao: L.blueBg, todos: L.surface,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
          }}
        >+ Nova Regra</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>}

      {!loading && regras.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 14,
        }}>Nenhuma regra cadastrada.</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {regras.map(r => (
          <div key={r.id} style={{
            background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
            padding: '18px 20px', boxShadow: L.shadow,
            opacity: r.ativo ? 1 : 0.55,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
                  {r.medicos?.nome || '—'}
                </div>
                <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                  {r.convenios?.nome || 'Todos os convênios'}
                </div>
              </div>
              {/* Ativo toggle */}
              <button
                onClick={() => toggleAtivo(r.id, r.ativo)}
                title={r.ativo ? 'Desativar' : 'Ativar'}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: r.ativo ? L.teal : L.line,
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: r.ativo ? 20 : 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: L.white, transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <Badge
                label={ATEND_LABEL[r.tipo_atendimento] || r.tipo_atendimento}
                color={ATEND_COLOR[r.tipo_atendimento] || L.t3}
                bg={ATEND_BG[r.tipo_atendimento] || L.surface}
              />
              <Badge
                label={TIPO_CALC_LABEL[r.tipo_calculo] || r.tipo_calculo}
                color={L.t2} bg={L.surface}
              />
            </div>

            {/* Value */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18, fontWeight: 700, color: L.green,
            }}>
              {r.tipo_calculo === 'valor_fixo'
                ? fmt(r.valor_fixo)
                : fmtPct(r.percentual)}
            </div>
            {r.tipo_calculo === 'maior_dos_dois' && r.valor_fixo && (
              <div style={{ fontSize: 12, color: L.t3, marginTop: 3 }}>
                ou {fmt(r.valor_fixo)} (o maior)
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Nova Regra de Comissão" onClose={() => { setShowForm(false); setForm(empty) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Médico *">
                <select
                  value={form.medico_id}
                  onChange={e => setForm(f => ({ ...f, medico_id: e.target.value }))}
                  style={inp}
                >
                  <option value="">Selecione...</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Field>
              <Field label="Convênio (opcional)">
                <select
                  value={form.convenio_id}
                  onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))}
                  style={inp}
                >
                  <option value="">Todos os convênios</option>
                  {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Tipo de Atendimento">
                <select
                  value={form.tipo_atendimento}
                  onChange={e => setForm(f => ({ ...f, tipo_atendimento: e.target.value }))}
                  style={inp}
                >
                  {TIPO_ATEND.map(t => (
                    <option key={t} value={t}>
                      {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de Cálculo">
                <select
                  value={form.tipo_calculo}
                  onChange={e => setForm(f => ({ ...f, tipo_calculo: e.target.value }))}
                  style={inp}
                >
                  {TIPO_CALC.map(t => (
                    <option key={t} value={t}>{TIPO_CALC_LABEL[t]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {form.tipo_calculo !== 'valor_fixo' && (
                <Field label="Percentual (%)">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={form.percentual}
                    onChange={e => setForm(f => ({ ...f, percentual: e.target.value }))}
                    style={inp}
                  />
                </Field>
              )}
              {form.tipo_calculo !== 'percentual' && (
                <Field label="Valor Fixo (R$)">
                  <input
                    type="number" min="0" step="0.01"
                    value={form.valor_fixo}
                    onChange={e => setForm(f => ({ ...f, valor_fixo: e.target.value }))}
                    style={inp}
                  />
                </Field>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: form.ativo ? L.teal : L.line,
                  border: 'none', cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 4,
                  left: form.ativo ? 22 : 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: L.white, transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 13, color: L.t2 }}>
                Regra {form.ativo ? 'ativa' : 'inativa'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={() => { setShowForm(false); setForm(empty) }}
                style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: 13,
                  border: `1px solid ${L.line}`, cursor: 'pointer',
                  background: 'transparent', color: L.t2,
                }}
              >Cancelar</button>
              <button
                onClick={save} disabled={saving}
                style={{
                  padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >{saving ? 'Salvando…' : 'Criar Regra'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab 2 — Extrato por Médico ────────────────────────────────────────────

function TabExtrato({ profile, medicos }) {
  const [medicoId, setMedicoId] = useState('')
  const [comissoes, setComissoes] = useState([])
  const [loading, setLoading]    = useState(false)

  const load = useCallback(async () => {
    if (!medicoId) return
    setLoading(true)
    const { data } = await supabase.from('comissoes')
      .select('*')
      .eq('clinica_id', profile.clinica_id)
      .eq('medico_id', medicoId)
      .order('competencia', { ascending: false })
    setComissoes(data || [])
    setLoading(false)
  }, [profile.clinica_id, medicoId])

  useEffect(() => { load() }, [load])

  // Group by competencia
  const byComp = {}
  comissoes.forEach(c => {
    if (!byComp[c.competencia]) byComp[c.competencia] = []
    byComp[c.competencia].push(c)
  })
  const comps = Object.keys(byComp).sort((a, b) => b.localeCompare(a))

  const medico = medicos.find(m => m.id === medicoId)

  const gerarRecibo = () => window.print()

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <select
          value={medicoId}
          onChange={e => setMedicoId(e.target.value)}
          style={{ ...inp, width: 220 }}
        >
          <option value="">Selecione um médico…</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        {medicoId && (
          <button
            onClick={gerarRecibo}
            className="no-print"
            style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: L.tealBg, color: L.teal,
              border: `1.5px solid ${L.teal}44`, cursor: 'pointer',
            }}
          >🖨 Gerar Recibo</button>
        )}
      </div>

      {!medicoId && (
        <div style={{
          textAlign: 'center', padding: 60, color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 14,
          fontSize: 14,
        }}>Selecione um médico para ver o extrato.</div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>}

      {/* Print header — only shows on print */}
      {medicoId && !loading && (
        <div style={{ display: 'none' }} className="print-only">
          <div style={{
            textAlign: 'center', padding: '32px 0 16px',
            borderBottom: '2px solid #000', marginBottom: 24,
          }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              Recibo de Comissões
            </h1>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              Médico: {medico?.nome} | Especialidade: {medico?.especialidade}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Emitido em: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {medicoId && !loading && comps.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 48, color: L.t4, fontSize: 13,
        }}>Nenhuma comissão encontrada para este médico.</div>
      )}

      {/* Timeline por competência */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {comps.map(comp => {
          const items = byComp[comp]
          const totalBase = items.reduce((s, c) => s + Number(c.valor_base), 0)
          const totalCom  = items.reduce((s, c) => s + Number(c.valor_comissao), 0)

          // Status breakdown
          const stBreak = {}
          items.forEach(c => {
            stBreak[c.status] = (stBreak[c.status] || 0) + Number(c.valor_comissao)
          })

          const [year, month] = comp.split('-')
          const monthName = MONTH_NAMES[parseInt(month, 10) - 1]

          return (
            <div key={comp} style={{
              background: L.bg, border: `1px solid ${L.line}`,
              borderRadius: 14, overflow: 'hidden', boxShadow: L.shadow,
            }}>
              {/* Month header */}
              <div style={{
                background: L.surface, padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${L.line}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>
                  {monthName} {year}
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: L.t4,
                      fontFamily: "'JetBrains Mono', monospace" }}>
                      BASE TOTAL
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: L.t2 }}>
                      {fmt(totalBase)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: L.t4,
                      fontFamily: "'JetBrains Mono', monospace" }}>
                      COMISSÃO
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: L.green }}>
                      {fmt(totalCom)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status breakdown pills */}
              <div style={{ padding: '10px 20px', display: 'flex', gap: 8,
                flexWrap: 'wrap', borderBottom: `1px solid ${L.line}` }}>
                {Object.entries(stBreak).map(([st, val]) => {
                  const sc = STATUS_COM[st] || {}
                  return (
                    <span key={st} style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12,
                      background: sc.bg, color: sc.color,
                      border: `1px solid ${sc.bd || sc.color + '33'}`,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {sc.label}: {fmt(val)}
                    </span>
                  )
                })}
              </div>

              {/* Items */}
              <div>
                {items.map((c, i) => {
                  const tr = TIPO_REF[c.tipo_referencia] || {}
                  const sc = STATUS_COM[c.status] || {}
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 20px', gap: 14,
                      borderBottom: i < items.length - 1
                        ? `1px solid ${L.line}` : 'none',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: sc.color, flexShrink: 0,
                      }} />
                      <Badge
                        label={tr.label || c.tipo_referencia}
                        color={tr.color || L.t3}
                        bg={tr.bg || L.surface}
                      />
                      <div style={{ flex: 1, fontSize: 12, color: L.t3 }}>
                        {c.referencia_id ? `Ref: ${c.referencia_id}` : 'Sem referência'}
                      </div>
                      <div style={{ fontSize: 12, color: L.t3,
                        fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(c.valor_base)} × {fmtPct(c.percentual_aplicado)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: L.green,
                        fontFamily: "'JetBrains Mono', monospace", minWidth: 90,
                        textAlign: 'right' }}>
                        {fmt(c.valor_comissao)}
                      </div>
                      <Badge label={sc.label || c.status}
                        color={sc.color} bg={sc.bg} bd={sc.bd} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Root page ─────────────────────────────────────────────────────────────

export default function PageComissoes({ profile }) {
  const [tab, setTab]         = useState(0)
  const [medicos, setMedicos] = useState([])
  const [convenios, setConvenios] = useState([])
  const [regras, setRegras]   = useState([])

  useEffect(() => {
    const load = async () => {
      const [{ data: m }, { data: cv }, { data: rg }] = await Promise.all([
        supabase.from('medicos').select('id,nome,especialidade')
          .eq('clinica_id', profile.clinica_id).order('nome'),
        supabase.from('convenios').select('id,nome')
          .eq('clinica_id', profile.clinica_id).order('nome'),
        supabase.from('regras_comissao').select('*')
          .eq('clinica_id', profile.clinica_id).eq('ativo', true),
      ])
      setMedicos(m || [])
      setConvenios(cv || [])
      setRegras(rg || [])
    }
    load()
  }, [profile.clinica_id])

  const TABS = ['Comissões', 'Regras de Comissão', 'Extrato por Médico']

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>
          Comissões e Repasse
        </h1>
        <p style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
          Gestão de comissões médicas, regras de repasse e extratos por profissional.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, borderBottom: `2px solid ${L.line}`,
        marginBottom: 28, className: 'no-print',
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
              color: tab === i ? L.teal : L.t3,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabComissoes
          profile={profile}
          medicos={medicos}
          convenios={convenios}
          regras={regras}
        />
      )}
      {tab === 1 && (
        <TabRegras
          profile={profile}
          medicos={medicos}
          convenios={convenios}
        />
      )}
      {tab === 2 && (
        <TabExtrato
          profile={profile}
          medicos={medicos}
        />
      )}
    </div>
  )
}
