import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── shared helpers ─────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line  }

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  return `${Math.floor(diff / 3600)}h atrás`
}

function formatHMS(d) {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
}
function formatDate(d) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

const PRIORIDADE_MAP = {
  normal:      { label: 'Normal',      bg: '#1e3a5f', color: '#60a5fa', bd: '#2563eb' },
  prioritario: { label: 'Prioritário', bg: '#3b2700', color: '#fbbf24', bd: '#d97706' },
  urgente:     { label: 'URGENTE',     bg: '#3b0a0a', color: '#f87171', bd: '#dc2626' },
}

function PrioridadeBadge({ p, large }) {
  const s = PRIORIDADE_MAP[p] || PRIORIDADE_MAP.normal
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: large ? '4px 12px' : '2px 8px',
      borderRadius: 20, fontSize: large ? 13 : 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      letterSpacing: '0.4px',
    }}>{s.label}</span>
  )
}

/* ─── keyframes injected once ────────────────────────────────── */
const STYLES = `
  @keyframes up   { from { transform: translateY(60px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
  @keyframes glow { 0%,100% { text-shadow: 0 0 30px #00e5a0aa, 0 0 60px #00e5a055 } 50% { text-shadow: 0 0 50px #00e5a0ff, 0 0 100px #00e5a088 } }
  @keyframes flash { 0%,100% { border-color: #dc2626 } 50% { border-color: transparent } }
  @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
`

