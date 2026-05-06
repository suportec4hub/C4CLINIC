import { useState, useEffect } from 'react'
import { L } from '../constants/theme.js'
import { NAV_ITEMS, ADMIN_ITEMS, PAGE_TITLES } from '../constants/nav.js'
import PageDashboard from '../pages/PageDashboard.jsx'
import PagePacientes from '../pages/PagePacientes.jsx'
import PageAgenda from '../pages/PageAgenda.jsx'
import PageConsultas from '../pages/PageConsultas.jsx'
import PageMedicos from '../pages/PageMedicos.jsx'
import PageConvenios from '../pages/PageConvenios.jsx'
import PageFinanceiro from '../pages/PageFinanceiro.jsx'
import PageRelatorios from '../pages/PageRelatorios.jsx'
import PageConfiguracoes from '../pages/PageConfiguracoes.jsx'

const SIDEBAR_W = 220
const SIDEBAR_COLLAPSED = 64

export default function Shell({ user, profile, onLogout, onProfileUpdate }) {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const isAdmin = profile?.cargo === 'admin'

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

  function nav(id) {
    setPage(id)
    if (isMobile) setMobileOpen(false)
  }

  function hasAccess(item) {
    if (item.adminOnly && !isAdmin) return false
    return true
  }

  const sw = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_W
  const clinicaNome = profile?.clinicas?.nome || 'C4CLINIC'

  const sidebarContent = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: L.bg, borderRight: `1px solid ${L.line}`,
      transition: 'width 0.2s ease', overflow: 'hidden',
      width: isMobile ? SIDEBAR_W : sw,
    }}>
      {/* Header da sidebar */}
      <div style={{
        padding: collapsed && !isMobile ? '20px 0' : '20px 16px',
        borderBottom: `1px solid ${L.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 64
      }}>
        {(!collapsed || isMobile) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: L.tealBg,
              border: `1.5px solid ${L.line}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, flexShrink: 0
            }}>🏥</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16,
                color: L.t1, letterSpacing: '-0.3px', whiteSpace: 'nowrap'
              }}>C4CLINIC</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                color: L.teal, letterSpacing: '0.5px'
              }}>by C4HUB</div>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div style={{
            width: '100%', display: 'flex', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 20 }}>🏥</div>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 28, height: 28, borderRadius: 7, background: L.hover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: L.t3, fontSize: 12, flexShrink: 0,
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = L.line}
            onMouseLeave={e => e.currentTarget.style.background = L.hover}
          >
            {collapsed ? '›' : '‹'}
          </button>
        )}
      </div>

      {/* Clínica badge */}
      {(!collapsed || isMobile) && (
        <div style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${L.lineSoft}`
        }}>
          <div style={{
            fontSize: 11, color: L.t4,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.3px', marginBottom: 2
          }}>CLÍNICA</div>
          <div style={{ fontSize: 13, color: L.t2, fontWeight: 500, truncate: true }}>
            {clinicaNome}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.map(group => (
          <div key={group.group}>
            {(!collapsed || isMobile) && (
              <div style={{
                padding: '12px 16px 4px',
                fontSize: 10, color: L.t4, letterSpacing: '0.8px',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase'
              }}>{group.group}</div>
            )}
            {group.items.filter(hasAccess).map(item => {
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => nav(item.id)}
                  title={collapsed && !isMobile ? item.label : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 10, padding: collapsed && !isMobile ? '10px 0' : '9px 16px',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    background: active ? L.tealBg : 'transparent',
                    color: active ? L.teal : L.t2,
                    fontWeight: active ? 600 : 400,
                    fontSize: 13, borderRadius: 0,
                    borderLeft: active ? `3px solid ${L.teal}` : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = L.hover }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {(!collapsed || isMobile) && (
                    <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  )}
                </button>
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
              width: 34, height: 34, borderRadius: '50%', background: L.tealBg,
              border: `1.5px solid ${L.teal}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16, flexShrink: 0
            }}>
              {profile?.nome?.[0]?.toUpperCase() || '👤'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, truncate: true }}>
                {profile?.nome || user.email}
              </div>
              <div style={{ fontSize: 11, color: L.t4 }}>{profile?.cargo || 'usuário'}</div>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              style={{
                width: 28, height: 28, borderRadius: 7, background: L.hover,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: L.t3, fontSize: 14, flexShrink: 0
              }}
              onMouseEnter={e => e.currentTarget.style.background = L.redBg}
              onMouseLeave={e => e.currentTarget.style.background = L.hover}
            >⇥</button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', justifyContent: 'center',
              padding: '8px 0', color: L.t3, fontSize: 18
            }}
            title="Sair"
          >⇥</button>
        )}
      </div>
    </div>
  )

  const pageProps = { user, profile, isAdmin }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      {!isMobile && sidebarContent}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 40, animation: 'in 0.2s ease'
          }}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: 50, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease', boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
        }}>
          {sidebarContent}
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: 56, background: L.bg, borderBottom: `1px solid ${L.line}`,
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          flexShrink: 0
        }}>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 8, background: L.hover,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: L.t2, fontSize: 18
              }}
            >☰</button>
          )}

          <div style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 700,
            fontSize: 17, color: L.t1, flex: 1
          }}>
            {PAGE_TITLES[page] || page}
          </div>

          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: L.t3
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: L.green, boxShadow: `0 0 6px ${L.green}`
            }} />
            <span className="hide-mobile">Online</span>
          </div>

          {/* Clinic badge */}
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: L.tealBg, border: `1px solid ${L.teal}20`,
            fontSize: 12, color: L.teal, fontWeight: 500
          }} className="hide-mobile">
            {clinicaNome}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: L.surface }}>
          <div className="anim-up" key={page} style={{ minHeight: '100%' }}>
            {page === 'dashboard'     && <PageDashboard {...pageProps} />}
            {page === 'pacientes'     && <PagePacientes {...pageProps} />}
            {page === 'agenda'        && <PageAgenda {...pageProps} />}
            {page === 'consultas'     && <PageConsultas {...pageProps} />}
            {page === 'medicos'       && <PageMedicos {...pageProps} />}
            {page === 'convenios'     && <PageConvenios {...pageProps} />}
            {page === 'financeiro'    && <PageFinanceiro {...pageProps} />}
            {page === 'relatorios'    && <PageRelatorios {...pageProps} />}
            {page === 'configuracoes' && <PageConfiguracoes {...pageProps} onProfileUpdate={onProfileUpdate} />}
          </div>
        </main>
      </div>
    </div>
  )
}
