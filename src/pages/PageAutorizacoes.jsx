import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS_GUIA = ['consulta', 'sp_sadt', 'internacao', 'cirurgia', 'honorarios']
const TIPOS_GUIA_LABEL = {
  consulta: 'Consulta',
  sp_sadt: 'SP/SADT',
  internacao: 'Internação',
  cirurgia: 'Cirurgia',
  honorarios: 'Honorários',
}
const STATUS_LIST = ['pendente', 'autorizado', 'negado', 'recurso', 'expirado']
const STATUS_LABEL = {
  pendente: 'Pendente',
  autorizado: 'Autorizado',
  negado: 'Negado',
  recurso: 'Recurso',
  expirado: 'Expirado',
}
const STATUS_COLOR = {
  pendente:   { bg: L.yellowBg,  bd: L.yellowBd,  text: L.yellow },
  autorizado: { bg: L.greenBg,   bd: L.greenBd,   text: L.green  },
  negado:     { bg: L.redBg,     bd: L.redBd,     text: L.red    },
  recurso:    { bg: L.orangeBg,  bd: L.orangeBd,  text: L.orange },
  expirado:   { bg: L.hover,     bd: L.line,      text: L.t3     },
}
const TIPO_GUIA_COLOR = {
  consulta:   { bg: L.blueBg,   bd: L.blueBd,   text: L.blue   },
  sp_sadt:    { bg: L.purpleBg, bd: L.purpleBd, text: L.purple },
  internacao: { bg: L.orangeBg, bd: L.orangeBd, text: L.orange },
  cirurgia:   { bg: L.redBg,    bd: L.redBd,    text: L.red    },
  honorarios: { bg: L.tealBg,   bd: '#b2dfdf',  text: L.teal   },
}

