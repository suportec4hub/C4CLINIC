import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = v =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const today = () => new Date().toISOString().split('T')[0]

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_LOTE = {
  aberto:      { label: 'Aberto',      color: L.blue,   bg: L.blueBg },
  enviado:     { label: 'Enviado',     color: L.yellow, bg: L.yellowBg },
  processado:  { label: 'Processado',  color: L.teal,   bg: L.tealBg },
  rejeitado:   { label: 'Rejeitado',   color: L.red,    bg: L.redBg },
  pago:        { label: 'Pago',        color: L.green,  bg: L.greenBg },
}

const STATUS_GUIA = {
  gerada:      { label: 'Gerada',      color: L.t3,     bg: L.surface },
  enviada:     { label: 'Enviada',     color: L.yellow, bg: L.yellowBg },
  processada:  { label: 'Processada',  color: L.blue,   bg: L.blueBg },
  glosada:     { label: 'Glosada',     color: L.red,    bg: L.redBg },
  paga:        { label: 'Paga',        color: L.green,  bg: L.greenBg },
}

const TIPO_GUIA = {
  sp_sadt:            { label: 'SP/SADT',       color: L.blue,   bg: L.blueBg },
  internacao:         { label: 'Internação',    color: L.purple, bg: L.purpleBg },
  honorarios:         { label: 'Honorários',    color: L.teal,   bg: L.tealBg },
  resumo_internacao:  { label: 'Resumo Int.',   color: L.orange, bg: L.orangeBg },
  outras_despesas:    { label: 'Outras Desp.',  color: L.t3,     bg: L.surface },
}

const VERSOES_TISS = ['3.05.00', '3.04.01', '3.03.03', '3.02.02']

// ─── XML generator (simulated TISS structure) ────────────────────────────────

