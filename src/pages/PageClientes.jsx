import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const PLANOS = [
  ['basico',       'Básico'],
  ['profissional', 'Profissional'],
  ['enterprise',   'Enterprise'],
]

const TIPOS = [
  { value: 'clinica',        label: 'Clínica',        bg: L.blueBg,    color: L.blue },
  { value: 'hospital',       label: 'Hospital',       bg: L.purpleBg,  color: L.purple },
  { value: 'medico_avulso',  label: 'Médico Avulso',  bg: L.greenBg,   color: L.green },
]

function Badge({ tipo }) {
  const t = TIPOS.find(x => x.value === tipo) || TIPOS[0]
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.color
    }}>{t.label}</span>
  )
}

function PlanoBadge({ plano }) {
  const map = {
    basico:       { bg: L.hover,    color: L.t3 },
    profissional: { bg: L.blueBg,   color: L.blue },
    enterprise:   { bg: L.purpleBg, color: L.purple },
  }
  const s = map[plano] || map.basico
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, textTransform: 'capitalize'
    }}>{plano === 'basico' ? 'Básico' : plano === 'profissional' ? 'Profissional' : 'Enterprise'}</span>
  )
}

const EMPTY = {
  nome: '', tipo: 'clinica', email: '', telefone: '',
  cnpj: '', cpf: '', crm: '', especialidade: '',
  cidade: '', estado: '', plano: 'basico', ativo: true, observacoes: ''
}

function isMedico(tipo) { return tipo === 'medico_avulso' }

