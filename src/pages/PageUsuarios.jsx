import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { ROLE_LABELS } from '../constants/nav.js'

const C4HUB_CLINICA_ID = 'c4000000-0000-0000-0000-000000000000'

const CLINICA_ROLES = [
  ['admin_clinica',      'Admin Clínica'],
  ['medico',             'Médico'],
  ['enfermeiro',         'Enfermeiro(a)'],
  ['tecnico_enfermagem', 'Técnico de Enfermagem'],
  ['recepcionista',      'Recepcionista'],
  ['atendente',          'Atendente'],
  ['financeiro',         'Financeiro'],
  ['faturamento',        'Faturamento'],
  ['farmaceutico',       'Farmacêutico(a)'],
  ['fisioterapeuta',     'Fisioterapeuta'],
  ['nutricionista',      'Nutricionista'],
  ['psicologo',          'Psicólogo(a)'],
  ['estoque',            'Estoque'],
  ['ti',                 'TI / Tecnologia'],
  ['pdv_tv',             'Painel TV (Quiosque)'],
]

const C4HUB_ROLES = [
  ['c4hub_admin', 'Admin C4HUB'],
  ['c4hub',       'C4HUB'],
  ...CLINICA_ROLES,
]

function CargoBadge({ cargo }) {
  const map = {
    c4hub_admin:        { bg: L.tealBg,    color: L.teal,   label: 'Admin C4HUB' },
    c4hub:              { bg: L.tealBg,    color: L.teal,   label: 'C4HUB' },
    admin_clinica:      { bg: L.blueBg,    color: L.blue,   label: 'Admin Clínica' },
    medico:             { bg: L.greenBg,   color: L.green,  label: 'Médico' },
    enfermeiro:         { bg: L.greenBg,   color: L.green,  label: 'Enfermeiro(a)' },
    tecnico_enfermagem: { bg: L.greenBg,   color: L.green,  label: 'Téc. Enfermagem' },
    recepcionista:      { bg: L.yellowBg,  color: L.yellow, label: 'Recepcionista' },
    atendente:          { bg: L.orangeBg,  color: L.orange, label: 'Atendente' },
    financeiro:         { bg: L.purpleBg,  color: L.purple, label: 'Financeiro' },
    faturamento:        { bg: L.purpleBg,  color: L.purple, label: 'Faturamento' },
    farmaceutico:       { bg: L.blueBg,    color: L.blue,   label: 'Farmacêutico(a)' },
    fisioterapeuta:     { bg: L.orangeBg,  color: L.orange, label: 'Fisioterapeuta' },
    nutricionista:      { bg: L.greenBg,   color: L.green,  label: 'Nutricionista' },
    psicologo:          { bg: L.tealBg,    color: L.teal,   label: 'Psicólogo(a)' },
    estoque:            { bg: L.yellowBg,  color: L.yellow, label: 'Estoque' },
    ti:                 { bg: L.blueBg,    color: L.blue,   label: 'TI / Tecnologia' },
    pdv_tv:             { bg: L.hover,     color: L.t3,     label: 'Painel TV' },
  }
  const s = map[cargo] || { bg: L.hover, color: L.t3, label: ROLE_LABELS[cargo] || cargo }
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

const EMPTY_FORM = { nome: '', email: '', cargo: 'recepcionista', senha: '', confirmarSenha: '', trocarSenha: false, selectedClinicaId: '' }

export default function PageUsuarios({ user, profile, cargo, isAdmin, isMaster }) {
  const [usuarios, setUsuarios]   = useState([])
  const [clinicas, setClinicas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCargo, setFilterCargo] = useState('todos')
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const clinicaId = profile?.clinica_id
  const roles = isMaster ? C4HUB_ROLES : CLINICA_ROLES

  useEffect(() => {
    if (!isMaster) return
    supabase.from('clinicas').select('id, nome').order('nome').then(({ data }) => setClinicas(data || []))
  }, [isMaster])

  const load = useCallback(async () => {
    if (!clinicaId && !isMaster) { setLoading(false); return }
    setLoading(true)
    let q = supabase
      .from('usuarios')
      .select('id, nome, email, cargo, clinica_id, criado_em, ativo, trocar_senha')
      .order('nome')

    if (!isMaster) q = q.eq('clinica_id', clinicaId)

    const { data, error: qErr } = await q
    if (qErr) setError(qErr.message)
    setUsuarios(data || [])
    setLoading(false)
  }, [clinicaId, isMaster])

  useEffect(() => { load() }, [load])

  function openNew() {
    setForm({ ...EMPTY_FORM, cargo: isMaster ? 'admin_clinica' : 'recepcionista' })
    setError(''); setShowPass(false); setCopiedPass(false); setModal('new')
  }
  function openEdit(u) {
    setForm({ nome: u.nome, email: u.email || '', cargo: u.cargo, senha: '', confirmarSenha: '', trocarSenha: u.trocar_senha || false, selectedClinicaId: u.clinica_id || '' })
    setError(''); setShowPass(false); setCopiedPass(false); setModal(u)
  }
  function closeModal() { setModal(null); setError(''); setCopiedPass(false) }
  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  function toggleTrocarSenha(checked) {
    if (checked) {
      if (modal === 'new') {
        const tmp = generateTempPassword()
        setForm(f => ({ ...f, trocarSenha: true, senha: tmp, confirmarSenha: tmp }))
        setShowPass(true)
      } else {
        setForm(f => ({ ...f, trocarSenha: true }))
      }
    } else {
      setForm(f => ({ ...f, trocarSenha: false, senha: '', confirmarSenha: '' }))
      setShowPass(false)
    }
    setCopiedPass(false)
  }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    if (modal === 'new') {
      if (!form.email.trim())  { setError('E-mail é obrigatório.'); return }
      const needsClinica = isMaster && !['c4hub_admin','c4hub'].includes(form.cargo)
      if (needsClinica && !form.selectedClinicaId) { setError('Selecione a clínica do usuário.'); return }
      if (!form.senha)         { setError('Senha é obrigatória.'); return }
      if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
      if (form.senha !== form.confirmarSenha) { setError('Senhas não conferem.'); return }
    }

    setSaving(true); setError('')
    try {
      if (modal === 'new') {
        const targetClinicaId = ['c4hub_admin','c4hub'].includes(form.cargo)
          ? C4HUB_CLINICA_ID
          : isMaster ? form.selectedClinicaId : clinicaId

        const { error: rpcErr } = await supabase.rpc('admin_create_user', {
          p_email:        form.email.trim().toLowerCase(),
          p_password:     form.senha,
          p_nome:         form.nome.trim(),
          p_cargo:        form.cargo,
          p_clinica_id:   targetClinicaId,
          p_trocar_senha: form.trocarSenha,
        })
        if (rpcErr) throw rpcErr
      } else {
        const updates = { nome: form.nome.trim(), cargo: form.cargo, trocar_senha: form.trocarSenha }
        const { error: e } = await supabase.from('usuarios').update(updates).eq('id', modal.id)
        if (e) throw e
      }
      await load(); closeModal()
    } catch (e) {
      setError(e.message || 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  async function toggleAtivo(u) {
    if (u.id === user.id) { alert('Não é possível desativar seu próprio usuário.'); return }
    const { error: e } = await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    if (!e) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function del(u) {
    if (u.id === user.id) { alert('Você não pode excluir seu próprio usuário.'); return }
    if (!window.confirm(`Excluir "${u.nome}"? Esta ação não pode ser desfeita.`)) return
    await supabase.from('usuarios').delete().eq('id', u.id)
    setUsuarios(prev => prev.filter(x => x.id !== u.id))
  }

  const filterRoles = isMaster ? C4HUB_ROLES : CLINICA_ROLES

  const filtered = usuarios.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchC = filterCargo === 'todos' || u.cargo === filterCargo
    return matchQ && matchC
  })

  const stats = {
    total:    usuarios.length,
    admins:   usuarios.filter(u => ['c4hub_admin','c4hub','admin_clinica'].includes(u.cargo)).length,
    medicos:  usuarios.filter(u => u.cargo === 'medico').length,
    ativos:   usuarios.filter(u => u.ativo !== false).length,
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
        Acesso restrito a administradores.
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Usuários', value: stats.total,   color: L.teal },
          { label: 'Admins',         value: stats.admins,  color: L.blue },
          { label: 'Médicos',        value: stats.medicos, color: L.green },
          { label: 'Ativos',         value: stats.ativos,  color: L.t2 },
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
          placeholder="Buscar por nome ou e-mail..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1, background: L.surface
          }}
        />
        <select value={filterCargo} onChange={e => setFilterCargo(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
          fontSize: 13, color: L.t2, background: L.surface
        }}>
          <option value="todos">Todos os perfis</option>
          {filterRoles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>+ Novo Usuário</button>
      </div>

      {/* Table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: L.t4 }}>
            {usuarios.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Usuário', 'Perfil', 'E-mail', 'Status', 'Membro desde', 'Ações'].map(h => (
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
                        width: 34, height: 34, borderRadius: '50%',
                        background: ['c4hub_admin','c4hub'].includes(u.cargo) ? L.tealBg : L.hover,
                        border: `1.5px solid ${['c4hub_admin','c4hub'].includes(u.cargo) ? L.teal + '40' : L.line}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: ['c4hub_admin','c4hub'].includes(u.cargo) ? L.teal : L.t3,
                        flexShrink: 0
                      }}>{u.nome?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{u.nome}</div>
                        {u.id === user.id && (
                          <div style={{ fontSize: 10, color: L.teal, fontWeight: 600 }}>Você</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><CargoBadge cargo={u.cargo} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: L.t3 }}>{u.email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleAtivo(u)} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: u.ativo !== false ? L.greenBg : L.redBg,
                      color: u.ativo !== false ? L.green : L.red,
                      border: `1px solid ${u.ativo !== false ? L.greenBd : L.redBd}`,
                      cursor: 'pointer'
                    }}>{u.ativo !== false ? 'Ativo' : 'Inativo'}</button>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: L.t3 }}>
                    {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—'}
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: L.bg, borderRadius: 16, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>
                {modal === 'new' ? '+ Novo Usuário' : 'Editar Usuário'}
              </div>
              <button onClick={closeModal} style={{
                fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer'
              }}>×</button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FRow label="Nome completo *">
                <input value={form.nome} onChange={field('nome')} placeholder="Nome do usuário" style={inp} />
              </FRow>

              {/* Perfil selector */}
              <FRow label="Perfil de acesso">
                <select value={form.cargo} onChange={field('cargo')} style={inp}>
                  {roles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FRow>

              {/* Alert for c4hub_admin */}
              {['c4hub_admin','c4hub'].includes(form.cargo) && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 12,
                  background: L.tealBg, color: L.tealDark, border: `1px solid ${L.teal}30`
                }}>
                  <strong>Atenção:</strong> Este perfil terá acesso total a todas as clínicas e hospitais do sistema.
                </div>
              )}

              {/* trocar_senha toggle — shown for both new and edit */}
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                background: form.trocarSenha ? L.tealBg : L.surface,
                border: `1.5px solid ${form.trocarSenha ? L.teal + '50' : L.line}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={form.trocarSenha}
                  onChange={e => toggleTrocarSenha(e.target.checked)}
                  style={{ marginTop: 2, accentColor: L.teal, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                />
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
                    <input value={form.email} onChange={field('email')}
                      placeholder="usuario@exemplo.com" style={inp} type="email" />
                  </FRow>

                  {/* Clinic selector — only for isMaster creating non-C4HUB users */}
                  {isMaster && !['c4hub_admin','c4hub'].includes(form.cargo) && (
                    <FRow label="Clínica / Empresa *">
                      <select value={form.selectedClinicaId} onChange={field('selectedClinicaId')} style={inp}>
                        <option value="">Selecione uma clínica...</option>
                        {clinicas.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </FRow>
                  )}

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
                          fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                          color: L.t1, letterSpacing: '0.5px',
                        }}>{form.senha}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(form.senha)
                            setCopiedPass(true)
                            setTimeout(() => setCopiedPass(false), 2000)
                          }}
                          style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12,
                            background: copiedPass ? L.greenBg : L.hover,
                            color: copiedPass ? L.green : L.t2,
                            border: `1px solid ${copiedPass ? L.greenBd : L.line}`,
                            cursor: 'pointer', fontWeight: 600, flexShrink: 0,
                            transition: 'all 0.15s',
                          }}
                        >{copiedPass ? '✓ Copiado' : 'Copiar'}</button>
                        <button
                          type="button"
                          onClick={() => {
                            const tmp = generateTempPassword()
                            setForm(f => ({ ...f, senha: tmp, confirmarSenha: tmp }))
                            setCopiedPass(false)
                          }}
                          title="Gerar nova senha"
                          style={{
                            padding: '8px 10px', borderRadius: 8, fontSize: 14,
                            background: L.hover, color: L.t3,
                            border: `1px solid ${L.line}`, cursor: 'pointer',
                          }}
                        >↻</button>
                      </div>
                      <div style={{ fontSize: 11, color: L.t4, marginTop: 6 }}>
                        Compartilhe esta senha com o usuário. Ele precisará trocá-la no primeiro login.
                      </div>
                    </div>
                  ) : (
                    <>
                      <FRow label="Senha inicial *">
                        <div style={{ position: 'relative' }}>
                          <input value={form.senha} onChange={field('senha')}
                            placeholder="Mínimo 6 caracteres" style={{ ...inp, paddingRight: 40 }}
                            type={showPass ? 'text' : 'password'} />
                          <button
                            type="button"
                            onClick={() => setShowPass(v => !v)}
                            style={{
                              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', color: L.t3, fontSize: 14
                            }}
                          >{showPass ? '🙈' : '👁'}</button>
                        </div>
                      </FRow>
                      <FRow label="Confirmar senha *">
                        <input value={form.confirmarSenha} onChange={field('confirmarSenha')}
                          placeholder="Repita a senha" style={inp}
                          type={showPass ? 'text' : 'password'} />
                      </FRow>
                    </>
                  )}
                </>
              )}

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
  background: L.surface, outline: 'none', boxSizing: 'border-box'
}
