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

export default function PageConfiguracoes({ profile, user, onProfileUpdate }) {
  const [clinica, setClinica] = useState(null)
  const [formClinica, setFormClinica] = useState({})
  const [formPerfil, setFormPerfil] = useState({})
  const [formSenha, setFormSenha] = useState({ nova: '', confirma: '' })
  const [saving, setSaving] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    if (profile) {
      setFormPerfil({ nome: profile.nome || '', cargo: profile.cargo || '', telefone: profile.telefone || '' })
      if (profile.clinicas) {
        setClinica(profile.clinicas)
        setFormClinica({ ...profile.clinicas })
      }
    }
  }, [profile])

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
            opacity: saving.perfil ? 0.7 : 1
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
            opacity: (saving.senha || !formSenha.nova) ? 0.7 : 1
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
              opacity: saving.clinica ? 0.7 : 1
            }}>{saving.clinica ? 'Salvando...' : 'Salvar Clínica'}</button>
            <MsgBox k="clinica" />
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
    </div>
  )
}
