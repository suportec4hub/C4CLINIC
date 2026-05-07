import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

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
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px'
      }}>{label}</label>
      {children}
    </div>
  )
}

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e) { e.target.style.borderColor = L.line }

const CATEGORIAS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'material', label: 'Material' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'outros', label: 'Outros' },
]

function itemStatus(item) {
  const atual = Number(item.quantidade_atual)
  const min = Number(item.quantidade_minima)
  if (!min) return 'ok'
  if (atual === 0) return 'crítico'
  if (atual < min) return 'baixo'
  return 'ok'
}

function StatusBadge({ status }) {
  const map = {
    ok: { bg: L.greenBg, color: L.green, bd: L.greenBd, label: 'OK' },
    baixo: { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, label: 'Baixo' },
    'crítico': { bg: L.redBg, color: L.red, bd: L.redBd, label: 'Crítico' },
  }
  const s = map[status] || map.ok
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`
    }}>{s.label}</span>
  )
}

function CategoriaBadge({ categoria }) {
  const map = {
    material: { bg: L.blueBg, color: L.blue },
    medicamento: { bg: L.purpleBg, color: L.purple },
    equipamento: { bg: L.orangeBg, color: L.orange },
    outros: { bg: L.surface, color: L.t3 },
  }
  const s = map[categoria] || map.outros
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color, textTransform: 'capitalize'
    }}>{categoria || 'outros'}</span>
  )
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 160
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function PageEstoque({ profile }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [movForm, setMovForm] = useState({})
  const [itemMov, setItemMov] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('estoque_itens')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setItens(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, categoria: 'material', quantidade_atual: 0, quantidade_minima: 0 })
    setModal('form')
  }

  function abrirEditar(item) {
    setForm({ ...item })
    setModal('form')
  }

  function abrirMovimento(item) {
    setItemMov(item)
    setMovForm({ tipo: 'entrada', quantidade: '', motivo: '' })
    setModal('movimento')
  }

  async function salvar() {
    setSaving(true)
    if (form.id) {
      const { id, ...rest } = form
      await supabase.from('estoque_itens').update(rest).eq('id', id)
    } else {
      await supabase.from('estoque_itens').insert(form)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function salvarMovimento() {
    if (!movForm.quantidade || !itemMov) return
    setSaving(true)
    const qtd = Number(movForm.quantidade)
    const delta = movForm.tipo === 'saida' ? -qtd : movForm.tipo === 'entrada' ? qtd : 0
    await Promise.all([
      supabase.from('estoque_movimentos').insert({
        clinica_id: clinicaId,
        item_id: itemMov.id,
        tipo: movForm.tipo,
        quantidade: qtd,
        motivo: movForm.motivo,
      }),
      movForm.tipo !== 'ajuste'
        ? supabase.from('estoque_itens')
            .update({ quantidade_atual: Math.max(0, Number(itemMov.quantidade_atual) + delta) })
            .eq('id', itemMov.id)
        : supabase.from('estoque_itens')
            .update({ quantidade_atual: qtd })
            .eq('id', itemMov.id),
    ])
    setSaving(false)
    setModal(null)
    load()
  }

  async function deletar(id) {
    await supabase.from('estoque_itens').delete().eq('id', id)
    setConfirmDel(null)
    load()
  }

  const filtrados = itens.filter(i => {
    const matchBusca = !busca ||
      i.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      i.fornecedor?.toLowerCase().includes(busca.toLowerCase())
    const matchCat = !catFiltro || i.categoria === catFiltro
    return matchBusca && matchCat
  })

  const totalItens = itens.length
  const abaixoMin = itens.filter(i => itemStatus(i) !== 'ok').length
  const valorTotal = itens.reduce((acc, i) => acc + (Number(i.quantidade_atual) * Number(i.preco_unitario || 0)), 0)
  const fmtMoeda = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <KPI label="TOTAL DE ITENS" value={totalItens} sub="no estoque" />
        <KPI label="ALERTAS DE ESTOQUE" value={abaixoMin} sub="abaixo do mínimo" color={abaixoMin > 0 ? L.red : L.green} />
        <KPI label="VALOR TOTAL" value={fmtMoeda(valorTotal)} sub="valor estimado" color={L.teal} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nome ou fornecedor..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, maxWidth: 300, ...inp, width: 'auto' }}
          onFocus={focus} onBlur={blur}
        />
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          style={{ ...inp, width: 'auto', appearance: 'none', color: catFiltro ? L.t1 : L.t4 }}
        >
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtrados.length} itens</div>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>+ Novo Item</button>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 100px 100px 120px',
          padding: '10px 16px', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
          borderBottom: `1px solid ${L.line}`, background: L.surface
        }}>
          <span>NOME</span><span>CATEGORIA</span><span>UNIDADE</span>
          <span>ATUAL</span><span>MÍNIMO</span><span>STATUS</span><span>AÇÕES</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 24, height: 24, border: `3px solid ${L.line}`,
              borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
              animation: 'spin 0.7s linear infinite', margin: '0 auto'
            }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            Nenhum item encontrado
          </div>
        ) : filtrados.map(item => {
          const st = itemStatus(item)
          return (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 100px 100px 120px',
              padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
              transition: 'background 0.12s', alignItems: 'center',
              background: st === 'crítico' ? L.redBg : st === 'baixo' ? L.yellowBg : 'transparent'
            }}
              onMouseEnter={e => e.currentTarget.style.background = st === 'ok' ? L.hover : e.currentTarget.style.background}
              onMouseLeave={e => e.currentTarget.style.background = st === 'crítico' ? L.redBg : st === 'baixo' ? L.yellowBg : 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, color: L.t1 }}>{item.nome}</div>
                {item.fornecedor && <div style={{ fontSize: 11, color: L.t4 }}>{item.fornecedor}</div>}
              </div>
              <div><CategoriaBadge categoria={item.categoria} /></div>
              <div style={{ color: L.t2 }}>{item.unidade || '—'}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                color: st === 'crítico' ? L.red : st === 'baixo' ? L.yellow : L.t1
              }}>{item.quantidade_atual}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: L.t3 }}>{item.quantidade_minima}</div>
              <div><StatusBadge status={st} /></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirMovimento(item)} style={{
                  padding: '5px 8px', borderRadius: 6, background: L.tealBg, color: L.teal,
                  fontSize: 11, fontWeight: 600, border: `1px solid ${L.teal}20`, cursor: 'pointer'
                }}>+/−</button>
                <button onClick={() => abrirEditar(item)} style={{
                  padding: '5px 8px', borderRadius: 6, background: L.hover, color: L.t2,
                  fontSize: 12, border: 'none', cursor: 'pointer'
                }}>✎</button>
                <button onClick={() => setConfirmDel(item)} style={{
                  padding: '5px 8px', borderRadius: 6, background: L.redBg, color: L.red,
                  fontSize: 12, border: 'none', cursor: 'pointer'
                }}>✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Item' : 'Novo Item'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME *">
              <input style={inp} value={form.nome || ''} placeholder="Nome do item"
                onChange={e => setForm({ ...form, nome: e.target.value })} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CATEGORIA">
                <select style={{ ...inp, appearance: 'none' }} value={form.categoria || 'material'}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="UNIDADE">
                <input style={inp} value={form.unidade || ''} placeholder="ex: cx, un, ml"
                  onChange={e => setForm({ ...form, unidade: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="QUANTIDADE ATUAL">
                <input type="number" style={inp} value={form.quantidade_atual ?? ''} min="0"
                  onChange={e => setForm({ ...form, quantidade_atual: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="QUANTIDADE MÍNIMA">
                <input type="number" style={inp} value={form.quantidade_minima ?? ''} min="0"
                  onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="PREÇO UNITÁRIO (R$)">
                <input type="number" style={inp} value={form.preco_unitario || ''} min="0" step="0.01"
                  onChange={e => setForm({ ...form, preco_unitario: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="FORNECEDOR">
                <input style={inp} value={form.fornecedor || ''} placeholder="Nome do fornecedor"
                  onChange={e => setForm({ ...form, fornecedor: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.nome} style={{
                flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, border: 'none',
                cursor: saving || !form.nome ? 'not-allowed' : 'pointer',
                opacity: saving || !form.nome ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Item'}</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'movimento' && itemMov && (
        <Modal title={`Entrada / Saída — ${itemMov.nome}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '10px 14px', background: L.surface, borderRadius: 8,
              fontSize: 13, color: L.t2, border: `1px solid ${L.line}`
            }}>
              Estoque atual: <strong style={{ color: L.t1 }}>{itemMov.quantidade_atual} {itemMov.unidade || 'un'}</strong>
            </div>
            <Field label="TIPO DE MOVIMENTAÇÃO">
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'entrada', label: 'Entrada', color: L.green, bg: L.greenBg },
                  { value: 'saida', label: 'Saída', color: L.red, bg: L.redBg },
                  { value: 'ajuste', label: 'Ajuste', color: L.blue, bg: L.blueBg },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setMovForm({ ...movForm, tipo: opt.value })} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${movForm.tipo === opt.value ? opt.color : L.line}`,
                    background: movForm.tipo === opt.value ? opt.bg : L.bg,
                    color: movForm.tipo === opt.value ? opt.color : L.t3,
                    cursor: 'pointer', transition: 'all 0.12s'
                  }}>{opt.label}</button>
                ))}
              </div>
            </Field>
            <Field label={movForm.tipo === 'ajuste' ? 'QUANTIDADE FINAL' : 'QUANTIDADE'}>
              <input type="number" style={inp} value={movForm.quantidade} min="0"
                placeholder="0" onChange={e => setMovForm({ ...movForm, quantidade: e.target.value })}
                onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="MOTIVO">
              <input style={inp} value={movForm.motivo} placeholder="Motivo da movimentação"
                onChange={e => setMovForm({ ...movForm, motivo: e.target.value })}
                onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={salvarMovimento} disabled={saving || !movForm.quantidade} style={{
                flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, border: 'none',
                cursor: saving || !movForm.quantidade ? 'not-allowed' : 'pointer',
                opacity: saving || !movForm.quantidade ? 0.7 : 1
              }}>{saving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div style={{
            background: L.bg, borderRadius: 14, padding: 28, maxWidth: 380, width: '90%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: L.t1, marginBottom: 8 }}>Excluir item?</div>
            <div style={{ fontSize: 14, color: L.t3, marginBottom: 20 }}>
              "{confirmDel.nome}" será removido permanentemente do estoque.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={() => deletar(confirmDel.id)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.red,
                color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
