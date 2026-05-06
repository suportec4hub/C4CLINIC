import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { ROLE_LABELS } from '../constants/nav.js'

const CLINICA_ROLES = [
  ['admin_clinica', 'Admin Clínica'],
  ['medico',        'Médico'],
  ['recepcionista', 'Recepcionista'],
  ['atendente',     'Atendente'],
  ['financeiro',    'Financeiro'],
]

function CargoBadge({ cargo }) {
  const map = {
    admin_clinica: { bg: L.blueBg,   color: L.blue,   label: 'Admin Clínica' },
    medico:        { bg: L.greenBg,  color: L.green,  label: 'Médico' },
    recepcionista: { bg: L.yellowBg, color: L.yellow, label: 'Recepcionista' },
    atendente:     { bg: L.orangeBg, color: L.orange, label: 'Atendente' },
    financeiro:    { bg: L.purpleBg, color: L.purple, label: 'Financeiro' },
  }
  const s = map[cargo] || { bg: L.hover, color: L.t3, label: ROLE_LABELS[cargo] || cargo }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color
    }}>{s.label}</span>
  )
}

const EMPTY_FORM = { nome: '', email: '', cargo: 'recepcionista', senha: '' }

export default function PageUsuarios({ user, profile, cargo, isAdmin }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterCargo, setFilterCargo] = useState('todos')
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const clinicaId = profile?.clinica_id

  const load = useCallback(async () => {
    if (!clinicaId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, cargo, created_at')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function openNew() { setForm(EMPTY_FORM); setError(''); setModal('new') }
  function openEdit(u) {
    setForm({ nome: u.nome, email: '', cargo: u.cargo, senha: '' })
    setError(''); setModal(u)
  }
  function closeModal() { setModal(null); setError('') }
  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    if (modal === 'new' && !form.email.trim()) { setError('E-mail é obrigatório.'); return }
    if (modal === 'new' && !form.senha)        { setError('Senha é obrigatória.'); return }

    setSaving(true); setError('')
    try {
      if (modal === 'new') {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: form.email.trim(),
          password: form.senha,
          email_confirm: true,
        })
        if (authErr) throw authErr
        const { error: profErr } = await supabase.from('usuarios').insert({
          id: authData.user.id,
          nome: form.nome.trim(),
          cargo: form.cargo,
          clinica_id: clinicaId,
        })
        if (profErr) throw profErr
      } else {
        const { error: e } = await supabase.from('usuarios').update({
          nome: form.nome.trim(),
          cargo: form.cargo,
        }).eq('id', modal.id)
        if (e) throw e
      }
      await load(); closeModal()
    } catch (e) {
      setError(e.message || 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  async function del(u) {
    if (u.id === user.id) { alert('Você não pode excluir seu próprio usuário.'); return }
    if (!window.confirm(`Excluir "${u.nome}"?`)) return
    await supabase.from('usuarios').delete().eq('id', u.id)
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
  }

  const filtered = usuarios.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || u.nome?.toLowerCase().includes(q)
    const matchC = filterCargo === 'todos' || u.cargo === filterCargo
    return matchQ && matchC
  })

  const stats = {
    total:      usuarios.length,
    medicos:    usuarios.filter(u => u.cargo === 'medico').length,
    receps:     usuarios.filter(u => u.cargo === 'recepcionista').length,
    outros:     usuarios.filter(u => !['medico', 'recepcionista'].includes(u.cargo)).length,
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
        Acesso restrito a administradores da clínica.
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',          value: stats.total,   color: L.teal },
          { label: 'Médicos',        value: stats.medicos,  color: L.green },
          { label: 'Recepcionistas', value: stats.receps,   color: L.yellow },
          { label: 'Outros',         value: stats.outros,   color: L.t3 },
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
          placeholder="Buscar por nome..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1, background: L.surface
          }}
        />
        <select value={filterCargo} onChange={e => setFilterCargo(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
          fontSize: 13, color: L.t2, background: L.surface
        }}>
          <option value="todos">Todos os cargos</option>
          {CLINICA_ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13
        }}>+ Novo Usuário</button>
      </div>

      {/* Table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
            {usuarios.length === 0 ? 'Nenhum usuário cadastrado nesta clínica.' : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Usuário', 'Cargo', 'Membro desde', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: 11, color: L.t4, fontWeight: 600,
                    letterSpacing: '0.5px', textTransform: 'uppercase'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: i < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.surface}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: L.tealBg,
                        border: `1.5px solid ${L.teal}30`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: L.teal, flexShrink: 0
                      }}>{u.nome?.[0]?.toUpperCase() || '?'}</div>
                      <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{u.nome}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><CargoBadge cargo={u.cargo} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t3 }}>
                    {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.hover, color: L.t2, fontWeight: 500
                      }}>Editar</button>
                      {u.id !== user.id && (
                        <button onClick={() => del(u)} style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 12,
                          background: L.redBg, color: L.red, fontWeight: 500
                        }}>Excluir</button>
                      )}
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
            background: L.bg, borderRadius: 16, width: '100%', maxWidth: 460,
            maxHeight: '90vh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>
                {modal === 'new' ? 'Novo Usuário' : 'Editar Usuário'}
              </div>
              <button onClick={closeModal} style={{ fontSize: 20, color: L.t3 }}>×</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FRow label="Nome *">
                <input value={form.nome} onChange={field('nome')} placeholder="Nome completo" style={inp} />
              </FRow>
              {modal === 'new' && (
                <>
                  <FRow label="E-mail *">
                    <input value={form.email} onChange={field('email')} placeholder="email@exemplo.com"
                      style={inp} type="email" />
                  </FRow>
                  <FRow label="Senha *">
                    <input value={form.senha} onChange={field('senha')} placeholder="Senha inicial"
                      style={inp} type="password" />
                  </FRow>
                </>
              )}
              <FRow label="Cargo">
                <select value={form.cargo} onChange={field('cargo')} style={inp}>
                  {CLINICA_ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FRow>

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

function FRow({ label, children }) {
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
