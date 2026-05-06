import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin() {
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) setErro('E-mail ou senha incorretos.')
    else onLogin(data.user)
  }

  const inp = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: `1.5px solid ${erro ? L.red : L.line}`, borderRadius: 9,
    background: L.bg, color: L.t1, outline: 'none', transition: 'border 0.15s',
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', minHeight: '100dvh',
      fontFamily: "'Instrument Sans', sans-serif"
    }}>
      {/* Painel Esquerdo */}
      <div style={{
        width: 'clamp(280px, 36%, 440px)', background: L.surface,
        borderRight: `1px solid ${L.line}`, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', gap: 32
      }} className="hide-mobile">
        {/* Logo */}
        <div style={{
          width: 88, height: 88, borderRadius: 20,
          background: L.tealBg, border: `1.5px solid ${L.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(13,110,110,0.12)',
          fontSize: 36
        }}>
          🏥
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 800,
            fontSize: 28, color: L.t1, letterSpacing: '-0.5px'
          }}>C4 CLINIC</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: L.teal, marginTop: 2, letterSpacing: '0.5px'
          }}>by C4HUB</div>
          <div style={{
            marginTop: 16, fontSize: 14, color: L.t3, lineHeight: 1.6, maxWidth: 240
          }}>
            O sistema completo de gestão para clínicas e consultórios médicos.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {[
            ['◈', 'Prontuário eletrônico completo'],
            ['◷', 'Agenda inteligente de consultas'],
            ['◬', 'Gestão financeira e convênios'],
            ['▤', 'Relatórios e indicadores'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: L.t2
            }}>
              <span style={{ color: L.teal, fontWeight: 600, fontSize: 16 }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Painel Direito — Formulário */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: L.bg
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'up 0.3s ease both' }}>
          {/* Mobile: logo */}
          <div style={{ display: 'none', textAlign: 'center', marginBottom: 32 }}
               className="show-mobile">
            <span style={{ fontSize: 40 }}>🏥</span>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 24, color: L.t1 }}>
              C4 CLINIC
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 700,
              fontSize: 22, color: L.t1, marginBottom: 6
            }}>Bem-vindo de volta</div>
            <div style={{ fontSize: 14, color: L.t3 }}>
              Acesse sua conta para continuar
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                color: L.t3, marginBottom: 6, letterSpacing: '0.3px'
              }}>E-MAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErro('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="seu@email.com"
                style={inp}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = erro ? L.red : L.line}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                color: L.t3, marginBottom: 6, letterSpacing: '0.3px'
              }}>SENHA</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  style={{ ...inp, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = erro ? L.red : L.line}
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowSenha(!showSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)', color: L.t4, fontSize: 16
                  }}
                >{showSenha ? '○' : '●'}</button>
              </div>
            </div>

            {erro && (
              <div style={{
                fontSize: 13, color: L.red, background: L.redBg,
                border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '8px 12px'
              }}>{erro}</div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 14,
                borderRadius: 9, marginTop: 8, opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.15s, background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = L.tealMd }}
              onMouseLeave={e => e.target.style.background = L.teal}
            >
              {loading && (
                <div style={{
                  width: 14, height: 14, border: `2px solid rgba(255,255,255,0.3)`,
                  borderTop: '2px solid #fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: L.t4 }}>
            C4CLINIC © {new Date().getFullYear()} · C4HUB
          </div>
        </div>
      </div>
    </div>
  )
}