function gerarXmlTISS(lote, guias, convenioNome) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const guiasXml = (guias || []).map((g, i) => `
    <ans:guiaServico>
      <ans:cabecalhoGuia>
        <ans:numeroGuiaPrestador>${g.numero_guia || `GUIA${i + 1}`}</ans:numeroGuiaPrestador>
        <ans:numeroGuiaOperadora>${g.numero_autorizacao || ''}</ans:numeroGuiaOperadora>
        <ans:dataAtendimento>${g.data_atendimento || ''}</ans:dataAtendimento>
        <ans:tipoGuia>${g.tipo_guia || ''}</ans:tipoGuia>
      </ans:cabecalhoGuia>
      <ans:procedimentoExecutado>
        <ans:codigoProcedimento>${g.codigo_procedimento || ''}</ans:codigoProcedimento>
        <ans:descricaoProcedimento>${g.descricao_procedimento || ''}</ans:descricaoProcedimento>
        <ans:quantidade>${g.quantidade || 1}</ans:quantidade>
        <ans:valorUnitario>${(g.valor_unitario || 0).toFixed(2)}</ans:valorUnitario>
        <ans:valorTotal>${(g.valor_total || 0).toFixed(2)}</ans:valorTotal>
      </ans:procedimentoExecutado>
    </ans:guiaServico>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas tissV${lote.versao_tiss || '3.05.00'}.xsd">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${lote.numero_lote || '001'}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${ts.split(' ')[0]}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${ts.split(' ')[1]}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>PRESTADOR001</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:identificacaoOperadora>
        <ans:registro ANS="${convenioNome || 'CONVENIO'}"/>
      </ans:identificacaoOperadora>
    </ans:destino>
    <ans:Padrao>${lote.versao_tiss || '3.05.00'}</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${lote.numero_lote || '001'}</ans:numeroLote>
      <ans:competencia>${lote.competencia || ''}</ans:competencia>
      <ans:guiasServico>${guiasXml}
      </ans:guiasServico>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:hash>SHA256-SIMULADO-${Date.now()}</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function exportGlosasCSV(guias, convenios, pacientes) {
  const header = ['Número Guia', 'Convênio', 'Paciente', 'Data Atendimento',
    'Procedimento', 'Valor Total', 'Motivo Glosa']
  const rows = guias.map(g => [
    g.numero_guia || '',
    convenios.find(c => c.id === g.convenio_id)?.nome || '',
    pacientes.find(p => p.id === g.paciente_id)?.nome || '',
    g.data_atendimento || '',
    g.descricao_procedimento || '',
    (g.valor_total || 0).toFixed(2),
    g.motivo_glosa || '',
  ])
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `glosas_${currentMonth()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── shared UI ───────────────────────────────────────────────────────────────

function Badge({ value, map }) {
  const s = map[value] || { label: value || '-', color: L.t3, bg: L.surface }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
      border: `1px solid ${s.color}22`, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function BottomSheet({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 860 : 560,
        maxHeight: '92vh', overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none', border: 'none',
            cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 11, color: L.t4,
      fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 4, fontWeight: 600, letterSpacing: '0.03em',
    }}>{children}</div>
  )
}

function Input({ ...props }) {
  return (
    <input style={{
      width: '100%', padding: '9px 12px', fontSize: 13,
      border: `1.5px solid ${L.line}`, borderRadius: 8,
      background: L.surface, color: L.t1, outline: 'none',
      boxSizing: 'border-box',
    }} {...props} />
  )
}

function Select({ children, ...props }) {
  return (
    <select style={{
      width: '100%', padding: '9px 12px', fontSize: 13,
      border: `1.5px solid ${L.line}`, borderRadius: 8,
      background: L.surface, color: L.t1, outline: 'none',
      boxSizing: 'border-box',
    }} {...props}>{children}</select>
  )
}

function BtnPrimary({ children, loading, ...props }) {
  return (
    <button style={{
      background: L.teal, color: L.white, fontWeight: 600,
      border: 'none', borderRadius: 8, padding: '10px 20px',
      fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
    }} disabled={loading} {...props}>
      {loading && <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>}
      {children}
    </button>
  )
}

function BtnSecondary({ children, ...props }) {
  return (
    <button style={{
      background: 'none', color: L.t2, fontWeight: 600,
      border: `1.5px solid ${L.line}`, borderRadius: 8,
      padding: '9px 18px', fontSize: 13, cursor: 'pointer',
    }} {...props}>{children}</button>
  )
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`,
      borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || L.t1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Toast({ msg, ok }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: ok ? L.green : L.red, color: L.white, fontWeight: 600,
      padding: '12px 28px', borderRadius: 10, zIndex: 999,
      fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'up 0.2s ease',
    }}>{msg}</div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: L.t4 }}>
      <span style={{ fontSize: 24, animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
    </div>
  )
}

function EmptyRow({ cols, text }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '32px 0', color: L.t4, fontSize: 13 }}>
        {text}
      </td>
    </tr>
  )
}

const TH = ({ children, ...s }) => (
  <th style={{
    padding: '10px 14px', fontSize: 11, color: L.t4, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap', ...s,
  }}>{children}</th>
)

const TD = ({ children, ...s }) => (
  <td style={{
    padding: '10px 14px', fontSize: 13, color: L.t2,
    borderBottom: `1px solid ${L.line}`, verticalAlign: 'middle', ...s,
  }}>{children}</td>
)

// ─── Tab 0: Lotes TISS ───────────────────────────────────────────────────────

function TabLotes({ clinicaId, convenios, toast }) {
  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // detail sheets
  const [loteGuias, setLoteGuias] = useState(null)      // { lote, guias }
  const [xmlPreview, setXmlPreview] = useState(null)    // { lote, xml }
  const [errosLote, setErrosLote] = useState(null)      // { lote }

  const [form, setForm] = useState({
    convenio_id: '', competencia: currentMonth(),
    versao_tiss: '3.05.00', data_envio: today(), status: 'aberto',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tiss_lotes')
      .select('*, convenios(nome)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setLotes(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const mesAtual = currentMonth()
  const lotesAbertos = lotes.filter(l => l.status === 'aberto').length
  const totalEnviadoMes = lotes
    .filter(l => l.competencia === mesAtual && ['enviado', 'processado', 'pago'].includes(l.status))
    .reduce((s, l) => s + (l.valor_total || 0), 0)
  const glosasCount = lotes.filter(l => l.status === 'rejeitado' && l.competencia === mesAtual).length
  const valorPagoMes = lotes
    .filter(l => l.status === 'pago' && l.competencia === mesAtual)
    .reduce((s, l) => s + (l.valor_total || 0), 0)

  const salvarLote = async () => {
    if (!form.convenio_id) return toast('Selecione um convênio', false)
    setSaving(true)
    const { error } = await supabase.from('tiss_lotes').insert({
      ...form,
      clinica_id: clinicaId,
      numero_lote: `LOT-${Date.now()}`.slice(-10),
      total_guias: 0,
      valor_total: 0,
    })
    setSaving(false)
    if (error) return toast('Erro ao criar lote: ' + error.message, false)
    toast('Lote criado!', true)
    setShowNew(false)
    setForm({ convenio_id: '', competencia: currentMonth(), versao_tiss: '3.05.00', data_envio: today(), status: 'aberto' })
    load()
  }

  const abrirGuias = async lote => {
    const { data } = await supabase.from('tiss_guias').select('*, pacientes(nome)').eq('lote_id', lote.id)
    setLoteGuias({ lote, guias: data || [] })
  }

  const gerarXml = async lote => {
    const { data: guias } = await supabase.from('tiss_guias').select('*').eq('lote_id', lote.id)
    const conv = convenios.find(c => c.id === lote.convenio_id)
    const xml = gerarXmlTISS(lote, guias || [], conv?.nome)
    setXmlPreview({ lote, xml })
  }

  const marcarEnviado = async lote => {
    await supabase.from('tiss_lotes').update({ status: 'enviado', data_envio: today() }).eq('id', lote.id)
    toast('Lote marcado como enviado!', true)
    load()
  }

  const verErros = lote => setErrosLote({ lote })

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPICard label="LOTES ABERTOS" value={lotesAbertos} color={L.blue} />
        <KPICard label="TOTAL ENVIADO (MÊS)" value={fmt(totalEnviadoMes)} color={L.teal} />
        <KPICard label="LOTES REJEITADOS (MÊS)" value={glosasCount} color={L.red} />
        <KPICard label="VALOR PAGO (MÊS)" value={fmt(valorPagoMes)} color={L.green} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: L.t1 }}>Lotes TISS</div>
        <BtnPrimary onClick={() => setShowNew(true)}>+ Novo Lote</BtnPrimary>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: L.surface }}>
              <TH>Nº Lote</TH>
              <TH>Convênio</TH>
              <TH>Competência</TH>
              <TH>Versão TISS</TH>
              <TH>Data Envio</TH>
              <TH>Guias</TH>
              <TH>Valor Total</TH>
              <TH>Status</TH>
              <TH>Ações</TH>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><Spinner /></td></tr>
            ) : lotes.length === 0 ? (
              <EmptyRow cols={9} text="Nenhum lote TISS cadastrado" />
            ) : lotes.map(l => (
              <tr key={l.id} style={{ background: L.bg }}>
                <TD style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{l.numero_lote}</TD>
                <TD>{l.convenios?.nome || '-'}</TD>
                <TD style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{l.competencia}</TD>
                <TD style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{l.versao_tiss}</TD>
                <TD>{l.data_envio || '-'}</TD>
                <TD style={{ textAlign: 'center' }}>{l.total_guias || 0}</TD>
                <TD style={{ fontWeight: 600, color: L.t1 }}>{fmt(l.valor_total)}</TD>
                <TD><Badge value={l.status} map={STATUS_LOTE} /></TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => abrirGuias(l)} style={btnGhost}>Abrir Lote</button>
                    <button onClick={() => gerarXml(l)} style={btnGhost}>Gerar XML</button>
                    {l.status === 'aberto' && (
                      <button onClick={() => marcarEnviado(l)} style={{ ...btnGhost, color: L.yellow }}>Marcar Enviado</button>
                    )}
                    {l.erros && (
                      <button onClick={() => verErros(l)} style={{ ...btnGhost, color: L.red }}>Ver Erros</button>
                    )}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Novo Lote */}
      {showNew && (
        <BottomSheet title="Novo Lote TISS" onClose={() => setShowNew(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>CONVÊNIO *</Label>
              <Select value={form.convenio_id} onChange={e => setForm(f => ({ ...f, convenio_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>COMPETÊNCIA (MÊS/ANO)</Label>
              <Input type="month" value={form.competencia}
                onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} />
            </div>
            <div>
              <Label>VERSÃO TISS</Label>
              <Select value={form.versao_tiss} onChange={e => setForm(f => ({ ...f, versao_tiss: e.target.value }))}>
                {VERSOES_TISS.map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label>DATA ENVIO</Label>
              <Input type="date" value={form.data_envio}
                onChange={e => setForm(f => ({ ...f, data_envio: e.target.value }))} />
            </div>
            <div>
              <Label>STATUS</Label>
              <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_LOTE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <BtnSecondary onClick={() => setShowNew(false)}>Cancelar</BtnSecondary>
            <BtnPrimary loading={saving} onClick={salvarLote}>Criar Lote</BtnPrimary>
          </div>
        </BottomSheet>
      )}

      {/* Guias do Lote */}
      {loteGuias && (
        <BottomSheet wide title={`Guias — Lote ${loteGuias.lote.numero_lote}`} onClose={() => setLoteGuias(null)}>
          {loteGuias.guias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: L.t4 }}>Nenhuma guia neste lote</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    <TH>Nº Guia</TH>
                    <TH>Tipo</TH>
                    <TH>Paciente</TH>
                    <TH>Data</TH>
                    <TH>Procedimento</TH>
                    <TH>Qtd</TH>
                    <TH>Valor Total</TH>
                    <TH>Status</TH>
                  </tr>
                </thead>
                <tbody>
                  {loteGuias.guias.map(g => (
                    <tr key={g.id}>
                      <TD style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{g.numero_guia}</TD>
                      <TD><Badge value={g.tipo_guia} map={TIPO_GUIA} /></TD>
                      <TD>{g.pacientes?.nome || '-'}</TD>
                      <TD>{g.data_atendimento || '-'}</TD>
                      <TD>
                        <div style={{ fontSize: 12 }}>{g.codigo_procedimento}</div>
                        <div style={{ fontSize: 11, color: L.t4 }}>{g.descricao_procedimento}</div>
                      </TD>
                      <TD style={{ textAlign: 'center' }}>{g.quantidade}</TD>
                      <TD style={{ fontWeight: 600 }}>{fmt(g.valor_total)}</TD>
                      <TD><Badge value={g.status} map={STATUS_GUIA} /></TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BottomSheet>
      )}

      {/* XML Preview */}
      {xmlPreview && (
        <BottomSheet wide title={`XML TISS — Lote ${xmlPreview.lote.numero_lote}`} onClose={() => setXmlPreview(null)}>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <BtnPrimary onClick={() => {
              navigator.clipboard.writeText(xmlPreview.xml)
              toast('XML copiado!', true)
            }}>Copiar XML</BtnPrimary>
          </div>
          <pre style={{
            background: '#0d1117', color: '#adbac7', padding: 20,
            borderRadius: 10, fontSize: 11, overflowX: 'auto', lineHeight: 1.6,
            fontFamily: "'JetBrains Mono', monospace", maxHeight: '60vh', overflowY: 'auto',
            border: `1px solid ${L.line}`,
          }}>{xmlPreview.xml}</pre>
        </BottomSheet>
      )}

      {/* Erros */}
      {errosLote && (
        <BottomSheet title={`Erros — Lote ${errosLote.lote.numero_lote}`} onClose={() => setErrosLote(null)}>
          <div style={{
            background: L.redBg, border: `1.5px solid ${L.red}`,
            borderRadius: 10, padding: 16, color: L.red, fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap',
          }}>
            {errosLote.lote.erros || 'Nenhum detalhe disponível.'}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 1: Guias ─────────────────────────────────────────────────────────────

function TabGuias({ clinicaId, convenios, pacientes, lotes, toast }) {
  const [guias, setGuias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const [filters, setFilters] = useState({
    lote_id: '', convenio_id: '', tipo_guia: '', status: '',
    data_ini: '', data_fim: '',
  })

  const [form, setForm] = useState({
    lote_id: '', convenio_id: '', paciente_id: '', tipo_guia: 'sp_sadt',
    numero_guia: '', numero_autorizacao: '', data_atendimento: today(),
    codigo_procedimento: '', descricao_procedimento: '',
    quantidade: 1, valor_unitario: '', valor_total: '', status: 'gerada',
  })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('tiss_guias')
      .select('*, convenios(nome), pacientes(nome), tiss_lotes(numero_lote)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })

    if (filters.lote_id)     q = q.eq('lote_id', filters.lote_id)
    if (filters.convenio_id) q = q.eq('convenio_id', filters.convenio_id)
    if (filters.tipo_guia)   q = q.eq('tipo_guia', filters.tipo_guia)
    if (filters.status)      q = q.eq('status', filters.status)
    if (filters.data_ini)    q = q.gte('data_atendimento', filters.data_ini)
    if (filters.data_fim)    q = q.lte('data_atendimento', filters.data_fim)

    const { data } = await q
    setGuias(data || [])
    setLoading(false)
  }, [clinicaId, filters])

  useEffect(() => { load() }, [load])

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  const setFrm = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'quantidade' || k === 'valor_unitario') {
        const q = parseFloat(k === 'quantidade' ? v : next.quantidade) || 0
        const u = parseFloat(k === 'valor_unitario' ? v : next.valor_unitario) || 0
        next.valor_total = (q * u).toFixed(2)
      }
      return next
    })
  }

  const salvarGuia = async () => {
    if (!form.lote_id || !form.convenio_id || !form.paciente_id)
      return toast('Preencha lote, convênio e paciente', false)
    setSaving(true)
    const { error } = await supabase.from('tiss_guias').insert({
      ...form,
      clinica_id: clinicaId,
      quantidade: Number(form.quantidade) || 1,
      valor_unitario: parseFloat(form.valor_unitario) || 0,
      valor_total: parseFloat(form.valor_total) || 0,
    })
    setSaving(false)
    if (error) return toast('Erro: ' + error.message, false)
    toast('Guia criada!', true)
    setShowNew(false)
    setForm({
      lote_id: '', convenio_id: '', paciente_id: '', tipo_guia: 'sp_sadt',
      numero_guia: '', numero_autorizacao: '', data_atendimento: today(),
      codigo_procedimento: '', descricao_procedimento: '',
      quantidade: 1, valor_unitario: '', valor_total: '', status: 'gerada',
    })
    load()
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 12, padding: 16, marginBottom: 20,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12,
      }}>
        <div>
          <Label>LOTE</Label>
          <Select value={filters.lote_id} onChange={e => setF('lote_id', e.target.value)}>
            <option value="">Todos</option>
            {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote}</option>)}
          </Select>
        </div>
        <div>
          <Label>CONVÊNIO</Label>
          <Select value={filters.convenio_id} onChange={e => setF('convenio_id', e.target.value)}>
            <option value="">Todos</option>
            {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        <div>
          <Label>TIPO GUIA</Label>
          <Select value={filters.tipo_guia} onChange={e => setF('tipo_guia', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPO_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>STATUS</Label>
          <Select value={filters.status} onChange={e => setF('status', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>DATA INI</Label>
          <Input type="date" value={filters.data_ini} onChange={e => setF('data_ini', e.target.value)} />
        </div>
        <div>
          <Label>DATA FIM</Label>
          <Input type="date" value={filters.data_fim} onChange={e => setF('data_fim', e.target.value)} />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: L.t1 }}>
          Guias TISS <span style={{ fontSize: 12, color: L.t4, fontWeight: 400 }}>({guias.length})</span>
        </div>
        <BtnPrimary onClick={() => setShowNew(true)}>+ Nova Guia</BtnPrimary>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: L.surface }}>
              <TH>Nº Guia</TH>
              <TH>Tipo</TH>
              <TH>Paciente</TH>
              <TH>Convênio</TH>
              <TH>Data</TH>
              <TH>Procedimento</TH>
              <TH>Qtd</TH>
              <TH>Vl Unit.</TH>
              <TH>Vl Total</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><Spinner /></td></tr>
            ) : guias.length === 0 ? (
              <EmptyRow cols={10} text="Nenhuma guia encontrada" />
            ) : guias.map(g => (
              <tr key={g.id} style={{ background: L.bg }}>
                <TD style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{g.numero_guia}</TD>
                <TD><Badge value={g.tipo_guia} map={TIPO_GUIA} /></TD>
                <TD>{g.pacientes?.nome || '-'}</TD>
                <TD>{g.convenios?.nome || '-'}</TD>
                <TD style={{ whiteSpace: 'nowrap' }}>{g.data_atendimento || '-'}</TD>
                <TD>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{g.codigo_procedimento}</div>
                  <div style={{ fontSize: 11, color: L.t4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.descricao_procedimento}
                  </div>
                </TD>
                <TD style={{ textAlign: 'center' }}>{g.quantidade}</TD>
                <TD>{fmt(g.valor_unitario)}</TD>
                <TD style={{ fontWeight: 600, color: L.t1 }}>{fmt(g.valor_total)}</TD>
                <TD>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Badge value={g.status} map={STATUS_GUIA} />
                    {g.status === 'glosada' && g.motivo_glosa && (
                      <span title={g.motivo_glosa} style={{
                        fontSize: 10, color: L.red, background: L.redBg,
                        borderRadius: 4, padding: '1px 6px', cursor: 'help',
                        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>⚠ {g.motivo_glosa}</span>
                    )}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nova Guia */}
      {showNew && (
        <BottomSheet wide title="Nova Guia TISS" onClose={() => setShowNew(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Label>LOTE *</Label>
              <Select value={form.lote_id} onChange={e => setFrm('lote_id', e.target.value)}>
                <option value="">Selecione...</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.numero_lote} ({l.competencia})</option>)}
              </Select>
            </div>
            <div>
              <Label>CONVÊNIO *</Label>
              <Select value={form.convenio_id} onChange={e => setFrm('convenio_id', e.target.value)}>
                <option value="">Selecione...</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>PACIENTE *</Label>
              <Select value={form.paciente_id} onChange={e => setFrm('paciente_id', e.target.value)}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
            <div>
              <Label>TIPO DE GUIA</Label>
              <Select value={form.tipo_guia} onChange={e => setFrm('tipo_guia', e.target.value)}>
                {Object.entries(TIPO_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>NÚMERO DA GUIA</Label>
              <Input value={form.numero_guia} onChange={e => setFrm('numero_guia', e.target.value)} placeholder="Ex: GUIA-001" />
            </div>
            <div>
              <Label>NÚMERO AUTORIZAÇÃO</Label>
              <Input value={form.numero_autorizacao} onChange={e => setFrm('numero_autorizacao', e.target.value)} placeholder="Ex: AUT-2024-001" />
            </div>
            <div>
              <Label>DATA DO ATENDIMENTO</Label>
              <Input type="date" value={form.data_atendimento} onChange={e => setFrm('data_atendimento', e.target.value)} />
            </div>
            <div>
              <Label>CÓDIGO DO PROCEDIMENTO</Label>
              <Input value={form.codigo_procedimento} onChange={e => setFrm('codigo_procedimento', e.target.value)} placeholder="Ex: 30101012" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>DESCRIÇÃO DO PROCEDIMENTO</Label>
              <Input value={form.descricao_procedimento} onChange={e => setFrm('descricao_procedimento', e.target.value)} placeholder="Ex: Consulta em clínica médica" />
            </div>
            <div>
              <Label>QUANTIDADE</Label>
              <Input type="number" min="1" value={form.quantidade} onChange={e => setFrm('quantidade', e.target.value)} />
            </div>
            <div>
              <Label>VALOR UNITÁRIO (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_unitario}
                onChange={e => setFrm('valor_unitario', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>VALOR TOTAL (calculado)</Label>
              <Input readOnly value={form.valor_total}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13,
                  border: `1.5px solid ${L.line}`, borderRadius: 8,
                  background: L.hover, color: L.t1, outline: 'none',
                  boxSizing: 'border-box', cursor: 'not-allowed',
                }} />
            </div>
            <div>
              <Label>STATUS</Label>
              <Select value={form.status} onChange={e => setFrm('status', e.target.value)}>
                {Object.entries(STATUS_GUIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <BtnSecondary onClick={() => setShowNew(false)}>Cancelar</BtnSecondary>
            <BtnPrimary loading={saving} onClick={salvarGuia}>Criar Guia</BtnPrimary>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 2: Glosas & Recursos ─────────────────────────────────────────────────

function TabGlosas({ clinicaId, convenios, pacientes, toast }) {
  const [guias, setGuias] = useState([])
  const [loading, setLoading] = useState(true)
  const [contestar, setContestar] = useState(null) // guia
  const [recursoText, setRecursoText] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tiss_guias')
      .select('*, convenios(nome), pacientes(nome), tiss_lotes(numero_lote, competencia)')
      .eq('clinica_id', clinicaId)
      .eq('status', 'glosada')
      .order('criado_em', { ascending: false })
    setGuias(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const totalGlosas = guias.length
  const valorGlosado = guias.reduce((s, g) => s + (g.valor_total || 0), 0)

  // We need total faturado to compute %
  const [totalFaturado, setTotalFaturado] = useState(0)
  useEffect(() => {
    supabase.from('tiss_guias').select('valor_total').eq('clinica_id', clinicaId)
      .then(({ data }) => {
        setTotalFaturado((data || []).reduce((s, g) => s + (g.valor_total || 0), 0))
      })
  }, [clinicaId])

  const pctGlosa = totalFaturado > 0 ? ((valorGlosado / totalFaturado) * 100).toFixed(1) : '0.0'

  // group by convenio
  const grouped = guias.reduce((acc, g) => {
    const cid = g.convenio_id || 'sem_convenio'
    const cnome = g.convenios?.nome || 'Sem Convênio'
    if (!acc[cid]) acc[cid] = { nome: cnome, guias: [] }
    acc[cid].guias.push(g)
    return acc
  }, {})

  const registrarRecurso = async () => {
    if (!recursoText.trim()) return toast('Escreva o recurso antes de enviar', false)
    setSaving(true)
    // store recurso in motivo_glosa appended, mark as gerada (in recurso)
    const novoMotivo = `[RECURSO: ${recursoText}] | ${contestar.motivo_glosa || ''}`
    await supabase.from('tiss_guias').update({ motivo_glosa: novoMotivo, status: 'gerada' }).eq('id', contestar.id)
    setSaving(false)
    toast('Recurso registrado!', true)
    setContestar(null)
    setRecursoText('')
    load()
  }

  const aceitarGlosa = async guia => {
    await supabase.from('tiss_guias').update({ status: 'processada' }).eq('id', guia.id)
    toast('Glosa aceita — guia marcada como processada', true)
    load()
  }

  const exportCSV = () => exportGlosasCSV(guias, convenios, pacientes)

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPICard label="TOTAL DE GLOSAS" value={totalGlosas} color={L.red} />
        <KPICard label="VALOR GLOSADO" value={fmt(valorGlosado)} color={L.red} />
        <KPICard label="% SOBRE FATURADO" value={`${pctGlosa}%`} color={L.orange} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: L.t1 }}>Glosas & Recursos</div>
        <BtnSecondary onClick={exportCSV}>Relatório de Glosas (CSV)</BtnSecondary>
      </div>

      {loading ? <Spinner /> : guias.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: L.t4, fontSize: 14,
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
        }}>
          Nenhuma guia glosada no momento
        </div>
      ) : (
        Object.entries(grouped).map(([cid, group]) => (
          <div key={cid} style={{ marginBottom: 28 }}>
            {/* Convenio header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              borderBottom: `2px solid ${L.line}`, paddingBottom: 8,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: L.t1 }}>{group.nome}</div>
              <span style={{
                background: L.redBg, color: L.red, fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 99, border: `1px solid ${L.red}22`,
              }}>{group.guias.length} glosas</span>
              <span style={{ fontSize: 12, color: L.t3 }}>
                {fmt(group.guias.reduce((s, g) => s + (g.valor_total || 0), 0))}
              </span>
            </div>

            {/* Glosas list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.guias.map(g => (
                <div key={g.id} style={{
                  background: L.surface, border: `1.5px solid ${L.redBd || L.line}`,
                  borderRadius: 10, padding: '14px 18px',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start',
                }}>
                  <div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700, color: L.t1,
                      }}>{g.numero_guia || '-'}</span>
                      <Badge value={g.tipo_guia} map={TIPO_GUIA} />
                      <span style={{ fontSize: 12, color: L.t3 }}>{g.data_atendimento}</span>
                    </div>
                    <div style={{ fontSize: 13, color: L.t2, marginBottom: 4 }}>
                      <strong>Paciente:</strong> {g.pacientes?.nome || '-'}
                    </div>
                    <div style={{ fontSize: 12, color: L.t3, marginBottom: 4 }}>
                      {g.codigo_procedimento} — {g.descricao_procedimento}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: L.red, marginBottom: 6 }}>
                      {fmt(g.valor_total)}
                    </div>
                    {g.motivo_glosa && (
                      <div style={{
                        background: L.redBg, border: `1px solid ${L.red}33`,
                        borderRadius: 6, padding: '6px 10px', fontSize: 12, color: L.red,
                      }}>
                        <strong>Motivo:</strong> {g.motivo_glosa}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                    <button onClick={() => { setContestar(g); setRecursoText('') }} style={{
                      background: L.teal, color: L.white, fontWeight: 600,
                      border: 'none', borderRadius: 8, padding: '8px 14px',
                      fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>Contestar</button>
                    <button onClick={() => aceitarGlosa(g)} style={{
                      background: 'none', color: L.t3, fontWeight: 600,
                      border: `1.5px solid ${L.line}`, borderRadius: 8,
                      padding: '7px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>Aceitar Glosa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Contestar modal */}
      {contestar && (
        <BottomSheet title={`Recurso — Guia ${contestar.numero_guia}`} onClose={() => setContestar(null)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: L.t2, marginBottom: 8 }}>
              <strong>Paciente:</strong> {contestar.pacientes?.nome || '-'} &nbsp;|&nbsp;
              <strong>Procedimento:</strong> {contestar.descricao_procedimento}
            </div>
            {contestar.motivo_glosa && (
              <div style={{
                background: L.redBg, border: `1px solid ${L.red}33`,
                borderRadius: 6, padding: '8px 12px', fontSize: 12, color: L.red, marginBottom: 12,
              }}>
                <strong>Motivo da Glosa:</strong> {contestar.motivo_glosa}
              </div>
            )}
          </div>
          <Label>TEXTO DO RECURSO *</Label>
          <textarea
            value={recursoText}
            onChange={e => setRecursoText(e.target.value)}
            rows={5}
            placeholder="Descreva os argumentos para contestação da glosa..."
            style={{
              width: '100%', padding: '9px 12px', fontSize: 13,
              border: `1.5px solid ${L.line}`, borderRadius: 8,
              background: L.surface, color: L.t1, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <BtnSecondary onClick={() => setContestar(null)}>Cancelar</BtnSecondary>
            <BtnPrimary loading={saving} onClick={registrarRecurso}>Enviar Recurso</BtnPrimary>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── ghost button style ───────────────────────────────────────────────────────

const btnGhost = {
  background: 'none', border: `1px solid ${L.line}`, borderRadius: 6,
  padding: '4px 10px', fontSize: 11, color: L.t2, cursor: 'pointer', whiteSpace: 'nowrap',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PageTISS({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [convenios, setConvenios] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [lotes, setLotes] = useState([])
  const [toast, setToastState] = useState(null)

  const showToast = (msg, ok = true) => {
    setToastState({ msg, ok })
    setTimeout(() => setToastState(null), 3200)
  }

  useEffect(() => {
    if (!clinicaId) return
    Promise.all([
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('tiss_lotes').select('id, numero_lote, competencia, status').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
    ]).then(([{ data: c }, { data: p }, { data: l }]) => {
      setConvenios(c || [])
      setPacientes(p || [])
      setLotes(l || [])
    })
  }, [clinicaId])

  const TABS = ['Lotes TISS', 'Guias', 'Glosas & Recursos']

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Global keyframes */}
      <style>{`
        @keyframes up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 4 }}>TISS / ANS</div>
        <div style={{ fontSize: 13, color: L.t4 }}>
          Troca eletrônica de informações em saúde suplementar — padrão ANS
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: `1px solid ${L.line}` }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
            color: tab === i ? L.teal : L.t3,
            borderBottom: tab === i ? `2.5px solid ${L.teal}` : '2.5px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabLotes
          clinicaId={clinicaId}
          convenios={convenios}
          toast={showToast}
        />
      )}
      {tab === 1 && (
        <TabGuias
          clinicaId={clinicaId}
          convenios={convenios}
          pacientes={pacientes}
          lotes={lotes}
          toast={showToast}
        />
      )}
      {tab === 2 && (
        <TabGlosas
          clinicaId={clinicaId}
          convenios={convenios}
          pacientes={pacientes}
          toast={showToast}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}
