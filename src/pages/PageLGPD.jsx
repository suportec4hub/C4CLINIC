import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addBusinessDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function maskCPF(cpf) {
  if (!cpf) return '—'
  const c = cpf.replace(/\D/g, '')
  return `***.${c.slice(3, 6) || '***'}.${c.slice(6, 9) || '***'}-**`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d - now) / 86400000)
}

function isPast(dateStr) {
  return daysUntil(dateStr) !== null && daysUntil(dateStr) < 0
}

const CONSENT_TYPES = [
  { key: 'tratamento_dados', label: 'Tratamento de Dados' },
  { key: 'comunicacao_marketing', label: 'Comunicação / Marketing' },
  { key: 'compartilhamento_terceiros', label: 'Compartilhamento c/ Terceiros' },
  { key: 'pesquisa_academica', label: 'Pesquisa Acadêmica' },
]

const SOLICITACAO_TIPOS = [
  { key: 'acesso_dados', label: 'Acesso aos Dados' },
  { key: 'correcao_dados', label: 'Correção de Dados' },
  { key: 'exclusao_dados', label: 'Exclusão de Dados' },
  { key: 'portabilidade', label: 'Portabilidade' },
  { key: 'revogacao_consentimento', label: 'Revogação de Consentimento' },
]

const SOLICITACAO_STATUS = [
  { key: 'pendente', label: 'Pendente', color: L.yellow, bg: L.yellowBg, bd: L.yellowBd },
  { key: 'em_analise', label: 'Em Análise', color: L.blue, bg: L.blueBg, bd: L.blueBd },
  { key: 'concluido', label: 'Concluído', color: L.green, bg: L.greenBg, bd: L.greenBd },
  { key: 'negado', label: 'Negado', color: L.red, bg: L.redBg, bd: L.redBd },
]

function statusInfo(key) {
  return SOLICITACAO_STATUS.find(s => s.key === key) || { label: key, color: L.t3, bg: L.surface, bd: L.line }
}

function tipoLabel(key, list) {
  const f = list.find(t => t.key === key)
  return f ? f.label : key
}

// ─── small components ────────────────────────────────────────────────────────

