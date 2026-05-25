import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

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

function Section({ title, children }) {
  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${L.line}`,
        fontWeight: 700, fontSize: 14, color: L.t1, background: L.surface
      }}>{title}</div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CATEGORIAS = ['consulta', 'retorno', 'procedimento', 'cirurgia', 'exame', 'outros']

const HORARIO_DEFAULT = [
  { dia_semana: 0, hora_inicio: '08:00', hora_fim: '18:00', ativo: false },
  { dia_semana: 1, hora_inicio: '08:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 2, hora_inicio: '08:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 3, hora_inicio: '08:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 4, hora_inicio: '08:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 5, hora_inicio: '08:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 6, hora_inicio: '08:00', hora_fim: '12:00', ativo: true },
]

export default function PageConfiguracoes({ profile, user, onProfileUpdate }) {
  const [clinica, setClinica] = useState(null)
  const [formClinica, setFormClinica] = useState({})
  const [formPerfil, setFormPerfil] = useState({})
  const [formSenha, setFormSenha] = useState({ nova: '', confirma: '' })
  const [saving, setSaving] = useState({})
  const [msg, setMsg] = useState({})

  // Procedimentos
  const [procedimentos, setProcedimentos] = useState([])
  const [loadingProc, setLoadingProc] = useState(false)
  const [modalProc, setModalProc] = useState(null) // null | 'new' | { ...proc }
  const [formProc, setFormProc] = useState({
    nome: '', categoria: 'consulta', descricao: '', valor: '', duracao_minutos: 30, ativo: true
  })
  const [savingProc, setSavingProc] = useState(false)

  // Horários
  const [horarios, setHorarios] = useState(HORARIO_DEFAULT.map(h => ({ ...h })))
  const [loadingHor, setLoadingHor] = useState(false)
  const [savingHor, setSavingHor] = useState(false)

  const clinicaId = clinica?.id || null

  useEffect(() => {
    if (profile) {
      setFormPerfil({ nome: profile.nome || '', cargo: profile.cargo || '', telefone: profile.telefone || '' })
      if (profile.clinicas) {
        setClinica(profile.clinicas)
        setFormClinica({ ...profile.clinicas })
      }
    }
  }, [profile])

  useEffect(() => {
    if (!clinicaId) return
    loadProcedimentos()
    loadHorarios()
  }, [clinicaId])

  async function loadProcedimentos() {
    setLoadingProc(true)
    const { data } = await supabase
      .from('procedimentos')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setProcedimentos(data || [])
    setLoadingProc(false)
  }

  async function loadHorarios() {
    setLoadingHor(true)
    const { data } = await supabase
      .from('horarios_funcionamento')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('dia_semana')
    if (data && data.length === 7) {
      const sorted = [...data].sort((a, b) => a.dia_semana - b.dia_semana)
      setHorarios(sorted.map(h => ({
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio || '08:00',
        hora_fim: h.hora_fim || '18:00',
        ativo: h.ativo ?? true,
        id: h.id
      })))
    } else if (!data || data.length === 0) {
      // Create defaults
      const defaults = HORARIO_DEFAULT.map(h => ({ ...h, clinica_id: clinicaId }))
      const { data: inserted } = await supabase
        .from('horarios_funcionamento')
        .insert(defaults)
        .select()
      if (inserted) {
        const sorted = [...inserted].sort((a, b) => a.dia_semana - b.dia_semana)
        setHorarios(sorted.map(h => ({
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio || '08:00',
          hora_fim: h.hora_fim || '18:00',
          ativo: h.ativo ?? true,
          id: h.id
        })))
      }
    } else {
      // Partial data — merge with defaults
      const merged = HORARIO_DEFAULT.map(def => {
        const found = data.find(d => d.dia_semana === def.dia_semana)
        return found
          ? { dia_semana: found.dia_semana, hora_inicio: found.hora_inicio || def.hora_inicio, hora_fim: found.hora_fim || def.hora_fim, ativo: found.ativo ?? def.ativo, id: found.id }
          : { ...def }
      })
      setHorarios(merged)
    }
    setLoadingHor(false)
  }

  function showMsg(key, text, ok = true) {
    setMsg(m => ({ ...m, [key]: { text, ok } }))
    setTimeout(() => setMsg(m => { const n = { ...m }; delete n[key]; return n }), 3000)
  }

  async function salvarPerfil() {
    setSaving(s => ({ ...s, perfil: true }))
    await supabase.from('usuarios').update(formPerfil).eq('id', user.id)
    onProfileUpdate({ ...profile, ...formPerfil })
    setSaving(s => ({ ...s, perfil: false }))
    showMsg('perfil', 'Perfil atualizado com sucesso!')
  }

  async function salvarSenha() {
    if (formSenha.nova !== formSenha.confirma) {
      showMsg('senha', 'As senhas não coincidem.', false)
      return
    }
    if (formSenha.nova.length < 6) {
      showMsg('senha', 'A senha deve ter ao menos 6 caracteres.', false)
      return
    }
    setSaving(s => ({ ...s, senha: true }))
    const { error } = await supabase.auth.updateUser({ password: formSenha.nova })
    setSaving(s => ({ ...s, senha: false }))
    if (error) showMsg('senha', 'Erro ao alterar senha.', false)
    else {
      setFormSenha({ nova: '', confirma: '' })
      showMsg('senha', 'Senha alterada com sucesso!')
    }
  }

  async function salvarClinica() {
    if (!formClinica.id) return
    setSaving(s => ({ ...s, clinica: true }))
    const { id, ...rest } = formClinica
    await supabase.from('clinicas').update(rest).eq('id', id)
    setSaving(s => ({ ...s, clinica: false }))
    showMsg('clinica', 'Dados da clínica atualizados!')
  }

  function openModalProc(proc) {
    if (proc) {
      setFormProc({
        nome: proc.nome || '',
        categoria: proc.categoria || 'consulta',
        descricao: proc.descricao || '',
        valor: proc.valor ?? '',
        duracao_minutos: proc.duracao_minutos ?? 30,
        ativo: proc.ativo ?? true,
        _id: proc.id
      })
    } else {
      setFormProc({ nome: '', categoria: 'consulta', descricao: '', valor: '', duracao_minutos: 30, ativo: true })
    }
    setModalProc(proc || 'new')
  }

  function closeModalProc() {
    setModalProc(null)
  }

  async function salvarProcedimento() {
    if (!formProc.nome.trim()) return
    setSavingProc(true)
    const payload = {
      clinica_id: clinicaId,
      nome: formProc.nome.trim(),
      categoria: formProc.categoria,
      descricao: formProc.descricao || null,
      valor: formProc.valor !== '' ? parseFloat(formProc.valor) : null,
      duracao_minutos: parseInt(formProc.duracao_minutos) || 30,
      ativo: formProc.ativo
    }
    if (formProc._id) {
      await supabase.from('procedimentos').update(payload).eq('id', formProc._id)
    } else {
      await supabase.from('procedimentos').insert(payload)
    }
    await loadProcedimentos()
    setSavingProc(false)
    closeModalProc()
    showMsg('proc', formProc._id ? 'Procedimento atualizado!' : 'Procedimento criado!')
  }

  async function deletarProcedimento(id) {
    if (!window.confirm('Excluir este procedimento?')) return
    await supabase.from('procedimentos').delete().eq('id', id)
    await loadProcedimentos()
    showMsg('proc', 'Procedimento excluído.')
  }

  async function toggleProcAtivo(proc) {
    await supabase.from('procedimentos').update({ ativo: !proc.ativo }).eq('id', proc.id)
    await loadProcedimentos()
  }

  async function salvarHorarios() {
    if (!clinicaId) return
    setSavingHor(true)
    const rows = horarios.map(h => ({
      clinica_id: clinicaId,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim,
      ativo: h.ativo
    }))
    const { error } = await supabase
      .from('horarios_funcionamento')
      .upsert(rows, { onConflict: 'clinica_id,dia_semana' })
    setSavingHor(false)
    if (error) showMsg('horarios', 'Erro ao salvar horários.', false)
    else showMsg('horarios', 'Horários salvos com sucesso!')
  }

  function setHorario(dia, field, value) {
    setHorarios(prev => prev.map(h => h.dia_semana === dia ? { ...h, [field]: value } : h))
  }

  const MsgBox = ({ k }) => msg[k] ? (
    <div style={{
      padding: '8px 12px', borderRadius: 8, fontSize: 13,
      background: msg[k].ok ? L.greenBg : L.redBg,
      color: msg[k].ok ? L.green : L.red,
      border: `1px solid ${msg[k].ok ? L.greenBd : L.redBd}`,
      marginTop: 8
    }}>{msg[k].text}</div>
  ) : null

  return (
    <div style={{ padding: '24px 28px', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Perfil */}
      <Section title="Meu Perfil">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: L.teal,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: L.white, fontSize: 22, fontWeight: 700
            }}>
              {formPerfil.nome?.[0]?.toUpperCase() || '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: L.t1 }}>{formPerfil.nome || user.email}</div>
              <div style={{ fontSize: 12, color: L.t4 }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="NOME COMPLETO">
              <input style={inp} value={formPerfil.nome || ''}
                onChange={e => setFormPerfil({ ...formPerfil, nome: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="CARGO">
              <select style={{ ...inp, appearance: 'none' }} value={formPerfil.cargo || ''}
                onChange={e => setFormPerfil({ ...formPerfil, cargo: e.target.value })}
              >
                {['admin', 'medico', 'recepcionista', 'enfermeiro', 'auxiliar'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="TELEFONE">
            <input style={inp} value={formPerfil.telefone || ''} placeholder="(00) 00000-0000"
              onChange={e => setFormPerfil({ ...formPerfil, telefone: e.target.value })}
              onFocus={e => e.target.style.borderColor = L.teal}
              onBlur={e => e.target.style.borderColor = L.line}
            />
          </Field>
          <button onClick={salvarPerfil} disabled={saving.perfil} style={{
            alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8,
            background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
            opacity: saving.perfil ? 0.7 : 1, border: 'none', cursor: 'pointer'
          }}>{saving.perfil ? 'Salvando...' : 'Salvar Perfil'}</button>
          <MsgBox k="perfil" />
        </div>
      </Section>

      {/* Senha */}
      <Section title="Alterar Senha">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="NOVA SENHA">
              <input type="password" style={inp} value={formSenha.nova} placeholder="Mínimo 6 caracteres"
                onChange={e => setFormSenha({ ...formSenha, nova: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="CONFIRMAR SENHA">
              <input type="password" style={inp} value={formSenha.confirma} placeholder="Repita a senha"
                onChange={e => setFormSenha({ ...formSenha, confirma: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
          </div>
          <button onClick={salvarSenha} disabled={saving.senha || !formSenha.nova} style={{
            alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8,
            background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
            opacity: (saving.senha || !formSenha.nova) ? 0.7 : 1, border: 'none', cursor: 'pointer'
          }}>{saving.senha ? 'Alterando...' : 'Alterar Senha'}</button>
          <MsgBox k="senha" />
        </div>
      </Section>

      {/* Clínica */}
      {clinica && (
        <Section title="Dados da Clínica">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="NOME DA CLÍNICA *">
                <input style={inp} value={formClinica.nome || ''}
                  onChange={e => setFormClinica({ ...formClinica, nome: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="CNPJ">
                <input style={inp} value={formClinica.cnpj || ''} placeholder="00.000.000/0001-00"
                  onChange={e => setFormClinica({ ...formClinica, cnpj: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TELEFONE">
                <input style={inp} value={formClinica.telefone || ''} placeholder="(00) 0000-0000"
                  onChange={e => setFormClinica({ ...formClinica, telefone: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="E-MAIL">
                <input style={inp} type="email" value={formClinica.email || ''} placeholder="clinica@email.com"
                  onChange={e => setFormClinica({ ...formClinica, email: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <Field label="ENDEREÇO">
              <input style={inp} value={formClinica.endereco || ''} placeholder="Rua, número, bairro"
                onChange={e => setFormClinica({ ...formClinica, endereco: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 12 }}>
              <Field label="CIDADE">
                <input style={inp} value={formClinica.cidade || ''}
                  onChange={e => setFormClinica({ ...formClinica, cidade: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="UF">
                <input style={inp} value={formClinica.estado || ''} maxLength={2}
                  onChange={e => setFormClinica({ ...formClinica, estado: e.target.value.toUpperCase() })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="CEP">
                <input style={inp} value={formClinica.cep || ''} placeholder="00000-000"
                  onChange={e => setFormClinica({ ...formClinica, cep: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <button onClick={salvarClinica} disabled={saving.clinica} style={{
              alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8,
              background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
              opacity: saving.clinica ? 0.7 : 1, border: 'none', cursor: 'pointer'
            }}>{saving.clinica ? 'Salvando...' : 'Salvar Clínica'}</button>
            <MsgBox k="clinica" />
          </div>
        </Section>
      )}

      {/* Tabela de Procedimentos */}
      {clinica && (
        <Section title="Tabela de Procedimentos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: L.t3 }}>
                {loadingProc ? 'Carregando...' : `${procedimentos.length} procedimento(s) cadastrado(s)`}
              </span>
              <button
                onClick={() => openModalProc(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, background: L.teal,
                  color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
                }}
              >+ Novo Procedimento</button>
            </div>

            {!loadingProc && procedimentos.length === 0 && (
              <div style={{
                padding: '32px', textAlign: 'center', color: L.t4, fontSize: 13,
                border: `1px dashed ${L.line}`, borderRadius: 10
              }}>
                Nenhum procedimento cadastrado ainda.
              </div>
            )}

            {procedimentos.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                      {['Nome', 'Categoria', 'Duração', 'Valor', 'Status', 'Ações'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', fontSize: 11,
                          color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.3px', fontWeight: 600
                        }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {procedimentos.map((p, i) => (
                      <tr key={p.id} style={{
                        borderBottom: `1px solid ${L.lineSoft || L.line}`,
                        background: i % 2 === 0 ? 'transparent' : L.surface
                      }}>
                        <td style={{ padding: '10px 12px', color: L.t1, fontWeight: 500 }}>{p.nome}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11,
                            background: L.tealBg, color: L.teal, fontWeight: 600
                          }}>{p.categoria}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{p.duracao_minutos} min</td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>
                          {p.valor != null
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => toggleProcAtivo(p)}
                            style={{
                              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                              border: 'none', cursor: 'pointer',
                              background: p.ativo ? L.greenBg : L.redBg,
                              color: p.ativo ? L.green : L.red
                            }}
                          >{p.ativo ? 'Ativo' : 'Inativo'}</button>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => openModalProc(p)}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                                background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
                                cursor: 'pointer', fontWeight: 500
                              }}
                            >Editar</button>
                            <button
                              onClick={() => deletarProcedimento(p.id)}
                              style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                                background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
                                cursor: 'pointer', fontWeight: 500
                              }}
                            >Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <MsgBox k="proc" />
          </div>
        </Section>
      )}

      {/* Horários de Funcionamento */}
      {clinica && (
        <Section title="Horários de Funcionamento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loadingHor ? (
              <div style={{ color: L.t4, fontSize: 13 }}>Carregando horários...</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                        {['Dia', 'Aberto', 'Abertura', 'Fechamento'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left', fontSize: 11,
                            color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.3px', fontWeight: 600
                          }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {horarios.map((h, i) => (
                        <tr key={h.dia_semana} style={{
                          borderBottom: `1px solid ${L.lineSoft || L.line}`,
                          background: i % 2 === 0 ? 'transparent' : L.surface
                        }}>
                          <td style={{ padding: '10px 12px', color: L.t1, fontWeight: 600, minWidth: 48 }}>
                            {DIAS[h.dia_semana]}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {/* Toggle switch */}
                            <button
                              onClick={() => setHorario(h.dia_semana, 'ativo', !h.ativo)}
                              style={{
                                position: 'relative', width: 40, height: 22, borderRadius: 11,
                                background: h.ativo ? L.teal : L.line,
                                border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                                padding: 0, flexShrink: 0
                              }}
                              title={h.ativo ? 'Clique para fechar' : 'Clique para abrir'}
                            >
                              <span style={{
                                position: 'absolute', top: 3, left: h.ativo ? 20 : 3,
                                width: 16, height: 16, borderRadius: '50%', background: L.white,
                                transition: 'left 0.2s', display: 'block'
                              }} />
                            </button>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {h.ativo ? (
                              <input
                                type="time"
                                value={h.hora_inicio}
                                onChange={e => setHorario(h.dia_semana, 'hora_inicio', e.target.value)}
                                style={{ ...inp, width: 110 }}
                                onFocus={e => e.target.style.borderColor = L.teal}
                                onBlur={e => e.target.style.borderColor = L.line}
                              />
                            ) : (
                              <span style={{ color: L.t4, fontSize: 12 }}>Fechado</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {h.ativo ? (
                              <input
                                type="time"
                                value={h.hora_fim}
                                onChange={e => setHorario(h.dia_semana, 'hora_fim', e.target.value)}
                                style={{ ...inp, width: 110 }}
                                onFocus={e => e.target.style.borderColor = L.teal}
                                onBlur={e => e.target.style.borderColor = L.line}
                              />
                            ) : (
                              <span style={{ color: L.t4, fontSize: 12 }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={salvarHorarios}
                    disabled={savingHor}
                    style={{
                      alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8,
                      background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
                      opacity: savingHor ? 0.7 : 1, border: 'none', cursor: 'pointer'
                    }}
                  >{savingHor ? 'Salvando...' : 'Salvar Horários'}</button>
                </div>
                <MsgBox k="horarios" />
              </>
            )}
          </div>
        </Section>
      )}

      {/* Info sistema */}
      <div style={{
        padding: '14px 18px', background: L.tealBg, borderRadius: 12,
        border: `1px solid ${L.teal}20`, fontSize: 12, color: L.teal
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>C4CLINIC v1.0</div>
        <div style={{ color: L.t3 }}>Sistema de gestão para clínicas médicas · by C4HUB</div>
        <div style={{ color: L.t4, marginTop: 2 }}>Supabase · React · Vercel</div>
      </div>

      {/* Modal Procedimento */}
      {modalProc !== null && (
        <div
          onClick={closeModalProc}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, margin: '0 auto',
              background: L.bg, borderRadius: '16px 16px 0 0',
              maxHeight: '92vh', overflowY: 'auto',
              animation: 'up 0.25s ease'
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${L.line}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: L.surface, borderRadius: '16px 16px 0 0'
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>
                {formProc._id ? 'Editar Procedimento' : 'Novo Procedimento'}
              </span>
              <button onClick={closeModalProc} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: L.t3, fontSize: 20, lineHeight: 1, padding: '0 4px'
              }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="NOME *">
                <input
                  style={inp}
                  value={formProc.nome}
                  placeholder="Nome do procedimento"
                  onChange={e => setFormProc(f => ({ ...f, nome: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                  autoFocus
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="CATEGORIA">
                  <select
                    style={{ ...inp, appearance: 'none' }}
                    value={formProc.categoria}
                    onChange={e => setFormProc(f => ({ ...f, categoria: e.target.value }))}
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="DURAÇÃO (min)">
                  <input
                    type="number"
                    style={inp}
                    value={formProc.duracao_minutos}
                    min={5}
                    step={5}
                    onChange={e => setFormProc(f => ({ ...f, duracao_minutos: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
              </div>

              <Field label="VALOR (R$)">
                <input
                  type="number"
                  style={inp}
                  value={formProc.valor}
                  placeholder="0,00"
                  min={0}
                  step={0.01}
                  onChange={e => setFormProc(f => ({ ...f, valor: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>

              <Field label="DESCRIÇÃO">
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={formProc.descricao}
                  placeholder="Descrição opcional..."
                  onChange={e => setFormProc(f => ({ ...f, descricao: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formProc.ativo}
                  onChange={e => setFormProc(f => ({ ...f, ativo: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: L.teal }}
                />
                <span style={{ fontSize: 13, color: L.t2 }}>Procedimento ativo</span>
              </label>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={salvarProcedimento}
                  disabled={savingProc || !formProc.nome.trim()}
                  style={{
                    flex: 1, padding: '10px 20px', borderRadius: 8,
                    background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
                    opacity: (savingProc || !formProc.nome.trim()) ? 0.6 : 1,
                    border: 'none', cursor: 'pointer'
                  }}
                >{savingProc ? 'Salvando...' : (formProc._id ? 'Atualizar' : 'Criar Procedimento')}</button>
                <button
                  onClick={closeModalProc}
                  style={{
                    padding: '10px 20px', borderRadius: 8,
                    background: L.surface, color: L.t2, fontWeight: 600, fontSize: 13,
                    border: `1px solid ${L.line}`, cursor: 'pointer'
                  }}
                >Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
