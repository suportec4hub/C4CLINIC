import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── shared style helpers ─────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

function fmt(n) {
  const v = Number(n) || 0
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}
function today() { return new Date().toISOString().split('T')[0] }
function monthStart() {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}

/* ─── Field ────────────────────────────────────────────────────────────── */
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

/* ─── KPI card ─────────────────────────────────────────────────────────── */
function KPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 150,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || L.t1, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ─── Bottom-sheet Modal ───────────────────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 860 : 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Status badge helpers ─────────────────────────────────────────────── */
const STATUS_PEDIDO = {
  rascunho:  { label: 'Rascunho',  bg: L.surface, color: L.t3,     bd: L.line },
  cotacao:   { label: 'Cotação',   bg: L.blueBg,  color: L.blue,   bd: L.blueBd },
  aprovado:  { label: 'Aprovado',  bg: L.greenBg, color: L.green,  bd: L.greenBd },
  enviado:   { label: 'Enviado',   bg: L.yellowBg,color: L.yellow, bd: L.yellowBd },
  recebido:  { label: 'Recebido',  bg: L.tealBg,  color: L.teal,   bd: L.line },
  cancelado: { label: 'Cancelado', bg: L.redBg,   color: L.red,    bd: L.redBd },
}
const STATUS_ORDER = ['rascunho','cotacao','aprovado','enviado','recebido']