export default function PageClientes({ isMaster }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [modal, setModal]     = useState(null)
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
  function openEdit(r) {
    setForm({
      nome: r.nome || '', tipo: r.tipo || 'clinica',
      email: r.email || '', telefone: r.telefone || '',
      cnpj: r.cnpj || '', cpf: r.cpf || '',
      crm: r.crm || '', especialidade: r.especialidade || '',
      cidade: r.cidade || '', estado: r.estado || '',
      plano: r.plano || 'basico', ativo: r.ativo !== false,
      observacoes: r.observacoes || ''
    })
    setError(''); setModal(r)
  }
  function closeModal() { setModal(null); setError('') }
  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function toggle(k) { setForm(f => ({ ...f, [k]: !f[k] })) }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        email: form.email || null,
        telefone: form.telefone || null,
        cnpj: isMedico(form.tipo) ? null : (form.cnpj || null),
        cpf: isMedico(form.tipo) ? (form.cpf || null) : null,
        crm: isMedico(form.tipo) ? (form.crm || null) : null,
        especialidade: isMedico(form.tipo) ? (form.especialidade || null) : null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        plano: form.plano,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      }
      if (modal === 'new') {
        const { error: e } = await supabase.from('clinicas').insert(payload)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('clinicas').update(payload).eq('id', modal.id)
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
    const matchQ = !q || r.nome?.toLowerCase().includes(q) ||
      r.cidade?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) ||
      r.crm?.toLowerCase().includes(q) || r.especialidade?.toLowerCase().includes(q)
    const matchT = filterTipo === 'todos' || r.tipo === filterTipo
    return matchQ && matchT
  })

  const stats = {
    total:         rows.length,
    clinicas:      rows.filter(r => r.tipo === 'clinica').length,
    hospitais:     rows.filter(r => r.tipo === 'hospital').length,
    medicos_avul:  rows.filter(r => r.tipo === 'medico_avulso').length,
    ativos:        rows.filter(r => r.ativo).length,
  }

  const isNew  = modal === 'new'
  const medico = isMedico(form.tipo)

  return (
    <div style={{ padding: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',           value: stats.total,        color: L.teal },
          { label: 'Clínicas',        value: stats.clinicas,     color: L.blue },
          { label: 'Hospitais',       value: stats.hospitais,    color: L.purple },
          { label: 'Méd. Avulsos',    value: stats.medicos_avul, color: L.green },
          { label: 'Ativos',          value: stats.ativos,       color: L.t2 },
        ].map(k => (
          <div key={k.label} style={{
            background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '16px 20px'
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
          placeholder="Buscar por nome, cidade, e-mail, CRM..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1, background: L.surface
          }}
        />
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
          fontSize: 13, color: L.t2, background: L.surface
        }}>
          <option value="todos">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>+ Novo Cadastro</button>
      </div>

      {/* Table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
            {rows.length === 0 ? 'Nenhum cadastro encontrado.' : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Nome', 'Tipo', 'Plano', 'Localização / Especialidade', 'E-mail', 'Status', 'Ações'].map(h => (
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
                    {r.tipo === 'medico_avulso'
                      ? r.crm && <div style={{ fontSize: 11, color: L.t4 }}>CRM: {r.crm}</div>
                      : r.cnpj && <div style={{ fontSize: 11, color: L.t4 }}>{r.cnpj}</div>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}><Badge tipo={r.tipo} /></td>
                  <td style={{ padding: '12px 16px' }}><PlanoBadge plano={r.plano} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>
                    {r.tipo === 'medico_avulso'
                      ? r.especialidade || '—'
                      : [r.cidade, r.estado].filter(Boolean).join(' / ') || '—'
                    }
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t3 }}>{r.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleAtivo(r)} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: r.ativo ? L.greenBg : L.redBg,
                      color: r.ativo ? L.green : L.red,
                      border: `1px solid ${r.ativo ? L.greenBd : L.redBd}`,
                      cursor: 'pointer'
                    }}>{r.ativo ? 'Ativo' : 'Inativo'}</button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(r)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.hover, color: L.t2, fontWeight: 500, cursor: 'pointer'
                      }}>Editar</button>
                      <button onClick={() => del(r)} disabled={deleting === r.id} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.redBg, color: L.red, fontWeight: 500, cursor: 'pointer'
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: L.bg, borderRadius: 16, width: '100%', maxWidth: 580,
            maxHeight: '90vh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>
                {isNew ? '+ Novo Cadastro' : 'Editar Cadastro'}
              </div>
              <button onClick={closeModal} style={{
                fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer'
              }}>×</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tipo selector — first to adapt the rest of the form */}
              <Row label="Tipo de cadastro">
                <div style={{ display: 'flex', gap: 8 }}>
                  {TIPOS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: `2px solid ${form.tipo === t.value ? t.color : L.line}`,
                        background: form.tipo === t.value ? t.bg : L.surface,
                        color: form.tipo === t.value ? t.color : L.t3,
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >{t.label}</button>
                  ))}
                </div>
              </Row>

              <Row label={medico ? 'Nome do Médico *' : 'Nome da Clínica / Hospital *'}>
                <input value={form.nome} onChange={field('nome')}
                  placeholder={medico ? 'Dr. Nome Completo' : 'Nome da instituição'} style={inp} />
              </Row>

              {/* Médico Avulso fields */}
              {medico ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Row label="CRM">
                    <input value={form.crm} onChange={field('crm')}
                      placeholder="CRM/SP 123456" style={inp} />
                  </Row>
                  <Row label="Especialidade">
                    <input value={form.especialidade} onChange={field('especialidade')}
                      placeholder="Cardiologia, Clínica Geral..." style={inp} />
                  </Row>
                  <Row label="CPF">
                    <input value={form.cpf} onChange={field('cpf')}
                      placeholder="000.000.000-00" style={inp} />
                  </Row>
                  <Row label="Plano">
                    <select value={form.plano} onChange={field('plano')} style={inp}>
                      {PLANOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Row>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Row label="CNPJ">
                    <input value={form.cnpj} onChange={field('cnpj')}
                      placeholder="00.000.000/0001-00" style={inp} />
                  </Row>
                  <Row label="Plano">
                    <select value={form.plano} onChange={field('plano')} style={inp}>
                      {PLANOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Row>
                </div>
              )}

              <Row label="E-mail">
                <input value={form.email} onChange={field('email')}
                  placeholder={medico ? 'dr.nome@email.com' : 'contato@clinica.com'}
                  style={inp} type="email" />
              </Row>
              <Row label="Telefone">
                <input value={form.telefone} onChange={field('telefone')}
                  placeholder="(11) 3000-0000" style={inp} />
              </Row>

              {!medico && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
                  <Row label="Cidade">
                    <input value={form.cidade} onChange={field('cidade')} placeholder="Cidade" style={inp} />
                  </Row>
                  <Row label="UF">
                    <input value={form.estado} onChange={field('estado')}
                      placeholder="SP" maxLength={2} style={inp} />
                  </Row>
                </div>
              )}

              {medico && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12 }}>
                  <Row label="Cidade">
                    <input value={form.cidade} onChange={field('cidade')} placeholder="Cidade" style={inp} />
                  </Row>
                  <Row label="UF">
                    <input value={form.estado} onChange={field('estado')}
                      placeholder="SP" maxLength={2} style={inp} />
                  </Row>
                </div>
              )}

              <Row label="Observações">
                <textarea value={form.observacoes} onChange={field('observacoes')}
                  placeholder="Notas internas..." rows={3}
                  style={{ ...inp, resize: 'vertical' }} />
              </Row>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.ativo} onChange={() => toggle('ativo')} />
                <span style={{ fontSize: 13, color: L.t2 }}>Cadastro ativo</span>
              </label>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: L.redBg, color: L.red, fontSize: 13
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={closeModal} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: L.hover, color: L.t2, fontWeight: 500, fontSize: 13,
                  border: 'none', cursor: 'pointer'
                }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{
                  padding: '9px 22px', borderRadius: 8,
                  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
                  opacity: saving ? 0.7 : 1, border: 'none', cursor: saving ? 'not-allowed' : 'pointer'
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
  background: L.surface, outline: 'none', boxSizing: 'border-box'
}