const EMPTY_FORM = {
  paciente_id: '',
  convenio_id: '',
  medico_id: '',
  tipo_guia: 'consulta',
  codigo_procedimento: '',
  descricao: '',
  data_solicitacao: new Date().toISOString().slice(0, 10),
  data_resposta: '',
  status: 'pendente',
  numero_autorizacao: '',
  valor_solicitado: '',
  valor_autorizado: '',
  observacoes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function fmtCurrency(v) {
  if (v == null || v === '') return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function daysDiff(dateStr) {
  const a = new Date(dateStr + 'T00:00:00')
  const b = new Date()
  return Math.floor((b - a) / 86400000)
}
function thisMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}
const labelStyle = {
  display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ status }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.expirado
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, border: `1px solid ${c.bd}`, color: c.text,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function TipoBadge({ tipo }) {
  const c = TIPO_GUIA_COLOR[tipo] || TIPO_GUIA_COLOR.consulta
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
      background: c.bg, border: `1px solid ${c.bd}`, color: c.text,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {TIPOS_GUIA_LABEL[tipo] || tipo}
    </span>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2px solid ${L.line}`, borderTopColor: L.teal,
      display: 'inline-block', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 140,
      boxShadow: L.shadow, display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || L.t1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3 }}>{sub}</div>}
    </div>
  )
}

// ─── Bottom-sheet modal ───────────────────────────────────────────────────────
function BottomSheet({ title, onClose, children, maxWidth = 600 }) {
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
        width: '100%', maxWidth,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        {/* sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Form for new / edit authorization ───────────────────────────────────────
function FormAutorizacao({ form, onChange, pacientes, convenios, medicos, onSave, onClose, saving }) {
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave() }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* row 1 */}
        <Field label="PACIENTE *">
          <select
            style={inp} required value={form.paciente_id}
            onChange={e => onChange('paciente_id', e.target.value)}
          >
            <option value="">Selecione...</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>

        <div style={grid2}>
          <Field label="CONVÊNIO *">
            <select
              style={inp} required value={form.convenio_id}
              onChange={e => onChange('convenio_id', e.target.value)}
            >
              <option value="">Selecione...</option>
              {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="MÉDICO SOLICITANTE">
            <select
              style={inp} value={form.medico_id || ''}
              onChange={e => onChange('medico_id', e.target.value)}
            >
              <option value="">Selecione...</option>
              {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="TIPO DE GUIA *">
            <select
              style={inp} required value={form.tipo_guia}
              onChange={e => onChange('tipo_guia', e.target.value)}
            >
              {TIPOS_GUIA.map(t => <option key={t} value={t}>{TIPOS_GUIA_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="STATUS">
            <select
              style={inp} value={form.status}
              onChange={e => onChange('status', e.target.value)}
            >
              {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>

        <div style={grid2}>
          <Field label="CÓDIGO DO PROCEDIMENTO">
            <input
              style={inp} value={form.codigo_procedimento || ''}
              onChange={e => onChange('codigo_procedimento', e.target.value)}
              placeholder="Ex: 10101012"
            />
          </Field>
          <Field label="DATA SOLICITAÇÃO *">
            <input
              style={inp} type="date" required value={form.data_solicitacao || ''}
              onChange={e => onChange('data_solicitacao', e.target.value)}
            />
          </Field>
        </div>

        <Field label="DESCRIÇÃO DO PROCEDIMENTO">
          <input
            style={inp} value={form.descricao || ''}
            onChange={e => onChange('descricao', e.target.value)}
            placeholder="Ex: Tomografia computadorizada de crânio"
          />
        </Field>

        <div style={grid2}>
          <Field label="VALOR SOLICITADO (R$)">
            <input
              style={inp} type="number" step="0.01" min="0"
              value={form.valor_solicitado || ''}
              onChange={e => onChange('valor_solicitado', e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="VALOR AUTORIZADO (R$)">
            <input
              style={inp} type="number" step="0.01" min="0"
              value={form.valor_autorizado || ''}
              onChange={e => onChange('valor_autorizado', e.target.value)}
              placeholder="0,00"
            />
          </Field>
        </div>

        <div style={grid2}>
          <Field label="DATA RESPOSTA">
            <input
              style={inp} type="date" value={form.data_resposta || ''}
              onChange={e => onChange('data_resposta', e.target.value)}
            />
          </Field>
          <Field label="Nº AUTORIZAÇÃO">
            <input
              style={inp} value={form.numero_autorizacao || ''}
              onChange={e => onChange('numero_autorizacao', e.target.value)}
              placeholder="Ex: 123456789"
            />
          </Field>
        </div>

        <Field label="OBSERVAÇÕES">
          <textarea
            style={{ ...inp, minHeight: 72, resize: 'vertical' }}
            value={form.observacoes || ''}
            onChange={e => onChange('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre a autorização..."
          />
        </Field>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'transparent', color: L.t2, border: `1px solid ${L.line}`, cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            type="submit" disabled={saving}
            style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Spinner />}
            Salvar
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Update status sheet ──────────────────────────────────────────────────────
function SheetAtualizarStatus({ aut, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    status: aut.status,
    data_resposta: aut.data_resposta || '',
    numero_autorizacao: aut.numero_autorizacao || '',
    valor_autorizado: aut.valor_autorizado || '',
    observacoes: aut.observacoes || '',
  })
  const ch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <BottomSheet title="Atualizar Status" onClose={onClose} maxWidth={480}>
      <div style={{ marginBottom: 16, padding: '10px 14px', background: L.surface, borderRadius: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{aut._paciente}</div>
        <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
          {aut._convenio} · {TIPOS_GUIA_LABEL[aut.tipo_guia]}
          {aut.codigo_procedimento ? ` · ${aut.codigo_procedimento}` : ''}
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); onSave(aut.id, form) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="NOVO STATUS">
            <select style={inp} value={form.status} onChange={e => ch('status', e.target.value)}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="DATA RESPOSTA">
              <input style={inp} type="date" value={form.data_resposta}
                onChange={e => ch('data_resposta', e.target.value)} />
            </Field>
            <Field label="Nº AUTORIZAÇÃO">
              <input style={inp} value={form.numero_autorizacao}
                onChange={e => ch('numero_autorizacao', e.target.value)} />
            </Field>
          </div>

          <Field label="VALOR AUTORIZADO (R$)">
            <input style={inp} type="number" step="0.01" min="0"
              value={form.valor_autorizado}
              onChange={e => ch('valor_autorizado', e.target.value)} />
          </Field>

          <Field label="OBSERVAÇÕES">
            <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }}
              value={form.observacoes}
              onChange={e => ch('observacoes', e.target.value)} />
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13,
              background: 'transparent', color: L.t2, border: `1px solid ${L.line}`, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
            }}>
              {saving && <Spinner />} Salvar
            </button>
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}

// ─── Details sheet ────────────────────────────────────────────────────────────
function SheetDetalhes({ aut, onClose }) {
  const row = (label, value) => (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: `1px solid ${L.lineSoft}` }}>
      <div style={{ ...labelStyle, minWidth: 160, paddingTop: 1, marginBottom: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: L.t1, fontWeight: 500, flex: 1 }}>{value || '—'}</div>
    </div>
  )

  return (
    <BottomSheet title="Detalhes da Autorização" onClose={onClose} maxWidth={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <Badge status={aut.status} />
          <TipoBadge tipo={aut.tipo_guia} />
        </div>
        {row('PACIENTE', aut._paciente)}
        {row('CONVÊNIO', aut._convenio)}
        {row('MÉDICO', aut._medico)}
        {row('CÓDIGO PROCEDIMENTO', aut.codigo_procedimento)}
        {row('DESCRIÇÃO', aut.descricao)}
        {row('DATA SOLICITAÇÃO', fmtDate(aut.data_solicitacao))}
        {row('DATA RESPOSTA', fmtDate(aut.data_resposta))}
        {row('Nº AUTORIZAÇÃO', aut.numero_autorizacao)}
        {row('VALOR SOLICITADO', fmtCurrency(aut.valor_solicitado))}
        {row('VALOR AUTORIZADO', fmtCurrency(aut.valor_autorizado))}
        {row('OBSERVAÇÕES', aut.observacoes)}
        <button onClick={onClose} style={{
          marginTop: 8, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: L.surface, color: L.t2, border: `1px solid ${L.line}`, cursor: 'pointer',
        }}>Fechar</button>
      </div>
    </BottomSheet>
  )
}

// ─── Tab 0: Autorizações ──────────────────────────────────────────────────────
function TabAutorizacoes({ autorizacoes, pacientes, convenios, medicos, loading, onRefresh, clinicaId }) {
  const [modal, setModal] = useState(null) // 'new' | { type:'status'|'detail', aut }
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterConvenio, setFilterConvenio] = useState('')
  const [search, setSearch] = useState('')

  const { year, month } = thisMonth()

  // KPI computations
  const pendentes = autorizacoes.filter(a => a.status === 'pendente').length
  const autorizadosMes = autorizacoes.filter(a =>
    a.status === 'autorizado' && a.data_resposta &&
    new Date(a.data_resposta).getFullYear() === year &&
    new Date(a.data_resposta).getMonth() + 1 === month
  ).length
  const negadosMes = autorizacoes.filter(a =>
    a.status === 'negado' && a.data_resposta &&
    new Date(a.data_resposta).getFullYear() === year &&
    new Date(a.data_resposta).getMonth() + 1 === month
  ).length
  const totalRespondidosMes = autorizadosMes + negadosMes
  const taxaAprovacao = totalRespondidosMes > 0
    ? Math.round((autorizadosMes / totalRespondidosMes) * 100)
    : 0

  // Filter
  const filtered = autorizacoes.filter(a => {
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false
    if (filterConvenio && a.convenio_id !== filterConvenio) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a._paciente?.toLowerCase().includes(q) &&
          !a._convenio?.toLowerCase().includes(q) &&
          !a.codigo_procedimento?.toLowerCase().includes(q) &&
          !a.descricao?.toLowerCase().includes(q) &&
          !a.numero_autorizacao?.toLowerCase().includes(q)) return false
    }
    return true
  })

  function openNew() {
    setForm({ ...EMPTY_FORM, clinica_id: clinicaId })
    setModal('new')
  }
  function chForm(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function saveNew() {
    setSaving(true)
    const payload = {
      ...form,
      clinica_id: clinicaId,
      valor_solicitado: form.valor_solicitado ? Number(form.valor_solicitado) : null,
      valor_autorizado: form.valor_autorizado ? Number(form.valor_autorizado) : null,
      data_resposta: form.data_resposta || null,
      medico_id: form.medico_id || null,
    }
    await supabase.from('autorizacoes').insert(payload)
    setSaving(false)
    setModal(null)
    onRefresh()
  }

  async function saveStatus(id, upd) {
    setSaving(true)
    const payload = {
      status: upd.status,
      data_resposta: upd.data_resposta || null,
      numero_autorizacao: upd.numero_autorizacao || null,
      valor_autorizado: upd.valor_autorizado ? Number(upd.valor_autorizado) : null,
      observacoes: upd.observacoes || null,
    }
    await supabase.from('autorizacoes').update(payload).eq('id', id)
    setSaving(false)
    setModal(null)
    onRefresh()
  }

  const thStyle = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: L.t4, textAlign: 'left',
    fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', borderBottom: `1px solid ${L.line}`,
  }
  const tdStyle = { padding: '11px 14px', fontSize: 13, color: L.t1, verticalAlign: 'middle' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard label="PENDENTES" value={pendentes} color={pendentes > 0 ? L.yellow : L.t3} />
        <KpiCard label="AUTORIZADAS (MÊS)" value={autorizadosMes} color={L.green} />
        <KpiCard label="NEGADAS (MÊS)" value={negadosMes} color={L.red} />
        <KpiCard
          label="TAXA DE APROVAÇÃO"
          value={`${taxaAprovacao}%`}
          color={taxaAprovacao >= 70 ? L.green : taxaAprovacao >= 50 ? L.yellow : L.red}
          sub="Mês atual"
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inp, width: 220, flex: '0 0 auto' }}
          placeholder="Buscar paciente, código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...inp, width: 150, flex: '0 0 auto' }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select style={{ ...inp, width: 180, flex: '0 0 auto' }}
          value={filterConvenio} onChange={e => setFilterConvenio(e.target.value)}>
          <option value="">Todos convênios</option>
          {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={openNew} style={{
            padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Autorização
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        overflow: 'auto', boxShadow: L.shadow,
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t3, fontSize: 14 }}>
            Nenhuma autorização encontrada.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead style={{ background: L.surface }}>
              <tr>
                <th style={thStyle}>PACIENTE</th>
                <th style={thStyle}>CONVÊNIO</th>
                <th style={thStyle}>TIPO</th>
                <th style={thStyle}>CÓD / DESCRIÇÃO</th>
                <th style={thStyle}>SOLICITAÇÃO</th>
                <th style={thStyle}>RESPOSTA</th>
                <th style={thStyle}>VALOR AUTORI.</th>
                <th style={thStyle}>STATUS</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{
                  borderBottom: `1px solid ${L.lineSoft}`,
                  background: i % 2 === 0 ? L.bg : L.surface,
                  transition: 'background 0.1s',
                }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: L.t1 }}>{a._paciente || '—'}</div>
                    {a.numero_autorizacao && (
                      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        #{a.numero_autorizacao}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                      background: L.tealBg, color: L.teal, fontSize: 12, fontWeight: 500,
                    }}>{a._convenio || '—'}</span>
                  </td>
                  <td style={tdStyle}><TipoBadge tipo={a.tipo_guia} /></td>
                  <td style={{ ...tdStyle, maxWidth: 220 }}>
                    {a.codigo_procedimento && (
                      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {a.codigo_procedimento}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: L.t2, marginTop: 1 }}
                      title={a.descricao}>
                      {a.descricao ? (a.descricao.length > 35 ? a.descricao.slice(0, 35) + '…' : a.descricao) : '—'}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: L.t2 }}>{fmtDate(a.data_solicitacao)}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: L.t2 }}>{fmtDate(a.data_resposta)}</td>
                  <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600 }}>
                    {a.valor_autorizado != null ? fmtCurrency(a.valor_autorizado) : (
                      <span style={{ color: L.t4, fontWeight: 400, fontSize: 12 }}>
                        {a.valor_solicitado != null ? `Sol: ${fmtCurrency(a.valor_solicitado)}` : '—'}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}><Badge status={a.status} /></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        onClick={() => setModal({ type: 'status', aut: a })}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: L.tealBg, color: L.teal, border: `1px solid #b2dfdf`,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >Atualizar</button>
                      <button
                        onClick={() => setModal({ type: 'detail', aut: a })}
                        style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
                          cursor: 'pointer',
                        }}
                      >Detalhes</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modal === 'new' && (
        <BottomSheet title="Nova Autorização" onClose={() => setModal(null)} maxWidth={620}>
          <FormAutorizacao
            form={form} onChange={chForm}
            pacientes={pacientes} convenios={convenios} medicos={medicos}
            onSave={saveNew} onClose={() => setModal(null)} saving={saving}
          />
        </BottomSheet>
      )}
      {modal?.type === 'status' && (
        <SheetAtualizarStatus
          aut={modal.aut}
          onSave={saveStatus}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      {modal?.type === 'detail' && (
        <SheetDetalhes aut={modal.aut} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Tab 1: Pendentes Urgentes ────────────────────────────────────────────────
function TabPendentes({ autorizacoes, loading, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null)

  const pendentes = autorizacoes
    .filter(a => a.status === 'pendente')
    .map(a => ({ ...a, dias: daysDiff(a.data_solicitacao) }))
    .sort((a, b) => a.dias - b.dias) // oldest first = highest dias first
    .reverse() // actually: oldest = smallest date = most days elapsed, so sort desc
    // Note: oldest first means most days elapsed → sort by dias descending
  // Re-sort: oldest solicitation = highest daysDiff
  pendentes.sort((a, b) => b.dias - a.dias)

  async function quickUpdate(id, status) {
    setUpdatingId(id)
    const payload = { status }
    if (status === 'autorizado' || status === 'negado') {
      payload.data_resposta = new Date().toISOString().slice(0, 10)
    }
    await supabase.from('autorizacoes').update(payload).eq('id', id)
    setUpdatingId(null)
    onRefresh()
  }

  const thStyle = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: L.t4,
    fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
  }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: L.t1, verticalAlign: 'middle' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 10,
        background: L.yellowBg, border: `1px solid ${L.yellowBd}`,
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: L.yellow }}>
            {pendentes.length} autorização(ões) aguardando resposta
          </div>
          <div style={{ fontSize: 12, color: L.t3 }}>
            Registros com mais de 5 dias estão destacados em vermelho.
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : pendentes.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: L.t3, fontSize: 14,
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        }}>
          Nenhuma autorização pendente. ✓
        </div>
      ) : (
        <div style={{
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
          overflow: 'auto', boxShadow: L.shadow,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead style={{ background: L.surface }}>
              <tr>
                <th style={thStyle}>PACIENTE</th>
                <th style={thStyle}>CONVÊNIO</th>
                <th style={thStyle}>TIPO</th>
                <th style={thStyle}>PROCEDIMENTO</th>
                <th style={thStyle}>SOLICITAÇÃO</th>
                <th style={thStyle}>AGUARDANDO</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>AÇÕES RÁPIDAS</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((a, i) => {
                const urgente = a.dias > 5
                return (
                  <tr key={a.id} style={{
                    borderBottom: `1px solid ${L.lineSoft}`,
                    background: urgente
                      ? L.redBg
                      : (i % 2 === 0 ? L.bg : L.surface),
                  }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: urgente ? L.red : L.t1 }}>
                        {a._paciente || '—'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                        background: L.tealBg, color: L.teal, fontSize: 12, fontWeight: 500,
                      }}>{a._convenio || '—'}</span>
                    </td>
                    <td style={tdStyle}><TipoBadge tipo={a.tipo_guia} /></td>
                    <td style={{ ...tdStyle, maxWidth: 200 }}>
                      {a.codigo_procedimento && (
                        <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                          {a.codigo_procedimento}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: L.t2 }}>
                        {a.descricao ? (a.descricao.length > 30 ? a.descricao.slice(0, 30) + '…' : a.descricao) : '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{fmtDate(a.data_solicitacao)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: urgente ? L.red : L.yellowBg,
                        color: urgente ? L.white : L.yellow,
                        border: `1px solid ${urgente ? L.red : L.yellowBd}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        minWidth: 60,
                      }}>
                        {a.dias}d
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {updatingId === a.id ? (
                        <Spinner />
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => quickUpdate(a.id, 'autorizado')}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >✓ Autorizar</button>
                          <button
                            onClick={() => quickUpdate(a.id, 'negado')}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >✗ Negar</button>
                          <button
                            onClick={() => quickUpdate(a.id, 'recurso')}
                            style={{
                              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: L.orangeBg, color: L.orange, border: `1px solid ${L.orangeBd}`,
                              cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >↩ Recurso</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Relatório por Convênio ────────────────────────────────────────────
function TabRelatorio({ autorizacoes, convenios, loading }) {
  const now = new Date()
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)

  const MONTHS = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]
  const years = []
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) years.push(y)

  // Filter autorizacoes by month/year based on data_solicitacao
  const filtered = autorizacoes.filter(a => {
    if (!a.data_solicitacao) return false
    const d = new Date(a.data_solicitacao + 'T00:00:00')
    return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth
  })

  // Aggregate by convenio
  const convMap = {}
  convenios.forEach(c => {
    convMap[c.id] = {
      id: c.id, nome: c.nome,
      total: 0, autorizados: 0, negados: 0,
      totalValorAutorizado: 0, totalResponseDays: 0, respondidos: 0,
    }
  })

  filtered.forEach(a => {
    const key = a.convenio_id
    if (!convMap[key]) {
      convMap[key] = {
        id: key, nome: a._convenio || 'Desconhecido',
        total: 0, autorizados: 0, negados: 0,
        totalValorAutorizado: 0, totalResponseDays: 0, respondidos: 0,
      }
    }
    const c = convMap[key]
    c.total++
    if (a.status === 'autorizado') c.autorizados++
    if (a.status === 'negado') c.negados++
    if (a.valor_autorizado) c.totalValorAutorizado += Number(a.valor_autorizado)
    if (a.data_solicitacao && a.data_resposta) {
      const dSol = new Date(a.data_solicitacao + 'T00:00:00')
      const dRes = new Date(a.data_resposta + 'T00:00:00')
      const diff = Math.max(0, Math.floor((dRes - dSol) / 86400000))
      c.totalResponseDays += diff
      c.respondidos++
    }
  })

  const rows = Object.values(convMap).filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // Totals
  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    autorizados: acc.autorizados + r.autorizados,
    negados: acc.negados + r.negados,
    totalValorAutorizado: acc.totalValorAutorizado + r.totalValorAutorizado,
  }), { total: 0, autorizados: 0, negados: 0, totalValorAutorizado: 0 })

  const thStyle = {
    padding: '10px 16px', fontSize: 11, fontWeight: 600, color: L.t4,
    fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
  }
  const tdStyle = { padding: '12px 16px', fontSize: 13, color: L.t1, verticalAlign: 'middle' }
  const tdNum = { ...tdStyle, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>Relatório por Convênio</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <select style={{ ...inp, width: 140 }} value={filterMonth}
            onChange={e => setFilterMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select style={{ ...inp, width: 100 }} value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KpiCard label="TOTAL SOLICITAÇÕES" value={totals.total} />
        <KpiCard label="AUTORIZADAS" value={totals.autorizados} color={L.green} />
        <KpiCard label="NEGADAS" value={totals.negados} color={L.red} />
        <KpiCard
          label="TOTAL AUTORIZADO"
          value={fmtCurrency(totals.totalValorAutorizado)}
          color={L.teal}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : rows.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: L.t3, fontSize: 14,
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        }}>
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div style={{
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
          overflow: 'auto', boxShadow: L.shadow,
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead style={{ background: L.surface }}>
              <tr>
                <th style={thStyle}>CONVÊNIO</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>SOLICITAÇÕES</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>AUTORIZADAS</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>NEGADAS</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>TAXA APROV.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>T.M. RESPOSTA</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>TOTAL AUTORIZADO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const respondidosConv = r.autorizados + r.negados
                const taxa = respondidosConv > 0 ? Math.round((r.autorizados / respondidosConv) * 100) : null
                const tmResposta = r.respondidos > 0 ? Math.round(r.totalResponseDays / r.respondidos) : null
                return (
                  <tr key={r.id} style={{
                    borderBottom: `1px solid ${L.lineSoft}`,
                    background: i % 2 === 0 ? L.bg : L.surface,
                  }}>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        background: L.tealBg, color: L.teal, fontSize: 13, fontWeight: 600,
                      }}>{r.nome}</span>
                    </td>
                    <td style={tdNum}>{r.total}</td>
                    <td style={{ ...tdNum, color: L.green, fontWeight: 600 }}>{r.autorizados}</td>
                    <td style={{ ...tdNum, color: L.red, fontWeight: 600 }}>{r.negados}</td>
                    <td style={{ ...tdNum }}>
                      {taxa != null ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                          background: taxa >= 70 ? L.greenBg : taxa >= 50 ? L.yellowBg : L.redBg,
                          color: taxa >= 70 ? L.green : taxa >= 50 ? L.yellow : L.red,
                          fontWeight: 700, fontSize: 12,
                        }}>{taxa}%</span>
                      ) : '—'}
                    </td>
                    <td style={tdNum}>
                      {tmResposta != null ? (
                        <span style={{ color: tmResposta > 5 ? L.red : L.t2 }}>
                          {tmResposta}d
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdNum, fontWeight: 600, color: L.teal }}>
                      {fmtCurrency(r.totalValorAutorizado)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background: L.surface, borderTop: `2px solid ${L.line}` }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>TOTAL</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{totals.total}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: L.green }}>{totals.autorizados}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: L.red }}>{totals.negados}</td>
                <td style={tdNum}>
                  {(() => {
                    const t = totals.autorizados + totals.negados
                    const tx = t > 0 ? Math.round((totals.autorizados / t) * 100) : null
                    return tx != null ? (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                        background: tx >= 70 ? L.greenBg : tx >= 50 ? L.yellowBg : L.redBg,
                        color: tx >= 70 ? L.green : tx >= 50 ? L.yellow : L.red,
                        fontWeight: 700, fontSize: 12,
                      }}>{tx}%</span>
                    ) : '—'
                  })()}
                </td>
                <td style={tdNum}>—</td>
                <td style={{ ...tdNum, fontWeight: 700, color: L.teal }}>
                  {fmtCurrency(totals.totalValorAutorizado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PageAutorizacoes({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [autorizacoes, setAutorizacoes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [convenios, setConvenios] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)

  const TABS = ['Autorizações', 'Pendentes Urgentes', 'Relatório por Convênio']

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)

    const [autRes, pacRes, convRes, medRes] = await Promise.all([
      supabase.from('autorizacoes')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('criado_em', { ascending: false }),
      supabase.from('pacientes')
        .select('id, nome')
        .eq('clinica_id', clinicaId)
        .order('nome'),
      supabase.from('convenios')
        .select('id, nome')
        .eq('clinica_id', clinicaId)
        .order('nome'),
      supabase.from('medicos')
        .select('id, nome')
        .eq('clinica_id', clinicaId)
        .order('nome'),
    ])

    const pacs = pacRes.data || []
    const convs = convRes.data || []
    const meds = medRes.data || []
    const pacMap = Object.fromEntries(pacs.map(p => [p.id, p.nome]))
    const convMap = Object.fromEntries(convs.map(c => [c.id, c.nome]))
    const medMap = Object.fromEntries(meds.map(m => [m.id, m.nome]))

    const auts = (autRes.data || []).map(a => ({
      ...a,
      _paciente: pacMap[a.paciente_id] || '—',
      _convenio: convMap[a.convenio_id] || '—',
      _medico: medMap[a.medico_id] || '—',
    }))

    setAutorizacoes(auts)
    setPacientes(pacs)
    setConvenios(convs)
    setMedicos(meds)
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: L.t1 }}>Autorizações TISS</div>
        <div style={{ fontSize: 13, color: L.t3, marginTop: 3 }}>
          Gestão de autorizações de procedimentos junto aos convênios
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24,
        borderBottom: `1px solid ${L.line}`, paddingBottom: 0,
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: tab === i ? 600 : 500,
              color: tab === i ? L.teal : L.t3,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t}
            {i === 1 && autorizacoes.filter(a => a.status === 'pendente').length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, padding: '0 5px',
                background: L.red, color: L.white, borderRadius: 20,
                fontSize: 10, fontWeight: 700,
              }}>
                {autorizacoes.filter(a => a.status === 'pendente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabAutorizacoes
          autorizacoes={autorizacoes}
          pacientes={pacientes}
          convenios={convenios}
          medicos={medicos}
          loading={loading}
          onRefresh={load}
          clinicaId={clinicaId}
        />
      )}
      {tab === 1 && (
        <TabPendentes
          autorizacoes={autorizacoes}
          loading={loading}
          onRefresh={load}
        />
      )}
      {tab === 2 && (
        <TabRelatorio
          autorizacoes={autorizacoes}
          convenios={convenios}
          loading={loading}
        />
      )}
    </div>
  )
}
