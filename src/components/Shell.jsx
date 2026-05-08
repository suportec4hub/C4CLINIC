import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { NAV_ITEMS, PAGE_TITLES, isC4HubAdmin, isClinicaAdmin } from '../constants/nav.js'
import PageDashboard from '../pages/PageDashboard.jsx'
import PagePacientes from '../pages/PagePacientes.jsx'
import PageAgenda from '../pages/PageAgenda.jsx'
import PageConsultas from '../pages/PageConsultas.jsx'
import PageMedicos from '../pages/PageMedicos.jsx'
import PageConvenios from '../pages/PageConvenios.jsx'
import PageFinanceiro from '../pages/PageFinanceiro.jsx'
import PageRelatorios from '../pages/PageRelatorios.jsx'
import PageUsuarios from '../pages/PageUsuarios.jsx'
import PageConfiguracoes from '../pages/PageConfiguracoes.jsx'
import PageClientes from '../pages/PageClientes.jsx'
import PageTodosUsuarios from '../pages/PageTodosUsuarios.jsx'
import PageTriagem from '../pages/PageTriagem.jsx'
import PageDocumentos from '../pages/PageDocumentos.jsx'
import PageEstoque from '../pages/PageEstoque.jsx'
import PageFluxo from '../pages/PageFluxo.jsx'
import PageAtividades from '../pages/PageAtividades.jsx'

