import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { ROLES, ROLE_LABELS } from '../constants/nav.js'

const CARGO_OPTIONS = Object.entries(ROLE_LABELS)

function CargoBadge({ cargo }) {
  const map = {
    c4hub_admin:   { bg: L.tealBg,   color: L.teal,   label: 'C4HUB Admin' },
    c4hub:         { bg: L.tealBg,   color: L.teal,   label: 'C4HUB' },
    admin_clinica: { bg: L.blueBg,   color: L.blue,   label: 'Admin Clínica' },
    medico:        { bg: L.greenBg,  color: L.green,  label: 'Médico' },
    recepcionista: { bg: L.yellowBg, color: L.yellow, label: 'Recepcionista' },
    atendente:     { bg: L.orangeBg, color: L.orange, label: 'Atendente' },
    financeiro:    { bg: L.purpleBg, color: L.purple, label: 'Financeiro' },
  }
  const s = map[cargo] || { bg: L.hover, color: L.t3, label: cargo }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color
    }}>{s.label}</span>
  )
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

const EMPTY_FORM = { nome: '', email: '', cargo: 'medico', clinica_id: '', senha: '', confirmarSenha: '', trocarSenha: false }

export default function PageTodosUsuarios({ user, isMaster, isMobile, isTablet }) {
  const [usuarios, setUsuarios]     = useState([])
  const [clinicas, setClinicas]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterCargo, setFilterCargo]     = useState('todos')
  const [filterClinica, setFilterClinica] = useState('todas')
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: us }, { data: cs }] = await Promise.all([
      supabase.from('usuarios').select('*, clinicas(id, nome, tipo)').order('nome'),
      supabase.from('clinicas').select('id, nome, tipo').order('nome'),
    ])
    setUsuarios(us || [])
    setClinicas(cs || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew()  { setForm(EMPTY_FORM); setError(''); setShowPass(false); setCopiedPass(false); setModal('new') }
  function openEdit(u) {
    setForm({ nome: u.nome, email: u.email || '', cargo: u.cargo, clinica_id: u.clinica_id || '', senha: '', confirmarSenha: '', trocarSenha: u.trocar_senha || false })
    setError(''); setShowPass(false); setCopiedPass(false); setModal(u)
  }
  function closeModal() { setModal(null); setError(''); setCopiedPass(false) }
  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  function toggleTrocarSenhaForm(checked) {
    if (checked && modal === 'new') {
      const tmp = generateTempPassword()
      setForm(f => ({ ...f, trocarSenha: true, senha: tmp, confirmarSenha: tmp }))
      setShowPass(true)
    } else {
      setForm(f => ({ ...f, trocarSenha: checked, ...(checked ? {} : { senha: '', confirmarSenha: '' }) }))
      if (!checked) setShowPass(false)
    }
    setCopiedPass(false)
  }

  async function toggleTrocarSenha(u) {
    const newVal = !u.trocar_senha
    const { error: e } = await supabase.from('usuarios').update({ trocar_senha: newVal }).eq('id', u.id)
    if (!e) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, trocar_senha: newVal } : x))
  }

  async function toggleAtivo(u) {
    if (u.id === user.id) { alert('Não é possível desativar seu próprio usuário.'); return }
    const { error: e } = await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    if (!e) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function save() {
    if (!form.nome.trim())    { setError('Nome é obrigatório.'); return }
    if (!form.clinica_id)     { setError('Selecione uma clínica/empresa.'); return }
    if (modal === 'new') {
      if (!form.email.trim()) { setError('E-mail é obrigatório.'); return }
      if (!form.senha)        { setError('Senha é obrigatória.'); return }
      if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
      if (form.senha !== form.confirmarSenha) { setError('Senhas não conferem.'); return }
    }

    setSaving(true); setError('')
    try {
      if (modal === 'new') {
        const { error: rpcErr } = await supabase.rpc('admin_create_user', {
          p_email:        form.email.trim().toLowerCase(),
          p_password:     form.senha,
          p_nome:         form.nome.trim(),
          p_cargo:        form.cargo,
          p_clinica_id:   form.clinica_id,
          p_trocar_senha: form.trocarSenha,
        })
        if (rpcErr) throw rpcErr
      } else {
        const { error: e } = await supabase.from('usuarios').update({
          nome:        form.nome.trim(),
          cargo:       form.cargo,
          clinica_id:  form.clinica_id,
          trocar_senha: form.trocarSenha,
        }).eq('id', modal.id)
        if (e) throw e
      }
      await load(); closeModal()
    } catch (e) {
      setError(e.message || 'Erro ao salvar usuário.')
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
    const matchQ = !q || u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.clinicas?.nome?.toLowerCase().includes(q)
    const matchC  = filterCargo   === 'todos'  || u.cargo      === filterCargo
    const matchCl = filterClinica === 'todas'  || u.clinica_id === filterClinica
    return matchQ && matchC && matchCl
  })

  const stats = {
    total:  usuarios.length,
    c4hub:  usuarios.filter(u => ['c4hub_admin', 'c4hub'].includes(u.cargo)).length,
    admins: usuarios.filter(u => u.cargo === 'admin_clinica').length,
    medicos: usuarios.filter(u => u.cargo === 'medico').length,
  }

  const pad = isMobile ? 12 : isTablet ? 16 : 24

  return (
    <div style={{ padding: pad }}>
      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20
      }}>
        {[
          { label: 'Total Usuários', value: stats.total,   color: L.teal  },
          { label: 'Equipe C4HUB',   value: stats.c4hub,   color: L.teal  },
          { label: 'Admins Clínica', value: stats.admins,  color: L.blue  },
          { label: 'Médicos',        value: stats.medicos, color: L.green },
        ].map(k => (
          <div key={k.label} style={{
            background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: isMobile ? '12px 14px' : '16px 20px'
          }}>
            <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        padding: isMobile ? 12 : 16, marginBottom: 16,
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', gap: 10, flexWrap: 'wrap'
      }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail, clínica..."
          style={{
            flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1, background: L.surface
          }}
        />
        {!isMobile && <>
          <select value={filterCargo} onChange={e => setFilterCargo(e.target.value)} style={selStyle}>
            <option value="todos">Todos os cargos</option>
            {CARGO_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterClinica} onChange={e => setFilterClinica(e.target.value)} style={selStyle}>
            <option value="todas">Todas as clínicas</option>
            {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </>}
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13,
          width: isMobile ? '100%' : undefined
        }}>+ Novo Usuário</button>
      </div>

      {/* Table/Cards */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Nenhum usuário encontrado.</div>
        ) : isMobile ? (
          /* CARD VIEW - mobile */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((u, i) => (
              <div key={u.id} style={{
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: L.tealBg, border: `1.5px solid ${L.teal}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: L.teal,
                  }}>{u.nome?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: L.t1, fontSize: 14 }}>{u.nome}</div>
                    <div style={{ fontSize: 11, color: L.t4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email || '—'} · {u.clinicas?.nome || '—'}
                    </div>
                  </div>
                  <CargoBadge cargo={u.cargo} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 48 }}>
                  <button onClick={() => toggleAtivo(u)} style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: u.ativo !== false ? L.greenBg : L.redBg,
                    color: u.ativo !== false ? L.green : L.red,
                    border: `1px solid ${u.ativo !== false ? L.greenBd : L.redBd}`, cursor: 'pointer'
                  }}>{u.ativo !== false ? 'Ativo' : 'Inativo'}</button>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: u.trocar_senha ? L.teal : L.t4 }}>
                    <input type="checkbox" checked={u.trocar_senha || false} onChange={() => toggleTrocarSenha(u)}
                      style={{ accentColor: L.teal, width: 14, height: 14, cursor: 'pointer' }} />
                    {u.trocar_senha ? 'Troca pendente' : 'Troca senha'}
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(u)} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12,
                      background: L.hover, color: L.t2, fontWeight: 500, cursor: 'pointer'
                    }}>Editar</button>
                    {u.id !== user.id && (
                      <button onClick={() => del(u)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.redBg, color: L.red, fontWeight: 500, cursor: 'pointer'
                      }}>Excluir</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW - desktop/tablet */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Usuário', 'Cargo', 'Clínica / Empresa', 'Status', 'Troca Senha', 'Ações'].map(h => (
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
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none' }}
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
                      <div>
                        <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{u.nome}</div>
                        <div style={{ fontSize: 11, color: L.t4 }}>{u.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><CargoBadge cargo={u.cargo} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>{u.clinicas?.nome || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleAtivo(u)} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: u.ativo !== false ? L.greenBg : L.redBg,
                      color: u.ativo !== false ? L.green : L.red,
                      border: `1px solid ${u.ativo !== false ? L.greenBd : L.redBd}`, cursor: 'pointer'
                    }}>{u.ativo !== false ? 'Ativo' : 'Inativo'}</button>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <label style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <input type="checkbox" checked={u.trocar_senha || false} onChange={() => toggleTrocarSenha(u)}
                        style={{ accentColor: L.teal, width: 16, height: 16, cursor: 'pointer' }} />
                      {u.trocar_senha && <span style={{ fontSize: 9, color: L.teal, fontWeight: 600, letterSpacing: '0.3px' }}>PENDENTE</span>}
                    </label>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12,
                        background: L.hover, color: L.t2, fontWeight: 500, cursor: 'pointer'
                      }}>Editar</button>
                      {u.id !== user.id && (
                        <button onClick={() => del(u)} style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 12,
                          background: L.redBg, color: L.red, fontWeight: 500, cursor: 'pointer'
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 16,
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="anim-up" style={{
            background: L.bg,
            borderRadius: isMobile ? '16px 16px 0 0' : 16,
            width: '100%', maxWidth: isMobile ? '100%' : 500,
            maxHeight: '90dvh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            ...(isMobile && { position: 'fixed', bottom: 0, left: 0, right: 0 }),
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

              <FRow label="Cargo">
                <select value={form.cargo} onChange={field('cargo')} style={inp}>
                  {CARGO_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FRow>

              <FRow label="Clínica / Empresa *">
                <select value={form.clinica_id} onChange={field('clinica_id')} style={inp}>
                  <option value="">Selecione...</option>
                  {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </FRow>

              {/* Trocar senha toggle */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                background: form.trocarSenha ? L.tealBg : L.surface,
                border: `1.5px solid ${form.trocarSenha ? L.teal + '50' : L.line}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <input type="checkbox" checked={form.trocarSenha}
                  onChange={e => toggleTrocarSenhaForm(e.target.checked)}
                  style={{ marginTop: 2, accentColor: L.teal, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.trocarSenha ? L.teal : L.t2 }}>
                    Solicitar troca de senha no próximo acesso
                  </div>
                  <div style={{ fontSize: 11, color: L.t4, marginTop: 2, lineHeight: 1.4 }}>
                    {modal === 'new'
                      ? 'Uma senha temporária será gerada. O usuário deverá criar uma nova senha ao fazer login.'
                      : 'O usuário será solicitado a criar uma nova senha na próxima vez que fizer login.'}
                  </div>
                </div>
              </label>

              {modal === 'new' && (
                <>
                  <FRow label="E-mail *">
                    <input value={form.email} onChange={field('email')} placeholder="email@exemplo.com"
                      style={inp} type="email" />
                  </FRow>

                  {form.trocarSenha ? (
                    <div style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: L.surface, border: `1px solid ${L.line}`,
                    }}>
                      <div style={{ fontSize: 11, color: L.t4, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Senha temporária gerada
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8,
                          background: L.bg, border: `1px solid ${L.line}`,
                          fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                          color: L.t1, letterSpacing: '0.5px', wordBreak: 'break-all',
                        }}>{form.senha}</code>
                        <button type="button" onClick={() => {
                          navigator.clipboard.writeText(form.senha)
                          setCopiedPass(true)
                          setTimeout(() => setCopiedPass(false), 2000)
                        }} style={{
                          padding: '8px 12px', borderRadius: 8, fontSize: 12,
                          background: copiedPass ? L.greenBg : L.hover,
                          color: copiedPass ? L.green : L.t2,
                          border: `1px solid ${copiedPass ? L.greenBd : L.line}`,
                          cursor: 'pointer', fontWeight: 600, flexShrink: 0,
                        }}>{copiedPass ? '✓' : 'Copiar'}</button>
                        <button type="button" onClick={() => {
                          const tmp = generateTempPassword()
                          setForm(f => ({ ...f, senha: tmp, confirmarSenha: tmp }))
                          setCopiedPass(false)
                        }} title="Gerar nova" style={{
                          padding: '8px 10px', borderRadius: 8, fontSize: 14,
                          background: L.hover, color: L.t3,
                          border: `1px solid ${L.line}`, cursor: 'pointer', flexShrink: 0,
                        }}>↻</button>
                      </div>
                      <div style={{ fontSize: 11, color: L.t4, marginTop: 6 }}>
                        Compartilhe esta senha com o usuário. Ele precisará trocá-la no primeiro login.
                      </div>
                    </div>
                  ) : (
                    <>
                      <FRow label="Senha *">
                        <div style={{ position: 'relative' }}>
                          <input value={form.senha} onChange={field('senha')} placeholder="Mínimo 6 caracteres"
                            style={{ ...inp, paddingRight: 40 }} type={showPass ? 'text' : 'password'} />
                          <button type="button" onClick={() => setShowPass(v => !v)} style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: L.t3, fontSize: 14
                          }}>{showPass ? '🙈' : '👁'}</button>
                        </div>
                      </FRow>
                      <FRow label="Confirmar senha *">
                        <input value={form.confirmarSenha} onChange={field('confirmarSenha')} placeholder="Repita a senha"
                          style={inp} type={showPass ? 'text' : 'password'} />
                      </FRow>
                    </>
                  )}
                </>
              )}

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: L.redBg, color: L.red, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={closeModal} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: L.hover, color: L.t2, fontWeight: 500, fontSize: 13
                }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
                  opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer'
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
  background: L.surface, outline: 'none', boxSizing: 'border-box',
}

const selStyle = {
  padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
  fontSize: 13, color: L.t2, background: L.surface
}
