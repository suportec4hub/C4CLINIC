import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const CATEGORIA_MAP = {
  seguranca:   { label: 'Segurança',    color: L.red,    bg: L.redBg },
  qualidade:   { label: 'Qualidade',    color: L.blue,   bg: L.blueBg },
  eficiencia:  { label: 'Eficiência',   color: L.teal,   bg: L.tealBg },
  satisfacao:  { label: 'Satisfação',   color: L.green,  bg: L.greenBg },
  financeiro:  { label: 'Financeiro',   color: L.purple, bg: L.purpleBg },
}

const FREQUENCIA_MAP = {
  diario:   'Diário',
  semanal:  'Semanal',
  mensal:   'Mensal',
}

const META_TIPO_MAP = {
  maior_melhor: 'Maior é melhor',
  menor_melhor: 'Menor é melhor',
}

const SEED_INDICADORES = [
  { codigo: 'IACS-01',  nome: 'Taxa de infecção hospitalar (IACS)',   categoria: 'seguranca',  meta_valor: 2,   meta_tipo: 'menor_melhor', unidade: '%',    frequencia: 'mensal', formula: 'Nº infecções / Nº internações × 100' },
  { codigo: 'REINTERN', nome: 'Taxa de reinternação em 30 dias',       categoria: 'qualidade',  meta_valor: 8,   meta_tipo: 'menor_melhor', unidade: '%',    frequencia: 'mensal', formula: 'Nº reinternações 30d / Total altas × 100' },
  { codigo: 'TMESP',    nome: 'Tempo médio de espera',                 categoria: 'eficiencia', meta_valor: 30,  meta_tipo: 'menor_melhor', unidade: 'min',  frequencia: 'diario', formula: 'Soma dos tempos de espera / Nº atendimentos' },
  { codigo: 'OCUP',     nome: 'Taxa de ocupação de leitos',            categoria: 'eficiencia', meta_valor: 75,  meta_tipo: 'maior_melhor', unidade: '%',    frequencia: 'diario', formula: 'Leitos ocupados / Total leitos × 100' },
  { codigo: 'NPS',      nome: 'Satisfação do paciente (NPS)',          categoria: 'satisfacao', meta_valor: 70,  meta_tipo: 'maior_melhor', unidade: 'pts',  frequencia: 'mensal', formula: '% promotores - % detratores' },
  { codigo: 'ABSMEDD',  nome: 'Taxa de absenteísmo médico',            categoria: 'qualidade',  meta_valor: 5,   meta_tipo: 'menor_melhor', unidade: '%',    frequencia: 'mensal', formula: 'Dias faltosos / Dias trabalháveis × 100' },
  { codigo: 'CUSTOINT', nome: 'Custo médio por internação',            categoria: 'financeiro', meta_valor: 5000,meta_tipo: 'menor_melhor', unidade: 'R$',   frequencia: 'mensal', formula: 'Custo total internações / Nº internações' },
  { codigo: 'COMPCIR',  nome: 'Taxa de complicações cirúrgicas',       categoria: 'seguranca',  meta_valor: 2,   meta_tipo: 'menor_melhor', unidade: '%',    frequencia: 'mensal', formula: 'Nº complicações / Nº cirurgias × 100' },
  { codigo: 'TMINT',    nome: 'Tempo médio de internação',             categoria: 'eficiencia', meta_valor: 5,   meta_tipo: 'menor_melhor', unidade: 'dias', frequencia: 'mensal', formula: 'Soma dias internação / Nº internações' },
  { codigo: 'GLOSA',    nome: 'Taxa de glosa',                         categoria: 'financeiro', meta_valor: 5,   meta_tipo: 'menor_melhor', unidade: '%',    frequencia: 'mensal', formula: 'Valor glosado / Valor faturado × 100' },
]

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${L.line}`,
        borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
    </div>
  )
}

function CategoriaBadge({ categoria }) {
  const cfg = CATEGORIA_MAP[categoria] || { label: categoria, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      color: cfg.color, background: cfg.bg, letterSpacing: '0.5px',
      textTransform: 'uppercase'
    }}>{cfg.label}</span>
  )
}

function MetaBadge({ atingiu }) {
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: atingiu ? L.green : L.red,
      background: atingiu ? L.greenBg : L.redBg
    }}>
      {atingiu ? '✓ Meta' : '✗ Abaixo'}
    </span>
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8,
        background: L.bg, color: L.t1, outline: 'none',
        boxSizing: 'border-box', ...style
      }}
    />
  )
}

function Select({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8,
        background: L.bg, color: L.t1, outline: 'none',
        boxSizing: 'border-box', ...style
      }}
    >
      {children}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8,
        background: L.bg, color: L.t1, outline: 'none',
        boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit'
      }}
    />
  )
}

function BtnPrimary({ onClick, children, disabled, loading: isLoading, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        background: L.teal, color: L.white, fontWeight: 600,
        padding: '10px 20px', borderRadius: 8, fontSize: 13,
        border: 'none', cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.7 : 1, ...style
      }}
    >
      {isLoading ? 'Salvando...' : children}
    </button>
  )
}

function BtnSecondary({ onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: L.bg, color: L.t2, fontWeight: 500,
        padding: '10px 20px', borderRadius: 8, fontSize: 13,
        border: `1.5px solid ${L.line}`, cursor: 'pointer', ...style
      }}
    >
      {children}
    </button>
  )
}

// Bottom sheet overlay
function SheetOverlay({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100
      }}
    />
  )
}

// ─── SVG Trend Chart ──────────────────────────────────────────────────────────

function TrendChart({ medicoes, meta, metaTipo }) {
  const last6 = medicoes.slice(-6)
  if (last6.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: L.t4, fontSize: 12, padding: 20 }}>
        Sem dados para gráfico
      </div>
    )
  }

  const W = 340, H = 140
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const values = last6.map(m => m.valor)
  const allVals = [...values, meta]
  const minVal = Math.min(...allVals) * 0.9
  const maxVal = Math.max(...allVals) * 1.1

  const scaleX = i => PAD.left + (i / (last6.length - 1 || 1)) * chartW
  const scaleY = v => PAD.top + chartH - ((v - minVal) / (maxVal - minVal || 1)) * chartH

  const metaY = scaleY(meta)

  const points = last6.map((m, i) => ({ x: scaleX(i), y: scaleY(m.valor), val: m.valor, comp: m.competencia }))
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PAD.top + chartH * f
        const val = maxVal - f * (maxVal - minVal)
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke={L.line} strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize={9} fill={L.t4}>{Math.round(val)}</text>
          </g>
        )
      })}

      {/* Meta dashed line */}
      <line x1={PAD.left} x2={W - PAD.right} y1={metaY} y2={metaY}
        stroke={L.yellow} strokeWidth={1.5} strokeDasharray="5,3" />
      <text x={W - PAD.right + 2} y={metaY + 4} fontSize={9} fill={L.yellow}>Meta</text>

      {/* Value line */}
      <polyline points={polyline}
        fill="none" stroke={L.teal} strokeWidth={2} strokeLinejoin="round" />

      {/* Area fill */}
      {points.length > 1 && (
        <polygon
          points={`${points[0].x},${PAD.top + chartH} ${polyline} ${points[points.length-1].x},${PAD.top + chartH}`}
          fill={L.teal} opacity={0.08}
        />
      )}

      {/* Dots */}
      {points.map((p, i) => {
        const met = metaTipo === 'maior_melhor' ? p.val >= meta : p.val <= meta
        return (
          <circle key={i} cx={p.x} cy={p.y} r={4}
            fill={met ? L.green : L.red} stroke={L.white} strokeWidth={1.5} />
        )
      })}

      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle"
          fontSize={9} fill={L.t4}>{p.comp?.slice(0,7)}</text>
      ))}
    </svg>
  )
}

// ─── Tab 0: Painel de Indicadores ─────────────────────────────────────────────

function TrendArrow({ current, previous, metaTipo }) {
  if (previous === null || previous === undefined) return <span style={{ color: L.t4 }}>→</span>
  if (current === previous) return <span style={{ color: L.t3 }}>→</span>
  const up = current > previous
  const good = metaTipo === 'maior_melhor' ? up : !up
  return (
    <span style={{ fontSize: 18, color: good ? L.green : L.red, fontWeight: 700 }}>
      {up ? '↑' : '↓'}
    </span>
  )
}

function KpiCard({ ind, medicaoAtual, medicaoAnterior }) {
  const cat = CATEGORIA_MAP[ind.categoria] || {}
  const val = medicaoAtual?.valor
  const meta = ind.meta_valor
  const atingiu = medicaoAtual?.atingiu_meta

  let progress = 0
  if (val !== undefined && val !== null && meta) {
    if (ind.meta_tipo === 'maior_melhor') {
      progress = Math.min((val / meta) * 100, 100)
    } else {
      progress = val <= meta ? 100 : Math.max(0, (1 - (val - meta) / meta) * 100)
    }
  }

  const barColor = atingiu ? L.green : (val !== undefined && val !== null ? L.red : L.line)

  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      borderTop: `3px solid ${cat.color || L.line}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, flex: 1, lineHeight: 1.3 }}>
          {ind.nome}
        </div>
        <CategoriaBadge categoria={ind.categoria} />
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: 32, fontWeight: 700, color: L.t1,
          fontFamily: "'Outfit', sans-serif", lineHeight: 1
        }}>
          {val !== undefined && val !== null ? val.toLocaleString('pt-BR') : '—'}
        </span>
        <span style={{ fontSize: 13, color: L.t3 }}>{ind.unidade}</span>
        <TrendArrow
          current={val}
          previous={medicaoAnterior?.valor}
          metaTipo={ind.meta_tipo}
        />
      </div>

      {/* Meta progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
            Meta: {meta} {ind.unidade}
          </span>
          <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
            {META_TIPO_MAP[ind.meta_tipo]}
          </span>
        </div>
        <div style={{ height: 6, background: L.line, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: barColor, borderRadius: 3,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {atingiu !== undefined && atingiu !== null
          ? <MetaBadge atingiu={atingiu} />
          : <span style={{ fontSize: 11, color: L.t4 }}>Sem medição</span>
        }
        <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
          {FREQUENCIA_MAP[ind.frequencia]}
        </span>
      </div>
    </div>
  )
}

function TabPainel({ clinicaId }) {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [indicadores, setIndicadores] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [medicoesAnterior, setMedicoesAnterior] = useState([])
  const [loading, setLoading] = useState(true)

  const competencia = `${ano}-${String(mes).padStart(2, '0')}`
  const mesAnterior = mes === 1
    ? `${ano - 1}-12`
    : `${ano}-${String(mes - 1).padStart(2, '0')}`

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    try {
      // Seed indicadores if empty
      const { data: existing } = await supabase
        .from('indicadores_kpi')
        .select('codigo')
        .eq('clinica_id', clinicaId)

      const existingCodes = new Set((existing || []).map(e => e.codigo))
      const toInsert = SEED_INDICADORES.filter(s => !existingCodes.has(s.codigo))
      if (toInsert.length > 0) {
        await supabase.from('indicadores_kpi').insert(
          toInsert.map(s => ({ ...s, clinica_id: clinicaId, ativo: true }))
        )
      }

      const [{ data: inds }, { data: meds }, { data: medsAnterior }] = await Promise.all([
        supabase.from('indicadores_kpi').select('*').eq('clinica_id', clinicaId).eq('ativo', true).order('categoria'),
        supabase.from('medicoes_kpi').select('*').eq('clinica_id', clinicaId).eq('competencia', competencia),
        supabase.from('medicoes_kpi').select('*').eq('clinica_id', clinicaId).eq('competencia', mesAnterior),
      ])
      setIndicadores(inds || [])
      setMedicoes(meds || [])
      setMedicoesAnterior(medsAnterior || [])
    } finally {
      setLoading(false)
    }
  }, [clinicaId, competencia, mesAnterior])

  useEffect(() => { load() }, [load])

  const getMedicao = (indicadorId, list = medicoes) =>
    list.find(m => m.indicador_id === indicadorId)

  const total = indicadores.length
  const comMedicao = indicadores.filter(ind => getMedicao(ind.id))
  const atingiram = comMedicao.filter(ind => getMedicao(ind.id)?.atingiu_meta)
  const compliance = comMedicao.length > 0 ? Math.round((atingiram.length / comMedicao.length) * 100) : null

  const mesAntComMed = indicadores.filter(ind => getMedicao(ind.id, medicoesAnterior))
  const mesAntAtingiu = mesAntComMed.filter(ind => getMedicao(ind.id, medicoesAnterior)?.atingiu_meta)
  const complianceAnterior = mesAntComMed.length > 0 ? Math.round((mesAntAtingiu.length / mesAntComMed.length) * 100) : null

  const trendDiff = compliance !== null && complianceAnterior !== null ? compliance - complianceAnterior : null

  return (
    <div>
      {/* Month/Year selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Label>Mês</Label>
          <Select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width: 140 }}>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Ano</Label>
          <Select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ width: 100 }}>
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Executive summary strip */}
      <div style={{
        background: L.teal, borderRadius: 14, padding: '20px 24px',
        marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>
            Conformidade geral — {MESES[mes - 1]}/{ano}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: L.white, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
              {compliance !== null ? `${compliance}%` : '—'}
            </span>
            {trendDiff !== null && (
              <span style={{
                fontSize: 16, fontWeight: 700,
                color: trendDiff >= 0 ? '#86efac' : '#fca5a5'
              }}>
                {trendDiff >= 0 ? `▲ +${trendDiff}%` : `▼ ${trendDiff}%`} vs mês anterior
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: L.white }}>{total}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Indicadores ativos</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#86efac' }}>{atingiram.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Metas atingidas</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fca5a5' }}>{comMedicao.length - atingiram.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Abaixo da meta</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{total - comMedicao.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Sem medição</div>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16
        }}>
          {indicadores.map(ind => (
            <KpiCard
              key={ind.id}
              ind={ind}
              medicaoAtual={getMedicao(ind.id)}
              medicaoAnterior={getMedicao(ind.id, medicoesAnterior)}
            />
          ))}
          {indicadores.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: L.t4, padding: 40 }}>
              Nenhum indicador ativo encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab 1: Medições ──────────────────────────────────────────────────────────

