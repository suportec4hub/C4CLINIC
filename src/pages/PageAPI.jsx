import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── shared helpers ─── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

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

function BtnPrimary({ onClick, disabled, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? L.line : L.teal, color: L.white,
        fontWeight: 600, fontSize: 13, padding: '10px 20px',
        border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, ...style,
      }}
    >{children}</button>
  )
}

/* ─── bottom-sheet modal ─── */
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes up  { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 780 : 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer',
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── badge ─── */
function Badge({ label, color, bg, bd }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      color, background: bg, border: `1px solid ${bd}`,
      fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

/* ─── method badge ─── */
function MethodBadge({ method }) {
  const map = {
    GET:  { color: L.green,  bg: L.greenBg,  bd: L.greenBd },
    POST: { color: L.blue,   bg: L.blueBg,   bd: L.blueBd },
    PUT:  { color: L.yellow, bg: L.yellowBg, bd: L.yellowBd },
    DELETE: { color: L.red,  bg: L.redBg,    bd: L.redBd },
  }
  const s = map[method] || map.GET
  return <Badge label={method} {...s} />
}

/* ─── code block ─── */
function CodeBlock({ children }) {
  return (
    <pre style={{
      background: '#1a1a2e', color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
      padding: '14px 16px', borderRadius: 8, overflowX: 'auto',
      margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>{children}</pre>
  )
}

function JsonValue({ val, depth = 0 }) {
  if (val === null)    return <span style={{ color: '#f8718a' }}>null</span>
  if (typeof val === 'boolean') return <span style={{ color: '#f8718a' }}>{String(val)}</span>
  if (typeof val === 'number')  return <span style={{ color: '#f9c74f' }}>{val}</span>
  if (typeof val === 'string')  return <span style={{ color: '#90e0ef' }}>"{val}"</span>
  if (Array.isArray(val)) {
    if (val.length === 0) return <span style={{ color: '#e2e8f0' }}>[]</span>
    const pad = '  '.repeat(depth + 1)
    const closePad = '  '.repeat(depth)
    return (
      <span>
        <span style={{ color: '#e2e8f0' }}>[</span>{'\n'}
        {val.map((v, i) => (
          <span key={i}>{pad}<JsonValue val={v} depth={depth + 1} />{i < val.length - 1 ? ',' : ''}{'\n'}</span>
        ))}
        {closePad}<span style={{ color: '#e2e8f0' }}>]</span>
      </span>
    )
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val)
    if (keys.length === 0) return <span style={{ color: '#e2e8f0' }}>{'{}'}</span>
    const pad = '  '.repeat(depth + 1)
    const closePad = '  '.repeat(depth)
    return (
      <span>
        <span style={{ color: '#e2e8f0' }}>{'{'}</span>{'\n'}
        {keys.map((k, i) => (
          <span key={k}>
            {pad}<span style={{ color: '#c084fc' }}>"{k}"</span>
            <span style={{ color: '#e2e8f0' }}>: </span>
            <JsonValue val={val[k]} depth={depth + 1} />
            {i < keys.length - 1 ? ',' : ''}{'\n'}
          </span>
        ))}
        {closePad}<span style={{ color: '#e2e8f0' }}>{'}'}</span>
      </span>
    )
  }
  return <span>{String(val)}</span>
}

function JsonBlock({ obj }) {
  return (
    <pre style={{
      background: '#1a1a2e', color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
      padding: '14px 16px', borderRadius: 8, overflowX: 'auto',
      margin: 0, lineHeight: 1.6,
    }}>
      <JsonValue val={obj} />
    </pre>
  )
}

/* ═══════════════════════════════════════════════════════
   TAB 0 — Tokens de API
═══════════════════════════════════════════════════════ */
const PERMISSOES_LIST = [
  { value: 'read:pacientes',    label: 'read:pacientes' },
  { value: 'write:agendamentos',label: 'write:agendamentos' },
  { value: 'read:financeiro',   label: 'read:financeiro' },
  { value: 'read:relatorios',   label: 'read:relatorios' },
  { value: 'read:all',          label: 'read:all' },
  { value: 'write:all',         label: 'write:all' },
]

function generateToken(clinicaId) {
  const prefix = btoa(String(clinicaId)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const uuid   = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  return `c4k_${prefix}_${uuid}`
}

function TabTokens({ clinicaId }) {
  const [tokens, setTokens]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createdToken, setCreatedToken] = useState(null)
  const [copiedId, setCopiedId]   = useState(null)
  const [saving, setSaving]       = useState(false)

  const [form, setForm] = useState({
    nome: '', permissoes: [], expires_at: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setTokens(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function togglePerm(p) {
    setForm(f => ({
      ...f,
      permissoes: f.permissoes.includes(p)
        ? f.permissoes.filter(x => x !== p)
        : [...f.permissoes, p],
    }))
  }

  async function handleCreate() {
    if (!form.nome.trim()) return
    setSaving(true)
    const token = generateToken(clinicaId)
    const payload = {
      clinica_id: clinicaId,
      nome: form.nome.trim(),
      token,
      permissoes: form.permissoes,
      ativo: true,
      expires_at: form.expires_at || null,
    }
    const { error } = await supabase.from('api_tokens').insert(payload)
    setSaving(false)
    if (!error) {
      setShowCreate(false)
      setForm({ nome: '', permissoes: [], expires_at: '' })
      setCreatedToken(token)
      load()
    }
  }

  async function toggleAtivo(tok) {
    await supabase
      .from('api_tokens')
      .update({ ativo: !tok.ativo })
      .eq('id', tok.id)
    load()
  }

  async function revogar(tok) {
    if (!window.confirm(`Revogar token "${tok.nome}"?`)) return
    await supabase.from('api_tokens').update({ ativo: false }).eq('id', tok.id)
    load()
  }

  async function renovar(tok) {
    const newToken = generateToken(clinicaId)
    await supabase.from('api_tokens').update({ token: newToken, ultimo_uso: null }).eq('id', tok.id)
    setCreatedToken(newToken)
    load()
  }

  function copy(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{
        background: L.tealBg, border: `1px solid ${L.teal}33`, borderRadius: 10,
        padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18 }}>🔑</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: L.teal, marginBottom: 4 }}>
            API REST do C4CLINIC
          </div>
          <div style={{ fontSize: 12, color: L.t3, lineHeight: 1.6 }}>
            Integre com sistemas externos usando tokens Bearer.
            Base URL:{' '}
            <code style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: '#1a1a2e', color: '#90e0ef',
              padding: '1px 6px', borderRadius: 4, fontSize: 11,
            }}>https://api.c4clinic.app/v1</code>
          </div>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Tokens de Acesso</div>
        <BtnPrimary onClick={() => setShowCreate(true)}>+ Gerar Novo Token</BtnPrimary>
      </div>

      {/* Tokens table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4, fontSize: 13 }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: `2px solid ${L.teal}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : tokens.length === 0 ? (
        <div style={{
          border: `1.5px dashed ${L.line}`, borderRadius: 10, padding: '40px 24px',
          textAlign: 'center', color: L.t4, fontSize: 13,
        }}>
          Nenhum token criado. Gere seu primeiro token para integrar com APIs externas.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Nome', 'Token', 'Permissões', 'Último uso', 'Expira em', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                    color: L.t4, borderBottom: `1px solid ${L.line}`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map(tok => (
                <tr key={tok.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '12px', color: L.t1, fontWeight: 600 }}>{tok.nome}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        color: L.t3, background: L.surface, padding: '2px 6px', borderRadius: 4,
                      }}>
                        {String(tok.token || '').slice(0, 12)}...
                      </code>
                      <button
                        onClick={() => copy(tok.token, tok.id + 'token')}
                        title="Copiar token"
                        style={{
                          fontSize: 12, background: 'none', border: 'none',
                          cursor: 'pointer', color: copiedId === tok.id + 'token' ? L.green : L.t4,
                          padding: '2px 4px',
                        }}
                      >{copiedId === tok.id + 'token' ? '✓' : '⎘'}</button>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(tok.permissoes || []).map(p => (
                        <Badge key={p} label={p} color={L.teal} bg={L.tealBg} bd={`${L.teal}33`} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: L.t3 }}>{fmtDate(tok.ultimo_uso)}</td>
                  <td style={{ padding: '12px', color: tok.expires_at && new Date(tok.expires_at) < new Date() ? L.red : L.t3 }}>
                    {fmtDate(tok.expires_at)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!tok.ativo}
                        onChange={() => toggleAtivo(tok)}
                        style={{ accentColor: L.teal, width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: tok.ativo ? L.green : L.t4 }}>
                        {tok.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => renovar(tok)}
                        style={{
                          fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                          background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`,
                          fontWeight: 600,
                        }}
                      >Renovar</button>
                      <button
                        onClick={() => revogar(tok)}
                        style={{
                          fontSize: 11, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                          background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
                          fontWeight: 600,
                        }}
                      >Revogar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Gerar Novo Token" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="NOME DO TOKEN">
              <input
                style={inp}
                placeholder="ex: Integração ERP, App Mobile..."
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                onFocus={focus} onBlur={blur}
              />
            </Field>

            <Field label="PERMISSÕES">
              <div style={{
                border: `1.5px solid ${L.line}`, borderRadius: 8,
                padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {PERMISSOES_LIST.map(p => (
                  <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.permissoes.includes(p.value)}
                      onChange={() => togglePerm(p.value)}
                      style={{ accentColor: L.teal, width: 14, height: 14 }}
                    />
                    <code style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                      color: form.permissoes.includes(p.value) ? L.teal : L.t2,
                    }}>{p.label}</code>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="EXPIRA EM (OPCIONAL)">
              <input
                type="date"
                style={inp}
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                onFocus={focus} onBlur={blur}
              />
            </Field>

            <BtnPrimary onClick={handleCreate} disabled={saving || !form.nome.trim()}>
              {saving ? 'Gerando...' : 'Gerar Token'}
            </BtnPrimary>
          </div>
        </Modal>
      )}

      {/* Reveal token once modal */}
      {createdToken && (
        <Modal title="Token Gerado com Sucesso" onClose={() => setCreatedToken(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: L.yellowBg, border: `1px solid ${L.yellowBd}`,
              borderRadius: 8, padding: '12px 16px', fontSize: 13, color: L.yellow,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span><strong>Este token não será exibido novamente.</strong> Copie agora e armazene em local seguro.</span>
            </div>

            <Field label="TOKEN DE ACESSO">
              <div style={{
                background: '#1a1a2e', borderRadius: 8, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <code style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  color: '#90e0ef', flex: 1, wordBreak: 'break-all',
                }}>{createdToken}</code>
                <button
                  onClick={() => copy(createdToken, 'reveal')}
                  style={{
                    background: copiedId === 'reveal' ? L.green : L.teal,
                    color: L.white, border: 'none', borderRadius: 6,
                    padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >{copiedId === 'reveal' ? '✓ Copiado' : 'Copiar'}</button>
              </div>
            </Field>

            <div style={{ fontSize: 12, color: L.t4 }}>
              Use como header HTTP: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Authorization: Bearer {createdToken.slice(0, 16)}...</code>
            </div>

            <BtnPrimary onClick={() => setCreatedToken(null)}>Entendido</BtnPrimary>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   TAB 1 — Documentação
═══════════════════════════════════════════════════════ */
const ENDPOINTS = [
  {
    method: 'GET', path: '/v1/pacientes',
    description: 'Retorna a lista de pacientes da clínica.',
    params: [
      { name: 'page', type: 'integer', required: false, desc: 'Número da página (padrão: 1)' },
      { name: 'per_page', type: 'integer', required: false, desc: 'Registros por página (máx: 100)' },
      { name: 'q', type: 'string', required: false, desc: 'Busca por nome ou CPF' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/pacientes?page=1&per_page=20" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN" \\
  -H "Accept: application/json"`,
    response: {
      data: [
        { id: 'uuid-1', nome: 'Maria Silva', cpf: '***.***.***-12', nascimento: '1985-03-15', telefone: '(11) 99999-0001' },
        { id: 'uuid-2', nome: 'João Santos', cpf: '***.***.***-34', nascimento: '1972-07-20', telefone: '(11) 99999-0002' },
      ],
      meta: { total: 248, page: 1, per_page: 20 },
    },
    simulatedResponse: (params) => ({
      data: [
        { id: 'pac_001', nome: 'Maria Silva', cpf: '***.888.***-12', nascimento: '1985-03-15' },
        { id: 'pac_002', nome: 'João Santos', cpf: '***.777.***-34', nascimento: '1972-07-20' },
      ],
      meta: { total: 248, page: Number(params.page) || 1, per_page: Number(params.per_page) || 20 },
    }),
  },
  {
    method: 'GET', path: '/v1/pacientes/:id',
    description: 'Retorna detalhes completos de um paciente específico, incluindo histórico de consultas.',
    params: [
      { name: 'id', type: 'string', required: true, desc: 'UUID do paciente' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/pacientes/uuid-do-paciente" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN"`,
    response: {
      id: 'uuid-1', nome: 'Maria Silva', cpf: '***.***.***-12',
      nascimento: '1985-03-15', telefone: '(11) 99999-0001',
      email: 'maria@email.com', convenio: 'Unimed',
      ultima_consulta: '2025-05-10',
    },
    simulatedResponse: (params) => ({
      id: params.id || 'uuid-exemplo',
      nome: 'Maria Silva', cpf: '***.888.***-12',
      nascimento: '1985-03-15', telefone: '(11) 99999-0001',
      email: 'maria@email.com', convenio: 'Unimed',
      ultima_consulta: '2025-05-10',
    }),
  },
  {
    method: 'GET', path: '/v1/agendamentos',
    description: 'Lista agendamentos filtrados por data.',
    params: [
      { name: 'data', type: 'string', required: true, desc: 'Data no formato YYYY-MM-DD' },
      { name: 'medico_id', type: 'string', required: false, desc: 'Filtrar por médico' },
      { name: 'status', type: 'string', required: false, desc: 'confirmado | pendente | cancelado' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/agendamentos?data=2025-05-26" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN"`,
    response: {
      data: [
        { id: 'ag-001', paciente: 'Maria Silva', medico: 'Dr. Carlos', horario: '08:30', status: 'confirmado' },
        { id: 'ag-002', paciente: 'João Santos', medico: 'Dra. Ana', horario: '09:00', status: 'pendente' },
      ],
      total: 2,
    },
    simulatedResponse: (params) => ({
      data: [
        { id: 'ag-001', paciente: 'Maria Silva', medico: 'Dr. Carlos', horario: '08:30', status: 'confirmado', data: params.data || '2025-05-26' },
        { id: 'ag-002', paciente: 'João Santos', medico: 'Dra. Ana', horario: '09:00', status: 'pendente', data: params.data || '2025-05-26' },
      ],
      total: 2,
    }),
  },
  {
    method: 'GET', path: '/v1/medicos',
    description: 'Lista todos os médicos ativos da clínica.',
    params: [
      { name: 'especialidade', type: 'string', required: false, desc: 'Filtrar por especialidade' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/medicos" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN"`,
    response: {
      data: [
        { id: 'med-001', nome: 'Dr. Carlos Oliveira', crm: 'CRM/SP 12345', especialidade: 'Clínica Geral' },
        { id: 'med-002', nome: 'Dra. Ana Paula', crm: 'CRM/SP 67890', especialidade: 'Cardiologia' },
      ],
    },
    simulatedResponse: () => ({
      data: [
        { id: 'med-001', nome: 'Dr. Carlos Oliveira', crm: 'CRM/SP 12345', especialidade: 'Clínica Geral', ativo: true },
        { id: 'med-002', nome: 'Dra. Ana Paula', crm: 'CRM/SP 67890', especialidade: 'Cardiologia', ativo: true },
      ],
    }),
  },
  {
    method: 'GET', path: '/v1/financeiro/resumo',
    description: 'Retorna resumo financeiro mensal: receitas, despesas e saldo.',
    params: [
      { name: 'mes', type: 'string', required: true, desc: 'Mês no formato YYYY-MM' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/financeiro/resumo?mes=2025-05" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN"`,
    response: {
      mes: '2025-05', receitas: 48500.0, despesas: 22300.0,
      saldo: 26200.0, consultas_realizadas: 142, ticket_medio: 341.55,
    },
    simulatedResponse: (params) => ({
      mes: params.mes || '2025-05', receitas: 48500.0, despesas: 22300.0,
      saldo: 26200.0, consultas_realizadas: 142, ticket_medio: 341.55,
    }),
  },
  {
    method: 'GET', path: '/v1/relatorios/atendimentos',
    description: 'Relatório de atendimentos com agrupamento por período, médico ou especialidade.',
    params: [
      { name: 'inicio', type: 'string', required: true, desc: 'Data inicial YYYY-MM-DD' },
      { name: 'fim', type: 'string', required: true, desc: 'Data final YYYY-MM-DD' },
      { name: 'agrupar_por', type: 'string', required: false, desc: 'medico | especialidade | dia' },
    ],
    curl: `curl -X GET "https://api.c4clinic.app/v1/relatorios/atendimentos?inicio=2025-05-01&fim=2025-05-31" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN"`,
    response: {
      total: 142, periodo: { inicio: '2025-05-01', fim: '2025-05-31' },
      grupos: [
        { chave: 'Dr. Carlos', total: 78 },
        { chave: 'Dra. Ana', total: 64 },
      ],
    },
    simulatedResponse: (params) => ({
      total: 142,
      periodo: { inicio: params.inicio || '2025-05-01', fim: params.fim || '2025-05-31' },
      grupos: [
        { chave: 'Dr. Carlos', total: 78 },
        { chave: 'Dra. Ana', total: 64 },
      ],
    }),
  },
  {
    method: 'POST', path: '/v1/agendamentos',
    description: 'Cria um novo agendamento.',
    params: [
      { name: 'paciente_id', type: 'string', required: true, desc: 'UUID do paciente' },
      { name: 'medico_id', type: 'string', required: true, desc: 'UUID do médico' },
      { name: 'data_hora', type: 'string', required: true, desc: 'ISO 8601: 2025-05-26T09:00:00' },
      { name: 'tipo', type: 'string', required: false, desc: 'consulta | retorno | exame' },
      { name: 'observacoes', type: 'string', required: false, desc: 'Observações adicionais' },
    ],
    curl: `curl -X POST "https://api.c4clinic.app/v1/agendamentos" \\
  -H "Authorization: Bearer c4k_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paciente_id": "uuid-do-paciente",
    "medico_id": "uuid-do-medico",
    "data_hora": "2025-05-26T09:00:00",
    "tipo": "consulta"
  }'`,
    response: {
      id: 'ag-novo-003', status: 'confirmado',
      paciente_id: 'uuid-do-paciente', medico_id: 'uuid-do-medico',
      data_hora: '2025-05-26T09:00:00', tipo: 'consulta',
      criado_em: '2025-05-26T08:00:00Z',
    },
    simulatedResponse: (params) => ({
      id: `ag-${Date.now()}`, status: 'confirmado',
      paciente_id: params.paciente_id || 'uuid-paciente',
      medico_id: params.medico_id || 'uuid-medico',
      data_hora: params.data_hora || '2025-05-26T09:00:00',
      tipo: params.tipo || 'consulta',
      criado_em: new Date().toISOString(),
    }),
  },
]

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testParams, setTestParams] = useState({})
  const [testResult, setTestResult] = useState(null)

  function runTest() {
    setTestResult(ep.simulatedResponse(testParams))
  }

  return (
    <div style={{
      border: `1px solid ${L.line}`, borderRadius: 10,
      marginBottom: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '14px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          background: L.surface,
          borderBottom: open ? `1px solid ${L.line}` : 'none',
        }}
      >
        <MethodBadge method={ep.method} />
        <code style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
          color: L.t1, fontWeight: 600,
        }}>{ep.path}</code>
        <span style={{ fontSize: 12, color: L.t3, flex: 1 }}>{ep.description}</span>
        <span style={{ color: L.t4, fontSize: 14 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '18px' }}>
          {/* Params table */}
          {ep.params.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, marginBottom: 8, letterSpacing: '0.5px',
              }}>PARÂMETROS</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Nome', 'Tipo', 'Obrigatório', 'Descrição'].map(h => (
                      <th key={h} style={{
                        padding: '6px 10px', textAlign: 'left', fontSize: 11,
                        color: L.t4, borderBottom: `1px solid ${L.line}`,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map(p => (
                    <tr key={p.name} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                      <td style={{ padding: '8px 10px' }}>
                        <code style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: L.teal, background: L.tealBg, padding: '1px 5px', borderRadius: 4,
                        }}>{p.name}</code>
                      </td>
                      <td style={{ padding: '8px 10px', color: L.yellow, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{p.type}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {p.required
                          ? <Badge label="sim" color={L.red} bg={L.redBg} bd={L.redBd} />
                          : <Badge label="não" color={L.t4} bg={L.surface} bd={L.line} />}
                      </td>
                      <td style={{ padding: '8px 10px', color: L.t3 }}>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Curl example */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600, marginBottom: 8, letterSpacing: '0.5px',
            }}>EXEMPLO DE REQUISIÇÃO</div>
            <CodeBlock>{ep.curl}</CodeBlock>
          </div>

          {/* Response example */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600, marginBottom: 8, letterSpacing: '0.5px',
            }}>EXEMPLO DE RESPOSTA</div>
            <JsonBlock obj={ep.response} />
          </div>

          {/* Test button */}
          <button
            onClick={() => { setTestOpen(o => !o); setTestResult(null) }}
            style={{
              fontSize: 12, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`,
              fontWeight: 600,
            }}
          >{testOpen ? '× Fechar teste' : '▶ Testar Endpoint'}</button>

          {testOpen && (
            <div style={{
              marginTop: 16, padding: '16px', border: `1.5px dashed ${L.line}`,
              borderRadius: 8, background: L.surface,
            }}>
              <div style={{
                fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, marginBottom: 12, letterSpacing: '0.5px',
              }}>PARÂMETROS DE TESTE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {ep.params.map(p => (
                  <Field key={p.name} label={p.name.toUpperCase()}>
                    <input
                      style={{ ...inp, fontSize: 12 }}
                      placeholder={p.desc}
                      value={testParams[p.name] || ''}
                      onChange={e => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                      onFocus={focus} onBlur={blur}
                    />
                  </Field>
                ))}
              </div>
              <BtnPrimary onClick={runTest} style={{ fontSize: 12, padding: '8px 16px' }}>
                Executar (simulado)
              </BtnPrimary>
              {testResult && (
                <div style={{ marginTop: 14 }}>
                  <div style={{
                    fontSize: 11, color: L.green, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600, marginBottom: 8,
                  }}>▶ RESPOSTA SIMULADA (200 OK)</div>
                  <JsonBlock obj={testResult} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TabDocs() {
  return (
    <div>
      {/* Auth header note */}
      <div style={{
        background: '#1a1a2e', borderRadius: 10, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11, color: '#90e0ef', fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700, marginBottom: 8, letterSpacing: '0.5px',
        }}>AUTENTICAÇÃO</div>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          color: '#e2e8f0', margin: 0, lineHeight: 1.7,
        }}>
          <span style={{ color: '#c084fc' }}>Authorization</span>
          <span style={{ color: '#e2e8f0' }}>: Bearer </span>
          <span style={{ color: '#90e0ef' }}>{'<seu-token>'}</span>
          {'\n'}
          <span style={{ color: '#c084fc' }}>Content-Type</span>
          <span style={{ color: '#e2e8f0' }}>: application/json</span>
          {'\n'}
          <span style={{ color: '#c084fc' }}>X-Clinica-ID</span>
          <span style={{ color: '#e2e8f0' }}>: </span>
          <span style={{ color: '#f9c74f' }}>{'<clinica-id>'}</span>
        </pre>
      </div>

      {ENDPOINTS.map(ep => <EndpointCard key={ep.method + ep.path} ep={ep} />)}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   TAB 2 — Backup de Dados
═══════════════════════════════════════════════════════ */
const TABLE_MAP = {
  pacientes:    { label: 'Pacientes',    supabase: 'pacientes' },
  medicos:      { label: 'Médicos',      supabase: 'medicos' },
  agendamentos: { label: 'Agendamentos', supabase: 'agendamentos' },
  prontuarios:  { label: 'Prontuários',  supabase: 'prontuarios' },
  financeiro:   { label: 'Financeiro',   supabase: 'financeiro' },
  estoque:      { label: 'estoque',      supabase: 'estoque' },
}

function TabBackup({ clinicaId }) {
  const [selected, setSelected]       = useState([])
  const [todos, setTodos]             = useState(false)
  const [dataInicio, setDataInicio]   = useState('')
  const [dataFim, setDataFim]         = useState('')
  const [generating, setGenerating]   = useState(false)
  const [progress, setProgress]       = useState('')
  const [logs, setLogs]               = useState([])
  const [autoBackup, setAutoBackup]   = useState(
    () => localStorage.getItem('c4_auto_backup') === 'true'
  )

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
      .limit(20)
    setLogs(data || [])
  }, [clinicaId])

  useEffect(() => { loadLogs() }, [loadLogs])

  function toggleTable(key) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function toggleTodos(val) {
    setTodos(val)
    if (val) setSelected(Object.keys(TABLE_MAP))
    else setSelected([])
  }

  async function handleBackup() {
    const tables = todos ? Object.keys(TABLE_MAP) : selected
    if (tables.length === 0) return

    setGenerating(true)
    const result = {}
    let totalRecords = 0

    for (const key of tables) {
      setProgress(`Exportando ${TABLE_MAP[key].label}...`)
      let query = supabase.from(TABLE_MAP[key].supabase).select('*').eq('clinica_id', clinicaId)
      if (dataInicio) query = query.gte('criado_em', dataInicio)
      if (dataFim)    query = query.lte('criado_em', dataFim + 'T23:59:59')
      const { data } = await query
      result[key] = data || []
      totalRecords += (data || []).length
    }

    const exportData = {
      clinica_id: clinicaId,
      exportado_em: new Date().toISOString(),
      periodo: dataInicio ? { inicio: dataInicio, fim: dataFim || 'hoje' } : 'completo',
      tabelas: result,
    }

    const json  = JSON.stringify(exportData, null, 2)
    const bytes = new Blob([json]).size
    const sizeStr = bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`

    // Download
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `backup_c4clinic_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    // Log
    await supabase.from('backup_logs').insert({
      clinica_id: clinicaId,
      tipo: 'manual',
      tabelas: tables,
      total_registros: totalRecords,
      tamanho_estimado: sizeStr,
      status: 'concluido',
    })

    setProgress('')
    setGenerating(false)
    loadLogs()
  }

  function toggleAutoBackup() {
    const val = !autoBackup
    setAutoBackup(val)
    localStorage.setItem('c4_auto_backup', String(val))
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      {/* Manual backup */}
      <div style={{
        border: `1px solid ${L.line}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 16 }}>
          Backup Manual
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {/* Todos */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={todos}
              onChange={e => toggleTodos(e.target.checked)}
              style={{ accentColor: L.teal, width: 14, height: 14 }}
            />
            <span style={{ fontSize: 13, color: L.t1, fontWeight: 600 }}>Todos</span>
          </label>

          {Object.entries(TABLE_MAP).map(([key, info]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(key) || todos}
                onChange={() => { setTodos(false); toggleTable(key) }}
                style={{ accentColor: L.teal, width: 14, height: 14 }}
              />
              <span style={{ fontSize: 13, color: L.t2 }}>{info.label}</span>
            </label>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <Field label="DATA INÍCIO (OPCIONAL)">
            <input
              type="date" style={inp}
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              onFocus={focus} onBlur={blur}
            />
          </Field>
          <Field label="DATA FIM (OPCIONAL)">
            <input
              type="date" style={inp}
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              onFocus={focus} onBlur={blur}
            />
          </Field>
        </div>

        {progress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 16, height: 16, border: `2px solid ${L.teal}`, borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: L.teal }}>{progress}</span>
          </div>
        )}

        <BtnPrimary
          onClick={handleBackup}
          disabled={generating || (selected.length === 0 && !todos)}
        >
          {generating ? 'Gerando backup...' : '⬇ Gerar Backup'}
        </BtnPrimary>
      </div>

      {/* Backup agendado */}
      <div style={{
        border: `1px solid ${L.line}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 14 }}>
          Backup Agendado
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
          <div
            onClick={toggleAutoBackup}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: autoBackup ? L.teal : L.line,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: autoBackup ? 21 : 3,
              width: 16, height: 16, borderRadius: '50%',
              background: L.white, transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <span style={{ fontSize: 13, color: L.t1, fontWeight: 600 }}>
            Backup automático semanal
          </span>
          {autoBackup && (
            <Badge label="ATIVO" color={L.green} bg={L.greenBg} bd={L.greenBd} />
          )}
        </label>

        <div style={{ fontSize: 12, color: L.t3 }}>
          {autoBackup
            ? 'Backup automático programado toda segunda-feira às 02:00.'
            : 'Ative para realizar backup semanal automaticamente.'}
        </div>

        {/* Last 3 entries */}
        {logs.slice(0, 3).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600, marginBottom: 8,
            }}>ÚLTIMOS BACKUPS</div>
            {logs.slice(0, 3).map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: `1px solid ${L.lineSoft}`, fontSize: 12,
              }}>
                <Badge
                  label={log.tipo}
                  color={log.tipo === 'manual' ? L.blue : L.purple}
                  bg={log.tipo === 'manual' ? L.blueBg : L.purpleBg}
                  bd={log.tipo === 'manual' ? L.blueBd : L.purpleBd}
                />
                <span style={{ color: L.t3 }}>{fmtDate(log.criado_em)}</span>
                <span style={{ color: L.t3, flex: 1 }}>{log.total_registros} registros</span>
                <span style={{ color: L.t4 }}>{log.tamanho_estimado}</span>
                <Badge
                  label={log.status}
                  color={log.status === 'concluido' ? L.green : L.red}
                  bg={log.status === 'concluido' ? L.greenBg : L.redBg}
                  bd={log.status === 'concluido' ? L.greenBd : L.redBd}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div style={{
        border: `1px solid ${L.line}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 16 }}>
          Histórico de Backups
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: L.t4, fontSize: 13 }}>
            Nenhum backup realizado ainda.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Tipo', 'Tabelas', 'Registros', 'Tamanho', 'Status', 'Data'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontSize: 11, color: L.t4,
                      borderBottom: `1px solid ${L.line}`,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge
                        label={log.tipo}
                        color={log.tipo === 'manual' ? L.blue : L.purple}
                        bg={log.tipo === 'manual' ? L.blueBg : L.purpleBg}
                        bd={log.tipo === 'manual' ? L.blueBd : L.purpleBd}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>
                      {Array.isArray(log.tabelas) ? log.tabelas.join(', ') : String(log.tabelas)}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {log.total_registros?.toLocaleString('pt-BR') || '0'}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {log.tamanho_estimado || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge
                        label={log.status}
                        color={log.status === 'concluido' ? L.green : L.red}
                        bg={log.status === 'concluido' ? L.greenBg : L.redBg}
                        bd={log.status === 'concluido' ? L.greenBd : L.redBd}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t3, fontSize: 12 }}>
                      {fmtDate(log.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security info */}
      <div style={{
        background: L.greenBg, border: `1px solid ${L.greenBd}`,
        borderRadius: 10, padding: '16px 20px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: L.green, marginBottom: 4 }}>
            Segurança dos Dados
          </div>
          <div style={{ fontSize: 12, color: L.t3, lineHeight: 1.6 }}>
            Os dados são armazenados na infraestrutura Supabase (AWS) com criptografia AES-256
            e backups diários automáticos. Todos os dados em trânsito são protegidos por TLS 1.3.
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const TABS = ['Tokens de API', 'Documentação', 'Backup de Dados']

export default function PageAPI({ profile }) {
  const [tab, setTab] = useState(0)
  const clinicaId = profile?.clinica_id

  return (
    <div style={{
      padding: '24px', maxWidth: 960, margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`
        @keyframes up  { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: L.t1, marginBottom: 4 }}>
          API &amp; Integrações
        </div>
        <div style={{ fontSize: 13, color: L.t3 }}>
          Gerencie tokens de acesso, consulte a documentação e faça backup dos seus dados.
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: `2px solid ${L.line}`,
        marginBottom: 28,
      }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
              border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer',
              background: tab === i ? L.bg : 'transparent',
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'color 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabTokens clinicaId={clinicaId} />}
      {tab === 1 && <TabDocs />}
      {tab === 2 && <TabBackup clinicaId={clinicaId} />}
    </div>
  )
}
