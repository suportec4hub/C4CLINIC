import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const TIPOS = ['receita', 'despesa']
const CATEGORIAS_REC = [
  'Consulta', 'Retorno', 'Procedimento', 'Cirurgia',
  'Exame', 'Convênio', 'Particular', 'Plano de Saúde', 'Outros'
]
const CATEGORIAS_DES = [
  'Salários', 'Pró-labore', 'Encargos Trabalhistas', 'Benefícios',
  'Aluguel', 'Condomínio', 'IPTU', 'Água', 'Energia', 'Internet/Telefone',
  'Material de Escritório', 'Material Médico', 'Medicamentos/Insumos',
  'Equipamentos', 'Manutenção', 'Limpeza/Higiene',
  'Marketing/Publicidade', 'Sistemas/Software', 'Contabilidade',
  'Impostos/Taxas', 'Seguros', 'Outros'
]
const FORMAS_PAG = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'boleto', 'convenio']
const FORMAS_LABEL = {
  dinheiro: 'Dinheiro', cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito', pix: 'PIX',
  transferencia: 'Transferência', boleto: 'Boleto', convenio: 'Convênio'
}
const STATUS_FIN = ['pendente', 'pago', 'cancelado', 'atrasado']
const STATUS_MAP = {
  pendente: { label: 'Pendente', color: L.yellow, bg: L.yellowBg },
  pago:     { label: 'Pago',     color: L.green,  bg: L.greenBg },
  cancelado:{ label: 'Cancelado',color: L.red,    bg: L.redBg },
  atrasado: { label: 'Atrasado', color: L.orange, bg: L.orangeBg },
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0, background: L.bg, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: `1.5px solid ${L.line}`, borderRadius: 8, background: L.bg, color: L.t1, outline: 'none' }

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>{label}</label>
      {children}
    </div>
  )
}

