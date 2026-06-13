import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { globalCSS, L } from './constants/theme.js'
import Login from './components/Login.jsx'
import Shell from './components/Shell.jsx'
import ForcePasswordChange from './components/ForcePasswordChange.jsx'

function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: L.bg, flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${L.line}`,
        borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <div style={{ fontSize: 13, color: L.t4 }}>Carregando...</div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = globalCSS
    document.head.appendChild(style)

    supabase.auth.getSession().then(({ data, error: e }) => {
      if (e) { setError(e.message); setReady(true); return }
      const u = data.session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setReady(true)
    }).catch(e => { setError(String(e)); setReady(true) })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else { setProfile(null); setReady(true) }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function fetchProfile(_uid) {
    try {
      // Usa RPC com SECURITY DEFINER — ignora RLS, sempre retorna o perfil do usuário logado
      const { data, error } = await supabase.rpc('get_my_profile')
      if (error) console.warn('Erro ao buscar perfil:', error)
      setProfile(data ?? null)
    } catch (e) {
      console.warn('Erro ao carregar perfil:', e)
    } finally {
      setReady(true)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  if (!ready) return <Spinner />

  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: L.bg, padding: 24
    }}>
      <div style={{
        maxWidth: 400, textAlign: 'center',
        padding: 32, borderRadius: 16,
        border: `1px solid ${L.redBd}`, background: L.redBg
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, color: L.red, marginBottom: 8 }}>Erro de conexão</div>
        <div style={{ fontSize: 13, color: L.t3 }}>{error}</div>
        <button onClick={() => window.location.reload()} style={{
          marginTop: 16, padding: '9px 20px', borderRadius: 8,
          background: L.teal, color: L.white, fontWeight: 600, fontSize: 13
        }}>Tentar novamente</button>
      </div>
    </div>
  )

  if (!user) return <Login onLogin={setUser} />

  if (profile?.trocar_senha === true) {
    return (
      <ForcePasswordChange
        user={user}
        onComplete={() => fetchProfile(user.id)}
      />
    )
  }

  return (
    <Shell
      user={user}
      profile={profile}
      onLogout={handleLogout}
      onProfileUpdate={setProfile}
    />
  )
}
