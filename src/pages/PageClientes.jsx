import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { TIPO_LABELS } from '../constants/nav.js'

const PLANOS = ['basico', 'profissional', 'enterprise']
const TIPOS  = ['clinica', 'hospital']

function Badge({ tipo }) {
  const map = {
    clinica:  { bg: L.blueBg,   color: L.blue,   label: 'Clínica' },
    hospital: { bg: L.purpleBg, color: L.purple,  label: 'Hospital' },
    c4hub:    { bg: L.tealBg,   color: L.teal,    label: 'C4HUB' },
  }
  const s = map[tipo] || map.clinica
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color
    }}>{s.label}</span>
  )
}

function PlanoBadge({ plano }) {
  const map = {
    basico:       { bg: L.hover,      color: L.t3 },
    profissional: { bg: L.blueBg,     color: L.blue },
    enterprise:   { bg: L.purpleBg,   color: L.purple },
  }
  const s = map[plano] || map.basico
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, textTransform: 'capitalize'
    }}>{plano || 'básico'}</span>
  )
}

const EMPTY = {
  nome: '', tipo: 'clinica', email: '', telefone: '', cnpj: '',
  cidade: '', estado: '', plano: 'basico', ativo: true, observacoes: ''
}

export default function PageClientes({ isMaster }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [modal, setModal]     = useState(null) // null | 'new' | row
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clinicas')
      .select('*')
      .neq('tipo', 'c4hub')
      .order('nome')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(EMPTY); setError(''); setModal('new') }
  function openEdit(r) { setForm({ ...r }); setError(''); setModal(r) }
  function closeModal() { setModal(null); setError('') }

  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function toggle(k) { setForm(f => ({ ...f, [k]: !f[k] })) }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      if (modal === 'new') {
        const { error: e } = await supabase.from('clinicas').insert({
          nome: form.nome.trim(), tipo: form.tipo, email: form.email,
          telefone: form.telefone, cnpj: form.cnpj, cidade: form.cidade,
          estado: form.estado, plano: form.plano, ativo: form.ativo,
          observacoes: form.observacoes
        })
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('clinicas').update({
          nome: form.nome.trim(), tipo: form.tipo, email: form.email,
          telefone: form.telefone, cnpj: form.cnpj, cidade: form.cidade,
          estado: form.estado, plano: form.plano, ativo: form.ativo,
          observacoes: form.observacoes
        }).eq('id', modal.id)
        if (e) throw e
      }
      await load(); closeModal()
    } catch (e) {
      setError(e.message || 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  async function toggleAtivo(r) {
    await supabase.from('clinicas').update({ ativo: !r.ativo }).eq('id', r.id)
    setRows(rows => rows.map(x => x.id === r.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function del(r) {
    if (!window.confirm(`Excluir "${r.nome}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(r.id)
    await supabase.from('clinicas').delete().eq('id', r.id)
    setRows(rows => rows.filter(x => x.id !== r.id))
    setDeleting(null)
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.nome?.toLowerCase().includes(q) || r.cidade?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
    const matchT = filterTipo === 'todos' || r.tipo === filterTipo
    return matchQ && matchT
  })

  const stats = {
    total:    rows.length,
    clinicas: rows.filter(r => r.tipo === 'clinica').length,
    hospitais: rows.filter(r => r.tipo === 'hospital').length,
    ativos:   rows.filter(r => r.ativo).length,
  }

  return (
    <div style={{ padding: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Clientes', value: stats.total, color: L.teal },
          { label: 'Clínicas',       value: stats.clinicas, color: L.blue },
          { label: 'Hospitais',      value: stats.hospitais, color: L.purple },
          { label: 'Ativos',         value: stats.ativos, color: L.green },
        ].map(k => (
          <div key={k.label} style={{
            background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '16px 20px'
          }}>
            <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        padding: 16, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
      }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, cidade, e-mail..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1,
            background: L.surface
          }}
        />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
          fontSize: 13, color: L.t2, background: L.surface
        }}>
          <option value="todos">Todos os tipos</option>
          <option value="clinica">Clínicas</option>
          <option value="hospital">Hospitais</option>
        </select>
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13
        }}>+ Novo Cliente</button>
      </div>

      {/* Table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
            {rows.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Nome', 'Tipo', 'Plano', 'Cidade / Estado', 'E-mail', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, color: L.t4, fontWeight: 600,
                    letterSpacing: '0.5px', textTransform: 'uppercase'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{
                  borderBottom: i < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                  transition: 'background 0.1s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.surface}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{r.nome}</div>
                    {r.cnpj && <div style={{ fontSize: 11, color: L.t4 }}>{r.cnpj}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}><Badge tipo={r.tipo} /></td>
                  <td style={{ padding: '12px 16px' }}><PlanoBadge plano={r.plano} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>
                    {[r.cidade, r.estado].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t3 }}>{r.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleAtivo(r)} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: r.ativo ? L.greenBg : L.redBg,
                      color: r.ativo ? L.green : L.red,
                      border: `1px solid ${r.ativo ? L.greenBd : L.redBd}`
                    }}>{r.ativo ? 'Ativo' : 'Inativo'}</button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(r)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.hover, color: L.t2, fontWeight: 500
                      }}>Editar</button>
                      <button onClick={() => del(r)} disabled={deleting === r.id} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.redBg, color: L.red, fontWeight: 500
                      }}>{deleting === r.id ? '...' : 'Excluir'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-wrap anim-up" style={{
            background: L.bg, borderRadius: 16, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>
                {modal === 'new' ? 'Novo Cliente' : 'Editar Cliente'}
              </div>
              <button onClick={closeModal} style={{ fontSize: 20, color: L.t3 }}>×</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Row label="Nome *">
                <input value={form.nome} onChange={field('nome')} placeholder="Nome da clínica ou hospital"
                  style={inp} />
              </Row>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Row label="Tipo">
                  <select value={form.tipo} onChange={field('tipo')} style={inp}>
                    {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t] || t}</option>)}
                  </select>
                </Row>
                <Row label="Plano">
                  <select value={form.plano} onChange={field('plano')} style={inp}>
                    {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Row>
              </div>
              <Row label="CNPJ">
                <input value={form.cnpj} onChange={field('cnpj')} placeholder="00.000.000/0001-00"
                  style={inp} />
              </Row>
              <Row label="E-mail">
                <input value={form.email} onChange={field('email')} placeholder="contato@clinica.com"
                  style={inp} type="email" />
              </Row>
              <Row label="Telefone">
                <input value={form.telefone} onChange={field('telefone')} placeholder="(11) 3000-0000"
                  style={inp} />
              </Row>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
                <Row label="Cidade">
                  <input value={form.cidade} onChange={field('cidade')} placeholder="Cidade"
                    style={inp} />
                </Row>
                <Row label="Estado">
                  <input value={form.estado} onChange={field('estado')} placeholder="SP"
                    maxLength={2} style={inp} />
                </Row>
              </div>
              <Row label="Observações">
                <textarea value={form.observacoes} onChange={field('observacoes')}
                  placeholder="Notas internas..." rows={3}
                  style={{ ...inp, resize: 'vertical' }} />
              </Row>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={() => toggle('ativo')} />
                <label htmlFor="ativo" style={{ fontSize: 13, color: L.t2 }}>Cliente ativo</label>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: L.redBg, color: L.red, fontSize: 13
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={closeModal} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: L.hover, color: L.t2, fontWeight: 500, fontSize: 13
                }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
                  opacity: saving ? 0.7 : 1
                }}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, color: L.t3, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${L.line}`, fontSize: 13, color: L.t1,
  background: L.surface, outline: 'none'
}