function NotificacoesBanner({ clinicaId, darkMode }) {
  const [alertas, setAlertas] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('c4_dismiss_notif') || '[]') } catch { return [] }
  })

  useEffect(() => {
    if (!clinicaId) return
    async function check() {
      const hoje = new Date().toISOString().split('T')[0]
      const novos = []

      const { data: est2 } = await supabase.from('estoque_items').select('nome, quantidade, quantidade_minima').eq('clinica_id', clinicaId)
      ;(est2 || []).filter(i => i.quantidade_minima != null && i.quantidade <= i.quantidade_minima).forEach(i => {
        novos.push({ id: `est_${i.nome}`, tipo: 'estoque', msg: `Estoque baixo: ${i.nome} (${i.quantidade} restantes)`, icon: '📦', color: L.orange })
      })

      const { count: qtdHoje } = await supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('clinica_id', clinicaId).gte('data_hora', `${hoje}T00:00:00`).lte('data_hora', `${hoje}T23:59:59`)
      if (qtdHoje > 0) novos.push({ id: `agenda_${hoje}`, tipo: 'agenda', msg: `${qtdHoje} agendamento${qtdHoje !== 1 ? 's' : ''} hoje`, icon: '📅', color: L.blue })

      const { data: pacs } = await supabase.from('pacientes').select('nome, data_nascimento').eq('clinica_id', clinicaId).eq('ativo', true).not('data_nascimento', 'is', null)
      const todayMM = (new Date().getMonth() + 1).toString().padStart(2, '0')
      const todayDD = new Date().getDate().toString().padStart(2, '0')
      const aniv = (pacs || []).filter(p => {
        if (!p.data_nascimento) return false
        const [, mm, dd] = p.data_nascimento.split('-')
        return mm === todayMM && dd === todayDD
      })
      if (aniv.length > 0) novos.push({ id: `aniv_${hoje}`, tipo: 'aniversario', msg: `🎂 ${aniv.map(p => p.nome.split(' ')[0]).join(', ')} faz${aniv.length > 1 ? 'em' : ''} aniversário hoje!`, icon: '🎉', color: L.yellow })

      setAlertas(novos)
    }
    check()
  }, [clinicaId])

  const visiveis = alertas.filter(a => !dismissed.includes(a.id))
  if (visiveis.length === 0) return null

  function dismiss(id) {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem('c4_dismiss_notif', JSON.stringify(next))
  }

  return (
    <div style={{ padding: '8px 20px 0' }}>
      {visiveis.map(a => (
        <div key={a.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, marginBottom: 6,
          background: darkMode ? L.surface : '#fffbeb',
          border: `1px solid ${a.color}30`,
          borderLeft: `3px solid ${a.color}`,
          fontSize: 13, color: L.t2,
          animation: 'up 0.2s ease',
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span>
          <span style={{ flex: 1 }}>{a.msg}</span>
          <button onClick={() => dismiss(a.id)} style={{ color: L.t4, fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      ))}
    </div>
  )
}

export default function Shell({ user, profile, onLogout, onProfileUpdate }) {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [buscaQuery, setBuscaQuery] = useState('')
  const [buscaResultados, setBuscaResultados] = useState({ pacientes: [], medicos: [] })
  const [buscaLoading, setBuscaLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('c4_dark') === '1')
  const [novoRapido, setNovoRapido] = useState(false)
  const buscaRef = useRef(null)
  const buscaTimerRef = useRef(null)

  const cargo = profile?.cargo || ''
  const isMaster = isC4HubAdmin(cargo)
  const isAdmin  = isClinicaAdmin(cargo)
  const clinicaNome = profile?.clinicas?.nome || 'C4CLINIC'
  const isClinical = !['c4hub_admin','c4hub'].includes(cargo) || profile?.clinica_id

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('c4_dark', darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => {
    if (novoRapido) { const t = setTimeout(() => setNovoRapido(false), 1500); return () => clearTimeout(t) }
  }, [novoRapido])

  useEffect(() => {
    function handler(e) {
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === '/' && !buscaAberta) { e.preventDefault(); setBuscaAberta(true) }
      if (e.key === 'n' || e.key === 'N') { setNovoRapido(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [buscaAberta])

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function nav(id) { setPage(id); if (isMobile) setMobileOpen(false); setBuscaAberta(false); setBuscaQuery('') }

  const executarBusca = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setBuscaResultados({ pacientes: [], medicos: [] }); return }
    const clinicaId = profile?.clinica_id
    if (!clinicaId) return
    setBuscaLoading(true)
    const [{ data: pacs }, { data: meds }] = await Promise.all([
      supabase.from('pacientes').select('id, nome, cpf, data_nascimento').eq('clinica_id', clinicaId).ilike('nome', `%${q}%`).eq('ativo', true).limit(6),
      supabase.from('medicos').select('id, nome, especialidade, crm').eq('clinica_id', clinicaId).ilike('nome', `%${q}%`).eq('ativo', true).limit(4),
    ])
    setBuscaResultados({ pacientes: pacs || [], medicos: meds || [] })
    setBuscaLoading(false)
  }, [profile?.clinica_id])

  function onBuscaChange(e) {
    const q = e.target.value
    setBuscaQuery(q)
    clearTimeout(buscaTimerRef.current)
    buscaTimerRef.current = setTimeout(() => executarBusca(q), 280)
  }

  useEffect(() => {
    if (buscaAberta) setTimeout(() => buscaRef.current?.focus(), 50)
  }, [buscaAberta])

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') setBuscaAberta(false) }
    if (buscaAberta) window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [buscaAberta])

  function canSee(item) {
    if (item.c4hubOnly && !isMaster) return false
    if (item.minRole === 'admin_clinica' && !isAdmin) return false
    return true
  }

  function canSeeGroup(group) {
    if (group.c4hubOnly && !isMaster) return false
    return true
  }

  const sw = collapsed ? 64 : 220

  const sidebarContent = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: L.bg, borderRight: `1px solid ${L.line}`,
      boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
      width: isMobile ? 220 : sw, transition: 'width 0.2s ease', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed && !isMobile ? '20px 0' : '16px',
        borderBottom: `1px solid ${L.line}`, minHeight: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {(!collapsed || isMobile) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0d6e6e, #0f8585)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(13,110,110,0.30)'
            }}>🏥</div>
            <div>
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15,
                color: L.t1, letterSpacing: '-0.3px', whiteSpace: 'nowrap'
              }}>C4CLINIC</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: L.teal }}>
                by C4HUB
              </div>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0d6e6e, #0f8585)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 2px 8px rgba(13,110,110,0.30)'
            }}>🏥</div>
          </div>
        )}
        {!isMobile && (
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: 26, height: 26, borderRadius: 6, background: L.hover,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: L.t3, fontSize: 13, flexShrink: 0
          }}>
            {collapsed ? '›' : '‹'}
          </button>
        )}
      </div>

      {/* Clínica/Empresa badge */}
      {(!collapsed || isMobile) && (
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${L.lineSoft}` }}>
          <div style={{
            fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.3px', marginBottom: 2
          }}>
            {isMaster ? 'MASTER' : 'CLÍNICA'}
          </div>
          <div style={{
            fontSize: 13, color: isMaster ? L.teal : L.t2,
            fontWeight: isMaster ? 700 : 500, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {clinicaNome}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.filter(canSeeGroup).map(group => (
          <div key={group.group}>
            {(!collapsed || isMobile) && (
              <div style={{
                padding: '12px 16px 4px', fontSize: 10, color: L.t4,
                letterSpacing: '0.8px', fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase'
              }}>{group.group}</div>
            )}
            {group.items.filter(canSee).map(item => {
              const active = page === item.id
              return (
                <div key={item.id} style={{
                  padding: collapsed && !isMobile ? '3px 0' : '3px 4px',
                }}>
                <button onClick={() => nav(item.id)}
                  title={collapsed && !isMobile ? item.label : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 10, padding: collapsed && !isMobile ? '9px 0' : '9px 12px',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    background: active ? L.tealBg : 'transparent',
                    color: active ? L.teal : L.t2, fontWeight: active ? 600 : 400,
                    fontSize: 13, borderRadius: active ? 8 : 8,
                    borderLeft: active ? `3px solid ${L.teal}` : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = L.hover }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontSize: 17, flexShrink: 0,
                    filter: active ? 'none' : 'grayscale(20%)',
                    opacity: active ? 1 : 0.75,
                  }}>{item.icon}</span>
                  {(!collapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </button>
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: `1px solid ${L.line}`, padding: '12px 16px' }}>
        {(!collapsed || isMobile) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d6e6e, #0f8585)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, flexShrink: 0,
              color: '#ffffff', fontWeight: 700, letterSpacing: '-0.5px',
              boxShadow: '0 2px 6px rgba(13,110,110,0.25)',
              fontFamily: "'Outfit', sans-serif",
            }}>
              {profile?.nome ? profile.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.nome || user.email}
              </div>
              <div style={{
                fontSize: 10, color: isMaster ? L.teal : L.t4,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: isMaster ? 700 : 400
              }}>
                {profile?.cargo || 'usuário'}
              </div>
            </div>
            <button onClick={onLogout} title="Sair" style={{
              width: 28, height: 28, borderRadius: 7, background: L.hover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: L.t3, fontSize: 14, flexShrink: 0
            }}
              onMouseEnter={e => e.currentTarget.style.background = L.redBg}
              onMouseLeave={e => e.currentTarget.style.background = L.hover}
            >⇥</button>
          </div>
        ) : (
          <button onClick={onLogout} style={{
            width: '100%', display: 'flex', justifyContent: 'center',
            padding: '8px 0', color: L.t3, fontSize: 18
          }} title="Sair">⇥</button>
        )}
      </div>
    </div>
  )

  const pageProps = { user, profile, cargo, isMaster, isAdmin, nav }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {!isMobile && sidebarContent}

      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40
        }} />
      )}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease', boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
        }}>
          {sidebarContent}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: 56, background: L.bg,
          borderBottom: `1px solid ${L.line}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0
        }}>
          {isMobile && (
            <button onClick={() => setMobileOpen(true)} style={{
              width: 36, height: 36, borderRadius: 8, background: L.hover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: L.t2, fontSize: 18
            }}>☰</button>
          )}
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 700,
            fontSize: 18, color: L.t1, flex: 1, letterSpacing: '-0.2px'
          }}>{PAGE_TITLES[page] || page}</div>

          <button
            onClick={() => setBuscaAberta(true)}
            title="Busca global (/)"
            style={{
              width: 32, height: 32, borderRadius: 8, background: L.hover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: L.t3, fontSize: 15
            }}
          >🔍</button>

          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            style={{ width: 32, height: 32, borderRadius: 8, background: L.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.t3, fontSize: 15 }}
          >
            {darkMode ? '☀' : '🌙'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: L.t3 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: L.green, boxShadow: `0 0 6px ${L.green}`
            }} />
            <span className="hide-mobile">Online</span>
          </div>

          {isMaster && (
            <div style={{
              padding: '3px 10px', borderRadius: 20,
              background: L.teal, color: L.white,
              fontSize: 11, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>C4HUB ADMIN</div>
          )}
          {!isMaster && (
            <div style={{
              padding: '3px 10px', borderRadius: 20,
              background: L.tealBg, border: `1px solid ${L.teal}20`,
              fontSize: 12, color: L.teal, fontWeight: 500
            }} className="hide-mobile">{clinicaNome}</div>
          )}
        </header>

        <main style={{ flex: 1, overflowY: 'auto', background: L.surface }}>
          {!isMaster && <NotificacoesBanner clinicaId={profile?.clinica_id} darkMode={darkMode} />}
          <div className="anim-up" key={page} style={{ minHeight: '100%' }}>
            {page === 'dashboard'      && <PageDashboard {...pageProps} />}
            {page === 'pacientes'      && <PagePacientes {...pageProps} />}
            {page === 'agenda'         && <PageAgenda {...pageProps} />}
            {page === 'consultas'      && <PageConsultas {...pageProps} />}
            {page === 'medicos'        && <PageMedicos {...pageProps} />}
            {page === 'convenios'      && <PageConvenios {...pageProps} />}
            {page === 'financeiro'     && <PageFinanceiro {...pageProps} />}
            {page === 'relatorios'     && <PageRelatorios {...pageProps} />}
            {page === 'usuarios'       && <PageUsuarios {...pageProps} />}
            {page === 'configuracoes'  && <PageConfiguracoes {...pageProps} onProfileUpdate={onProfileUpdate} />}
            {page === 'clientes'       && <PageClientes {...pageProps} />}
            {page === 'todos_usuarios' && <PageTodosUsuarios {...pageProps} />}
            {page === 'triagem'        && <PageTriagem {...pageProps} />}
            {page === 'documentos'     && <PageDocumentos {...pageProps} />}
            {page === 'estoque'        && <PageEstoque {...pageProps} />}
            {page === 'fluxo'          && <PageFluxo {...pageProps} />}
            {page === 'atividades'     && <PageAtividades {...pageProps} />}
          </div>
        </main>
      </div>

      {/* Novo Rápido toast */}
      {novoRapido && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, background: L.teal, color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', animation: 'up 0.2s ease' }}>
          ⌨ Use o botão "+ Novo" na página atual
        </div>
      )}

      {/* Busca Global */}
      {buscaAberta && (
        <div
          onClick={() => setBuscaAberta(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 80
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 580, background: L.bg,
              borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${L.line}` }}>
              <span style={{ fontSize: 17, color: L.t4 }}>🔍</span>
              <input
                ref={buscaRef}
                value={buscaQuery}
                onChange={onBuscaChange}
                placeholder="Buscar pacientes e médicos..."
                style={{
                  flex: 1, fontSize: 15, color: L.t1, background: 'transparent',
                  border: 'none', outline: 'none'
                }}
              />
              {buscaLoading && (
                <div style={{
                  width: 16, height: 16, border: `2px solid ${L.line}`,
                  borderTop: `2px solid ${L.teal}`, borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
              )}
              <kbd style={{
                fontSize: 11, color: L.t4, border: `1px solid ${L.line}`,
                borderRadius: 5, padding: '2px 6px', fontFamily: 'monospace'
              }}>Esc</kbd>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {buscaQuery.length < 2 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                  <div style={{ marginBottom: 14 }}>Digite pelo menos 2 caracteres para buscar</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[['N', 'Novo'], ['/', 'Buscar'], ['Esc', 'Fechar']].map(([k, v]) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: L.t4 }}>
                        <kbd style={{ fontSize: 10, color: L.t3, border: `1px solid ${L.line}`, borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace', background: L.surface }}>{k}</kbd>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (buscaResultados.pacientes.length === 0 && buscaResultados.medicos.length === 0 && !buscaLoading) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                  Nenhum resultado para &ldquo;{buscaQuery}&rdquo;
                </div>
              ) : (
                <>
                  {buscaResultados.pacientes.length > 0 && (
                    <div>
                      <div style={{
                        padding: '8px 18px 4px', fontSize: 10, color: L.t4,
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>Pacientes</div>
                      {buscaResultados.pacientes.map(p => {
                        const idade = p.data_nascimento
                          ? Math.floor((Date.now() - new Date(p.data_nascimento).getTime()) / (1000*60*60*24*365.25)) + ' anos'
                          : null
                        return (
                          <button key={p.id} onClick={() => nav('pacientes')}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 18px', transition: 'background 0.1s', textAlign: 'left'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = L.hover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%', background: L.tealBg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: L.teal, fontSize: 14, fontWeight: 700, flexShrink: 0
                            }}>{p.nome[0].toUpperCase()}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{p.nome}</div>
                              <div style={{ fontSize: 11, color: L.t4 }}>
                                {[p.cpf, idade].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: L.t4 }}>Paciente →</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {buscaResultados.medicos.length > 0 && (
                    <div>
                      <div style={{
                        padding: '8px 18px 4px', fontSize: 10, color: L.t4,
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>Médicos</div>
                      {buscaResultados.medicos.map(m => (
                        <button key={m.id} onClick={() => nav('medicos')}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 18px', transition: 'background 0.1s', textAlign: 'left'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = L.hover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', background: L.teal,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: L.white, fontSize: 14, fontWeight: 700, flexShrink: 0
                          }}>{m.nome[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>Dr(a). {m.nome}</div>
                            <div style={{ fontSize: 11, color: L.t4 }}>
                              {[m.especialidade, m.crm && `CRM: ${m.crm}`].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: L.t4 }}>Médico →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