const EMPTY_MEDICAO = {
  indicador_id: '', competencia: '', valor: '',
  meta_no_periodo: '', observacoes: '', responsavel: ''
}

function TabMedicoes({ clinicaId }) {
  const now = new Date()
  const defaultComp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [medicoes, setMedicoes] = useState([])
  const [indicadores, setIndicadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_MEDICAO, competencia: defaultComp })
  const [filterInd, setFilterInd] = useState('')
  const [filterComp, setFilterComp] = useState('')
  const [filterMeta, setFilterMeta] = useState('')

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    try {
      const [{ data: meds }, { data: inds }] = await Promise.all([
        supabase.from('medicoes_kpi').select('*').eq('clinica_id', clinicaId).order('competencia', { ascending: false }).order('criado_em', { ascending: false }),
        supabase.from('indicadores_kpi').select('id,nome,meta_valor,meta_tipo,unidade,categoria').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      ])
      setMedicoes(meds || [])
      setIndicadores(inds || [])
    } finally {
      setLoading(false)
    }
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const indMap = Object.fromEntries(indicadores.map(i => [i.id, i]))

  const filtered = medicoes.filter(m => {
    if (filterInd && m.indicador_id !== filterInd) return false
    if (filterComp && !m.competencia.includes(filterComp)) return false
    if (filterMeta === 'sim' && !m.atingiu_meta) return false
    if (filterMeta === 'nao' && m.atingiu_meta) return false
    return true
  })

  function handleIndChange(e) {
    const id = e.target.value
    const ind = indicadores.find(i => i.id === id)
    setForm(f => ({
      ...f,
      indicador_id: id,
      meta_no_periodo: ind ? String(ind.meta_valor) : ''
    }))
  }

  function calcAtingiu(valor, meta, metaTipo) {
    if (valor === '' || meta === '') return null
    const v = Number(valor), m = Number(meta)
    return metaTipo === 'maior_melhor' ? v >= m : v <= m
  }

  async function salvar() {
    if (!form.indicador_id || form.valor === '' || !form.competencia) return
    setSaving(true)
    try {
      const ind = indicadores.find(i => i.id === form.indicador_id)
      const atingiu = calcAtingiu(form.valor, form.meta_no_periodo, ind?.meta_tipo)
      await supabase.from('medicoes_kpi').insert({
        clinica_id: clinicaId,
        indicador_id: form.indicador_id,
        competencia: form.competencia,
        valor: Number(form.valor),
        meta_no_periodo: form.meta_no_periodo ? Number(form.meta_no_periodo) : null,
        atingiu_meta: atingiu,
        observacoes: form.observacoes || null,
        responsavel: form.responsavel || null,
      })
      setSheetOpen(false)
      setForm({ ...EMPTY_MEDICAO, competencia: defaultComp })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Label>Indicador</Label>
          <Select value={filterInd} onChange={e => setFilterInd(e.target.value)}>
            <option value="">Todos</option>
            {indicadores.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 120 }}>
          <Label>Competência</Label>
          <Input value={filterComp} onChange={e => setFilterComp(e.target.value)} placeholder="2025-01" />
        </div>
        <div style={{ minWidth: 130 }}>
          <Label>Atingiu meta</Label>
          <Select value={filterMeta} onChange={e => setFilterMeta(e.target.value)}>
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </Select>
        </div>
        <BtnPrimary onClick={() => setSheetOpen(true)}>+ Registrar Medição</BtnPrimary>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                {['Indicador', 'Competência', 'Valor', 'Meta', 'Atingiu', 'Responsável', 'Obs'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: L.t3, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const ind = indMap[m.indicador_id]
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${L.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = L.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500, color: L.t1 }}>{ind?.nome || m.indicador_id}</div>
                      {ind && <CategoriaBadge categoria={ind.categoria} />}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                      {m.competencia}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: L.t1 }}>
                      {m.valor?.toLocaleString('pt-BR')} {ind?.unidade}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>
                      {m.meta_no_periodo ?? '—'} {ind?.unidade}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {m.atingiu_meta !== null && m.atingiu_meta !== undefined
                        ? <MetaBadge atingiu={m.atingiu_meta} />
                        : <span style={{ color: L.t4, fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>{m.responsavel || '—'}</td>
                    <td style={{ padding: '10px 12px', color: L.t3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.observacoes || '—'}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: L.t4, padding: 32 }}>
                    Nenhuma medição encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom-sheet: Registrar Medição */}
      {sheetOpen && (
        <>
          <SheetOverlay onClose={() => setSheetOpen(false)} />
          <div style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'flex-end', zIndex: 101
          }}>
            <div style={{
              width: '100%', background: L.bg,
              borderRadius: '16px 16px 0 0', maxHeight: '92vh',
              overflowY: 'auto', animation: 'up 0.25s ease',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15)'
            }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: L.t1 }}>Registrar Medição</h3>
                  <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: L.t3, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <Label>Indicador *</Label>
                    <Select value={form.indicador_id} onChange={handleIndChange}>
                      <option value="">Selecione…</option>
                      {indicadores.map(i => (
                        <option key={i.id} value={i.id}>{i.nome}</option>
                      ))}
                    </Select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <Label>Competência (AAAA-MM) *</Label>
                      <Input value={form.competencia} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} placeholder="2025-01" />
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0" />
                    </div>
                  </div>

                  <div>
                    <Label>Meta no período (auto-preenchida)</Label>
                    <Input type="number" value={form.meta_no_periodo} onChange={e => setForm(f => ({ ...f, meta_no_periodo: e.target.value }))} placeholder="0" />
                  </div>

                  <div>
                    <Label>Responsável</Label>
                    <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações ou contexto…" />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                  <BtnSecondary onClick={() => setSheetOpen(false)}>Cancelar</BtnSecondary>
                  <BtnPrimary
                    onClick={salvar}
                    loading={saving}
                    disabled={!form.indicador_id || form.valor === '' || !form.competencia}
                  >
                    Salvar
                  </BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab 2: Configuração de Indicadores ───────────────────────────────────────

