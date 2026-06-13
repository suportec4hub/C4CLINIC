import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

export default function ForcePasswordChange({ user, onComplete }) {
  const [senha, setSenha]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow]           = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (senha.length < 8) { setError('A senha deve ter ao menos 8 caracteres.'); return }
    if (senha !== confirmar) { setError('As senhas não conferem.'); return }

    setSaving(true)
    try {
      // 1. Update password in Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({ password: senha })
      if (authErr) throw authErr

      // 2. Clear the flag in our users table
      const { error: dbErr } = await supabase
        .from('usuarios')
        .update({ trocar_senha: false })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      onComplete()
    } catch (e) {
      setError(e.message || 'Erro ao alterar senha.')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: `1.5px solid ${L.line}`, borderRadius: 10,
    background: L.surface, color: L.t1, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0a4a4a 0%, #0d6e6e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: L.bg, borderRadius: 20, width: '100%', maxWidth: 420,
        padding: 36, boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        border: `1px solid ${L.line}`,
      }}>
        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: L.tealBg, border: `2px solid ${L.teal}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>🔑</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: L.t1, marginBottom: 6 }}>
            Troque sua senha
          </div>
          <div style={{ fontSize: 13, color: L.t4, lineHeight: 1.5 }}>
            Por segurança, crie uma nova senha para acessar o sistema.<br />
            <strong style={{ color: L.t3 }}>{user.email}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* new password */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
              NOVA SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                autoFocus
                style={{ ...inp, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: L.t3, fontSize: 15 }}
              >{show ? '🙈' : '👁'}</button>
            </div>
            {/* strength bar */}
            {senha.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                {[8, 10, 12].map((min, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: senha.length >= min
                      ? [L.red, L.yellow, L.green][i]
                      : L.line,
                    transition: 'background 0.2s',
                  }} />
                ))}
                <span style={{ fontSize: 10, color: L.t4, marginLeft: 4 }}>
                  {senha.length < 8 ? 'Fraca' : senha.length < 10 ? 'Média' : 'Forte'}
                </span>
              </div>
            )}
          </div>

          {/* confirm */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
              CONFIRMAR SENHA
            </label>
            <input
              type={show ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              required
              style={{
                ...inp,
                borderColor: confirmar && confirmar !== senha ? L.red : L.line,
              }}
              onFocus={e => e.target.style.borderColor = confirmar !== senha ? L.red : L.teal}
              onBlur={e => e.target.style.borderColor = confirmar !== senha ? L.red : L.line}
            />
            {confirmar && confirmar !== senha && (
              <div style={{ fontSize: 11, color: L.red, marginTop: 4 }}>As senhas não conferem</div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: L.redBg, color: L.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || senha.length < 8 || senha !== confirmar}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14,
              fontWeight: 700, background: L.teal, color: L.white, border: 'none',
              cursor: saving || senha.length < 8 || senha !== confirmar ? 'not-allowed' : 'pointer',
              opacity: saving || senha.length < 8 || senha !== confirmar ? 0.6 : 1,
              marginTop: 4, transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Salvando...' : 'Criar nova senha e entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: L.t4 }}>
          🔒 Sua senha é criptografada e nunca é armazenada em texto simples
        </div>
      </div>
    </div>
  )
}