function StatusBadge({ status }) {
  const s = STATUS_PEDIDO[status] || STATUS_PEDIDO.rascunho
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 0 — Pedidos de Compra
══════════════════════════════════════════════════════════════════════════ */
function TabPedidos({ clinicaId, fornecedores }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // 'novo' | 'itens'
  const [selected, setSelected] = useState(null)
  const [itens, setItens] = useState([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({})
  const [itemRows, setItemRows] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos_compra')
      .select('*, fornecedores(nome)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  async function loadItens(pedidoId) {
    const { data } = await supabase
      .from('itens_pedido')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('id')
    setItens(data || [])
  }

  function abrirItens(p) {
    setSelected(p)
    loadItens(p.id)
    setModal('itens')
  }

  function abrirNovo() {
    setForm({
      clinica_id: clinicaId,
      fornecedor_id: '',
      data_pedido: today(),
      data_entrega_prevista: '',
      observacoes: '',
      status: 'rascunho',
      numero_pedido: `PC-${Date.now().toString().slice(-6)}`,
    })
    setItemRows([])
    setModal('novo')
  }

  function addItemRow() {
    setItemRows(r => [...r, { descricao: '', unidade: 'un', quantidade: 1, valor_unitario: 0 }])
  }

  function updateItemRow(i, field, val) {
    setItemRows(rows => rows.map((r, idx) => {
      if (idx !== i) return r
      const updated = { ...r, [field]: val }
      updated.valor_total = (Number(updated.quantidade) || 0) * (Number(updated.valor_unitario) || 0)
      return updated
    }))
  }

  function removeItemRow(i) {
    setItemRows(rows => rows.filter((_, idx) => idx !== i))
  }

  const totalPedido = itemRows.reduce((s, r) => s + ((Number(r.quantidade)||0)*(Number(r.valor_unitario)||0)), 0)

  async function salvarPedido() {
    if (!form.fornecedor_id) return alert('Selecione um fornecedor')
    setSaving(true)
    const { data: ped, error } = await supabase
      .from('pedidos_compra')
      .insert({
        clinica_id: clinicaId,
        fornecedor_id: form.fornecedor_id,
        numero_pedido: form.numero_pedido,
        status: 'rascunho',
        data_pedido: form.data_pedido || today(),
        data_entrega_prevista: form.data_entrega_prevista || null,
        observacoes: form.observacoes || null,
        valor_total: totalPedido,
        desconto: 0,
      })
      .select()
      .single()
    if (error) { alert('Erro ao salvar pedido'); setSaving(false); return }

    if (itemRows.length) {
      const rows = itemRows
        .filter(r => r.descricao.trim())
        .map(r => ({
          pedido_id: ped.id,
          descricao: r.descricao,
          unidade: r.unidade || 'un',
          quantidade: Number(r.quantidade) || 0,
          valor_unitario: Number(r.valor_unitario) || 0,
          valor_total: (Number(r.quantidade)||0) * (Number(r.valor_unitario)||0),
        }))
      if (rows.length) await supabase.from('itens_pedido').insert(rows)
    }

    setSaving(false)
    setModal(null)
    load()
  }

  async function avancarStatus(p) {
    const idx = STATUS_ORDER.indexOf(p.status)
    if (idx < 0 || idx >= STATUS_ORDER.length - 1) return
    const next = STATUS_ORDER[idx + 1]
    await supabase.from('pedidos_compra').update({ status: next }).eq('id', p.id)
    load()
  }

  async function cancelarPedido(p) {
    if (!window.confirm(`Cancelar pedido ${p.numero_pedido}?`)) return
    await supabase.from('pedidos_compra').update({ status: 'cancelado' }).eq('id', p.id)
    load()
  }

  /* KPIs */
  const abertos = pedidos.filter(p => ['rascunho','cotacao','aprovado'].includes(p.status)).length
  const aguardando = pedidos.filter(p => p.status === 'enviado').length
  const mes = pedidos.filter(p => p.data_pedido >= monthStart() && p.status !== 'cancelado')
  const valorMes = mes.reduce((s, p) => s + Number(p.valor_total||0), 0)
  const economiaTotal = pedidos.reduce((s, p) => s + Number(p.desconto||0), 0)

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPI label="PEDIDOS ABERTOS" value={abertos} />
        <KPI label="AGUARDANDO ENTREGA" value={aguardando} color={L.yellow} />
        <KPI label="VALOR TOTAL (MÊS)" value={fmt(valorMes)} color={L.teal} />
        <KPI label="ECONOMIA ESTIMADA" value={fmt(economiaTotal)} sub="descontos acumulados" color={L.green} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: L.t1 }}>Pedidos de Compra</div>
        <button onClick={abrirNovo} style={{
          background: L.teal, color: L.white, border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>+ Novo Pedido</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>
          <span style={{ display: 'inline-block', width: 20, height: 20, border: `2px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t3, fontSize: 14 }}>Nenhum pedido encontrado</div>
      ) : (
        <div style={{ border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['Nº Pedido','Fornecedor','Data','Prev. Entrega','Valor Total','Desconto','Status','Ações'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', borderBottom: `1px solid ${L.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < pedidos.length-1 ? `1px solid ${L.line}` : 'none', background: L.bg }}>
                    <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: L.teal, fontWeight: 600 }}>{p.numero_pedido}</td>
                    <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 500 }}>{p.fornecedores?.nome || '—'}</td>
                    <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>{fmtDate(p.data_pedido)}</td>
                    <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>{fmtDate(p.data_entrega_prevista)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: L.t1, whiteSpace: 'nowrap' }}>{fmt(p.valor_total)}</td>
                    <td style={{ padding: '10px 14px', color: p.desconto > 0 ? L.green : L.t3, whiteSpace: 'nowrap' }}>{fmt(p.desconto)}</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        <button onClick={() => abrirItens(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.tealBg, color: L.teal, border: `1px solid ${L.line}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver Itens</button>
                        {!['recebido','cancelado'].includes(p.status) && (
                          <button onClick={() => avancarStatus(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>Avançar</button>
                        )}
                        {!['recebido','cancelado'].includes(p.status) && (
                          <button onClick={() => cancelarPedido(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, cursor: 'pointer' }}>Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Ver Itens */}
      {modal === 'itens' && selected && (
        <Modal title={`Itens — ${selected.numero_pedido}`} onClose={() => setModal(null)} wide>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>FORNECEDOR</div>
              <div style={{ fontWeight: 600, color: L.t1 }}>{selected.fornecedores?.nome || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>STATUS</div>
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>DATA PEDIDO</div>
              <div style={{ color: L.t2 }}>{fmtDate(selected.data_pedido)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>PREV. ENTREGA</div>
              <div style={{ color: L.t2 }}>{fmtDate(selected.data_entrega_prevista)}</div>
            </div>
          </div>

          {itens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: L.t3, fontSize: 13 }}>Nenhum item neste pedido</div>
          ) : (
            <div style={{ border: `1px solid ${L.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {['Item / Descrição','Un.','Qtd.','Valor Unit.','Total'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, i) => (
                    <tr key={it.id} style={{ borderBottom: i < itens.length-1 ? `1px solid ${L.line}` : 'none' }}>
                      <td style={{ padding: '9px 12px', color: L.t1 }}>{it.descricao}</td>
                      <td style={{ padding: '9px 12px', color: L.t3 }}>{it.unidade}</td>
                      <td style={{ padding: '9px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>{it.quantidade}</td>
                      <td style={{ padding: '9px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(it.valor_unitario)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: L.t1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(it.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          <div style={{ background: L.surface, borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: L.t2 }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.valor_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: L.green }}>
              <span>Desconto</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>- {fmt(selected.desconto)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: L.t1, borderTop: `1px solid ${L.line}`, paddingTop: 10, marginTop: 4 }}>
              <span>Total</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: L.teal }}>{fmt(Number(selected.valor_total||0) - Number(selected.desconto||0))}</span>
            </div>
          </div>
          {selected.observacoes && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: L.yellowBg, borderRadius: 8, fontSize: 13, color: L.t2, borderLeft: `3px solid ${L.yellow}` }}>
              <strong>Obs:</strong> {selected.observacoes}
            </div>
          )}
        </Modal>
      )}

      {/* Modal: Novo Pedido */}
      {modal === 'novo' && (
        <Modal title="Novo Pedido de Compra" onClose={() => setModal(null)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="NÚMERO DO PEDIDO">
                <input style={inp} value={form.numero_pedido||''} onChange={e => setForm(f => ({...f, numero_pedido: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="FORNECEDOR *">
                <select style={inp} value={form.fornecedor_id||''} onChange={e => setForm(f => ({...f, fornecedor_id: e.target.value}))} onFocus={focus} onBlur={blur}>
                  <option value="">Selecionar fornecedor...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="DATA DO PEDIDO">
                <input type="date" style={inp} value={form.data_pedido||''} onChange={e => setForm(f => ({...f, data_pedido: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="PREVISÃO DE ENTREGA">
                <input type="date" style={inp} value={form.data_entrega_prevista||''} onChange={e => setForm(f => ({...f, data_entrega_prevista: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, height: 72, resize: 'vertical' }} value={form.observacoes||''} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} onFocus={focus} onBlur={blur} />
            </Field>

            {/* Item rows */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>Itens do Pedido</div>
                <button onClick={addItemRow} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, background: L.tealBg, color: L.teal, border: `1px solid ${L.line}`, cursor: 'pointer', fontWeight: 600 }}>+ Adicionar Item</button>
              </div>

              {itemRows.length > 0 && (
                <div style={{ border: `1px solid ${L.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: L.surface }}>
                        {['Descrição','Un.','Qtd.','Valor Unit.','Total',''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < itemRows.length-1 ? `1px solid ${L.line}` : 'none' }}>
                          <td style={{ padding: '6px 8px' }}>
                            <input style={{ ...inp, padding: '6px 8px', fontSize: 12 }} placeholder="Descrição do item" value={row.descricao} onChange={e => updateItemRow(i, 'descricao', e.target.value)} onFocus={focus} onBlur={blur} />
                          </td>
                          <td style={{ padding: '6px 8px', width: 70 }}>
                            <input style={{ ...inp, padding: '6px 8px', fontSize: 12 }} placeholder="un" value={row.unidade} onChange={e => updateItemRow(i, 'unidade', e.target.value)} onFocus={focus} onBlur={blur} />
                          </td>
                          <td style={{ padding: '6px 8px', width: 80 }}>
                            <input type="number" min="0" style={{ ...inp, padding: '6px 8px', fontSize: 12 }} value={row.quantidade} onChange={e => updateItemRow(i, 'quantidade', e.target.value)} onFocus={focus} onBlur={blur} />
                          </td>
                          <td style={{ padding: '6px 8px', width: 110 }}>
                            <input type="number" min="0" step="0.01" style={{ ...inp, padding: '6px 8px', fontSize: 12 }} value={row.valor_unitario} onChange={e => updateItemRow(i, 'valor_unitario', e.target.value)} onFocus={focus} onBlur={blur} />
                          </td>
                          <td style={{ padding: '6px 8px', width: 110, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: L.t1, whiteSpace: 'nowrap' }}>{fmt((Number(row.quantidade)||0)*(Number(row.valor_unitario)||0))}</td>
                          <td style={{ padding: '6px 8px', width: 36 }}>
                            <button onClick={() => removeItemRow(i)} style={{ color: L.red, fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {itemRows.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '10px 4px' }}>
                  <span style={{ fontSize: 13, color: L.t3 }}>Total do pedido:</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: L.teal, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalPedido)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${L.line}` }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${L.line}`, background: L.bg, color: L.t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarPedido} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: L.teal, color: L.white, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar Pedido'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 — Cotações & Comparativo
══════════════════════════════════════════════════════════════════════════ */
function TabCotacoes({ clinicaId, fornecedores }) {
  const [cotacoes, setCotacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [gerandoPedido, setGerandoPedido] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cotacoes')
      .select('*, fornecedores(nome)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setCotacoes(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* group by item_descricao */
  const grouped = cotacoes.reduce((acc, c) => {
    const k = c.item_descricao
    if (!acc[k]) acc[k] = []
    acc[k].push(c)
    return acc
  }, {})

  /* KPI: avg savings vs highest quote */
  let totalSavingsPct = 0, groupCount = 0
  Object.values(grouped).forEach(group => {
    if (group.length < 2) return
    const vals = group.map(c => Number(c.valor_unitario)||0).filter(v => v > 0)
    if (!vals.length) return
    const max = Math.max(...vals), min = Math.min(...vals)
    if (max > 0) { totalSavingsPct += ((max - min) / max) * 100; groupCount++ }
  })
  const avgSavings = groupCount > 0 ? (totalSavingsPct / groupCount).toFixed(1) : '0.0'

  const existingItems = [...new Set(cotacoes.map(c => c.item_descricao))]

  async function salvarCotacao() {
    if (!form.item_descricao || !form.fornecedor_id || !form.valor_unitario) {
      return alert('Preencha item, fornecedor e valor unitário')
    }
    setSaving(true)
    await supabase.from('cotacoes').insert({
      clinica_id: clinicaId,
      item_descricao: form.item_descricao,
      fornecedor_id: form.fornecedor_id,
      valor_unitario: Number(form.valor_unitario),
      prazo_entrega: form.prazo_entrega ? Number(form.prazo_entrega) : null,
      validade_cotacao: form.validade_cotacao || null,
      observacoes: form.observacoes || null,
    })
    setSaving(false)
    setModal(false)
    load()
  }

  async function gerarPedidoDraft(cotacao) {
    setGerandoPedido(cotacao.id)
    const numPedido = `PC-${Date.now().toString().slice(-6)}`
    const { data: ped } = await supabase
      .from('pedidos_compra')
      .insert({
        clinica_id: clinicaId,
        fornecedor_id: cotacao.fornecedor_id,
        numero_pedido: numPedido,
        status: 'rascunho',
        data_pedido: today(),
        valor_total: Number(cotacao.valor_unitario) || 0,
        desconto: 0,
        observacoes: `Gerado a partir de cotação: ${cotacao.item_descricao}`,
      })
      .select()
      .single()
    if (ped) {
      await supabase.from('itens_pedido').insert({
        pedido_id: ped.id,
        descricao: cotacao.item_descricao,
        unidade: 'un',
        quantidade: 1,
        valor_unitario: Number(cotacao.valor_unitario),
        valor_total: Number(cotacao.valor_unitario),
      })
      alert(`Pedido rascunho ${numPedido} criado com sucesso!`)
    }
    setGerandoPedido(null)
  }

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPI label="ITENS COTADOS" value={Object.keys(grouped).length} />
        <KPI label="TOTAL DE COTAÇÕES" value={cotacoes.length} />
        <KPI label="ECONOMIA MÉDIA (VS MAIOR)" value={`${avgSavings}%`} color={L.green} sub="comparando cotações por item" />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: L.t1 }}>Comparativo de Cotações</div>
        <button onClick={() => { setForm({ clinica_id: clinicaId }); setModal(true) }} style={{
          background: L.teal, color: L.white, border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Nova Cotação</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>
          <span style={{ display: 'inline-block', width: 20, height: 20, border: `2px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t3, fontSize: 14 }}>Nenhuma cotação cadastrada</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([item, quotes]) => {
            const vals = quotes.map(q => Number(q.valor_unitario)||0)
            const minVal = Math.min(...vals)
            const maxVal = Math.max(...vals)
            return (
              <div key={item} style={{ border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: L.surface, padding: '12px 18px', borderBottom: `1px solid ${L.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{item}</div>
                  <div style={{ fontSize: 12, color: L.t3 }}>{quotes.length} cotação{quotes.length !== 1 ? 'ões' : ''}</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: L.surface }}>
                        {['Fornecedor','Valor Unit.','Prazo (dias)','Validade','Observações','Ação'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.sort((a,b) => Number(a.valor_unitario)-Number(b.valor_unitario)).map((q, i) => {
                        const isMin = Number(q.valor_unitario) === minVal
                        const isMax = Number(q.valor_unitario) === maxVal && quotes.length > 1
                        return (
                          <tr key={q.id} style={{ borderBottom: i < quotes.length-1 ? `1px solid ${L.line}` : 'none', background: isMin && quotes.length > 1 ? L.greenBg : L.bg }}>
                            <td style={{ padding: '10px 14px', fontWeight: 500, color: L.t1 }}>
                              {q.fornecedores?.nome || '—'}
                              {isMin && quotes.length > 1 && <span style={{ marginLeft: 6, fontSize: 10, background: L.green, color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>MENOR</span>}
                            </td>
                            <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isMin && quotes.length > 1 ? L.green : (isMax ? L.red : L.t1), whiteSpace: 'nowrap' }}>{fmt(q.valor_unitario)}</td>
                            <td style={{ padding: '10px 14px', color: L.t2 }}>{q.prazo_entrega ?? '—'}</td>
                            <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>{fmtDate(q.validade_cotacao)}</td>
                            <td style={{ padding: '10px 14px', color: L.t3, fontSize: 12, maxWidth: 200 }}>{q.observacoes || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <button
                                onClick={() => gerarPedidoDraft(q)}
                                disabled={gerandoPedido === q.id}
                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: isMin && quotes.length > 1 ? L.teal : L.surface, color: isMin && quotes.length > 1 ? L.white : L.t2, border: `1px solid ${L.line}`, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: isMin ? 600 : 400 }}
                              >
                                {gerandoPedido === q.id ? '...' : 'Selecionar'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {quotes.length > 1 && (
                  <div style={{ padding: '10px 18px', background: L.surface, borderTop: `1px solid ${L.line}`, fontSize: 12, color: L.t3, display: 'flex', gap: 20 }}>
                    <span>Menor: <strong style={{ color: L.green }}>{fmt(minVal)}</strong></span>
                    <span>Maior: <strong style={{ color: L.red }}>{fmt(maxVal)}</strong></span>
                    <span>Economia potencial: <strong style={{ color: L.teal }}>{maxVal > 0 ? (((maxVal-minVal)/maxVal)*100).toFixed(1) : 0}%</strong></span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Nova Cotação */}
      {modal && (
        <Modal title="Nova Cotação" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="ITEM / PRODUTO *">
              <>
                <input
                  list="itens-list"
                  style={inp}
                  placeholder="Nome do item ou produto..."
                  value={form.item_descricao||''}
                  onChange={e => setForm(f => ({...f, item_descricao: e.target.value}))}
                  onFocus={focus} onBlur={blur}
                />
                <datalist id="itens-list">
                  {existingItems.map(it => <option key={it} value={it} />)}
                </datalist>
              </>
            </Field>
            <Field label="FORNECEDOR *">
              <select style={inp} value={form.fornecedor_id||''} onChange={e => setForm(f => ({...f, fornecedor_id: e.target.value}))} onFocus={focus} onBlur={blur}>
                <option value="">Selecionar fornecedor...</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="VALOR UNITÁRIO (R$) *">
                <input type="number" min="0" step="0.01" style={inp} value={form.valor_unitario||''} onChange={e => setForm(f => ({...f, valor_unitario: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="PRAZO ENTREGA (DIAS)">
                <input type="number" min="0" style={inp} value={form.prazo_entrega||''} onChange={e => setForm(f => ({...f, prazo_entrega: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <Field label="VALIDADE DA COTAÇÃO">
              <input type="date" style={inp} value={form.validade_cotacao||''} onChange={e => setForm(f => ({...f, validade_cotacao: e.target.value}))} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, height: 68, resize: 'vertical' }} value={form.observacoes||''} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${L.line}` }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${L.line}`, background: L.bg, color: L.t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarCotacao} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: L.teal, color: L.white, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar Cotação'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — Fornecedores
══════════════════════════════════════════════════════════════════════════ */
function TabFornecedores({ clinicaId, fornecedores, onReload }) {
  const [stats, setStats] = useState({})
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (fornecedores.length) loadStats()
  }, [fornecedores])

  async function loadStats() {
    const ids = fornecedores.map(f => f.id)
    const { data } = await supabase
      .from('pedidos_compra')
      .select('fornecedor_id, valor_total, data_pedido, status')
      .in('fornecedor_id', ids)
      .neq('status', 'cancelado')
    if (!data) return
    const s = {}
    data.forEach(p => {
      if (!s[p.fornecedor_id]) s[p.fornecedor_id] = { total: 0, count: 0, ultimo: null }
      s[p.fornecedor_id].total += Number(p.valor_total)||0
      s[p.fornecedor_id].count++
      if (!s[p.fornecedor_id].ultimo || p.data_pedido > s[p.fornecedor_id].ultimo) {
        s[p.fornecedor_id].ultimo = p.data_pedido
      }
    })
    setStats(s)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, ativo: true, categoria: 'geral' })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome?.trim()) return alert('Informe o nome do fornecedor')
    setSaving(true)
    if (form.id) {
      await supabase.from('fornecedores').update({
        nome: form.nome, cnpj: form.cnpj||null, contato: form.contato||null,
        email: form.email||null, telefone: form.telefone||null,
        categoria: form.categoria||null, ativo: form.ativo,
      }).eq('id', form.id)
    } else {
      await supabase.from('fornecedores').insert({
        clinica_id: clinicaId, nome: form.nome, cnpj: form.cnpj||null,
        contato: form.contato||null, email: form.email||null,
        telefone: form.telefone||null, categoria: form.categoria||null, ativo: true,
      })
    }
    setSaving(false)
    setModal(false)
    onReload()
  }

  async function toggleAtivo(f) {
    await supabase.from('fornecedores').update({ ativo: !f.ativo }).eq('id', f.id)
    onReload()
  }

  const CAT_COLORS = {
    geral:      { bg: L.surface, color: L.t3 },
    farmacia:   { bg: L.purpleBg, color: L.purple },
    material:   { bg: L.blueBg, color: L.blue },
    equipamento:{ bg: L.orangeBg, color: L.orange },
    laboratorio:{ bg: L.yellowBg, color: L.yellow },
    alimento:   { bg: L.greenBg, color: L.green },
  }

  const filtered = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.cnpj||'').includes(busca) ||
    (f.contato||'').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPI label="TOTAL DE FORNECEDORES" value={fornecedores.length} />
        <KPI label="ATIVOS" value={fornecedores.filter(f=>f.ativo).length} color={L.green} />
        <KPI label="INATIVOS" value={fornecedores.filter(f=>!f.ativo).length} color={L.t3} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inp, maxWidth: 280 }}
          placeholder="Buscar fornecedor, CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        <button onClick={abrirNovo} style={{
          background: L.teal, color: L.white, border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>+ Novo Fornecedor</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t3, fontSize: 14 }}>
          {busca ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(f => {
            const st = stats[f.id] || { total: 0, count: 0, ultimo: null }
            const cat = f.categoria || 'geral'
            const catStyle = CAT_COLORS[cat] || CAT_COLORS.geral
            return (
              <div key={f.id} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                padding: '18px 20px', opacity: f.ativo ? 1 : 0.65,
                boxShadow: L.shadow,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 4 }}>{f.nome}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: catStyle.bg, color: catStyle.color, textTransform: 'capitalize' }}>{cat}</span>
                  </div>
                  {/* Ativo toggle */}
                  <button
                    onClick={() => toggleAtivo(f)}
                    style={{
                      position: 'relative', width: 38, height: 22, borderRadius: 11,
                      background: f.ativo ? L.teal : L.line, border: 'none', cursor: 'pointer',
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                    title={f.ativo ? 'Desativar' : 'Ativar'}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: f.ativo ? 19 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: L.t3, marginBottom: 14 }}>
                  {f.cnpj && <div><span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>CNPJ </span>{f.cnpj}</div>}
                  {f.contato && <div><span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>CONTATO </span>{f.contato}</div>}
                  {f.telefone && <div><span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>TEL </span>{f.telefone}</div>}
                  {f.email && <div><span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>EMAIL </span>{f.email}</div>}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: `1px solid ${L.line}`, paddingTop: 12, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: L.teal }}>{st.count}</div>
                    <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>PEDIDOS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: L.t1 }}>{st.total > 0 ? fmt(st.total) : '—'}</div>
                    <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>TOTAL</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: L.t2 }}>{st.ultimo ? fmtDate(st.ultimo) : '—'}</div>
                    <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>ÚLT. PEDIDO</div>
                  </div>
                </div>

                <button
                  onClick={() => { setForm({ ...f }); setModal(true) }}
                  style={{ width: '100%', padding: '7px', borderRadius: 7, border: `1px solid ${L.line}`, background: L.surface, color: L.t2, fontSize: 12, cursor: 'pointer' }}
                >Editar</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Fornecedor */}
      {modal && (
        <Modal title={form.id ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME *">
              <input style={inp} value={form.nome||''} onChange={e => setForm(f => ({...f, nome: e.target.value}))} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CNPJ">
                <input style={inp} placeholder="00.000.000/0000-00" value={form.cnpj||''} onChange={e => setForm(f => ({...f, cnpj: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="CATEGORIA">
                <select style={inp} value={form.categoria||'geral'} onChange={e => setForm(f => ({...f, categoria: e.target.value}))} onFocus={focus} onBlur={blur}>
                  {['geral','farmacia','material','equipamento','laboratorio','alimento'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="CONTATO (NOME)">
              <input style={inp} value={form.contato||''} onChange={e => setForm(f => ({...f, contato: e.target.value}))} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TELEFONE">
                <input style={inp} placeholder="(00) 00000-0000" value={form.telefone||''} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="E-MAIL">
                <input type="email" style={inp} value={form.email||''} onChange={e => setForm(f => ({...f, email: e.target.value}))} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${L.line}` }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${L.line}`, background: L.bg, color: L.t2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: L.teal, color: L.white, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT PAGE
══════════════════════════════════════════════════════════════════════════ */
const TABS = ['Pedidos de Compra', 'Cotações & Comparativo', 'Fornecedores']

export default function PageCompras({ profile }) {
  const [tab, setTab] = useState(0)
  const [fornecedores, setFornecedores] = useState([])
  const clinicaId = profile?.clinica_id

  const loadFornecedores = useCallback(async () => {
    if (!clinicaId) return
    const { data } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setFornecedores(data || [])
  }, [clinicaId])

  useEffect(() => { loadFornecedores() }, [loadFornecedores])

  return (
    <>
      <style>{`
        @keyframes up   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '24px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
            Central de Compras
          </div>
          <div style={{ fontSize: 13, color: L.t3 }}>Cotações, pedidos de compra e gestão de fornecedores</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: tab === i ? 600 : 400,
                color: tab === i ? L.teal : L.t3,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ animation: 'up 0.2s ease' }} key={tab}>
          {tab === 0 && <TabPedidos clinicaId={clinicaId} fornecedores={fornecedores} />}
          {tab === 1 && <TabCotacoes clinicaId={clinicaId} fornecedores={fornecedores} />}
          {tab === 2 && <TabFornecedores clinicaId={clinicaId} fornecedores={fornecedores} onReload={loadFornecedores} />}
        </div>
      </div>
    </>
  )
}