/* ═══════════════════════════════════════════════════════════════
   TAB 0 — Painel de Controle (receptionist)
═══════════════════════════════════════════════════════════════ */
function TabControle({ clinicaId }) {
  const [chamadas, setChamadas] = useState([])
  const [historico, setHistorico] = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({ valor: '', consultorio: '', prioridade: 'normal' })
  const [err, setErr]   = useState('')

  // KPI counters derived from state
  const hoje = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: fila }, { data: hist }] = await Promise.all([
      supabase
        .from('painel_chamadas')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('status', 'chamando')
        .order('criado_em', { ascending: false }),
      supabase
        .from('painel_chamadas')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('status', 'atendido')
        .gte('criado_em', hoje + 'T00:00:00')
        .order('criado_em', { ascending: false })
        .limit(20),
    ])
    setChamadas(fila || [])
    setHistorico(hist || [])
    setLoading(false)
  }, [clinicaId, hoje])

  useEffect(() => { load() }, [load])

  async function chamar() {
    if (!form.valor.trim()) { setErr('Informe a senha ou nome do paciente.'); return }
    if (!form.consultorio.trim()) { setErr('Informe o consultório.'); return }
    setErr('')
    setSaving(true)
    const { error } = await supabase.from('painel_chamadas').insert({
      clinica_id: clinicaId,
      tipo: /^\d+$/.test(form.valor.trim()) ? 'senha' : 'nome',
      valor: form.valor.trim().toUpperCase(),
      consultorio: form.consultorio.trim(),
      prioridade: form.prioridade,
      status: 'chamando',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setForm({ valor: '', consultorio: '', prioridade: 'normal' })
    load()
  }

  async function marcarAtendido(id) {
    await supabase.from('painel_chamadas').update({ status: 'atendido' }).eq('id', id)
    load()
  }

  async function chamarNovamente(id) {
    // touch updated_at to trigger re-display on TV
    await supabase.from('painel_chamadas').update({ prioridade: chamadas.find(c => c.id === id)?.prioridade || 'normal' }).eq('id', id)
    load()
  }

  // KPIs
  const todosHoje = [...chamadas, ...historico]
  const kpiHoje        = todosHoje.length
  const kpiAtendendo   = chamadas.length
  const kpiPrioritario = chamadas.filter(c => c.prioridade !== 'normal').length
  const kpiAtendidos   = historico.length

  const KPI = ({ label, value, color }) => (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || L.t1 }}>{value}</div>
      <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="CHAMADAS HOJE"        value={kpiHoje}        color={L.teal} />
        <KPI label="SENDO ATENDIDAS"      value={kpiAtendendo}   color={L.blue} />
        <KPI label="PRIORITÁRIOS NA FILA" value={kpiPrioritario} color={L.yellow} />
        <KPI label="ATENDIDOS"            value={kpiAtendidos}   color={L.green} />
      </div>

      {/* Quick call form */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 16 }}>
          Chamar Senha / Paciente
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 140 }}>
            <Field label="SENHA OU NOME">
              <input
                style={inp} placeholder="Ex: A001 ou João Silva"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                onFocus={focus} onBlur={blur}
                onKeyDown={e => e.key === 'Enter' && chamar()}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Field label="CONSULTÓRIO">
              <input
                style={inp} placeholder="Ex: Sala 01"
                value={form.consultorio}
                onChange={e => setForm(f => ({ ...f, consultorio: e.target.value }))}
                onFocus={focus} onBlur={blur}
                onKeyDown={e => e.key === 'Enter' && chamar()}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Field label="PRIORIDADE">
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={form.prioridade}
                onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                onFocus={focus} onBlur={blur}
              >
                <option value="normal">Normal</option>
                <option value="prioritario">Prioritário</option>
                <option value="urgente">URGENTE</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={chamar}
              disabled={saving}
              style={{
                background: saving ? L.tealDark : L.teal, color: L.white,
                border: 'none', borderRadius: 8, padding: '9px 28px',
                fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? '...' : 'Chamar'}
            </button>
          </div>
        </div>
        {err && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: L.redBg, color: L.red, fontSize: 13, border: `1px solid ${L.redBd}`,
          }}>{err}</div>
        )}
      </div>

      {/* Fila atual */}
      <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${L.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>
            Fila Atual
            <span style={{
              marginLeft: 8, fontSize: 12, fontWeight: 600,
              background: L.tealBg, color: L.teal, borderRadius: 20, padding: '2px 10px',
            }}>{chamadas.length}</span>
          </div>
          <button
            onClick={load}
            style={{ background: 'none', border: `1px solid ${L.line}`, borderRadius: 6,
              padding: '5px 12px', fontSize: 12, color: L.t3, cursor: 'pointer' }}
          >Atualizar</button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: L.t4 }}>Carregando…</div>
        ) : chamadas.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: L.t4 }}>Nenhuma chamada ativa no momento.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: L.hover }}>
                  {['Senha/Nome', 'Consultório', 'Prioridade', 'Tempo', 'Ações'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 11,
                      color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, borderBottom: `1px solid ${L.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chamadas.map((c, i) => (
                  <tr key={c.id} style={{
                    borderBottom: i < chamadas.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                    background: i === 0 ? `${L.tealBg}` : 'transparent',
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: i === 0 ? L.teal : L.t1 }}>
                        {c.valor}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: L.t2 }}>{c.consultorio}</td>
                    <td style={{ padding: '12px 16px' }}><PrioridadeBadge p={c.prioridade} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(c.criado_em)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => chamarNovamente(c.id)}
                          style={{
                            background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`,
                            borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >Chamar Novamente</button>
                        <button
                          onClick={() => marcarAtendido(c.id)}
                          style={{
                            background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
                            borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >Atendido</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico do dia */}
      {historico.length > 0 && (
        <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${L.line}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Histórico do Dia</div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {historico.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px',
                borderBottom: i < historico.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 700, color: L.t2, minWidth: 70,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{c.valor}</span>
                <span style={{ fontSize: 12, color: L.t4, flex: 1 }}>{c.consultorio}</span>
                <PrioridadeBadge p={c.prioridade} />
                <span style={{ fontSize: 11, color: L.t5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {timeAgo(c.criado_em)}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 12,
                  background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
                  fontWeight: 600,
                }}>Atendido</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — Visualização TV
═══════════════════════════════════════════════════════════════ */
function TVDisplay({ clinicaId, config, isPreview }) {
  const [chamadas, setChamadas] = useState([])
  const [clock, setClock]       = useState(new Date())

  const corFundo   = config?.cor_fundo    || '#0a0f1e'
  const corChamada = config?.cor_chamada  || '#00e5a0'
  const titulo     = config?.titulo       || 'Bem-vindo!'
  const rodape     = config?.mensagem_rodape || ''
  const maxVis     = config?.max_chamadas_visiveis ?? 6

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('painel_chamadas')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('status', 'chamando')
      .order('criado_em', { ascending: false })
      .limit(maxVis + 1)
    setChamadas(data || [])
  }, [clinicaId, maxVis])

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [load])

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  const principal  = chamadas[0] || null
  const anteriores = chamadas.slice(1, maxVis)
  const isUrgente  = principal?.prioridade === 'urgente'

  function fullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }
  }

  const tvWrap = {
    background: corFundo,
    borderRadius: isPreview ? 12 : 0,
    minHeight: isPreview ? 420 : '100vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', position: 'relative',
    fontFamily: "'Inter', sans-serif",
    border: isPreview ? `2px solid #1e2a3a` : 'none',
  }

  return (
    <div style={tvWrap}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isPreview ? '12px 20px' : '20px 40px',
        borderBottom: '1px solid #1e2a3a',
        background: '#060c18',
      }}>
        <div style={{
          fontSize: isPreview ? 18 : 28, fontWeight: 800, color: '#ffffff',
          letterSpacing: '-0.5px',
        }}>{titulo}</div>
        <div style={{ textAlign: 'right' }}>
          {(config?.exibir_relogio ?? true) && (
            <div style={{
              fontSize: isPreview ? 22 : 36, fontWeight: 700,
              color: corChamada, fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.1,
            }}>{formatHMS(clock)}</div>
          )}
          {(config?.exibir_data ?? true) && (
            <div style={{
              fontSize: isPreview ? 10 : 14, color: '#64748b', marginTop: 2,
              textTransform: 'capitalize',
            }}>{formatDate(clock)}</div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isPreview ? 20 : 40 }}>
        {principal ? (
          <>
            <div style={{
              fontSize: isPreview ? 11 : 16, color: '#64748b', letterSpacing: '3px',
              textTransform: 'uppercase', marginBottom: isPreview ? 8 : 16,
              fontFamily: "'JetBrains Mono', monospace",
            }}>CHAMANDO</div>

            <div style={{
              border: `3px solid ${isUrgente ? '#dc2626' : corChamada}`,
              borderRadius: 20,
              padding: isPreview ? '16px 32px' : '32px 64px',
              textAlign: 'center',
              animation: isUrgente ? 'flash 0.8s infinite' : 'none',
              marginBottom: isPreview ? 8 : 20,
              background: isUrgente ? '#1a0505' : '#060c18',
              minWidth: isPreview ? 180 : 320,
            }}>
              <div style={{
                fontSize: isPreview ? 52 : 96,
                fontWeight: 900,
                color: corChamada,
                lineHeight: 1,
                animation: 'glow 2s ease-in-out infinite',
                letterSpacing: '-2px',
              }}>{principal.valor}</div>
              <div style={{
                fontSize: isPreview ? 14 : 22, color: '#94a3b8',
                marginTop: isPreview ? 6 : 12, fontWeight: 500,
              }}>Consultório: <strong style={{ color: '#ffffff' }}>{principal.consultorio}</strong></div>
              <div style={{ marginTop: isPreview ? 6 : 12 }}>
                <PrioridadeBadge p={principal.prioridade} large />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            fontSize: isPreview ? 16 : 28, color: '#334155',
            textAlign: 'center', fontStyle: 'italic',
          }}>
            Aguardando chamadas…
          </div>
        )}

        {/* Previous calls grid */}
        {anteriores.length > 0 && (
          <div style={{ marginTop: isPreview ? 12 : 32, width: '100%', maxWidth: isPreview ? 400 : 700 }}>
            <div style={{
              fontSize: isPreview ? 9 : 12, color: '#475569', letterSpacing: '2px',
              textTransform: 'uppercase', marginBottom: isPreview ? 6 : 12,
              textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
            }}>Chamadas Anteriores</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(anteriores.length, 3)}, 1fr)`,
              gap: isPreview ? 6 : 12,
            }}>
              {anteriores.map(c => (
                <div key={c.id} style={{
                  background: '#0d1526', border: '1px solid #1e2a3a',
                  borderRadius: 10, padding: isPreview ? '8px 12px' : '14px 18px',
                  textAlign: 'center', opacity: 0.65,
                  animation: 'fadeIn 0.4s ease',
                }}>
                  <div style={{
                    fontSize: isPreview ? 22 : 38, fontWeight: 800,
                    color: '#4a7c6b', lineHeight: 1,
                  }}>{c.valor}</div>
                  <div style={{ fontSize: isPreview ? 10 : 13, color: '#475569', marginTop: 4 }}>
                    {c.consultorio}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {rodape && (
        <div style={{
          borderTop: '1px solid #1e2a3a',
          padding: isPreview ? '8px 20px' : '14px 40px',
          background: '#060c18',
          fontSize: isPreview ? 11 : 16, color: '#475569',
          textAlign: 'center', fontStyle: 'italic',
        }}>{rodape}</div>
      )}

      {/* Fullscreen button — only in live view */}
      {!isPreview && (
        <button
          onClick={fullscreen}
          style={{
            position: 'absolute', top: 20, right: 40,
            background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
            border: '1px solid #1e2a3a', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            backdropFilter: 'blur(6px)',
          }}
        >⛶ Tela Cheia</button>
      )}
    </div>
  )
}

function TabTV({ clinicaId, config }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Visualização TV</div>
          <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>
            Simulação do painel de chamadas. Atualiza automaticamente a cada 5 segundos.
          </div>
        </div>
        <button
          onClick={() => {
            const el = document.getElementById('tv-panel-fullscreen')
            if (el?.requestFullscreen) el.requestFullscreen()
          }}
          style={{
            background: L.teal, color: L.white, border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >Abrir em Tela Cheia</button>
      </div>

      <div id="tv-panel-fullscreen" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <TVDisplay clinicaId={clinicaId} config={config} isPreview={false} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — Configurações do Painel
═══════════════════════════════════════════════════════════════ */
function TabConfig({ clinicaId, config, onSaved }) {
  const [form, setForm] = useState({
    titulo: config?.titulo || 'Bem-vindo!',
    mensagem_rodape: config?.mensagem_rodape || '',
    exibir_relogio: config?.exibir_relogio ?? true,
    exibir_data: config?.exibir_data ?? true,
    cor_fundo: config?.cor_fundo || '#0a0f1e',
    cor_chamada: config?.cor_chamada || '#00e5a0',
    max_chamadas_visiveis: config?.max_chamadas_visiveis ?? 6,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [err, setErr]       = useState('')

  // sync when config prop changes (first load)
  useEffect(() => {
    if (config) {
      setForm({
        titulo: config.titulo || 'Bem-vindo!',
        mensagem_rodape: config.mensagem_rodape || '',
        exibir_relogio: config.exibir_relogio ?? true,
        exibir_data: config.exibir_data ?? true,
        cor_fundo: config.cor_fundo || '#0a0f1e',
        cor_chamada: config.cor_chamada || '#00e5a0',
        max_chamadas_visiveis: config.max_chamadas_visiveis ?? 6,
      })
    }
  }, [config])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function salvar() {
    setSaving(true); setErr('')
    const payload = {
      clinica_id: clinicaId,
      titulo: form.titulo,
      mensagem_rodape: form.mensagem_rodape,
      exibir_relogio: form.exibir_relogio,
      exibir_data: form.exibir_data,
      cor_fundo: form.cor_fundo,
      cor_chamada: form.cor_chamada,
      max_chamadas_visiveis: Number(form.max_chamadas_visiveis),
    }
    const { error } = config?.id
      ? await supabase.from('painel_config').update(payload).eq('id', config.id)
      : await supabase.from('painel_config').insert(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved()
  }

  const Toggle = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <label style={{ fontSize: 13, color: L.t2, cursor: 'pointer' }}>{label}</label>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: value ? L.teal : L.line,
          position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Form */}
      <div style={{
        flex: '1 1 320px', background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Configurações do Painel</div>

        <Field label="TÍTULO DO PAINEL">
          <input style={inp} value={form.titulo}
            onChange={e => set('titulo', e.target.value)} onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="MENSAGEM DO RODAPÉ">
          <input style={inp} placeholder="Ex: Agradecemos a sua preferência!"
            value={form.mensagem_rodape}
            onChange={e => set('mensagem_rodape', e.target.value)} onFocus={focus} onBlur={blur} />
        </Field>

        <div style={{
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 10,
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <Toggle label="Exibir relógio"         value={form.exibir_relogio} onChange={v => set('exibir_relogio', v)} />
          <Toggle label="Exibir data"            value={form.exibir_data}    onChange={v => set('exibir_data',    v)} />
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Field label="COR DO FUNDO">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.cor_fundo}
                  onChange={e => set('cor_fundo', e.target.value)}
                  style={{ width: 40, height: 36, border: `1.5px solid ${L.line}`, borderRadius: 8, padding: 2, cursor: 'pointer', background: L.bg }} />
                <input style={{ ...inp, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  value={form.cor_fundo}
                  onChange={e => set('cor_fundo', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="COR DAS CHAMADAS">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.cor_chamada}
                  onChange={e => set('cor_chamada', e.target.value)}
                  style={{ width: 40, height: 36, border: `1.5px solid ${L.line}`, borderRadius: 8, padding: 2, cursor: 'pointer', background: L.bg }} />
                <input style={{ ...inp, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  value={form.cor_chamada}
                  onChange={e => set('cor_chamada', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
            </Field>
          </div>
        </div>

        <Field label="MÁX. CHAMADAS VISÍVEIS (1-10)">
          <input type="number" min={1} max={10} style={inp}
            value={form.max_chamadas_visiveis}
            onChange={e => set('max_chamadas_visiveis', Math.max(1, Math.min(10, Number(e.target.value))))}
            onFocus={focus} onBlur={blur} />
        </Field>

        {err && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 13,
            background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
          }}>{err}</div>
        )}

        <button
          onClick={salvar}
          disabled={saving}
          style={{
            background: saving ? L.tealDark : saved ? L.green : L.teal,
            color: L.white, border: 'none', borderRadius: 8,
            padding: '10px 0', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', width: '100%',
            transition: 'background 0.3s',
          }}
        >{saving ? 'Salvando…' : saved ? 'Configurações Salvas!' : 'Salvar Configurações'}</button>
      </div>

      {/* Preview */}
      <div style={{ flex: '1 1 340px' }}>
        <div style={{
          fontSize: 11, color: L.t4, marginBottom: 8,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
        }}>PRÉ-VISUALIZAÇÃO</div>
        <TVDisplay clinicaId={clinicaId} config={form} isPreview={true} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Root page
═══════════════════════════════════════════════════════════════ */
const TABS = ['Painel de Controle', 'Visualização TV', 'Configurações do Painel']

export default function PagePainelTV({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab]       = useState(0)
  const [config, setConfig] = useState(null)

  const loadConfig = useCallback(async () => {
    if (!clinicaId) return
    const { data } = await supabase
      .from('painel_config')
      .select('*')
      .eq('clinica_id', clinicaId)
      .maybeSingle()
    setConfig(data || null)
  }, [clinicaId])

  useEffect(() => { loadConfig() }, [loadConfig])

  if (!clinicaId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: L.t4, fontSize: 14 }}>
        Clínica não identificada. Faça login novamente.
      </div>
    )
  }

  return (
    <>
      <style>{STYLES}</style>

      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, letterSpacing: '-0.5px' }}>
            Painel TV / Totem
          </div>
          <div style={{ fontSize: 13, color: L.t4, marginTop: 4 }}>
            Gerenciamento de chamadas para sala de espera e totem de autoatendimento
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: L.surface, padding: 4, borderRadius: 12,
          border: `1px solid ${L.line}`, width: 'fit-content',
        }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === i ? 700 : 500,
                background: tab === i ? L.teal : 'transparent',
                color: tab === i ? L.white : L.t3,
                transition: 'all 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Tab panels */}
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {tab === 0 && <TabControle clinicaId={clinicaId} />}
          {tab === 1 && <TabTV clinicaId={clinicaId} config={config} />}
          {tab === 2 && <TabConfig clinicaId={clinicaId} config={config} onSaved={loadConfig} />}
        </div>
      </div>
    </>
  )
}
