import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = v =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const today = () => new Date().toISOString().split('T')[0]

const loteSuggest = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = d.getFullYear()
  return `LOT-${yy}${mm}`
}

const STATUS_LOTE = {
  aberto:  { label: 'Aberto',   color: L.blue,   bg: L.blueBg },
  enviado: { label: 'Enviado',  color: L.yellow,  bg: L.yellowBg },
  pago:    { label: 'Pago',     color: L.green,   bg: L.greenBg },
  glosado: { label: 'Glosado',  color: L.red,     bg: L.redBg },
  recurso: { label: 'Recurso',  color: L.purple,  bg: L.purpleBg },
}

const STATUS_GUIA = {
  pendente: { label: 'Pendente', color: L.yellow, bg: L.yellowBg },
  enviado:  { label: 'Enviado',  color: L.blue,   bg: L.blueBg },
  pago:     { label: 'Pago',     color: L.green,  bg: L.greenBg },
  glosado:  { label: 'Glosada',  color: L.red,    bg: L.redBg },
}

const TIPO_GUIA_LABEL = { consulta: 'Consulta', spsadt: 'SP/SADT', internacao: 'Internação' }

// ─── shared UI ──────────────────────────────────────────────────────────────

function Badge({ status, map }) {
  const s = map[status] || { label: status, color: L.t3, bg: L.surface }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
      border: `1px solid ${s.color}22`,
    }}>{s.label}</span>
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
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 760 : 520,
        maxHeight: '92vh', overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.16)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer',
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}

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

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: `2px solid ${L.teal}44`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 150,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || L.t1 }}>{value}</div>
    </div>
  )
}

// ─── TISS XML Generator ──────────────────────────────────────────────────────