function Spinner({ size = 20 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2.5px solid ${L.line}`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

function Inp({ ...props }) {
  return <input style={inputStyle} {...props} />
}

function Select({ children, ...props }) {
  return (
    <select style={{ ...inputStyle, cursor: 'pointer' }} {...props}>
      {children}
    </select>
  )
}

function Textarea({ ...props }) {
  return <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} {...props} />
}

function Btn({ children, onClick, disabled, variant = 'primary', style: extra = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    border: 'none', fontFamily: 'inherit', transition: 'opacity 0.15s',
  }
  const variants = {
    primary: { background: L.teal, color: L.white },
    ghost: { background: 'transparent', color: L.t2, border: `1px solid ${L.line}` },
    danger: { background: L.red, color: L.white },
    outline: { background: 'transparent', color: L.teal, border: `1.5px solid ${L.teal}` },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...extra }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function StatusBadge({ statusKey }) {
  const s = statusInfo(statusKey)
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
    }}>
      {s.label}
    </span>
  )
}

function TipoBadge({ tipo, list }) {
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: L.tealBg, color: L.teal, border: `1px solid ${L.tealMd}20`,
    }}>
      {tipoLabel(tipo, list)}
    </span>
  )
}

// ─── overlay / bottom-sheet ──────────────────────────────────────────────────

function Sheet({ open, onClose, title, children, width = 640 }) {
  if (!open) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <style>{`
        @keyframes up { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <div style={{
        width: '100%', maxWidth: width, margin: '0 auto',
        background: L.bg, borderRadius: '16px 16px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        padding: 24, animation: 'up 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: L.t1 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── circular gauge ──────────────────────────────────────────────────────────

function CircularGauge({ pct }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? L.green : pct >= 60 ? L.yellow : L.red
  const label = pct >= 80 ? 'Conformidade Alta' : pct >= 60 ? 'Atenção Necessária' : 'Crítico'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={64} cy={64} r={r} fill="none" stroke={L.line} strokeWidth={10} />
        <circle
          cx={64} cy={64} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text
          x={64} y={64} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 22, fontWeight: 800, fill: color, transform: 'rotate(90deg)', transformOrigin: '64px 64px', fontFamily: 'inherit' }}
        >
          {pct}%
        </text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 600, color, textAlign: 'center' }}>{label}</div>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color = L.teal, sub }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '16px 20px', boxShadow: L.shadow, flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── tab 0 — Painel ──────────────────────────────────────────────────────────

function TabPainel({ clinicaId, pacientes, consentimentos, solicitacoes }) {
  const totalPacientes = pacientes.length

  // compliance score: patients with all 4 types recorded
  const comTodos = pacientes.filter(p => {
    return CONSENT_TYPES.every(ct =>
      consentimentos.some(c => c.paciente_id === p.id && c.tipo === ct.key)
    )
  }).length
  const score = totalPacientes > 0 ? Math.round((comTodos / totalPacientes) * 100) : 0

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const em5dias = new Date(now)
  em5dias.setDate(em5dias.getDate() + 5)
  const prazoVencendo = solicitacoes.filter(s => {
    if (!s.data_prazo || s.status === 'concluido' || s.status === 'negado') return false
    const d = new Date(s.data_prazo + 'T00:00:00')
    return d <= em5dias
  }).length

  // urgent: pendente + prazo within 7 days
  const urgentes = solicitacoes
    .filter(s => s.status === 'pendente' && s.data_prazo)
    .map(s => ({ ...s, dias: daysUntil(s.data_prazo) }))
    .filter(s => s.dias !== null && s.dias <= 7)
    .sort((a, b) => a.dias - b.dias)

  // recent activity: last 10 items from solicitacoes and consentimentos merged
  const feed = [
    ...solicitacoes.map(s => ({
      tipo: 'solicitacao', id: s.id, criado_em: s.criado_em,
      pacienteNome: s.paciente?.nome || '—',
      descricao: `Solicitação: ${tipoLabel(s.tipo, SOLICITACAO_TIPOS)}`,
      badge: statusInfo(s.status),
    })),
    ...consentimentos.map(c => ({
      tipo: 'consentimento', id: c.id, criado_em: c.criado_em,
      pacienteNome: c.paciente?.nome || '—',
      descricao: `Consentimento: ${tipoLabel(c.tipo, CONSENT_TYPES)} — ${c.aceito ? 'Aceito' : 'Recusado'}`,
      badge: c.aceito
        ? { label: 'Aceito', color: L.green, bg: L.greenBg, bd: L.greenBd }
        : { label: 'Recusado', color: L.red, bg: L.redBg, bd: L.redBd },
    })),
  ]
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* score + KPIs */}
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 16,
        padding: 24, boxShadow: L.shadow,
        display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <CircularGauge pct={score} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: L.t1, marginBottom: 4 }}>Score de Conformidade LGPD</div>
          <div style={{ fontSize: 13, color: L.t3, marginBottom: 16 }}>
            Percentual de pacientes com todos os 4 tipos de consentimento registrados.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <KpiCard label="TOTAL PACIENTES" value={totalPacientes} color={L.teal} />
            <KpiCard label="CONSENTIMENTO COMPLETO" value={comTodos} color={L.green} />
            <KpiCard label="SOLICITAÇÕES PENDENTES" value={pendentes} color={L.yellow} />
            <KpiCard label="PRAZO VENCENDO" value={prazoVencendo} color={L.red} sub="próximos 5 dias" />
          </div>
        </div>
      </div>

      {/* urgent */}
      {urgentes.length > 0 && (
        <div style={{ background: L.bg, border: `1.5px solid ${L.redBd}`, borderRadius: 14, padding: 20, boxShadow: L.shadow }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.red, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ Solicitações Urgentes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgentes.map(s => (
              <div key={s.id} style={{
                background: L.redBg, border: `1px solid ${L.redBd}`, borderRadius: 10,
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{s.paciente?.nome || '—'}</div>
                  <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>{tipoLabel(s.tipo, SOLICITACAO_TIPOS)} · Prazo: {fmtDate(s.data_prazo)}</div>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: s.dias < 0 ? L.red : L.redBg,
                  color: s.dias < 0 ? L.white : L.red,
                  border: `1px solid ${L.redBd}`,
                }}>
                  {s.dias < 0 ? `Vencido há ${Math.abs(s.dias)}d` : s.dias === 0 ? 'Vence hoje' : `${s.dias}d restantes`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* activity feed */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20, boxShadow: L.shadow }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 14 }}>Atividade Recente</div>
        {feed.length === 0 ? (
          <div style={{ color: L.t4, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Nenhuma atividade registrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {feed.map((item, i) => (
              <div key={item.tipo + item.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 0',
                borderBottom: i < feed.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: item.tipo === 'solicitacao' ? L.blue : L.teal,
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{item.pacienteNome}</span>
                  <span style={{ fontSize: 12, color: L.t3, marginLeft: 8 }}>{item.descricao}</span>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: item.badge.bg, color: item.badge.color, border: `1px solid ${item.badge.bd}`,
                  flexShrink: 0,
                }}>{item.badge.label}</span>
                <span style={{ fontSize: 11, color: L.t4, flexShrink: 0 }}>{fmtDt(item.criado_em)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── tab 1 — Consentimentos ───────────────────────────────────────────────────

function TabConsentimentos({ clinicaId, pacientes, consentimentos, onRefresh }) {
  const [filtroIncompleto, setFiltroIncompleto] = useState(false)
  const [sheetNew, setSheetNew] = useState(false)
  const [sheetHistory, setSheetHistory] = useState(null) // paciente obj
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    paciente_id: '',
    tipos: [],
    aceito: true,
    data_consentimento: new Date().toISOString().slice(0, 16),
    ip_address: '',
    versao_politica: '1.0',
  })

  function hasTipo(pac, tipo) {
    return consentimentos.some(c => c.paciente_id === pac.id && c.tipo === tipo)
  }

  function pacienteHistory(pac) {
    return consentimentos.filter(c => c.paciente_id === pac.id).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
  }

  const displayed = filtroIncompleto
    ? pacientes.filter(p => !CONSENT_TYPES.every(ct => hasTipo(p, ct.key)))
    : pacientes

  function toggleTipo(k) {
    setForm(f => ({
      ...f,
      tipos: f.tipos.includes(k) ? f.tipos.filter(t => t !== k) : [...f.tipos, k],
    }))
  }

  async function saveConsentimento() {
    if (!form.paciente_id || form.tipos.length === 0) return
    setSaving(true)
    const rows = form.tipos.map(tipo => ({
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      tipo,
      aceito: form.aceito,
      data_consentimento: form.data_consentimento ? new Date(form.data_consentimento).toISOString() : new Date().toISOString(),
      ip_address: form.ip_address || null,
      versao_politica: form.versao_politica || '1.0',
    }))
    const { error } = await supabase.from('lgpd_consentimentos').insert(rows)
    setSaving(false)
    if (!error) {
      setSheetNew(false)
      setForm({ paciente_id: '', tipos: [], aceito: true, data_consentimento: new Date().toISOString().slice(0, 16), ip_address: '', versao_politica: '1.0' })
      onRefresh()
    } else {
      alert('Erro: ' + error.message)
    }
  }

  const historyItems = sheetHistory ? pacienteHistory(sheetHistory) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: L.t2, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filtroIncompleto}
            onChange={e => setFiltroIncompleto(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: L.teal }}
          />
          Mostrar apenas pacientes com consentimentos incompletos
        </label>
        <Btn onClick={() => setSheetNew(true)}>+ Registrar Consentimento</Btn>
      </div>

      {/* table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: L.shadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: L.surface }}>
                <th style={thStyle}>Paciente</th>
                <th style={thStyle}>CPF</th>
                {CONSENT_TYPES.map(ct => (
                  <th key={ct.key} style={{ ...thStyle, fontSize: 10, maxWidth: 100, textAlign: 'center' }}>{ct.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : displayed.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: `1px solid ${L.lineSoft}`,
                    cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : L.surface,
                    transition: 'background 0.12s',
                  }}
                  onClick={() => setSheetHistory(p)}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : L.surface}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: L.t1 }}>{p.nome}</span></td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: L.t3 }}>{maskCPF(p.cpf)}</td>
                  {CONSENT_TYPES.map(ct => (
                    <td key={ct.key} style={{ ...tdStyle, textAlign: 'center' }}>
                      {hasTipo(p, ct.key)
                        ? <span style={{ fontSize: 16, color: L.green }}>✓</span>
                        : <span style={{ fontSize: 16, color: L.red }}>✗</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* sheet: register consent */}
      <Sheet open={sheetNew} onClose={() => setSheetNew(false)} title="Registrar Consentimento">
        <Field label="PACIENTE">
          <Select value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
            <option value="">Selecione…</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Field>
        <Field label="TIPO(S) DE CONSENTIMENTO">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 12px', border: `1.5px solid ${L.line}`, borderRadius: 8, background: L.bg }}>
            {CONSENT_TYPES.map(ct => (
              <label key={ct.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: L.t2, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.tipos.includes(ct.key)}
                  onChange={() => toggleTipo(ct.key)}
                  style={{ width: 15, height: 15, accentColor: L.teal }}
                />
                {ct.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="ACEITO / RECUSADO">
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: true, l: 'Aceito', color: L.green, bg: L.greenBg, bd: L.greenBd },
              { v: false, l: 'Recusado', color: L.red, bg: L.redBg, bd: L.redBd }].map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => setForm(f => ({ ...f, aceito: opt.v }))}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: form.aceito === opt.v ? opt.bg : 'transparent',
                  color: form.aceito === opt.v ? opt.color : L.t3,
                  border: `1.5px solid ${form.aceito === opt.v ? opt.bd : L.line}`,
                  transition: 'all 0.15s',
                }}
              >{opt.l}</button>
            ))}
          </div>
        </Field>
        <Field label="DATA DO CONSENTIMENTO">
          <Inp type="datetime-local" value={form.data_consentimento} onChange={e => setForm(f => ({ ...f, data_consentimento: e.target.value }))} />
        </Field>
        <Field label="ENDEREÇO IP">
          <Inp placeholder="ex: 192.168.1.1" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} />
        </Field>
        <Field label="VERSÃO DA POLÍTICA">
          <Inp placeholder="ex: 1.0" value={form.versao_politica} onChange={e => setForm(f => ({ ...f, versao_politica: e.target.value }))} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setSheetNew(false)}>Cancelar</Btn>
          <Btn onClick={saveConsentimento} disabled={saving || !form.paciente_id || form.tipos.length === 0}>
            {saving ? <Spinner size={16} /> : 'Salvar'}
          </Btn>
        </div>
      </Sheet>

      {/* sheet: patient history */}
      <Sheet open={!!sheetHistory} onClose={() => setSheetHistory(null)} title={sheetHistory ? `Histórico — ${sheetHistory.nome}` : ''}>
        {sheetHistory && (
          <div>
            <div style={{ fontSize: 12, color: L.t3, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
              CPF: {maskCPF(sheetHistory.cpf)} · E-mail: {sheetHistory.email || '—'}
            </div>
            {historyItems.length === 0 ? (
              <div style={{ color: L.t4, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhum consentimento registrado.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historyItems.map(c => (
                  <div key={c.id} style={{
                    background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{tipoLabel(c.tipo, CONSENT_TYPES)}</div>
                      <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtDt(c.criado_em)} · IP: {c.ip_address || '—'} · Política v{c.versao_politica || '—'}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: c.aceito ? L.greenBg : L.redBg,
                      color: c.aceito ? L.green : L.red,
                      border: `1px solid ${c.aceito ? L.greenBd : L.redBd}`,
                    }}>{c.aceito ? 'Aceito' : 'Recusado'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ─── tab 2 — Solicitações ─────────────────────────────────────────────────────

function TabSolicitacoes({ clinicaId, pacientes, solicitacoes, onRefresh }) {
  const [sheetNew, setSheetNew] = useState(false)
  const [sheetUpdate, setSheetUpdate] = useState(null)
  const [sheetDetail, setSheetDetail] = useState(null)
  const [saving, setSaving] = useState(false)

  const defaultForm = {
    paciente_id: '',
    tipo: '',
    status: 'pendente',
    data_solicitacao: today(),
    data_prazo: addBusinessDays(today(), 15),
    observacoes: '',
    responsavel: '',
  }
  const [form, setForm] = useState(defaultForm)

  const defaultUpdate = { status: '', resposta: '', data_conclusao: '', responsavel: '' }
  const [updateForm, setUpdateForm] = useState(defaultUpdate)

  function openUpdate(s) {
    setUpdateForm({
      status: s.status,
      resposta: s.resposta || '',
      data_conclusao: s.data_conclusao || '',
      responsavel: s.responsavel || '',
    })
    setSheetUpdate(s)
  }

  async function saveNew() {
    if (!form.paciente_id || !form.tipo) return
    setSaving(true)
    const { error } = await supabase.from('lgpd_solicitacoes').insert([{
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      tipo: form.tipo,
      status: form.status,
      data_solicitacao: form.data_solicitacao,
      data_prazo: form.data_prazo || null,
      observacoes: form.observacoes || null,
      responsavel: form.responsavel || null,
    }])
    setSaving(false)
    if (!error) { setSheetNew(false); setForm(defaultForm); onRefresh() }
    else alert('Erro: ' + error.message)
  }

  async function saveUpdate() {
    if (!sheetUpdate) return
    setSaving(true)
    const { error } = await supabase.from('lgpd_solicitacoes').update({
      status: updateForm.status,
      resposta: updateForm.resposta || null,
      data_conclusao: updateForm.data_conclusao || null,
      responsavel: updateForm.responsavel || null,
    }).eq('id', sheetUpdate.id)
    setSaving(false)
    if (!error) { setSheetUpdate(null); setUpdateForm(defaultUpdate); onRefresh() }
    else alert('Erro: ' + error.message)
  }

  function exportCSV() {
    const header = ['ID', 'Paciente', 'Tipo', 'Status', 'Solicitação', 'Prazo', 'Conclusão', 'Responsável', 'Observações', 'Resposta']
    const rows = solicitacoes.map(s => [
      s.id,
      s.paciente?.nome || '',
      tipoLabel(s.tipo, SOLICITACAO_TIPOS),
      tipoLabel(s.status, SOLICITACAO_STATUS),
      s.data_solicitacao,
      s.data_prazo || '',
      s.data_conclusao || '',
      s.responsavel || '',
      (s.observacoes || '').replace(/\n/g, ' '),
      (s.resposta || '').replace(/\n/g, ' '),
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lgpd_solicitacoes_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={exportCSV}>⬇ Exportar Relatório CSV</Btn>
        <Btn onClick={() => setSheetNew(true)}>+ Nova Solicitação</Btn>
      </div>

      {/* table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: L.shadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: L.surface }}>
                <th style={thStyle}>Paciente</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Solicitação</th>
                <th style={thStyle}>Prazo</th>
                <th style={thStyle}>Conclusão</th>
                <th style={thStyle}>Responsável</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                    Nenhuma solicitação registrada.
                  </td>
                </tr>
              ) : solicitacoes.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderTop: `1px solid ${L.lineSoft}`,
                    background: i % 2 === 0 ? 'transparent' : L.surface,
                  }}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: L.t1 }}>{s.paciente?.nome || '—'}</span></td>
                  <td style={tdStyle}><TipoBadge tipo={s.tipo} list={SOLICITACAO_TIPOS} /></td>
                  <td style={tdStyle}><StatusBadge statusKey={s.status} /></td>
                  <td style={{ ...tdStyle, color: L.t3, fontSize: 12 }}>{fmtDate(s.data_solicitacao)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 12, fontWeight: isPast(s.data_prazo) && s.status !== 'concluido' && s.status !== 'negado' ? 700 : 400,
                      color: isPast(s.data_prazo) && s.status !== 'concluido' && s.status !== 'negado' ? L.red : L.t3,
                    }}>
                      {fmtDate(s.data_prazo)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: L.t3, fontSize: 12 }}>{fmtDate(s.data_conclusao)}</td>
                  <td style={{ ...tdStyle, color: L.t3, fontSize: 12 }}>{s.responsavel || '—'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openUpdate(s)}
                        style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          background: L.tealBg, color: L.teal, border: `1px solid ${L.tealMd}30`, fontWeight: 600,
                        }}
                      >Atualizar</button>
                      <button
                        onClick={() => setSheetDetail(s)}
                        style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                          background: L.surface, color: L.t2, border: `1px solid ${L.line}`, fontWeight: 500,
                        }}
                      >Ver</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* sheet: new solicitacao */}
      <Sheet open={sheetNew} onClose={() => setSheetNew(false)} title="Nova Solicitação de Titular">
        <Field label="PACIENTE">
          <Select value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
            <option value="">Selecione…</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Field>
        <Field label="TIPO DE SOLICITAÇÃO">
          <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <option value="">Selecione…</option>
            {SOLICITACAO_TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="STATUS">
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {SOLICITACAO_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="DATA DA SOLICITAÇÃO">
            <Inp type="date" value={form.data_solicitacao} onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))} />
          </Field>
          <Field label="DATA DO PRAZO (15 dias úteis)">
            <Inp type="date" value={form.data_prazo} onChange={e => setForm(f => ({ ...f, data_prazo: e.target.value }))} />
          </Field>
        </div>
        <Field label="RESPONSÁVEL">
          <Inp placeholder="Nome do responsável" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
        </Field>
        <Field label="OBSERVAÇÕES">
          <Textarea placeholder="Detalhes da solicitação…" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setSheetNew(false)}>Cancelar</Btn>
          <Btn onClick={saveNew} disabled={saving || !form.paciente_id || !form.tipo}>
            {saving ? <Spinner size={16} /> : 'Registrar'}
          </Btn>
        </div>
      </Sheet>

      {/* sheet: update solicitacao */}
      <Sheet open={!!sheetUpdate} onClose={() => setSheetUpdate(null)} title="Atualizar Solicitação">
        {sheetUpdate && (
          <>
            <div style={{ background: L.surface, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: L.t2 }}>
              <strong>{sheetUpdate.paciente?.nome || '—'}</strong> · {tipoLabel(sheetUpdate.tipo, SOLICITACAO_TIPOS)}
            </div>
            <Field label="NOVO STATUS">
              <Select value={updateForm.status} onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value }))}>
                {SOLICITACAO_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="RESPONSÁVEL">
              <Inp placeholder="Nome do responsável" value={updateForm.responsavel} onChange={e => setUpdateForm(f => ({ ...f, responsavel: e.target.value }))} />
            </Field>
            <Field label="DATA DE CONCLUSÃO">
              <Inp type="date" value={updateForm.data_conclusao} onChange={e => setUpdateForm(f => ({ ...f, data_conclusao: e.target.value }))} />
            </Field>
            <Field label="RESPOSTA AO TITULAR">
              <Textarea placeholder="Descreva a resposta ao titular…" value={updateForm.resposta} onChange={e => setUpdateForm(f => ({ ...f, resposta: e.target.value }))} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setSheetUpdate(null)}>Cancelar</Btn>
              <Btn onClick={saveUpdate} disabled={saving}>
                {saving ? <Spinner size={16} /> : 'Salvar'}
              </Btn>
            </div>
          </>
        )}
      </Sheet>

      {/* sheet: detail */}
      <Sheet open={!!sheetDetail} onClose={() => setSheetDetail(null)} title="Detalhes da Solicitação">
        {sheetDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'PACIENTE', v: sheetDetail.paciente?.nome || '—' },
                { l: 'CPF', v: maskCPF(sheetDetail.paciente?.cpf) },
                { l: 'TIPO', v: tipoLabel(sheetDetail.tipo, SOLICITACAO_TIPOS) },
                { l: 'STATUS', v: tipoLabel(sheetDetail.status, SOLICITACAO_STATUS) },
                { l: 'DATA SOLICITAÇÃO', v: fmtDate(sheetDetail.data_solicitacao) },
                { l: 'DATA PRAZO', v: fmtDate(sheetDetail.data_prazo) },
                { l: 'DATA CONCLUSÃO', v: fmtDate(sheetDetail.data_conclusao) },
                { l: 'RESPONSÁVEL', v: sheetDetail.responsavel || '—' },
              ].map(({ l, v }) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, color: L.t1, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {sheetDetail.observacoes && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>OBSERVAÇÕES</div>
                <div style={{ fontSize: 13, color: L.t2, background: L.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${L.line}` }}>
                  {sheetDetail.observacoes}
                </div>
              </div>
            )}
            {sheetDetail.resposta && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>RESPOSTA AO TITULAR</div>
                <div style={{ fontSize: 13, color: L.t2, background: L.surface, borderRadius: 8, padding: '10px 12px', border: `1px solid ${L.line}` }}>
                  {sheetDetail.resposta}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setSheetDetail(null)}>Fechar</Btn>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ─── table cell styles ────────────────────────────────────────────────────────

const thStyle = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.4px',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '11px 14px', fontSize: 13, color: L.t2, verticalAlign: 'middle',
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PageLGPD({ profile }) {
  const clinicaId = profile?.clinica_id

  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pacientes, setPacientes] = useState([])
  const [consentimentos, setConsentimentos] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([])

  const TABS = [
    { id: 0, label: 'Painel LGPD' },
    { id: 1, label: 'Consentimentos' },
    { id: 2, label: 'Solicitações de Titulares' },
  ]

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [rPac, rCons, rSol] = await Promise.all([
      supabase.from('pacientes').select('id, nome, cpf, email').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('lgpd_consentimentos').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('lgpd_solicitacoes').select('*, paciente:pacientes(id, nome, cpf, email)').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
    ])
    setPacientes(rPac.data || [])
    setConsentimentos((rCons.data || []).map(c => ({
      ...c,
      paciente: (rPac.data || []).find(p => p.id === c.paciente_id),
    })))
    setSolicitacoes(rSol.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1300, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: L.t1, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🔒</span> LGPD — Gestão de Conformidade
        </h1>
        <p style={{ fontSize: 13, color: L.t3, marginTop: 5 }}>
          Consentimentos, solicitações de titulares e auditoria de conformidade da Lei Geral de Proteção de Dados.
        </p>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `2px solid ${L.line}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? L.teal : L.t3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner size={32} />
        </div>
      ) : (
        <div style={{ animation: 'up 0.25s ease' }}>
          {tab === 0 && (
            <TabPainel
              clinicaId={clinicaId}
              pacientes={pacientes}
              consentimentos={consentimentos}
              solicitacoes={solicitacoes}
            />
          )}
          {tab === 1 && (
            <TabConsentimentos
              clinicaId={clinicaId}
              pacientes={pacientes}
              consentimentos={consentimentos}
              onRefresh={load}
            />
          )}
          {tab === 2 && (
            <TabSolicitacoes
              clinicaId={clinicaId}
              pacientes={pacientes}
              solicitacoes={solicitacoes}
              onRefresh={load}
            />
          )}
        </div>
      )}
    </div>
  )
}
