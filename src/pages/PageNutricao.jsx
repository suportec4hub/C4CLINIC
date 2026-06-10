import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Helpers ─────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }
const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
  border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
}
const btnGhost = {
  background: 'none', color: L.t3, fontWeight: 500, fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
}

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Row2({ children, gap = 12 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>{children}</div>
}
function Row3({ children, gap = 12 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap }}>{children}</div>
}

function calcAge(dob) {
  if (!dob) return '—'
  const d = new Date(dob)
  const n = new Date()
  let age = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) age--
  return age
}

function calcIMC(peso, altura) {
  if (!peso || !altura || altura === 0) return null
  return (peso / Math.pow(altura / 100, 2)).toFixed(1)
}

function imcColor(imc) {
  const v = parseFloat(imc)
  if (isNaN(v)) return L.t3
  if (v < 18.5) return L.blue
  if (v < 25)   return L.green
  if (v < 30)   return L.yellow
  return L.red
}

function imcLabel(imc) {
  const v = parseFloat(imc)
  if (isNaN(v)) return '—'
  if (v < 18.5) return 'Abaixo do peso'
  if (v < 25)   return 'Normal'
  if (v < 30)   return 'Sobrepeso'
  return 'Obeso'
}

const OBJ_CFG = {
  emagrecimento:    { label: 'Emagrecimento',   bg: L.orangeBg,  color: L.orange,  bd: L.orangeBd  },
  ganho_massa:      { label: 'Ganho de Massa',  bg: L.blueBg,    color: L.blue,    bd: L.blueBd    },
  manutencao:       { label: 'Manutenção',      bg: L.greenBg,   color: L.green,   bd: L.greenBd   },
  saude_geral:      { label: 'Saúde Geral',     bg: L.tealBg,    color: L.teal,    bd: L.line      },
  doenca_especifica:{ label: 'Doença Específica',bg: L.purpleBg,  color: L.purple,  bd: L.purpleBd  },
}