function buildTissXML(lote, guias) {
  const now = new Date()
  const datePart = now.toISOString().split('T')[0]
  const timePart = now.toTimeString().split(' ')[0]

  const guiasTags = guias.map((g, i) => {
    if (g.tipo_guia === 'consulta') {
      return `
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:cabecalhoGuia>
            <ans:registroANS>000000</ans:registroANS>
            <ans:numeroGuiaPrestador>${g.numero_guia || ''}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:nomeBeneficiario>${g.pacientes?.nome || ''}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosAtendimento>
            <ans:dataAtendimento>${g.data_atendimento || ''}</ans:dataAtendimento>
            <ans:codigoProcedimento>${g.codigo_procedimento || ''}</ans:codigoProcedimento>
            <ans:descricaoProcedimento>${g.descricao_procedimento || ''}</ans:descricaoProcedimento>
            <ans:valorProcedimento>${Number(g.valor || 0).toFixed(2)}</ans:valorProcedimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>
      </ans:guiasTISS>`
    } else if (g.tipo_guia === 'spsadt') {
      return `
      <ans:guiasTISS>
        <ans:guiaSPSADT>
          <ans:cabecalhoGuia>
            <ans:registroANS>000000</ans:registroANS>
            <ans:numeroGuiaPrestador>${g.numero_guia || ''}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:nomeBeneficiario>${g.pacientes?.nome || ''}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosAtendimento>
            <ans:dataAtendimento>${g.data_atendimento || ''}</ans:dataAtendimento>
          </ans:dadosAtendimento>
          <ans:procedimentosExecutados>
            <ans:procedimentoExecutado>
              <ans:codigoProcedimento>${g.codigo_procedimento || ''}</ans:codigoProcedimento>
              <ans:descricaoProcedimento>${g.descricao_procedimento || ''}</ans:descricaoProcedimento>
              <ans:valorProcedimento>${Number(g.valor || 0).toFixed(2)}</ans:valorProcedimento>
            </ans:procedimentoExecutado>
          </ans:procedimentosExecutados>
        </ans:guiaSPSADT>
      </ans:guiasTISS>`
    } else {
      return `
      <ans:guiasTISS>
        <ans:guiaInternacao>
          <ans:cabecalhoGuia>
            <ans:registroANS>000000</ans:registroANS>
            <ans:numeroGuiaPrestador>${g.numero_guia || ''}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:nomeBeneficiario>${g.pacientes?.nome || ''}</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosInternacao>
            <ans:dataAtendimento>${g.data_atendimento || ''}</ans:dataAtendimento>
            <ans:codigoProcedimento>${g.codigo_procedimento || ''}</ans:codigoProcedimento>
            <ans:valorProcedimento>${Number(g.valor || 0).toFixed(2)}</ans:valorProcedimento>
          </ans:dadosInternacao>
        </ans:guiaInternacao>
      </ans:guiasTISS>`
    }
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>1</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${datePart}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${timePart}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>00000</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino><ans:registroANS>000000</ans:registroANS></ans:destino>
    <ans:versaoPadrao>3.05.00</ans:versaoPadrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${lote.numero_lote}</ans:numeroLote>${guiasTags}
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`
}

// ─── Modal: Novo Lote ────────────────────────────────────────────────────────

function ModalNovoLote({ convenios, onClose, onSaved, clinicaId }) {
  const [form, setForm] = useState({
    convenio_id: '',
    numero_lote: loteSuggest(),
    competencia: '',
    data_envio: today(),
    status: 'aberto',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.convenio_id) { setErr('Selecione um convênio.'); return }
    if (!form.numero_lote) { setErr('Informe o número do lote.'); return }
    if (!form.competencia) { setErr('Informe a competência (MM/YYYY).'); return }
    setSaving(true)
    const { error } = await supabase.from('lotes_faturamento').insert({
      clinica_id: clinicaId,
      convenio_id: form.convenio_id,
      numero_lote: form.numero_lote,
      competencia: form.competencia,
      data_envio: form.data_envio || null,
      status: form.status,
      total_valor: 0,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Novo Lote de Faturamento" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="CONVÊNIO *">
          <select value={form.convenio_id} onChange={e => set('convenio_id', e.target.value)} style={inp}>
            <option value="">Selecione...</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="NÚMERO DO LOTE *">
          <input value={form.numero_lote} onChange={e => set('numero_lote', e.target.value)} style={inp} placeholder="LOT-YYYYMM" />
        </Field>
        <Field label="COMPETÊNCIA (MM/YYYY) *">
          <input value={form.competencia} onChange={e => set('competencia', e.target.value)} style={inp} placeholder="05/2026" maxLength={7} />
        </Field>
        <Field label="DATA DE ENVIO">
          <input type="date" value={form.data_envio} onChange={e => set('data_envio', e.target.value)} style={inp} />
        </Field>
        <Field label="STATUS">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
            {Object.entries(STATUS_LOTE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
        <button onClick={save} disabled={saving} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 14,
          padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <Spinner /> : 'Salvar Lote'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Modal: Nova Guia ────────────────────────────────────────────────────────

function ModalNovaGuia({ lotes, clinicaId, onClose, onSaved, defaultLoteId }) {
  const [form, setForm] = useState({
    lote_id: defaultLoteId || '',
    tipo_guia: 'consulta',
    numero_guia: '',
    paciente_id: '',
    data_atendimento: today(),
    codigo_procedimento: '',
    descricao_procedimento: '',
    valor: '',
    status: 'pendente',
    motivo_glosa: '',
  })
  const [pacSearch, setPacSearch] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [pacLoading, setPacLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (pacSearch.length < 2) { setPacientes([]); return }
    setPacLoading(true)
    supabase.from('pacientes')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .ilike('nome', `%${pacSearch}%`)
      .limit(20)
      .then(({ data }) => { setPacientes(data || []); setPacLoading(false) })
  }, [pacSearch, clinicaId])

  async function save() {
    if (!form.lote_id) { setErr('Selecione um lote.'); return }
    if (!form.numero_guia) { setErr('Informe o número da guia.'); return }
    if (!form.paciente_id) { setErr('Selecione um paciente.'); return }
    setSaving(true)
    const { error } = await supabase.from('guias_faturamento').insert({
      clinica_id: clinicaId,
      lote_id: form.lote_id,
      tipo_guia: form.tipo_guia,
      numero_guia: form.numero_guia,
      paciente_id: form.paciente_id,
      data_atendimento: form.data_atendimento || null,
      codigo_procedimento: form.codigo_procedimento,
      descricao_procedimento: form.descricao_procedimento,
      valor: parseFloat(form.valor) || 0,
      status: form.status,
      motivo_glosa: form.status === 'glosado' ? form.motivo_glosa : null,
    })
    if (!error) {
      // recalc lote total
      const { data: guias } = await supabase.from('guias_faturamento')
        .select('valor').eq('lote_id', form.lote_id)
      const total = (guias || []).reduce((s, g) => s + (g.valor || 0), 0)
      await supabase.from('lotes_faturamento').update({ total_valor: total }).eq('id', form.lote_id)
    }
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  const selectedPac = pacientes.find(p => p.id === form.paciente_id)

  return (
    <Modal title="Nova Guia de Faturamento" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="LOTE *">
          <select value={form.lote_id} onChange={e => set('lote_id', e.target.value)} style={inp}>
            <option value="">Selecione...</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote} – {l.convenios?.nome}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="TIPO DE GUIA">
            <select value={form.tipo_guia} onChange={e => set('tipo_guia', e.target.value)} style={inp}>
              {Object.entries(TIPO_GUIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="NÚMERO DA GUIA *">
            <input value={form.numero_guia} onChange={e => set('numero_guia', e.target.value)} style={inp} placeholder="ex: 123456" />
          </Field>
        </div>
        <Field label="PACIENTE *">
          <input
            value={selectedPac ? selectedPac.nome : pacSearch}
            onChange={e => { setPacSearch(e.target.value); set('paciente_id', '') }}
            style={inp} placeholder="Digite o nome para buscar..."
          />
          {pacLoading && <div style={{ fontSize: 12, color: L.t4, marginTop: 4 }}>Buscando...</div>}
          {!selectedPac && pacientes.length > 0 && (
            <div style={{
              border: `1px solid ${L.line}`, borderRadius: 8, marginTop: 2,
              background: L.surface, maxHeight: 160, overflowY: 'auto',
            }}>
              {pacientes.map(p => (
                <div key={p.id} onClick={() => { set('paciente_id', p.id); setPacSearch(''); setPacientes([]) }} style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: L.t1,
                  borderBottom: `1px solid ${L.line}`,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{p.nome}</div>
              ))}
            </div>
          )}
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="DATA DE ATENDIMENTO">
            <input type="date" value={form.data_atendimento} onChange={e => set('data_atendimento', e.target.value)} style={inp} />
          </Field>
          <Field label="VALOR (R$)">
            <input type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)} style={inp} placeholder="0,00" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <Field label="CÓD. PROCEDIMENTO">
            <input value={form.codigo_procedimento} onChange={e => set('codigo_procedimento', e.target.value)} style={inp} placeholder="ex: 10101012" />
          </Field>
          <Field label="DESCRIÇÃO DO PROCEDIMENTO">
            <input value={form.descricao_procedimento} onChange={e => set('descricao_procedimento', e.target.value)} style={inp} />
          </Field>
        </div>
        <Field label="STATUS">
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
            {Object.entries(STATUS_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        {form.status === 'glosado' && (
          <Field label="MOTIVO DA GLOSA">
            <input value={form.motivo_glosa} onChange={e => set('motivo_glosa', e.target.value)} style={inp} placeholder="Descreva o motivo..." />
          </Field>
        )}
        {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
        <button onClick={save} disabled={saving} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 14,
          padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <Spinner /> : 'Salvar Guia'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Modal: Importar de Consultas ─────────────────────────────────────────────

function ModalImportarConsultas({ lotes, clinicaId, onClose, onSaved }) {
  const [loteId, setLoteId] = useState('')
  const [dataIni, setDataIni] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(today())
  const [consultas, setConsultas] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function buscar() {
    if (!loteId) { setErr('Selecione um lote.'); return }
    setErr(''); setLoading(true)
    // Load consultas in range not already in any guia
    const { data: jaGuias } = await supabase.from('guias_faturamento')
      .select('consulta_id').eq('clinica_id', clinicaId).not('consulta_id', 'is', null)
    const jaIds = (jaGuias || []).map(g => g.consulta_id).filter(Boolean)

    let q = supabase.from('consultas')
      .select('id, data_hora, valor, paciente_id, pacientes(nome)')
      .eq('clinica_id', clinicaId)
      .gte('data_hora', dataIni)
      .lte('data_hora', dataFim + 'T23:59:59')
      .order('data_hora', { ascending: false })
      .limit(200)

    if (jaIds.length > 0) q = q.not('id', 'in', `(${jaIds.join(',')})`)

    const { data, error } = await q
    setLoading(false)
    if (error) { setErr(error.message); return }
    setConsultas(data || [])
    setSelected({})
  }

  function toggleAll() {
    if (Object.keys(selected).length === consultas.length) setSelected({})
    else setSelected(Object.fromEntries(consultas.map(c => [c.id, true])))
  }

  async function importar() {
    const ids = Object.keys(selected).filter(id => selected[id])
    if (!ids.length) { setErr('Selecione ao menos uma consulta.'); return }
    setSaving(true)
    const rows = ids.map(id => {
      const c = consultas.find(x => x.id === id)
      return {
        clinica_id: clinicaId,
        lote_id: loteId,
        tipo_guia: 'consulta',
        numero_guia: `CONS-${id.slice(0, 8).toUpperCase()}`,
        paciente_id: c.paciente_id,
        consulta_id: c.id,
        data_atendimento: c.data_hora ? c.data_hora.split('T')[0] : null,
        codigo_procedimento: '10101012',
        descricao_procedimento: 'Consulta médica',
        valor: c.valor || 0,
        status: 'pendente',
      }
    })
    const { error } = await supabase.from('guias_faturamento').insert(rows)
    if (!error) {
      const { data: allGuias } = await supabase.from('guias_faturamento')
        .select('valor').eq('lote_id', loteId)
      const total = (allGuias || []).reduce((s, g) => s + (g.valor || 0), 0)
      await supabase.from('lotes_faturamento').update({ total_valor: total }).eq('id', loteId)
    }
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Importar Consultas como Guias" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="LOTE DE DESTINO *">
          <select value={loteId} onChange={e => setLoteId(e.target.value)} style={inp}>
            <option value="">Selecione...</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote} – {l.convenios?.nome}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <Field label="DATA INICIAL">
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} style={inp} />
          </Field>
          <Field label="DATA FINAL">
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={inp} />
          </Field>
          <button onClick={buscar} disabled={loading} style={{
            background: L.surface, border: `1.5px solid ${L.line}`, borderRadius: 8,
            padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: L.t1,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            {loading ? <Spinner /> : 'Buscar'}
          </button>
        </div>
        {err && <div style={{ color: L.red, fontSize: 12 }}>{err}</div>}
        {consultas.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: L.t2 }}>{consultas.length} consulta(s) encontrada(s)</span>
              <button onClick={toggleAll} style={{
                fontSize: 12, color: L.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
              }}>
                {Object.keys(selected).length === consultas.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
              </button>
            </div>
            <div style={{ border: `1px solid ${L.line}`, borderRadius: 8, maxHeight: 280, overflowY: 'auto' }}>
              {consultas.map(c => (
                <label key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderBottom: `1px solid ${L.line}`,
                  cursor: 'pointer', background: selected[c.id] ? L.tealBg : 'transparent',
                }}>
                  <input type="checkbox" checked={!!selected[c.id]}
                    onChange={e => setSelected(s => ({ ...s, [c.id]: e.target.checked }))} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: L.t1, fontWeight: 500 }}>{c.pacientes?.nome || '—'}</div>
                    <div style={{ fontSize: 11, color: L.t4 }}>
                      {c.data_hora ? new Date(c.data_hora).toLocaleDateString('pt-BR') : '—'} · {fmt(c.valor)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={importar} disabled={saving || !Object.values(selected).some(Boolean)} style={{
              background: L.teal, color: L.white, fontWeight: 600, fontSize: 14,
              padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: !Object.values(selected).some(Boolean) ? 0.5 : 1,
            }}>
              {saving ? <Spinner /> : `Importar ${Object.values(selected).filter(Boolean).length} consulta(s)`}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Modal: XML Viewer ───────────────────────────────────────────────────────

function ModalXML({ xml, filename, onClose }) {
  function download() {
    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title={`XML TISS — ${filename}`} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          background: '#0d1117', borderRadius: 8, padding: '16px',
          maxHeight: 400, overflowY: 'auto',
        }}>
          <pre style={{
            margin: 0, fontSize: 11, color: '#c9d1d9', fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>{xml}</pre>
        </div>
        <button onClick={download} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 14,
          padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
        }}>
          ↓ Baixar XML
        </button>
      </div>
    </Modal>
  )
}

// ─── Tab Lotes ───────────────────────────────────────────────────────────────

function TabLotes({ clinicaId, lotes, convenios, loading, onRefresh, onVerGuias }) {
  const [showNovoLote, setShowNovoLote] = useState(false)
  const [xmlModal, setXmlModal] = useState(null) // { xml, filename }
  const [deleting, setDeleting] = useState(null)

  const kpis = ['aberto', 'enviado', 'pago', 'glosado'].map(s => ({
    key: s,
    label: STATUS_LOTE[s].label,
    color: STATUS_LOTE[s].color,
    value: lotes.filter(l => l.status === s).reduce((s, l) => s + (l.total_valor || 0), 0),
  }))

  async function gerarXML(lote) {
    const { data: guias, error } = await supabase.from('guias_faturamento')
      .select('*, pacientes(nome)')
      .eq('lote_id', lote.id)
    if (error) { alert('Erro ao carregar guias: ' + error.message); return }
    const xml = buildTissXML(lote, guias || [])
    const filename = `lote_${lote.numero_lote}.xml`
    // Save to DB
    await supabase.from('lotes_faturamento').update({ xml_gerado: xml }).eq('id', lote.id)
    // Trigger download
    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    setXmlModal({ xml, filename })
    onRefresh()
  }

  async function excluir(lote) {
    if (!window.confirm(`Excluir lote ${lote.numero_lote}? Esta ação não pode ser desfeita.`)) return
    setDeleting(lote.id)
    await supabase.from('guias_faturamento').delete().eq('lote_id', lote.id)
    await supabase.from('lotes_faturamento').delete().eq('id', lote.id)
    setDeleting(null)
    onRefresh()
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {kpis.map(k => (
          <KpiCard key={k.key} label={k.label.toUpperCase()} value={fmt(k.value)} color={k.color} />
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Lotes de Faturamento</div>
        <button onClick={() => setShowNovoLote(true)} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
          padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        }}>+ Novo Lote</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>
          <Spinner /> <span style={{ marginLeft: 8, fontSize: 13 }}>Carregando...</span>
        </div>
      ) : lotes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: L.t4, fontSize: 14,
          border: `1.5px dashed ${L.line}`, borderRadius: 12,
        }}>Nenhum lote cadastrado. Clique em "+ Novo Lote" para começar.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Nº Lote', 'Convênio', 'Competência', 'Data Envio', 'Status', 'Total', 'Guias', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
                    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lotes.map(l => {
                const hasGlosa = (l.guias_faturamento || []).some(g => g.status === 'glosado')
                return (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${L.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = L.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', color: L.t1, fontWeight: 600 }}>
                      {l.numero_lote}
                      {hasGlosa && (
                        <span style={{
                          marginLeft: 6, fontSize: 10, color: L.red, background: L.redBg,
                          padding: '1px 6px', borderRadius: 99, fontWeight: 700,
                        }}>⚠ GLOSA</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: L.t2 }}>{l.convenios?.nome || '—'}</td>
                    <td style={{ padding: '11px 14px', color: L.t2 }}>{l.competencia || '—'}</td>
                    <td style={{ padding: '11px 14px', color: L.t2 }}>
                      {l.data_envio ? new Date(l.data_envio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Badge status={l.status} map={STATUS_LOTE} />
                    </td>
                    <td style={{ padding: '11px 14px', color: L.t1, fontWeight: 600 }}>
                      {fmt(l.total_valor || 0)}
                    </td>
                    <td style={{ padding: '11px 14px', color: L.t2 }}>
                      {(l.guias_faturamento || []).length}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        <button onClick={() => onVerGuias(l.id)} style={btnSm(L.blue, L.blueBg)}>
                          Ver Guias
                        </button>
                        <button onClick={() => gerarXML(l)} style={btnSm(L.teal, L.tealBg)}>
                          Gerar XML
                        </button>
                        {l.status === 'aberto' && (
                          <button onClick={() => excluir(l)} disabled={deleting === l.id} style={btnSm(L.red, L.redBg)}>
                            {deleting === l.id ? '...' : 'Excluir'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNovoLote && (
        <ModalNovoLote
          convenios={convenios}
          clinicaId={clinicaId}
          onClose={() => setShowNovoLote(false)}
          onSaved={() => { setShowNovoLote(false); onRefresh() }}
        />
      )}
      {xmlModal && (
        <ModalXML xml={xmlModal.xml} filename={xmlModal.filename} onClose={() => setXmlModal(null)} />
      )}
    </div>
  )
}

// ─── Tab Guias ───────────────────────────────────────────────────────────────

function TabGuias({ clinicaId, lotes, convenios, filterLoteId, onRefresh }) {
  const [guias, setGuias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovaGuia, setShowNovaGuia] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [filters, setFilters] = useState({
    lote_id: filterLoteId || '',
    convenio_id: '',
    tipo_guia: '',
    status: '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('guias_faturamento')
      .select('*, pacientes(nome), lotes_faturamento(numero_lote, convenio_id, convenios(nome))')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })

    if (filters.lote_id) q = q.eq('lote_id', filters.lote_id)
    if (filters.tipo_guia) q = q.eq('tipo_guia', filters.tipo_guia)
    if (filters.status) q = q.eq('status', filters.status)

    const { data, error } = await q
    if (!error) {
      let result = data || []
      if (filters.convenio_id) {
        result = result.filter(g => g.lotes_faturamento?.convenio_id === filters.convenio_id)
      }
      setGuias(result)
    }
    setLoading(false)
  }, [clinicaId, filters])

  useEffect(() => { load() }, [load])

  // sync filterLoteId from parent
  useEffect(() => {
    if (filterLoteId) setFilters(f => ({ ...f, lote_id: filterLoteId }))
  }, [filterLoteId])

  async function recorrer(guia) {
    await supabase.from('guias_faturamento').update({ status: 'recurso' }).eq('id', guia.id)
    // If lote has no more glosado guias, we just refresh
    load()
    onRefresh()
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={filters.lote_id} onChange={e => setF('lote_id', e.target.value)}
          style={{ ...inp, width: 180 }}>
          <option value="">Todos os lotes</option>
          {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote}</option>)}
        </select>
        <select value={filters.convenio_id} onChange={e => setF('convenio_id', e.target.value)}
          style={{ ...inp, width: 160 }}>
          <option value="">Todos convênios</option>
          {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filters.tipo_guia} onChange={e => setF('tipo_guia', e.target.value)}
          style={{ ...inp, width: 140 }}>
          <option value="">Todos tipos</option>
          {Object.entries(TIPO_GUIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={e => setF('status', e.target.value)}
          style={{ ...inp, width: 140 }}>
          <option value="">Todos status</option>
          {Object.entries(STATUS_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowImportar(true)} style={{
          background: L.surface, border: `1.5px solid ${L.line}`, borderRadius: 8,
          padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: L.t1,
        }}>
          ↑ Importar de Consultas
        </button>
        <button onClick={() => setShowNovaGuia(true)} style={{
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
          padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        }}>+ Nova Guia</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>
          <Spinner /> <span style={{ marginLeft: 8, fontSize: 13 }}>Carregando...</span>
        </div>
      ) : guias.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: L.t4, fontSize: 14,
          border: `1.5px dashed ${L.line}`, borderRadius: 12,
        }}>Nenhuma guia encontrada com os filtros atuais.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Nº Guia', 'Paciente', 'Tipo', 'Procedimento', 'Data Atend.', 'Valor', 'Status', 'Glosa', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
                    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guias.map(g => (
                <tr key={g.id} style={{ borderBottom: `1px solid ${L.line}` }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 600 }}>{g.numero_guia}</td>
                  <td style={{ padding: '10px 14px', color: L.t2 }}>{g.pacientes?.nome || '—'}</td>
                  <td style={{ padding: '10px 14px', color: L.t3 }}>{TIPO_GUIA_LABEL[g.tipo_guia] || g.tipo_guia}</td>
                  <td style={{ padding: '10px 14px', color: L.t2, maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={g.descricao_procedimento}>
                      <span style={{ color: L.t4, marginRight: 4 }}>{g.codigo_procedimento}</span>
                      {g.descricao_procedimento}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>
                    {g.data_atendimento ? new Date(g.data_atendimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 600 }}>{fmt(g.valor)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge status={g.status} map={STATUS_GUIA} />
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                    {g.status === 'glosado' ? (
                      <span style={{ color: L.red, fontSize: 12 }}
                        title={g.motivo_glosa}>
                        {g.motivo_glosa
                          ? (g.motivo_glosa.length > 30 ? g.motivo_glosa.slice(0, 30) + '…' : g.motivo_glosa)
                          : '—'
                        }
                      </span>
                    ) : <span style={{ color: L.t4 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {g.status === 'glosado' && (
                      <button onClick={() => recorrer(g)} style={btnSm(L.purple, L.purpleBg)}>
                        Recorrer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNovaGuia && (
        <ModalNovaGuia
          lotes={lotes}
          clinicaId={clinicaId}
          defaultLoteId={filters.lote_id}
          onClose={() => setShowNovaGuia(false)}
          onSaved={() => { setShowNovaGuia(false); load(); onRefresh() }}
        />
      )}
      {showImportar && (
        <ModalImportarConsultas
          lotes={lotes}
          clinicaId={clinicaId}
          onClose={() => setShowImportar(false)}
          onSaved={() => { setShowImportar(false); load(); onRefresh() }}
        />
      )}
    </div>
  )
}

// ─── button helper ───────────────────────────────────────────────────────────

function btnSm(color, bg) {
  return {
    background: bg, color, border: `1px solid ${color}33`, borderRadius: 6,
    padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PageFaturamento({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState('lotes')
  const [lotes, setLotes] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loadingLotes, setLoadingLotes] = useState(true)
  const [filterLoteId, setFilterLoteId] = useState(null)

  const loadLotes = useCallback(async () => {
    if (!clinicaId) return
    setLoadingLotes(true)
    const { data } = await supabase.from('lotes_faturamento')
      .select('*, convenios(id, nome), guias_faturamento(id, status, valor)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setLotes(data || [])
    setLoadingLotes(false)
  }, [clinicaId])

  const loadConvenios = useCallback(async () => {
    if (!clinicaId) return
    const { data } = await supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).order('nome')
    setConvenios(data || [])
  }, [clinicaId])

  useEffect(() => { loadLotes(); loadConvenios() }, [loadLotes, loadConvenios])

  function verGuias(loteId) {
    setFilterLoteId(loteId)
    setTab('guias')
  }

  return (
    <>
      <style>{`
        @keyframes up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: L.t1, marginBottom: 4 }}>
            Faturamento TISS
          </div>
          <div style={{ fontSize: 13, color: L.t4 }}>
            Gerenciamento de lotes e guias de faturamento para operadoras de saúde
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 24,
          borderBottom: `1.5px solid ${L.line}`,
        }}>
          {[
            { key: 'lotes', label: 'Lotes' },
            { key: 'guias', label: 'Guias' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 24px', fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? L.teal : L.t3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? `2.5px solid ${L.teal}` : '2.5px solid transparent',
              marginBottom: -1.5,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'lotes' && (
          <TabLotes
            clinicaId={clinicaId}
            lotes={lotes}
            convenios={convenios}
            loading={loadingLotes}
            onRefresh={loadLotes}
            onVerGuias={verGuias}
          />
        )}
        {tab === 'guias' && (
          <TabGuias
            clinicaId={clinicaId}
            lotes={lotes}
            convenios={convenios}
            filterLoteId={filterLoteId}
            onRefresh={loadLotes}
          />
        )}
      </div>
    </>
  )
}
