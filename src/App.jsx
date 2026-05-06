import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { globalCSS, L } from './constants/theme.js'
import Login from './components/Login.jsx'
import Shell from './components/Shell.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = globalCSS
    document.head.appendChild(style)

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (data.session?.user) fetchProfile(data.session.user.id)
      else setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setReady(true) }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const { data } = await supabase
      .from('usuarios')
      .select('*, clinicas(*)')
      .eq('id', uid)
      .single()
    setProfile(data)
    setReady(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  if (!ready) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: L.bg
    }}>
      <div style={{
        width: 32, height: 32, border: `3px solid ${L.line}`,
        borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
    </div>
  )

  if (!user) return <Login onLogin={setUser} />

  return (
    <Shell
      user={user}
      profile={profile}
      onLogout={handleLogout}
      onProfileUpdate={setProfile}
    />
  )
}