function ObjetivoBadge({ objetivo }) {
  const cfg = OBJ_CFG[objetivo] || { label: objetivo || '—', bg: L.hover, color: L.t3, bd: L.line }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bd}`, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

/* ─── Bottom-sheet Modal ──────────────────────────────────────── */
function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 820 : 600, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── KPI Card ────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

/* ─── BMI Ring ────────────────────────────────────────────────── */
function ImcRing({ imc }) {
  const v = parseFloat(imc)
  const color = imcColor(imc)
  const pct = isNaN(v) ? 0 : Math.min(v / 40, 1)
  const r = 22, circ = 2 * Math.PI * r
  const dash = circ * pct
  return (
    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke={L.line} strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>{isNaN(v) ? '—' : v.toFixed(1)}</div>
        <div style={{ fontSize: 9, color: L.t4, lineHeight: 1 }}>IMC</div>
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function PageNutricao({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)

  // data
  const [consultas, setConsultas] = useState([])
  const [evolucoes, setEvolucoes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [modal, setModal] = useState(null)  // 'nova_consulta' | 'nova_evolucao'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  // tab2 patient
  const [evolPacId, setEvolPacId] = useState('')
  // tab1 search
  const [buscaPlano, setBuscaPlano] = useState('')

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [cs, ev, pacs] = await Promise.all([
      supabase.from('consultas_nutri').select('*').eq('clinica_id', clinicaId).order('data', { ascending: false }),
      supabase.from('evolucoes_nutri').select('*').eq('clinica_id', clinicaId).order('data', { ascending: false }),
      supabase.from('pacientes').select('id, nome, data_nascimento').eq('clinica_id', clinicaId).order('nome'),
    ])
    setConsultas(cs.data || [])
    setEvolucoes(ev.data || [])
    setPacientes(pacs.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* ── Derived data ── */
  // Unique patients in nutrition care
  const pacIds = [...new Set(consultas.map(c => c.paciente_id))]
  const pacMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  // Last consulta per patient
  function lastConsulta(pacId) {
    return consultas.filter(c => c.paciente_id === pacId)[0] || null
  }
  // First consulta per patient
  function firstConsulta(pacId) {
    const arr = consultas.filter(c => c.paciente_id === pacId)
    return arr[arr.length - 1] || null
  }

  // KPIs
  const hoje = new Date().toISOString().slice(0, 10)
  const consultasHoje = consultas.filter(c => c.data === hoje).length
  const imcValues = pacIds.map(id => {
    const c = lastConsulta(id)
    return c?.imc ? parseFloat(c.imc) : null
  }).filter(Boolean)
  const imcMedio = imcValues.length ? (imcValues.reduce((a, b) => a + b, 0) / imcValues.length).toFixed(1) : '—'

  // Meta atingida heuristic: patients with >2 evolucoes who have lost weight
  const metaAtingida = pacIds.filter(id => {
    const evs = evolucoes.filter(e => e.paciente_id === id).sort((a, b) => a.data.localeCompare(b.data))
    if (evs.length < 2) return false
    const obj = lastConsulta(id)?.objetivo
    if (obj === 'ganho_massa') return evs[evs.length - 1].peso_kg > evs[0].peso_kg
    return evs[evs.length - 1].peso_kg < evs[0].peso_kg
  }).length

  /* ── Form helpers ── */
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const formImc = calcIMC(form.peso_kg, form.altura_cm)

  async function saveConsulta() {
    if (!form.paciente_id || !form.data) return
    setSaving(true)
    const imc = calcIMC(form.peso_kg, form.altura_cm)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      nutricionista: form.nutricionista || '',
      data: form.data,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
      altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : null,
      imc: imc ? parseFloat(imc) : null,
      gordura_corporal_pct: form.gordura_corporal_pct ? parseFloat(form.gordura_corporal_pct) : null,
      massa_muscular_kg: form.massa_muscular_kg ? parseFloat(form.massa_muscular_kg) : null,
      circunferencia_abdominal_cm: form.circunferencia_abdominal_cm ? parseFloat(form.circunferencia_abdominal_cm) : null,
      objetivo: form.objetivo || null,
      anamnese_alimentar: form.anamnese_alimentar || '',
      restricoes_alimentares: form.restricoes_alimentares || '',
      plano_alimentar: form.plano_alimentar || '',
      metas: form.metas || '',
      observacoes: form.observacoes || '',
    }
    await supabase.from('consultas_nutri').insert(payload)
    setSaving(false)
    setModal(null)
    setForm({})
    load()
  }

  async function saveEvolucao() {
    if (!form.paciente_id || !form.data) return
    setSaving(true)
    await supabase.from('evolucoes_nutri').insert({
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      consulta_id: form.consulta_id || null,
      data: form.data,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
      gordura_corporal_pct: form.gordura_corporal_pct ? parseFloat(form.gordura_corporal_pct) : null,
      circunferencia_abdominal_cm: form.circunferencia_abdominal_cm ? parseFloat(form.circunferencia_abdominal_cm) : null,
      observacoes: form.observacoes || '',
    })
    setSaving(false)
    setModal(null)
    setForm({})
    load()
  }

  function openNovaConsulta(pacId) {
    setForm({ data: hoje, paciente_id: pacId || '' })
    setModal('nova_consulta')
  }

  function openNovaEvolucao(pacId) {
    setForm({ data: hoje, paciente_id: pacId || evolPacId || '' })
    setModal('nova_evolucao')
  }

  /* ── Print plan ── */
  function printPlano(c) {
    const pac = pacMap[c.paciente_id]
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>Plano Alimentar</title>
<style>
body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#1a1a1a}
h1{font-size:22px;border-bottom:2px solid #0d6e6e;padding-bottom:8px}
h2{font-size:15px;color:#0d6e6e;margin-top:24px}
.meta{font-size:13px;color:#555;margin-bottom:4px}
pre{white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.7;background:#f8f8f8;padding:16px;border-radius:6px}
@media print{body{margin:20px}}
</style></head><body>
<h1>Plano Alimentar</h1>
<div class="meta"><b>Paciente:</b> ${pac?.nome || '—'}</div>
<div class="meta"><b>Data:</b> ${c.data}</div>
<div class="meta"><b>Nutricionista:</b> ${c.nutricionista || '—'}</div>
<div class="meta"><b>Objetivo:</b> ${OBJ_CFG[c.objetivo]?.label || c.objetivo || '—'}</div>
${c.restricoes_alimentares ? `<h2>Restrições Alimentares</h2><pre>${c.restricoes_alimentares}</pre>` : ''}
<h2>Plano Alimentar</h2>
<pre>${c.plano_alimentar}</pre>
${c.metas ? `<h2>Metas</h2><pre>${c.metas}</pre>` : ''}
${c.observacoes ? `<h2>Observações</h2><pre>${c.observacoes}</pre>` : ''}
</body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  /* ── Evolution chart data ── */
  function getEvolData(pacId) {
    if (!pacId) return []
    const consultaPoints = consultas
      .filter(c => c.paciente_id === pacId && c.peso_kg)
      .map(c => ({ data: c.data, peso_kg: parseFloat(c.peso_kg), imc: c.imc ? parseFloat(c.imc) : null, source: 'consulta' }))
    const evolPoints = evolucoes
      .filter(e => e.paciente_id === pacId && e.peso_kg)
      .map(e => ({ data: e.data, peso_kg: parseFloat(e.peso_kg), imc: null, source: 'evolucao' }))
    const all = [...consultaPoints, ...evolPoints]
    all.sort((a, b) => a.data.localeCompare(b.data))
    return all
  }

  /* ── Weight/BMI SVG chart ── */
  function ChartPesoImc({ data }) {
    if (!data.length) return (
      <div style={{ padding: 40, textAlign: 'center', color: L.t4, fontSize: 13 }}>Sem dados de peso registrados.</div>
    )
    const W = 600, H = 200, padL = 48, padR = 48, padT = 16, padB = 36
    const pesos = data.map(d => d.peso_kg)
    const imcs  = data.map(d => d.imc).filter(Boolean)
    const minP = Math.min(...pesos) - 2, maxP = Math.max(...pesos) + 2
    const minI = imcs.length ? Math.min(...imcs) - 1 : 15
    const maxI = imcs.length ? Math.max(...imcs) + 1 : 35
    const gW = W - padL - padR, gH = H - padT - padB
    const xOf = i => padL + (i / Math.max(data.length - 1, 1)) * gW
    const yP  = v => padT + gH - ((v - minP) / (maxP - minP)) * gH
    const yI  = v => padT + gH - ((v - minI) / (maxI - minI)) * gH

    const barW = Math.max(4, Math.min(24, gW / data.length - 4))

    const imcLine = data.filter(d => d.imc)
      .map(d => {
        const idx = data.indexOf(d)
        return `${xOf(idx)},${yI(d.imc)}`
      }).join(' ')

    return (
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', maxWidth: '100%' }}>
          {/* grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={padL} x2={W - padR}
              y1={padT + gH * (1 - f)} y2={padT + gH * (1 - f)}
              stroke={L.line} strokeWidth="1" strokeDasharray="4 3" />
          ))}
          {/* bars */}
          {data.map((d, i) => {
            const bh = ((d.peso_kg - minP) / (maxP - minP)) * gH
            return (
              <rect key={i}
                x={xOf(i) - barW / 2} y={padT + gH - bh}
                width={barW} height={bh}
                fill={L.teal} opacity="0.7" rx="3" />
            )
          })}
          {/* IMC line */}
          {imcs.length > 1 && (
            <polyline points={imcLine} fill="none" stroke={L.orange} strokeWidth="2" strokeLinejoin="round" />
          )}
          {/* IMC dots */}
          {data.filter(d => d.imc).map((d, i) => {
            const idx = data.indexOf(d)
            return (
              <circle key={i} cx={xOf(idx)} cy={yI(d.imc)} r="4"
                fill={L.orange} stroke={L.bg} strokeWidth="2" />
            )
          })}
          {/* X labels */}
          {data.map((d, i) => (
            <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle"
              fontSize="9" fill={L.t4} fontFamily="monospace">
              {d.data.slice(5)}
            </text>
          ))}
          {/* Y left */}
          {[0, 0.5, 1].map(f => (
            <text key={f} x={padL - 4} y={padT + gH * (1 - f) + 4}
              textAnchor="end" fontSize="9" fill={L.t4} fontFamily="monospace">
              {(minP + (maxP - minP) * f).toFixed(0)}
            </text>
          ))}
          {/* Y right (IMC) */}
          {imcs.length > 0 && [0, 0.5, 1].map(f => (
            <text key={f} x={W - padR + 4} y={padT + gH * (1 - f) + 4}
              textAnchor="start" fontSize="9" fill={L.orange} fontFamily="monospace">
              {(minI + (maxI - minI) * f).toFixed(0)}
            </text>
          ))}
          {/* Legend */}
          <rect x={padL} y={padT} width="10" height="10" fill={L.teal} opacity="0.7" rx="2" />
          <text x={padL + 13} y={padT + 8} fontSize="9" fill={L.t3} fontFamily="monospace">Peso (kg)</text>
          <circle cx={padL + 85} cy={padT + 5} r="4" fill={L.orange} />
          <text x={padL + 92} y={padT + 8} fontSize="9" fill={L.t3} fontFamily="monospace">IMC</text>
        </svg>
      </div>
    )
  }

  /* ─── Tab 0: Pacientes ──────────────────────────────────────── */
  function Tab0() {
    return (
      <div>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          <KpiCard label="Pacientes em Acompanhamento" value={pacIds.length} />
          <KpiCard label="Consultas Hoje" value={consultasHoje} color={L.teal} />
          <KpiCard label="Meta Atingida" value={metaAtingida} sub="com evolução favorável" color={L.green} />
          <KpiCard label="IMC Médio" value={imcMedio} sub="pacientes ativos" color={imcValues.length ? imcColor(imcMedio) : L.t3} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Pacientes em Acompanhamento Nutricional</div>
          <button style={btnPrimary} onClick={() => openNovaConsulta('')}>+ Nova Consulta</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: L.t4 }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Carregando...
          </div>
        ) : pacIds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: L.t4, fontSize: 14 }}>
            Nenhum paciente em acompanhamento nutricional ainda.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {pacIds.map(pacId => {
              const pac = pacMap[pacId]
              const last = lastConsulta(pacId)
              const first = firstConsulta(pacId)
              const pesoAtual = last?.peso_kg ? parseFloat(last.peso_kg) : null
              const pesoInicial = first?.peso_kg ? parseFloat(first.peso_kg) : null
              const delta = pesoAtual != null && pesoInicial != null ? (pesoAtual - pesoInicial).toFixed(1) : null
              const objetivo = last?.objetivo
              // arrow color: green if positive for objective, red otherwise
              let arrowColor = L.t3
              if (delta !== null) {
                const dv = parseFloat(delta)
                if (objetivo === 'ganho_massa') arrowColor = dv > 0 ? L.green : L.red
                else arrowColor = dv < 0 ? L.green : L.red
              }
              return (
                <div key={pacId} style={{
                  background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14,
                  padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{pac?.nome || `Paciente ${pacId.slice(0,8)}`}</div>
                      <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>
                        {pac?.data_nascimento ? `${calcAge(pac.data_nascimento)} anos` : '—'}
                        {last?.nutricionista ? ` · ${last.nutricionista}` : ''}
                      </div>
                    </div>
                    <ImcRing imc={last?.imc} />
                  </div>

                  {/* Objective */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ObjetivoBadge objetivo={objetivo} />
                    <span style={{ fontSize: 11, color: L.t4 }}>{imcLabel(last?.imc)}</span>
                  </div>

                  {/* Weight delta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                    <div>
                      <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>INICIAL</div>
                      <div style={{ fontWeight: 600, color: L.t2 }}>{pesoInicial != null ? `${pesoInicial} kg` : '—'}</div>
                    </div>
                    {delta !== null && (
                      <div style={{ color: arrowColor, fontWeight: 700, fontSize: 15 }}>
                        {parseFloat(delta) < 0 ? '↓' : parseFloat(delta) > 0 ? '↑' : '→'} {Math.abs(parseFloat(delta))} kg
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>ATUAL</div>
                      <div style={{ fontWeight: 600, color: L.t2 }}>{pesoAtual != null ? `${pesoAtual} kg` : '—'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button style={{ ...btnGhost, flex: 1, fontSize: 12 }} onClick={() => { setEvolPacId(pacId); setTab(2) }}>
                      Ver Evolução
                    </button>
                    <button style={{ ...btnPrimary, flex: 1, fontSize: 12 }} onClick={() => openNovaConsulta(pacId)}>
                      Nova Consulta
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ─── Tab 1: Planos Alimentares ─────────────────────────────── */
  function Tab1() {
    const comPlano = consultas.filter(c => c.plano_alimentar && c.plano_alimentar.trim())
    const filtered = buscaPlano.trim()
      ? comPlano.filter(c => {
          const pac = pacMap[c.paciente_id]
          const nome = pac?.nome?.toLowerCase() || ''
          return nome.includes(buscaPlano.toLowerCase())
        })
      : comPlano
    const [expandId, setExpandId] = useState(null)

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <input
            style={{ ...inp, maxWidth: 320 }}
            placeholder="Buscar por paciente..."
            value={buscaPlano}
            onChange={e => setBuscaPlano(e.target.value)}
            onFocus={focus} onBlur={blur}
          />
          <div style={{ fontSize: 13, color: L.t4 }}>{filtered.length} plano(s)</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: L.t4, fontSize: 14 }}>
            {buscaPlano ? 'Nenhum plano encontrado.' : 'Nenhum plano alimentar registrado ainda.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(c => {
              const pac = pacMap[c.paciente_id]
              const isOpen = expandId === c.id
              return (
                <div key={c.id} style={{
                  background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', cursor: 'pointer', gap: 12,
                    }}
                    onClick={() => setExpandId(isOpen ? null : c.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{pac?.nome || '—'}</div>
                      <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>
                        {c.data} · {c.nutricionista || '—'}
                      </div>
                    </div>
                    <ObjetivoBadge objetivo={c.objetivo} />
                    <div style={{ fontSize: 18, color: L.t3, marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${L.line}`, padding: '16px 18px' }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                        color: L.t1, lineHeight: 1.7, margin: 0,
                        background: L.bg, padding: 14, borderRadius: 8,
                        border: `1px solid ${L.line}`,
                      }}>{c.plano_alimentar}</pre>
                      {c.metas && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>METAS</div>
                          <div style={{ fontSize: 13, color: L.t2 }}>{c.metas}</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button style={btnPrimary} onClick={() => printPlano(c)}>🖨 Imprimir</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ─── Tab 2: Evolução ───────────────────────────────────────── */
  function Tab2() {
    const evolData = getEvolData(evolPacId)
    const evolPac = pacMap[evolPacId]

    // Body composition table: merge consultas + evolucoes for selected patient
    const tableCons = consultas.filter(c => c.paciente_id === evolPacId).map(c => ({
      data: c.data,
      peso_kg: c.peso_kg,
      gordura_corporal_pct: c.gordura_corporal_pct,
      massa_muscular_kg: c.massa_muscular_kg,
      circunferencia_abdominal_cm: c.circunferencia_abdominal_cm,
      imc: c.imc,
      source: 'Consulta',
    }))
    const tableEvols = evolucoes.filter(e => e.paciente_id === evolPacId).map(e => ({
      data: e.data,
      peso_kg: e.peso_kg,
      gordura_corporal_pct: e.gordura_corporal_pct,
      massa_muscular_kg: null,
      circunferencia_abdominal_cm: e.circunferencia_abdominal_cm,
      imc: null,
      source: 'Evolução',
    }))
    const tableAll = [...tableCons, ...tableEvols].sort((a, b) => b.data.localeCompare(a.data))

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>PACIENTE</label>
            <select
              style={{ ...inp, minWidth: 260 }}
              value={evolPacId}
              onChange={e => setEvolPacId(e.target.value)}
              onFocus={focus} onBlur={blur}
            >
              <option value="">Selecione um paciente...</option>
              {pacIds.map(id => (
                <option key={id} value={id}>{pacMap[id]?.nome || id}</option>
              ))}
            </select>
          </div>
          {evolPacId && (
            <button style={{ ...btnPrimary, alignSelf: 'flex-end' }} onClick={() => openNovaEvolucao(evolPacId)}>
              + Registrar Evolução
            </button>
          )}
        </div>

        {!evolPacId ? (
          <div style={{ textAlign: 'center', padding: 80, color: L.t4, fontSize: 14 }}>
            Selecione um paciente para visualizar a evolução.
          </div>
        ) : (
          <>
            {/* Patient summary */}
            {evolPac && (
              <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{evolPac.nome}</div>
                  <div style={{ fontSize: 12, color: L.t4 }}>{evolPac.data_nascimento ? `${calcAge(evolPac.data_nascimento)} anos` : ''}</div>
                </div>
                {(() => {
                  const lc = lastConsulta(evolPacId)
                  return lc ? (
                    <>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>OBJETIVO</div>
                        <ObjetivoBadge objetivo={lc.objetivo} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>NUTRICIONISTA</div>
                        <div style={{ fontSize: 13, color: L.t2, marginTop: 2 }}>{lc.nutricionista || '—'}</div>
                      </div>
                      {lc.imc && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ImcRing imc={lc.imc} />
                          <div style={{ fontSize: 12, color: L.t3 }}>{imcLabel(lc.imc)}</div>
                        </div>
                      )}
                    </>
                  ) : null
                })()}
              </div>
            )}

            {/* Chart */}
            <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 14 }}>Evolução de Peso e IMC</div>
              <ChartPesoImc data={evolData} />
            </div>

            {/* Body composition table */}
            {tableAll.length > 0 && (
              <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, padding: '14px 18px', borderBottom: `1px solid ${L.line}` }}>
                  Composição Corporal
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: L.hover }}>
                        {['Data','Tipo','Peso (kg)','Gordura (%)','Massa Musc. (kg)','Cintura (cm)','IMC'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableAll.map((row, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${L.line}` }}>
                          <td style={{ padding: '10px 14px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{row.data}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                              background: row.source === 'Consulta' ? L.tealBg : L.blueBg,
                              color: row.source === 'Consulta' ? L.teal : L.blue,
                              border: `1px solid ${row.source === 'Consulta' ? L.line : L.blueBd}` }}>
                              {row.source}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: L.t1 }}>{row.peso_kg != null ? parseFloat(row.peso_kg).toFixed(1) : '—'}</td>
                          <td style={{ padding: '10px 14px', color: L.t2 }}>{row.gordura_corporal_pct != null ? `${parseFloat(row.gordura_corporal_pct).toFixed(1)}%` : '—'}</td>
                          <td style={{ padding: '10px 14px', color: L.t2 }}>{row.massa_muscular_kg != null ? `${parseFloat(row.massa_muscular_kg).toFixed(1)}` : '—'}</td>
                          <td style={{ padding: '10px 14px', color: L.t2 }}>{row.circunferencia_abdominal_cm != null ? `${parseFloat(row.circunferencia_abdominal_cm).toFixed(1)}` : '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {row.imc != null ? (
                              <span style={{ fontWeight: 700, color: imcColor(row.imc) }}>{parseFloat(row.imc).toFixed(1)}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  /* ─── Nova Consulta Modal ───────────────────────────────────── */
  function NovaConsultaModal() {
    return (
      <Modal title="Nova Consulta Nutricional" onClose={() => { setModal(null); setForm({}) }} wide>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row2>
            <Field label="Paciente *">
              <select style={inp} value={form.paciente_id || ''} onChange={e => setF('paciente_id', e.target.value)} onFocus={focus} onBlur={blur}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="Data *">
              <input type="date" style={inp} value={form.data || ''} onChange={e => setF('data', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
          </Row2>

          <Field label="Nutricionista">
            <input style={inp} placeholder="Nome do nutricionista" value={form.nutricionista || ''} onChange={e => setF('nutricionista', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>

          {/* Anthropometric */}
          <div style={{ borderTop: `1px solid ${L.line}`, paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: L.t3, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>DADOS ANTROPOMÉTRICOS</div>
            <Row3 gap={12}>
              <Field label="Peso (kg)">
                <input type="number" step="0.1" style={inp} placeholder="Ex: 75.5" value={form.peso_kg || ''} onChange={e => setF('peso_kg', e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Altura (cm)">
                <input type="number" style={inp} placeholder="Ex: 170" value={form.altura_cm || ''} onChange={e => setF('altura_cm', e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="IMC (calculado)">
                <div style={{
                  ...inp, background: L.hover, color: formImc ? imcColor(formImc) : L.t4,
                  fontWeight: formImc ? 700 : 400, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {formImc ? (
                    <>{formImc} <span style={{ fontWeight: 400, fontSize: 11, color: L.t4 }}>— {imcLabel(formImc)}</span></>
                  ) : '—'}
                </div>
              </Field>
            </Row3>
            <div style={{ height: 12 }} />
            <Row3 gap={12}>
              <Field label="Gordura Corporal (%)">
                <input type="number" step="0.1" style={inp} placeholder="Ex: 25.0" value={form.gordura_corporal_pct || ''} onChange={e => setF('gordura_corporal_pct', e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Massa Muscular (kg)">
                <input type="number" step="0.1" style={inp} placeholder="Ex: 30.0" value={form.massa_muscular_kg || ''} onChange={e => setF('massa_muscular_kg', e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Circ. Abdominal (cm)">
                <input type="number" step="0.1" style={inp} placeholder="Ex: 90.0" value={form.circunferencia_abdominal_cm || ''} onChange={e => setF('circunferencia_abdominal_cm', e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>
            </Row3>
          </div>

          <Field label="Objetivo">
            <select style={inp} value={form.objetivo || ''} onChange={e => setF('objetivo', e.target.value)} onFocus={focus} onBlur={blur}>
              <option value="">Selecione...</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="ganho_massa">Ganho de Massa</option>
              <option value="manutencao">Manutenção</option>
              <option value="saude_geral">Saúde Geral</option>
              <option value="doenca_especifica">Doença Específica</option>
            </select>
          </Field>

          <Field label="Anamnese Alimentar">
            <textarea style={ta} placeholder="Hábitos alimentares, horários, preferências..." value={form.anamnese_alimentar || ''} onChange={e => setF('anamnese_alimentar', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>

          <Field label="Restrições Alimentares">
            <input style={inp} placeholder="Ex: intolerância à lactose, alergia a glúten..." value={form.restricoes_alimentares || ''} onChange={e => setF('restricoes_alimentares', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>

          <Field label="Plano Alimentar">
            <textarea style={{ ...ta, minHeight: 160 }} placeholder="Descreva o plano alimentar completo (café da manhã, almoço, jantar, lanches...)" value={form.plano_alimentar || ''} onChange={e => setF('plano_alimentar', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>

          <Row2>
            <Field label="Metas">
              <textarea style={{ ...ta, minHeight: 70 }} placeholder="Metas de curto e longo prazo" value={form.metas || ''} onChange={e => setF('metas', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Observações">
              <textarea style={{ ...ta, minHeight: 70 }} placeholder="Observações adicionais" value={form.observacoes || ''} onChange={e => setF('observacoes', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
          </Row2>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button style={btnGhost} onClick={() => { setModal(null); setForm({}) }}>Cancelar</button>
            <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={saveConsulta} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Consulta'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  /* ─── Nova Evolução Modal ───────────────────────────────────── */
  function NovaEvolucaoModal() {
    const pacConsultas = consultas.filter(c => c.paciente_id === form.paciente_id)
    return (
      <Modal title="Registrar Evolução" onClose={() => { setModal(null); setForm({}) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Paciente *">
            <select style={inp} value={form.paciente_id || ''} onChange={e => setF('paciente_id', e.target.value)} onFocus={focus} onBlur={blur}>
              <option value="">Selecione...</option>
              {pacIds.map(id => <option key={id} value={id}>{pacMap[id]?.nome || id}</option>)}
            </select>
          </Field>

          <Row2>
            <Field label="Data *">
              <input type="date" style={inp} value={form.data || ''} onChange={e => setF('data', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Vincular à Consulta">
              <select style={inp} value={form.consulta_id || ''} onChange={e => setF('consulta_id', e.target.value)} onFocus={focus} onBlur={blur}>
                <option value="">Nenhuma</option>
                {pacConsultas.map(c => <option key={c.id} value={c.id}>{c.data} — {c.objetivo || 'sem objetivo'}</option>)}
              </select>
            </Field>
          </Row2>

          <Row3>
            <Field label="Peso (kg)">
              <input type="number" step="0.1" style={inp} placeholder="Ex: 74.2" value={form.peso_kg || ''} onChange={e => setF('peso_kg', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Gordura Corporal (%)">
              <input type="number" step="0.1" style={inp} placeholder="Ex: 24.1" value={form.gordura_corporal_pct || ''} onChange={e => setF('gordura_corporal_pct', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Circ. Abdominal (cm)">
              <input type="number" step="0.1" style={inp} placeholder="Ex: 88.0" value={form.circunferencia_abdominal_cm || ''} onChange={e => setF('circunferencia_abdominal_cm', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
          </Row3>

          <Field label="Observações">
            <textarea style={ta} placeholder="Notas sobre a evolução do paciente" value={form.observacoes || ''} onChange={e => setF('observacoes', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button style={btnGhost} onClick={() => { setModal(null); setForm({}) }}>Cancelar</button>
            <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={saveEvolucao} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  /* ─── Render ────────────────────────────────────────────────── */
  const TABS = ['Pacientes', 'Planos Alimentares', 'Evolução do Paciente']

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: L.t1 }}>Nutrição</div>
        <div style={{ fontSize: 13, color: L.t4, marginTop: 2 }}>Avaliação nutricional, planos alimentares e evolução de peso</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 400,
            color: tab === i ? L.teal : L.t3,
            borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <Tab0 />}
      {tab === 1 && <Tab1 />}
      {tab === 2 && <Tab2 />}

      {/* Modals */}
      {modal === 'nova_consulta' && <NovaConsultaModal />}
      {modal === 'nova_evolucao' && <NovaEvolucaoModal />}
    </div>
  )
}
