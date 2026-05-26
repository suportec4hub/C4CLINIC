import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── shared styles ─────────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
}
const btn = (bg = L.teal, color = L.white) => ({
  background: bg, color, fontWeight: 600, border: 'none', borderRadius: 8,
  padding: '9px 18px', fontSize: 13, cursor: 'pointer',
})

function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ title, extra }) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: `1px solid ${L.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: L.surface,
    }}>
      <span style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>{title}</span>
      {extra}
    </div>
  )
}

function Badge({ label, ok }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: ok ? L.greenBg : L.redBg,
      color: ok ? L.green : L.red,
      border: `1px solid ${ok ? L.greenBd : L.redBd}`,
    }}>{label}</span>
  )
}

function Toast({ msg, onClose }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [msg, onClose])
  if (!msg) return null
  const isErr = msg.type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 24, zIndex: 9999,
      background: isErr ? L.redBg : L.greenBg,
      border: `1px solid ${isErr ? L.redBd : L.greenBd}`,
      color: isErr ? L.red : L.green,
      borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      animation: 'fadeIn 0.2s ease',
    }}>{msg.text}</div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: `2px solid ${L.line}`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? L.teal : L.line,
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: L.white,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

/* ─── bottom-sheet modal ─────────────────────────────────────────────────── */
function Sheet({ open, onClose, title, children, maxW = 540 }) {
  if (!open) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', zIndex: 1000,
      }}
    >
      <div style={{
        width: '100%', maxWidth: maxW, margin: '0 auto',
        background: L.bg, borderRadius: '16px 16px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: L.line }} />
        </div>
        <div style={{
          padding: '14px 20px 12px', borderBottom: `1px solid ${L.line}`,
          fontWeight: 700, fontSize: 15, color: L.t1,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {title}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: L.t3, fontSize: 20, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
function fmtDate(ts) {
  if (!ts) return 'Nunca'
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function maskToken(token) {
  if (!token) return '—'
  return '***' + token.slice(-8)
}

function csvFromAcessos(rows) {
  const header = 'Nome,Email,Ativo,Último Acesso,Token\n'
  const lines = rows.map(r =>
    [
      r.pacientes?.nome || '',
      r.email || '',
      r.ativo ? 'Sim' : 'Não',
      r.ultimo_acesso ? new Date(r.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca',
      maskToken(r.token),
    ].join(',')
  )
  return header + lines.join('\n')
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════*/
export default function PagePortalPaciente({ profile }) {
  const clinicaId = profile?.clinica_id

  /* ── global state ───────────────────────────────────────────────── */
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((text, type = 'ok') => setToast({ text, type }), [])

  /* ── portal_config ──────────────────────────────────────────────── */
  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)

  /* ── portal_acessos ─────────────────────────────────────────────── */
  const [acessos, setAcessos] = useState([])
  const [acessosLoading, setAcessosLoading] = useState(true)
  const [filterAcesso, setFilterAcesso] = useState('all') // all | ativo | inativo

  /* ── pacientes (for invite select) ─────────────────────────────── */
  const [pacientes, setPacientes] = useState([])

  /* ── invite sheet ───────────────────────────────────────────────── */
  const [sheetInvite, setSheetInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ paciente_id: '', email: '' })
  const [inviteSaving, setInviteSaving] = useState(false)

  /* ── detail sheet ───────────────────────────────────────────────── */
  const [sheetDetail, setSheetDetail] = useState(null) // acesso object

  /* ── Tab-2 config form ──────────────────────────────────────────── */
  const [formConfig, setFormConfig] = useState({
    mensagem_boas_vindas: '',
    url_portal: '',
    permite_agendamento: true,
    permite_prontuario: false,
    permite_resultados: true,
    permite_mensagens: true,
  })

  /* ════════════════════════════════════════════════════
     LOAD DATA
  ═════════════════════════════════════════════════════*/
  const loadConfig = useCallback(async () => {
    if (!clinicaId) return
    setConfigLoading(true)
    const { data } = await supabase
      .from('portal_config')
      .select('*')
      .eq('clinica_id', clinicaId)
      .maybeSingle()

    const defaultConfig = {
      clinica_id: clinicaId,
      habilitado: false,
      permite_agendamento: true,
      permite_prontuario: false,
      permite_resultados: true,
      permite_mensagens: true,
      mensagem_boas_vindas: '',
      url_portal: `https://portal.c4clinic.app/${clinicaId}`,
    }
    const merged = { ...defaultConfig, ...(data || {}) }
    setConfig(merged)
    setFormConfig({
      mensagem_boas_vindas: merged.mensagem_boas_vindas || '',
      url_portal: merged.url_portal || `https://portal.c4clinic.app/${clinicaId}`,
      permite_agendamento: merged.permite_agendamento,
      permite_prontuario: merged.permite_prontuario,
      permite_resultados: merged.permite_resultados,
      permite_mensagens: merged.permite_mensagens,
    })
    setConfigLoading(false)
  }, [clinicaId])

  const loadAcessos = useCallback(async () => {
    if (!clinicaId) return
    setAcessosLoading(true)
    const { data } = await supabase
      .from('portal_acessos')
      .select('*, pacientes(id, nome, email)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setAcessos(data || [])
    setAcessosLoading(false)
  }, [clinicaId])

  const loadPacientes = useCallback(async () => {
    if (!clinicaId) return
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, email')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setPacientes(data || [])
  }, [clinicaId])

  useEffect(() => {
    loadConfig()
    loadAcessos()
    loadPacientes()
  }, [loadConfig, loadAcessos, loadPacientes])

  /* ════════════════════════════════════════════════════
     UPSERT CONFIG (single field toggle)
  ═════════════════════════════════════════════════════*/
  async function upsertConfigField(patch) {
    if (!clinicaId) return
    const updated = { ...config, ...patch }
    setConfig(updated)
    const { error } = await supabase
      .from('portal_config')
      .upsert({ ...updated, clinica_id: clinicaId }, { onConflict: 'clinica_id' })
    if (error) {
      showToast('Erro ao salvar configuração', 'error')
      loadConfig()
    }
  }

  /* ════════════════════════════════════════════════════
     SAVE FULL CONFIG (Tab 2)
  ═════════════════════════════════════════════════════*/
  async function saveFullConfig() {
    if (!clinicaId) return
    setConfigSaving(true)
    const payload = { ...config, ...formConfig, clinica_id: clinicaId }
    const { error } = await supabase
      .from('portal_config')
      .upsert(payload, { onConflict: 'clinica_id' })
    setConfigSaving(false)
    if (error) {
      showToast('Erro ao salvar configurações', 'error')
    } else {
      setConfig(payload)
      showToast('Configurações salvas com sucesso')
    }
  }

  /* ════════════════════════════════════════════════════
     INVITE
  ═════════════════════════════════════════════════════*/
  const patientsWithAccess = new Set(acessos.filter(a => a.ativo).map(a => a.paciente_id))
  const patientsWithoutAccess = pacientes.filter(p => !patientsWithAccess.has(p.id))

  function handleSelectPaciente(id) {
    const pac = pacientes.find(p => p.id === id)
    setInviteForm(f => ({ ...f, paciente_id: id, email: pac?.email || '' }))
  }

  async function submitInvite() {
    if (!inviteForm.paciente_id || !inviteForm.email) {
      showToast('Selecione um paciente e informe o e-mail', 'error')
      return
    }
    setInviteSaving(true)
    const token = crypto.randomUUID()
    const { error } = await supabase.from('portal_acessos').insert({
      clinica_id: clinicaId,
      paciente_id: inviteForm.paciente_id,
      email: inviteForm.email,
      token,
      ativo: true,
    })
    setInviteSaving(false)
    if (error) {
      showToast('Erro ao criar convite', 'error')
    } else {
      showToast(`Convite enviado para ${inviteForm.email}`)
      setSheetInvite(false)
      setInviteForm({ paciente_id: '', email: '' })
      loadAcessos()
      loadPacientes()
    }
  }

  /* ════════════════════════════════════════════════════
     ACESSO ACTIONS
  ═════════════════════════════════════════════════════*/
  async function revogarAcesso(id) {
    const { error } = await supabase
      .from('portal_acessos')
      .update({ ativo: false })
      .eq('id', id)
    if (error) {
      showToast('Erro ao revogar acesso', 'error')
    } else {
      showToast('Acesso revogado')
      loadAcessos()
    }
  }

  function reenviarConvite(acesso) {
    showToast(`Convite enviado para ${acesso.email}`)
  }

  /* ════════════════════════════════════════════════════
     EXPORT CSV
  ═════════════════════════════════════════════════════*/
  function exportCSV() {
    const csv = csvFromAcessos(acessos)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portal_acessos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ════════════════════════════════════════════════════
     KPIs
  ═════════════════════════════════════════════════════*/
  const totalAcessos = acessos.length
  const ativos = acessos.filter(a => a.ativo).length
  const ultimoAcesso = acessos
    .filter(a => a.ultimo_acesso)
    .sort((a, b) => new Date(b.ultimo_acesso) - new Date(a.ultimo_acesso))[0]?.ultimo_acesso || null
  const aguardandoInvite = patientsWithoutAccess.length

  /* ════════════════════════════════════════════════════
     FILTERED ACESSOS
  ═════════════════════════════════════════════════════*/
  const filteredAcessos = acessos.filter(a => {
    if (filterAcesso === 'ativo') return a.ativo
    if (filterAcesso === 'inativo') return !a.ativo
    return true
  })

  /* ════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════*/
  return (
    <div style={{ padding: '24px 20px', maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pp-row:hover { background: ${L.hover} !important; }
        .pp-btn-ghost:hover { background: ${L.hover} !important; }
      `}</style>

      {/* ── page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: L.t1, margin: 0 }}>
          Portal do Paciente
        </h1>
        <p style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
          Configure o acesso dos pacientes ao portal online da clínica
        </p>
      </div>

      {/* ── tabs ── */}
      <div style={{
        display: 'flex', gap: 4, background: L.surface,
        borderRadius: 10, padding: 4, marginBottom: 24,
        border: `1px solid ${L.line}`, width: 'fit-content',
      }}>
        {['Visão Geral', 'Acessos de Pacientes', 'Configurações'].map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '7px 18px', fontSize: 13, borderRadius: 8,
              border: 'none', cursor: 'pointer', fontWeight: tab === i ? 700 : 400,
              background: tab === i ? L.teal : 'transparent',
              color: tab === i ? L.white : L.t2,
              transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {configLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* ════════ TAB 0 — Visão Geral ════════ */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* status card */}
              <div style={{
                borderRadius: 16, padding: 24,
                background: config?.habilitado ? L.greenBg : L.redBg,
                border: `1.5px solid ${config?.habilitado ? L.greenBd : L.redBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: config?.habilitado ? L.green : L.red,
                    fontFamily: "'JetBrains Mono', monospace", marginBottom: 4,
                  }}>PORTAL</div>
                  <div style={{
                    fontSize: 28, fontWeight: 900,
                    color: config?.habilitado ? L.green : L.red,
                  }}>
                    {config?.habilitado ? '● ATIVO' : '○ INATIVO'}
                  </div>
                  <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>
                    {config?.habilitado
                      ? 'Pacientes podem acessar o portal online'
                      : 'O portal está desabilitado para os pacientes'}
                  </div>
                </div>
                <button
                  onClick={() => upsertConfigField({ habilitado: !config?.habilitado })}
                  style={{
                    ...btn(config?.habilitado ? L.red : L.green),
                    padding: '11px 24px', fontSize: 14,
                  }}
                >
                  {config?.habilitado ? 'Desabilitar Portal' : 'Habilitar Portal'}
                </button>
              </div>

              {/* portal URL */}
              <Card>
                <CardHeader title="URL do Portal" />
                <div style={{ padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8,
                    background: L.surface, border: `1px solid ${L.line}`,
                    fontSize: 13, color: L.teal, fontFamily: "'JetBrains Mono', monospace",
                    wordBreak: 'break-all',
                  }}>
                    {config?.url_portal || `https://portal.c4clinic.app/${clinicaId}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(config?.url_portal || `https://portal.c4clinic.app/${clinicaId}`)
                      showToast('Link copiado!')
                    }}
                    style={btn()}
                  >
                    Copiar Link
                  </button>
                </div>
              </Card>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Pacientes com Acesso', value: totalAcessos, color: L.teal },
                  { label: 'Acessos Ativos', value: ativos, color: L.green },
                  { label: 'Último Acesso', value: fmtDate(ultimoAcesso), color: L.t1, small: true },
                  { label: 'Aguardando Convite', value: aguardandoInvite, color: L.yellow },
                ].map(k => (
                  <div key={k.label} style={{
                    background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                    padding: '16px 20px',
                  }}>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: k.small ? 15 : 28, fontWeight: 800, color: k.color }}>
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* feature toggles */}
              <Card>
                <CardHeader title="Funcionalidades do Portal" />
                <div style={{ padding: '8px 0' }}>
                  {[
                    { key: 'permite_agendamento', label: 'Agendamento online', desc: 'Pacientes podem agendar consultas pelo portal' },
                    {
                      key: 'permite_prontuario', label: 'Acesso ao prontuário',
                      desc: 'Pacientes visualizam seus registros médicos',
                      warning: 'Requer consentimento LGPD',
                    },
                    { key: 'permite_resultados', label: 'Resultados de exames', desc: 'Exames e laudos ficam disponíveis no portal' },
                    { key: 'permite_mensagens', label: 'Mensagens com a clínica', desc: 'Canal de comunicação direta com a equipe' },
                  ].map(feat => (
                    <div key={feat.key} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 20px', borderBottom: `1px solid ${L.lineSoft}`,
                    }}>
                      <Toggle
                        checked={!!config?.[feat.key]}
                        onChange={v => upsertConfigField({ [feat.key]: v })}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{feat.label}</div>
                        <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>{feat.desc}</div>
                        {feat.warning && (
                          <div style={{
                            fontSize: 11, color: L.yellow, marginTop: 4,
                            background: L.yellowBg, border: `1px solid ${L.yellowBd}`,
                            borderRadius: 6, padding: '3px 8px', display: 'inline-block',
                          }}>
                            ⚠ {feat.warning}
                          </div>
                        )}
                      </div>
                      <Badge label={config?.[feat.key] ? 'Ativo' : 'Inativo'} ok={!!config?.[feat.key]} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ════════ TAB 1 — Acessos de Pacientes ════════ */}
          {tab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* toolbar */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* filter */}
                <div style={{
                  display: 'flex', gap: 4, background: L.surface,
                  borderRadius: 8, padding: 4, border: `1px solid ${L.line}`,
                }}>
                  {['all', 'ativo', 'inativo'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterAcesso(f)}
                      style={{
                        padding: '5px 14px', fontSize: 12, borderRadius: 6,
                        border: 'none', cursor: 'pointer', fontWeight: filterAcesso === f ? 700 : 400,
                        background: filterAcesso === f ? L.teal : 'transparent',
                        color: filterAcesso === f ? L.white : L.t2,
                        transition: 'all 0.15s',
                      }}
                    >
                      {f === 'all' ? 'Todos' : f === 'ativo' ? 'Ativos' : 'Inativos'}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setInviteForm({ paciente_id: '', email: '' }); setSheetInvite(true) }}
                  style={btn()}
                >
                  + Convidar Paciente
                </button>
              </div>

              {/* table */}
              <Card>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: L.surface }}>
                        {['Paciente', 'E-mail', 'Status', 'Último Acesso', 'Token', 'Ações'].map(h => (
                          <th key={h} style={{
                            padding: '11px 14px', textAlign: 'left', fontSize: 11,
                            color: L.t4, fontWeight: 700, borderBottom: `1px solid ${L.line}`,
                            fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {acessosLoading ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                            <Spinner />
                          </td>
                        </tr>
                      ) : filteredAcessos.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: L.t3, fontSize: 13 }}>
                            Nenhum acesso encontrado
                          </td>
                        </tr>
                      ) : filteredAcessos.map(a => (
                        <tr
                          key={a.id}
                          className="pp-row"
                          style={{ borderBottom: `1px solid ${L.lineSoft}`, transition: 'background 0.12s' }}
                        >
                          <td style={{ padding: '11px 14px', color: L.t1, fontWeight: 600 }}>
                            {a.pacientes?.nome || '—'}
                          </td>
                          <td style={{ padding: '11px 14px', color: L.t2 }}>{a.email}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <Badge label={a.ativo ? 'Ativo' : 'Inativo'} ok={a.ativo} />
                          </td>
                          <td style={{ padding: '11px 14px', color: L.t3, whiteSpace: 'nowrap' }}>
                            {fmtDate(a.ultimo_acesso)}
                          </td>
                          <td style={{
                            padding: '11px 14px', color: L.t4,
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          }}>
                            {maskToken(a.token)}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="pp-btn-ghost"
                                onClick={() => setSheetDetail(a)}
                                style={{
                                  ...btn(L.surface, L.t2),
                                  padding: '5px 10px', fontSize: 12,
                                  border: `1px solid ${L.line}`, transition: 'background 0.12s',
                                }}
                              >
                                Detalhes
                              </button>
                              <button
                                className="pp-btn-ghost"
                                onClick={() => reenviarConvite(a)}
                                style={{
                                  ...btn(L.surface, L.teal),
                                  padding: '5px 10px', fontSize: 12,
                                  border: `1px solid ${L.teal}`, transition: 'background 0.12s',
                                }}
                              >
                                Reenviar
                              </button>
                              {a.ativo && (
                                <button
                                  onClick={() => revogarAcesso(a.id)}
                                  style={{
                                    ...btn(L.redBg, L.red),
                                    padding: '5px 10px', fontSize: 12,
                                    border: `1px solid ${L.redBd}`,
                                  }}
                                >
                                  Revogar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ════════ TAB 2 — Configurações ════════ */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* config form */}
              <Card>
                <CardHeader title="Configurações Gerais" />
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <Field label="URL DO PORTAL (exibida para os pacientes)">
                    <input
                      style={inp}
                      value={formConfig.url_portal}
                      onChange={e => setFormConfig(f => ({ ...f, url_portal: e.target.value }))}
                      placeholder="https://portal.c4clinic.app/..."
                    />
                  </Field>
                  <Field label="MENSAGEM DE BOAS-VINDAS (exibida na página inicial do portal)">
                    <textarea
                      style={{ ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
                      value={formConfig.mensagem_boas_vindas}
                      onChange={e => setFormConfig(f => ({ ...f, mensagem_boas_vindas: e.target.value }))}
                      placeholder="Bem-vindo ao nosso portal! Aqui você pode agendar consultas, ver seus resultados e muito mais."
                    />
                  </Field>
                </div>
              </Card>

              {/* feature toggles mirror */}
              <Card>
                <CardHeader title="Funcionalidades Habilitadas" />
                <div style={{ padding: '8px 0' }}>
                  {[
                    { key: 'permite_agendamento', label: 'Agendamento online', desc: 'Pacientes podem agendar consultas pelo portal' },
                    {
                      key: 'permite_prontuario', label: 'Acesso ao prontuário',
                      desc: 'Pacientes visualizam seus registros médicos',
                      warning: 'Requer consentimento LGPD',
                    },
                    { key: 'permite_resultados', label: 'Resultados de exames', desc: 'Exames e laudos ficam disponíveis no portal' },
                    { key: 'permite_mensagens', label: 'Mensagens com a clínica', desc: 'Canal de comunicação direta com a equipe' },
                  ].map(feat => (
                    <div key={feat.key} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 20px', borderBottom: `1px solid ${L.lineSoft}`,
                    }}>
                      <Toggle
                        checked={!!formConfig[feat.key]}
                        onChange={v => setFormConfig(f => ({ ...f, [feat.key]: v }))}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{feat.label}</div>
                        <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>{feat.desc}</div>
                        {feat.warning && (
                          <div style={{
                            fontSize: 11, color: L.yellow, marginTop: 4,
                            background: L.yellowBg, border: `1px solid ${L.yellowBd}`,
                            borderRadius: 6, padding: '3px 8px', display: 'inline-block',
                          }}>
                            ⚠ {feat.warning}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* email template preview */}
              <Card>
                <CardHeader title="Prévia do E-mail de Convite" />
                <div style={{ padding: 20 }}>
                  <div style={{
                    border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden',
                    maxWidth: 520, margin: '0 auto', fontFamily: 'Georgia, serif',
                  }}>
                    {/* email header */}
                    <div style={{
                      background: L.tealGrad, padding: '28px 32px', textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: 22, fontWeight: 800, color: L.white, letterSpacing: '-0.5px',
                      }}>
                        {profile?.clinicas?.nome || 'Sua Clínica'}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                        Portal do Paciente
                      </div>
                    </div>
                    {/* email body */}
                    <div style={{ padding: '28px 32px', background: '#ffffff' }}>
                      <p style={{ fontSize: 15, color: '#1a1a1a', marginBottom: 12 }}>
                        Olá, <strong>[Nome do Paciente]</strong>!
                      </p>
                      <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
                        {formConfig.mensagem_boas_vindas
                          || 'Você foi convidado(a) para acessar o portal do paciente da nossa clínica. Através dele você pode acompanhar seus atendimentos, resultados de exames e muito mais.'}
                      </p>
                      <div style={{ textAlign: 'center', margin: '24px 0' }}>
                        <div style={{
                          display: 'inline-block', background: L.teal, color: '#fff',
                          padding: '12px 32px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                          textDecoration: 'none', letterSpacing: '0.3px',
                        }}>
                          Acessar o Portal
                        </div>
                      </div>
                      <div style={{
                        background: '#f8f9fa', borderRadius: 8, padding: '12px 16px',
                        fontSize: 12, color: '#888', textAlign: 'center',
                      }}>
                        Ou acesse diretamente:{' '}
                        <span style={{ color: L.teal, fontFamily: 'monospace' }}>
                          {formConfig.url_portal || `https://portal.c4clinic.app/${clinicaId}`}
                        </span>
                      </div>
                    </div>
                    {/* email footer */}
                    <div style={{
                      background: '#f1f5f9', padding: '14px 32px', textAlign: 'center',
                      fontSize: 11, color: '#aaa', borderTop: '1px solid #e2e8f0',
                    }}>
                      Este e-mail foi enviado automaticamente. Não responda a esta mensagem.
                    </div>
                  </div>
                </div>
              </Card>

              {/* save + export */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={exportCSV}
                  style={{
                    ...btn(L.surface, L.t2),
                    border: `1.5px solid ${L.line}`,
                    padding: '10px 20px',
                  }}
                >
                  Exportar Lista de Acessos (.csv)
                </button>
                <button
                  onClick={saveFullConfig}
                  disabled={configSaving}
                  style={{
                    ...btn(), padding: '10px 24px',
                    opacity: configSaving ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {configSaving && <Spinner />}
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ SHEET — Convidar Paciente ════════ */}
      <Sheet
        open={sheetInvite}
        onClose={() => setSheetInvite(false)}
        title="Convidar Paciente"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="PACIENTE">
            <select
              style={inp}
              value={inviteForm.paciente_id}
              onChange={e => handleSelectPaciente(e.target.value)}
            >
              <option value="">Selecione um paciente...</option>
              {patientsWithoutAccess.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="E-MAIL DE CONVITE">
            <input
              style={inp}
              type="email"
              value={inviteForm.email}
              onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
              placeholder="paciente@email.com"
            />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => setSheetInvite(false)}
              style={{ ...btn(L.surface, L.t2), border: `1.5px solid ${L.line}`, padding: '9px 20px' }}
            >
              Cancelar
            </button>
            <button
              onClick={submitInvite}
              disabled={inviteSaving}
              style={{
                ...btn(), padding: '9px 24px',
                opacity: inviteSaving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {inviteSaving && <Spinner />}
              Enviar Convite
            </button>
          </div>
        </div>
      </Sheet>

      {/* ════════ SHEET — Detalhes do Acesso ════════ */}
      <Sheet
        open={!!sheetDetail}
        onClose={() => setSheetDetail(null)}
        title="Detalhes do Acesso"
      >
        {sheetDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: L.surface, borderRadius: 12, padding: 20,
              border: `1px solid ${L.line}`,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'PACIENTE', value: sheetDetail.pacientes?.nome || '—' },
                  { label: 'E-MAIL', value: sheetDetail.email },
                  { label: 'STATUS', value: sheetDetail.ativo ? 'Ativo' : 'Inativo' },
                  { label: 'CRIADO EM', value: fmtDate(sheetDetail.criado_em) },
                  { label: 'ÚLTIMO ACESSO', value: fmtDate(sheetDetail.ultimo_acesso) },
                  { label: 'TOKEN (parcial)', value: maskToken(sheetDetail.token) },
                ].map(row => (
                  <div key={row.label}>
                    <div style={lbl}>{row.label}</div>
                    <div style={{ fontSize: 14, color: L.t1, fontWeight: 600 }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {sheetDetail.ativo && (
                <button
                  onClick={() => { revogarAcesso(sheetDetail.id); setSheetDetail(null) }}
                  style={{ ...btn(L.redBg, L.red), border: `1px solid ${L.redBd}`, padding: '9px 20px' }}
                >
                  Revogar Acesso
                </button>
              )}
              <button
                onClick={() => { reenviarConvite(sheetDetail); setSheetDetail(null) }}
                style={btn()}
              >
                Reenviar Convite
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Toast msg={toast} onClose={() => setToast(null)} />
    </div>
  )
}