const EMPTY_IND = {
  codigo: '', nome: '', categoria: 'qualidade', formula: '',
  meta_valor: '', meta_tipo: 'maior_melhor', unidade: '%',
  frequencia: 'mensal', ativo: true
}

function ChartModal({ ind, clinicaId, onClose }) {
  const [medicoes, setMedicoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('medicoes_kpi')
        .select('competencia,valor,atingiu_meta')
        .eq('clinica_id', clinicaId)
        .eq('indicador_id', ind.id)
        .order('competencia', { ascending: true })
        .limit(6)
      setMedicoes(data || [])
      setLoading(false)
    }
    load()
  }, [ind.id, clinicaId])

  return (
    <>
      <SheetOverlay onClose={onClose} />
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'flex-end', zIndex: 101
      }}>
        <div style={{
          width: '100%', background: L.bg,
          borderRadius: '16px 16px 0 0', maxHeight: '92vh',
          overflowY: 'auto', animation: 'up 0.25s ease',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.15)'
        }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: L.t1 }}>Evolução — {ind.nome}</h3>
                <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>Últimas 6 medições</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: L.t3, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <CategoriaBadge categoria={ind.categoria} />
              <span style={{ fontSize: 12, color: L.t3 }}>Meta: {ind.meta_valor} {ind.unidade} ({META_TIPO_MAP[ind.meta_tipo]})</span>
            </div>

            {loading ? <Spinner /> : (
              <div style={{ padding: '8px 0' }}>
                <TrendChart medicoes={medicoes} meta={ind.meta_valor} metaTipo={ind.meta_tipo} />
                {medicoes.length === 0 && (
                  <div style={{ textAlign: 'center', color: L.t4, padding: 24 }}>
                    Sem medições registradas para este indicador.
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <BtnSecondary onClick={onClose}>Fechar</BtnSecondary>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function TabConfiguracao({ clinicaId }) {
  const [indicadores, setIndicadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editInd, setEditInd] = useState(null) // null = new
  const [form, setForm] = useState({ ...EMPTY_IND })
  const [chartInd, setChartInd] = useState(null)

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const { data } = await supabase
      .from('indicadores_kpi')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('categoria')
      .order('nome')
    setIndicadores(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditInd(null)
    setForm({ ...EMPTY_IND })
    setSheetOpen(true)
  }

  function openEdit(ind) {
    setEditInd(ind)
    setForm({
      codigo: ind.codigo || '',
      nome: ind.nome || '',
      categoria: ind.categoria || 'qualidade',
      formula: ind.formula || '',
      meta_valor: ind.meta_valor ?? '',
      meta_tipo: ind.meta_tipo || 'maior_melhor',
      unidade: ind.unidade || '%',
      frequencia: ind.frequencia || 'mensal',
      ativo: ind.ativo !== false,
    })
    setSheetOpen(true)
  }

  async function toggleAtivo(ind) {
    await supabase.from('indicadores_kpi').update({ ativo: !ind.ativo }).eq('id', ind.id)
    setIndicadores(prev => prev.map(i => i.id === ind.id ? { ...i, ativo: !i.ativo } : i))
  }

  async function salvar() {
    if (!form.nome || form.meta_valor === '') return
    setSaving(true)
    try {
      const payload = {
        clinica_id: clinicaId,
        codigo: form.codigo || null,
        nome: form.nome,
        categoria: form.categoria,
        formula: form.formula || null,
        meta_valor: Number(form.meta_valor),
        meta_tipo: form.meta_tipo,
        unidade: form.unidade,
        frequencia: form.frequencia,
        ativo: form.ativo,
      }
      if (editInd) {
        await supabase.from('indicadores_kpi').update(payload).eq('id', editInd.id)
      } else {
        await supabase.from('indicadores_kpi').insert(payload)
      }
      setSheetOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <BtnPrimary onClick={openNew}>+ Novo Indicador</BtnPrimary>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                {['Código', 'Nome', 'Categoria', 'Meta', 'Tipo', 'Unidade', 'Frequência', 'Ativo', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: L.t3, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indicadores.map(ind => (
                <tr key={ind.id} style={{ borderBottom: `1px solid ${L.line}` }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', color: L.t3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                    {ind.codigo || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: L.t1 }}>{ind.nome}</td>
                  <td style={{ padding: '10px 12px' }}><CategoriaBadge categoria={ind.categoria} /></td>
                  <td style={{ padding: '10px 12px', color: L.t2 }}>{ind.meta_valor}</td>
                  <td style={{ padding: '10px 12px', color: L.t3, fontSize: 11 }}>
                    {ind.meta_tipo === 'maior_melhor' ? '↑ Maior' : '↓ Menor'}
                  </td>
                  <td style={{ padding: '10px 12px', color: L.t2 }}>{ind.unidade}</td>
                  <td style={{ padding: '10px 12px', color: L.t2 }}>{FREQUENCIA_MAP[ind.frequencia]}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => toggleAtivo(ind)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: ind.ativo ? L.teal : L.line,
                        border: 'none', cursor: 'pointer',
                        position: 'relative', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2,
                        left: ind.ativo ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: L.white, transition: 'left 0.2s'
                      }} />
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openEdit(ind)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          border: `1px solid ${L.line}`, background: L.bg,
                          color: L.t2, cursor: 'pointer'
                        }}
                      >Editar</button>
                      <button
                        onClick={() => setChartInd(ind)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          border: `1px solid ${L.teal}`, background: L.tealBg,
                          color: L.teal, cursor: 'pointer'
                        }}
                      >Gráfico</button>
                    </div>
                  </td>
                </tr>
              ))}
              {indicadores.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: L.t4, padding: 32 }}>
                    Nenhum indicador cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart modal */}
      {chartInd && (
        <ChartModal ind={chartInd} clinicaId={clinicaId} onClose={() => setChartInd(null)} />
      )}

      {/* Bottom-sheet: Novo / Editar Indicador */}
      {sheetOpen && (
        <>
          <SheetOverlay onClose={() => setSheetOpen(false)} />
          <div style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'flex-end', zIndex: 101
          }}>
            <div style={{
              width: '100%', background: L.bg,
              borderRadius: '16px 16px 0 0', maxHeight: '92vh',
              overflowY: 'auto', animation: 'up 0.25s ease',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15)'
            }}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: L.t1 }}>
                    {editInd ? 'Editar Indicador' : 'Novo Indicador'}
                  </h3>
                  <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: L.t3, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                    <div>
                      <Label>Código</Label>
                      <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="EX-01" />
                    </div>
                    <div>
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do indicador" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                        <option value="seguranca">Segurança</option>
                        <option value="qualidade">Qualidade</option>
                        <option value="eficiencia">Eficiência</option>
                        <option value="satisfacao">Satisfação</option>
                        <option value="financeiro">Financeiro</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Frequência</Label>
                      <Select value={form.frequencia} onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}>
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                      </Select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <Label>Valor da meta *</Label>
                      <Input type="number" value={form.meta_valor} onChange={e => setForm(f => ({ ...f, meta_valor: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label>Tipo de meta</Label>
                      <Select value={form.meta_tipo} onChange={e => setForm(f => ({ ...f, meta_tipo: e.target.value }))}>
                        <option value="maior_melhor">Maior é melhor</option>
                        <option value="menor_melhor">Menor é melhor</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Unidade</Label>
                      <Input value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} placeholder="% / min / R$ / dias" />
                    </div>
                  </div>

                  <div>
                    <Label>Fórmula de cálculo</Label>
                    <Textarea value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))} placeholder="Descreva como calcular este indicador…" rows={2} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: form.ativo ? L.teal : L.line,
                        border: 'none', cursor: 'pointer',
                        position: 'relative', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2,
                        left: form.ativo ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: L.white, transition: 'left 0.2s'
                      }} />
                    </button>
                    <span style={{ fontSize: 13, color: L.t2 }}>Indicador ativo</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                  <BtnSecondary onClick={() => setSheetOpen(false)}>Cancelar</BtnSecondary>
                  <BtnPrimary
                    onClick={salvar}
                    loading={saving}
                    disabled={!form.nome || form.meta_valor === ''}
                  >
                    {editInd ? 'Salvar alterações' : 'Criar indicador'}
                  </BtnPrimary>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 0, label: 'Painel de Indicadores' },
  { id: 1, label: 'Medições' },
  { id: 2, label: 'Configuração de Indicadores' },
]

export default function PageKPIs({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: L.t1 }}>
          Indicadores de Qualidade
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: L.t3 }}>
          KPIs assistenciais — monitoramento e conformidade
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, borderBottom: `2px solid ${L.line}`, marginBottom: 28
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? L.teal : L.t3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? L.teal : 'transparent'}`,
              marginBottom: -2, transition: 'color 0.15s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabPainel clinicaId={clinicaId} />}
      {tab === 1 && <TabMedicoes clinicaId={clinicaId} />}
      {tab === 2 && <TabConfiguracao clinicaId={clinicaId} />}
    </div>
  )
}