function imprimirRecibo(l, clinicaNome) {
  const nomeclinica = clinicaNome || 'C4CLINIC'
  const valorFmt = Number(l.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataFmt = l.data_pagamento ? new Date(l.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
  const numeroRecibo = (l.id || '00000000').slice(0, 8).toUpperCase()
  const pacienteNome = l.pacientes?.nome || l.paciente_nome || ''
  const formaPag = FORMAS_LABEL[l.forma_pagamento] || l.forma_pagamento || '—'
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Recibo #${numeroRecibo}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Georgia',serif;background:#fff;color:#1a1a1a;padding:48px;max-width:680px;margin:0 auto}.header{text-align:center;margin-bottom:32px;border-bottom:2px solid #1a1a1a;padding-bottom:20px}.clinic-name{font-size:22px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}.recibo-title{font-size:36px;font-weight:bold;letter-spacing:4px;margin:16px 0 8px}.recibo-number{font-size:13px;color:#555;font-family:monospace}.body{margin:28px 0}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #ccc;font-size:14px}.row .label{color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}.row .value{font-weight:600;max-width:55%;text-align:right}.valor-destaque{text-align:center;margin:28px 0;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;padding:20px}.valor-destaque .label{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#555}.valor-destaque .quantia{font-size:32px;font-weight:bold;color:#1a1a1a;margin-top:6px}.footer{margin-top:48px}.assinatura{margin-top:40px;text-align:center}.assinatura .linha{border-top:1px solid #1a1a1a;width:260px;margin:0 auto 8px}.assinatura .texto{font-size:12px;color:#555}.obs{font-size:11px;color:#888;text-align:center;margin-top:24px}@media print{body{padding:24px}}</style></head><body><div class="header"><div class="clinic-name">${nomeclinica}</div><div class="recibo-title">RECIBO</div><div class="recibo-number">Nº ${numeroRecibo}</div></div><div class="body">${pacienteNome ? `<div class="row"><span class="label">Paciente</span><span class="value">${pacienteNome}</span></div>` : ''}<div class="row"><span class="label">Descrição</span><span class="value">${l.descricao || '—'}</span></div><div class="row"><span class="label">Categoria</span><span class="value">${l.categoria || '—'}</span></div><div class="row"><span class="label">Forma de Pagamento</span><span class="value">${formaPag}</span></div><div class="row"><span class="label">Data de Pagamento</span><span class="value">${dataFmt}</span></div></div><div class="valor-destaque"><div class="label">Valor Recebido</div><div class="quantia">${valorFmt}</div></div><div class="footer"><div class="assinatura"><div class="linha"></div><div class="texto">Assinatura e Carimbo</div></div><div class="obs">Documento emitido em ${new Date().toLocaleDateString('pt-BR')} — ${nomeclinica}</div></div></body></html>`
  const win = window.open('', '_blank', 'width=750,height=900')
  if (win) { win.document.write(html); win.document.close(); win.onload = () => win.print() }
}

export default function PageFinanceiro({ profile }) {
  const [lancamentos, setLancamentos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState({ tipo: '', status: '' })
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, pendentes: 0 })

  const clinicaId = profile?.clinica_id
  const clinicaNome = profile?.clinicas?.nome || 'C4CLINIC'

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [lancs, pacs, convs] = await Promise.all([
      supabase.from('financeiro_lancamentos').select('*, pacientes(nome), convenios(nome)').eq('clinica_id', clinicaId).order('data_vencimento', { ascending: false }).limit(300),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true),
    ])
    const data = lancs.data || []
    setLancamentos(data)
    setPacientes(pacs.data || [])
    setConvenios(convs.data || [])
    setResumo({
      receitas: data.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0),
      despesas: data.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0),
      pendentes: data.filter(l => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
    })
    setLoading(false)
  }

  function abrirNovo(tipo = 'receita') {
    setForm({ clinica_id: clinicaId, tipo, status: 'pendente', data_vencimento: new Date().toISOString().split('T')[0] })
    setModal('form')
  }

  function abrirEditar(l) { setForm({ ...l }); setModal('form') }

  async function salvar() {
    setSaving(true)
    const { pacientes: _, convenios: __, ...data } = form
    if (!data.id) { await supabase.from('financeiro_lancamentos').insert(data) }
    else { const { id, ...rest } = data; await supabase.from('financeiro_lancamentos').update(rest).eq('id', id) }
    setSaving(false); setModal(null); load()
  }

  async function marcarPago(id) {
    await supabase.from('financeiro_lancamentos').update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id)
    const lanc = lancamentos.find(l => l.id === id)
    if (lanc?.tipo === 'receita') imprimirRecibo({ ...lanc, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] }, clinicaNome)
    load()
  }

  const filtrados = lancamentos.filter(l => {
    if (filtro.tipo && l.tipo !== filtro.tipo) return false
    if (filtro.status && l.status !== filtro.status) return false
    return true
  })

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDt = dt => dt ? new Date(dt + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const fmtDdMm = dt => dt ? new Date(dt + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'

  const fluxoData = (() => {
    const now = new Date(), ano = now.getFullYear(), mes = now.getMonth()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const map = {}
    for (let d = 1; d <= diasNoMes; d++) map[d] = { dia: d, receitas: 0, despesas: 0 }
    lancamentos.forEach(l => {
      if (l.status !== 'pago' || !l.data_pagamento) return
      const dt = new Date(l.data_pagamento + 'T12:00:00')
      if (dt.getFullYear() !== ano || dt.getMonth() !== mes) return
      const day = dt.getDate()
      if (!map[day]) return
      if (l.tipo === 'receita') map[day].receitas += Number(l.valor)
      else map[day].despesas += Number(l.valor)
    })
    return Object.values(map)
  })()

  const alertas = (() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const limite = new Date(hoje); limite.setDate(limite.getDate() + 7)
    return lancamentos.filter(l => {
      if (l.status !== 'pendente' || !l.data_vencimento) return false
      const dt = new Date(l.data_vencimento + 'T12:00:00')
      return dt >= hoje && dt <= limite
    }).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  })()

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Receitas pagas', value: resumo.receitas, color: L.green, bg: L.greenBg, icon: '↑' },
          { label: 'Despesas pagas', value: resumo.despesas, color: L.red,   bg: L.redBg,   icon: '↓' },
          { label: 'A receber',      value: resumo.pendentes,color: L.yellow,bg: L.yellowBg,icon: '⏳' },
        ].map(k => (
          <div key={k.label} style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: k.color, fontWeight: 700 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: L.t3 }}>{k.label}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: k.color }}>{fmt(k.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, marginBottom: 10 }}>⚠ Vencimentos nos Próximos 7 Dias</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {alertas.map(l => {
              const isRec = l.tipo === 'receita'
              return (
                <div key={l.id} onClick={() => abrirEditar(l)} style={{ background: isRec ? L.yellowBg : L.redBg, border: `1px solid ${isRec ? L.yellow : L.red}`, borderRadius: 10, padding: '10px 14px', minWidth: 180, flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: L.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{l.descricao || '—'}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isRec ? L.green : L.red, marginTop: 4 }}>{fmt(l.valor)}</div>
                  <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>Vence {fmtDdMm(l.data_vencimento)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, marginBottom: 12 }}>Fluxo de Caixa — Mês Atual</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={fluxoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: L.t4 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: L.t4 }} tickLine={false} axisLine={false} tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} width={36} />
            <Tooltip formatter={(value, name) => [Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name === 'receitas' ? 'Receitas' : 'Despesas']} labelFormatter={label => `Dia ${label}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${L.line}`, background: L.bg, color: L.t1 }} />
            <Bar dataKey="receitas" fill={L.green} radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="despesas" fill={L.red}   radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={filtro.tipo} onChange={e => setFiltro({ ...filtro, tipo: e.target.value })} style={{ padding: '8px 12px', fontSize: 13, border: `1.5px solid ${L.line}`, borderRadius: 8, background: L.bg, color: L.t2, outline: 'none', appearance: 'none' }}>
          <option value="">Todos os tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select value={filtro.status} onChange={e => setFiltro({ ...filtro, status: e.target.value })} style={{ padding: '8px 12px', fontSize: 13, border: `1.5px solid ${L.line}`, borderRadius: 8, background: L.bg, color: L.t2, outline: 'none', appearance: 'none' }}>
          <option value="">Todos os status</option>
          {STATUS_FIN.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => abrirNovo('despesa')} style={{ padding: '9px 16px', borderRadius: 8, background: L.redBg, color: L.red, fontWeight: 600, fontSize: 13 }}>↓ Nova Despesa</button>
          <button onClick={() => abrirNovo('receita')} style={{ padding: '9px 16px', borderRadius: 8, background: L.teal, color: L.white, fontWeight: 600, fontSize: 13 }}>↑ Nova Receita</button>
        </div>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 100px 120px 100px 100px', padding: '10px 16px', fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', borderBottom: `1px solid ${L.line}`, background: L.surface }}>
          <span>TIPO</span><span>DESCRIÇÃO</span><span>CATEGORIA</span><span>VALOR</span><span>VENCIMENTO</span><span>STATUS</span><span>AÇÕES</span>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /></div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>Nenhum lançamento encontrado</div>
        ) : (
          filtrados.map(l => {
            const isRec = l.tipo === 'receita'
            const st = STATUS_MAP[l.status] || { label: l.status, color: L.t3, bg: L.surface }
            return (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 100px 120px 100px 100px', padding: '11px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`, transition: 'background 0.12s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = L.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => abrirEditar(l)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: isRec ? L.greenBg : L.redBg, color: isRec ? L.green : L.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{isRec ? '↑' : '↓'}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: L.t1 }}>{l.descricao}</div>
                  <div style={{ fontSize: 11, color: L.t4 }}>{l.pacientes?.nome && `${l.pacientes.nome} · `}{FORMAS_LABEL[l.forma_pagamento] || l.forma_pagamento || ''}</div>
                </div>
                <span style={{ color: L.t3, fontSize: 12 }}>{l.categoria || '—'}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: isRec ? L.green : L.red }}>{fmt(l.valor)}</span>
                <span style={{ color: L.t2, fontSize: 12 }}>{fmtDt(l.data_vencimento)}</span>
                <span><span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span></span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {l.status === 'pendente' && <button onClick={e => { e.stopPropagation(); marcarPago(l.id) }} style={{ padding: '4px 7px', borderRadius: 5, background: L.greenBg, color: L.green, fontSize: 11, fontWeight: 600 }} title="Marcar como pago">✓</button>}
                  {l.status === 'pago' && isRec && <button onClick={e => { e.stopPropagation(); imprimirRecibo(l, clinicaNome) }} style={{ padding: '4px 7px', borderRadius: 5, background: L.blueBg, color: L.blue, fontSize: 11, fontWeight: 600 }} title="Imprimir recibo">🖨</button>}
                  <button onClick={e => { e.stopPropagation(); abrirEditar(l) }} style={{ padding: '4px 7px', borderRadius: 5, background: L.hover, color: L.t2, fontSize: 11 }}>✎</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Lançamento' : 'Novo Lançamento'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="TIPO">
              <div style={{ display: 'flex', gap: 8 }}>
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: form.tipo === t ? (t === 'receita' ? L.greenBg : L.redBg) : L.hover, color: form.tipo === t ? (t === 'receita' ? L.green : L.red) : L.t3, border: `1.5px solid ${form.tipo === t ? (t === 'receita' ? L.green : L.red) : 'transparent'}` }}>
                    {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="DESCRIÇÃO *"><input style={inp} value={form.descricao || ''} placeholder="Ex: Consulta Dr. João, Aluguel..." onChange={e => setForm({ ...form, descricao: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CATEGORIA"><select style={{ ...inp, appearance: 'none' }} value={form.categoria || ''} onChange={e => setForm({ ...form, categoria: e.target.value })}><option value="">Selecione</option>{(form.tipo === 'receita' ? CATEGORIAS_REC : CATEGORIAS_DES).map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="VALOR (R$) *"><input type="number" style={inp} value={form.valor || ''} step="0.01" min="0" placeholder="0,00" onChange={e => setForm({ ...form, valor: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DATA DE VENCIMENTO"><input type="date" style={inp} value={form.data_vencimento || ''} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
              <Field label="DATA DE PAGAMENTO"><input type="date" style={inp} value={form.data_pagamento || ''} onChange={e => setForm({ ...form, data_pagamento: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            </div>
            <Field label="FORMA DE PAGAMENTO"><select style={{ ...inp, appearance: 'none' }} value={form.forma_pagamento || ''} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })}><option value="">Selecione</option>{FORMAS_PAG.map(f => <option key={f} value={f}>{FORMAS_LABEL[f]}</option>)}</select></Field>
            <Field label="STATUS">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_FIN.map(s => { const st = STATUS_MAP[s]; return (<button key={s} onClick={() => setForm({ ...form, status: s })} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: form.status === s ? st.bg : L.hover, color: form.status === s ? st.color : L.t3, border: `1.5px solid ${form.status === s ? st.color : 'transparent'}` }}>{st.label}</button>) })}
              </div>
            </Field>
            <Field label="PACIENTE (opcional)"><select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''} onChange={e => setForm({ ...form, paciente_id: e.target.value })}><option value="">Selecione</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
            <Field label="OBSERVAÇÕES"><textarea style={{ ...inp, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13 }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.descricao || !form.valor} style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal, color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar Lançamento'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
