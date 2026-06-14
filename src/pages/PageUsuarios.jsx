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

const EMPTY_FORM = { nome: '', email: '', cargo: 'recepcionista', senha: '', confirmarSenha: '', selectedClinicaId: '' }

export default function PageUsuarios({ user, profile, cargo, isAdmin, isMaster, isMobile, isTablet }) {
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
    setError(''); setShowPass(false); setModal('new')
  }
  function openEdit(u) {
    setForm({ nome: u.nome, email: u.email || '', cargo: u.cargo, senha: '', confirmarSenha: '', selectedClinicaId: u.clinica_id || '' })
    setError(''); setShowPass(false); setModal(u)
  }
  function closeModal() { setModal(null); setError('') }
  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function toggleTrocarSenha(u) {
    const newVal = !u.trocar_senha
    const { error } = await supabase.from('usuarios').update({ trocar_senha: newVal }).eq('id', u.id)
    if (!error) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, trocar_senha: newVal } : x))
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
        })
        if (rpcErr) throw rpcErr
      } else {
        const updates = { nome: form.nome.trim(), cargo: form.cargo }
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
    <div style={{ padding: isMobile ? 12 : isTablet ? 16 : 24 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 20 }}>
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
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${L.line}`, fontSize: 13, color: L.t1, background: L.surface,
            width: isMobile ? '100%' : undefined
          }}
        />
        <select value={filterCargo} onChange={e => setFilterCargo(e.target.value)} style={{
          padding: '8px 12px', borderRadius: 8, border: `1px solid ${L.line}`,
          fontSize: 13, color: L.t2, background: L.surface,
          width: isMobile ? '100%' : undefined
        }}>
          <option value="todos">Todos os perfis</option>
          {filterRoles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={openNew} style={{
          padding: '8px 18px', borderRadius: 8, background: L.teal,
          color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer',
          width: isMobile ? '100%' : undefined
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
        ) : isMobile ? (
          /* CARD VIEW para mobile */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((u, i) => (
              <div key={u.id} style={{
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Row 1: avatar + nome + cargo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: ['c4hub_admin','c4hub'].includes(u.cargo) ? L.tealBg : L.hover,
                    border: `1.5px solid ${['c4hub_admin','c4hub'].includes(u.cargo) ? L.teal + '40' : L.line}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    color: ['c4hub_admin','c4hub'].includes(u.cargo) ? L.teal : L.t3,
                  }}>{u.nome?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: L.t1, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.nome}
                      {u.id === user.id && <span style={{ fontSize: 10, color: L.teal, fontWeight: 600 }}>Você</span>}
                    </div>
                    <div style={{ fontSize: 12, color: L.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '—'}</div>
                  </div>
                  <CargoBadge cargo={u.cargo} />
                </div>
                {/* Row 2: ações + trocar senha + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 48 }}>
                  <button onClick={() => toggleAtivo(u)} style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: u.ativo !== false ? L.greenBg : L.redBg,
                    color: u.ativo !== false ? L.green : L.red,
                    border: `1px solid ${u.ativo !== false ? L.greenBd : L.redBd}`,
                    cursor: 'pointer'
                  }}>{u.ativo !== false ? 'Ativo' : 'Inativo'}</button>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: u.trocar_senha ? L.teal : L.t4 }}>
                    <input
                      type="checkbox"
                      checked={u.trocar_senha || false}
                      onChange={() => toggleTrocarSenha(u)}
                      style={{ accentColor: L.teal, width: 14, height: 14, cursor: 'pointer' }}
                    />
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
          /* TABLE VIEW para desktop/tablet */
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}`, background: L.surface }}>
                {['Usuário', 'Perfil', 'E-mail', 'Status', 'Troca Senha', 'Membro desde', 'Ações'].map(h => (
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
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <label style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={u.trocar_senha || false}
                        onChange={() => toggleTrocarSenha(u)}
                        style={{ accentColor: L.teal, width: 16, height: 16, cursor: 'pointer' }}
                      />
                      {u.trocar_senha && (
                        <span style={{ fontSize: 9, color: L.teal, fontWeight: 600, letterSpacing: '0.3px' }}>PENDENTE</span>
                      )}
                    </label>
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
          zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: L.bg, borderRadius: isMobile ? '16px 16px 0 0' : 16,
            width: '100%', maxWidth: isMobile ? '100%' : 480,
            maxHeight: '90dvh', overflowY: 'auto',
            border: `1px solid ${L.line}`, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            ...(isMobile && { position: 'fixed', bottom: 0, left: 0, right: 0, margin: 0 }),
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
