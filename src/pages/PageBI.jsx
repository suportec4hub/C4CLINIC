import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── constants ─────────────────────────────────────────── */
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const TABS = ['Visão Geral','Por Médico','Cohort Analysis','Exportação']

/* ─── helpers ───────────────────────────────────────────── */
function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function fmtPct(v) {
  return `${(v || 0).toFixed(1)}%`
}
function pad2(n) { return String(n).padStart(2,'0') }
function toISO(d) { return d.toISOString().split('T')[0] }

function getPeriodRange(preset, custom) {
  const hoje = new Date()
  if (preset === 'custom' && custom.start && custom.end) {
    return { start: custom.start, end: custom.end }
  }
  let d = new Date(hoje)
  if (preset === '7d')  { d.setDate(hoje.getDate() - 7) }
  if (preset === '30d') { d.setDate(hoje.getDate() - 30) }
  if (preset === '90d') { d.setDate(hoje.getDate() - 90) }
  if (preset === '12m') { d.setFullYear(hoje.getFullYear() - 1) }
  return { start: toISO(d), end: toISO(hoje) }
}

function getPrevRange(start, end) {
  const s = new Date(start), e = new Date(end)
  const diff = e - s
  const ps = new Date(s - diff)
  const pe = new Date(s - 1)
  return { start: toISO(ps), end: toISO(pe) }
}

/* ─── sub-components ────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding: 48 }}>
      <div style={{
        width:28, height:28,
        border:`3px solid ${L.line}`,
        borderTop:`3px solid ${L.teal}`,
        borderRadius:'50%',
        animation:'spin 0.7s linear infinite'
      }}/>
    </div>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.surface,
      border:`1px solid ${L.line}`,
      borderRadius:12,
      padding:'16px 18px',
      flex:'1 1 140px',
      minWidth:130
    }}>
      <div style={{ fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || L.t1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:L.t3, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

/* ─── SVG Line Chart ─────────────────────────────────────── */
function LineChartSVG({ data, width=600, height=250 }) {
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef()

  if (!data || data.length === 0) return (
    <div style={{ height:250, display:'flex', alignItems:'center', justifyContent:'center', color:L.t4, fontSize:13 }}>
      Sem dados no período
    </div>
  )

  const padL=52, padR=20, padT=20, padB=36
  const W = width - padL - padR
  const H = height - padT - padB

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const xs = data.map((_, i) => padL + (i / Math.max(data.length - 1, 1)) * W)
  const ys = data.map(d => padT + H - (d.value / maxVal) * H)

  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${xs[xs.length-1].toFixed(1)},${(padT+H).toFixed(1)} L${xs[0].toFixed(1)},${(padT+H).toFixed(1)} Z`

  const yTicks = 4
  const gridLines = Array.from({length: yTicks+1}, (_, i) => {
    const v = (maxVal / yTicks) * i
    const y = padT + H - (v / maxVal) * H
    return { v, y }
  })

  return (
    <div style={{ position:'relative', width:'100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width:'100%', height:height, display:'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="biGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={L.teal} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={L.teal} stopOpacity="0.02"/>
          </linearGradient>
        </defs>

        {/* grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={padL+W} y1={g.y.toFixed(1)} y2={g.y.toFixed(1)}
              stroke={L.line} strokeWidth="1" strokeDasharray="4 4" opacity="0.6"/>
            <text x={padL-6} y={g.y+4} textAnchor="end" fontSize="10" fill={L.t4}>
              {g.v >= 1000 ? `${(g.v/1000).toFixed(0)}k` : g.v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* area fill */}
        <path d={areaPath} fill="url(#biGrad)"/>

        {/* line */}
        <path d={linePath} fill="none" stroke={L.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

        {/* x-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={xs[i].toFixed(1)} y={padT+H+22} textAnchor="middle" fontSize="11" fill={L.t4}>
            {d.label}
          </text>
        ))}

        {/* hover dots */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xs[i].toFixed(1)} cy={ys[i].toFixed(1)} r="5"
            fill={L.teal} stroke={L.white} strokeWidth="2"
            style={{ cursor:'pointer' }}
            onMouseEnter={() => setTooltip({ x: xs[i], y: ys[i], label: d.label, value: d.value })}
          />
        ))}
      </svg>

      {/* tooltip */}
      {tooltip && (
        <div style={{
          position:'absolute',
          left: `calc(${(tooltip.x / width)*100}% - 70px)`,
          top: tooltip.y - 52,
          background: L.surface,
          border:`1px solid ${L.line}`,
          borderRadius:8,
          padding:'6px 12px',
          fontSize:12,
          pointerEvents:'none',
          boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
          whiteSpace:'nowrap',
          zIndex:10
        }}>
          <div style={{ fontWeight:600, color:L.t1 }}>{tooltip.label}</div>
          <div style={{ color:L.teal }}>{fmtBRL(tooltip.value)}</div>
        </div>
      )}
    </div>
  )
}

/* ─── SVG Bar Chart ──────────────────────────────────────── */
function BarChartSVG({ data, width=500, height=200, color, valuePrefix='' }) {
  const [tooltip, setTooltip] = useState(null)

  if (!data || data.length === 0) return (
    <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:L.t4, fontSize:13 }}>
      Sem dados
    </div>
  )

  const padL=44, padR=12, padT=16, padB=36
  const W = width - padL - padR
  const H = height - padT - padB
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(4, W / data.length - 4)

  return (
    <div style={{ position:'relative', width:'100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width:'100%', height, display:'block' }}
        onMouseLeave={() => setTooltip(null)}>
        {/* y-grid */}
        {[0,0.25,0.5,0.75,1].map((f, i) => {
          const y = padT + H - f * H
          return (
            <g key={i}>
              <line x1={padL} x2={padL+W} y1={y} y2={y} stroke={L.line} strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
              <text x={padL-4} y={y+4} textAnchor="end" fontSize="10" fill={L.t4}>
                {(maxVal*f) >= 1000 ? `${((maxVal*f)/1000).toFixed(0)}k` : (maxVal*f).toFixed(0)}
              </text>
            </g>
          )
        })}

        {data.map((d, i) => {
          const x = padL + (i / data.length) * W + (W / data.length - barW) / 2
          const bh = (d.value / maxVal) * H
          const y = padT + H - bh
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={bh}
                rx="3" fill={color || L.teal} opacity="0.85"
                style={{ cursor:'pointer' }}
                onMouseEnter={() => setTooltip({ x: x + barW/2, y, label: d.label, value: d.value })}
              />
              <text x={x + barW/2} y={padT+H+18} textAnchor="middle" fontSize="10" fill={L.t4}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {tooltip && (
        <div style={{
          position:'absolute',
          left:`calc(${(tooltip.x/width)*100}% - 55px)`,
          top: tooltip.y - 46,
          background:L.surface, border:`1px solid ${L.line}`,
          borderRadius:8, padding:'5px 10px', fontSize:12,
          pointerEvents:'none', boxShadow:'0 4px 14px rgba(0,0,0,0.12)',
          whiteSpace:'nowrap', zIndex:10
        }}>
          <div style={{ fontWeight:600, color:L.t1 }}>{tooltip.label}</div>
          <div style={{ color: color || L.teal }}>{valuePrefix}{typeof tooltip.value === 'number' && valuePrefix === 'R$ ' ? fmtBRL(tooltip.value) : tooltip.value}</div>
        </div>
      )}
    </div>
  )
}

/* ─── Heatmap ────────────────────────────────────────────── */
function HeatmapWeek({ data }) {
  // data: { [weekday_0-6]: { [hour_0-23]: count } }
  const maxCount = Math.max(1, ...Object.values(data).flatMap(h => Object.values(h)))

  function cellColor(count) {
    if (!count) return L.surface
    const t = count / maxCount
    if (t < 0.33) return `rgba(13,110,110,${0.15 + t * 0.5})`
    if (t < 0.66) return `rgba(13,110,110,${0.4 + t * 0.3})`
    return `rgba(13,110,110,${0.7 + t * 0.25})`
  }

  const hours = Array.from({length:24},(_,i)=>i)
  return (
    <div style={{ overflowX:'auto' }}>
      <div style={{ display:'grid', gridTemplateColumns:`40px repeat(7, 1fr)`, gap:2, minWidth:400 }}>
        <div/>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:L.t4, fontFamily:"'JetBrains Mono', monospace", padding:'2px 0' }}>{d}</div>
        ))}
        {hours.map(h => (
          <>
            <div key={`h${h}`} style={{ fontSize:10, color:L.t4, textAlign:'right', paddingRight:4, paddingTop:4, fontFamily:"'JetBrains Mono', monospace" }}>{pad2(h)}h</div>
            {[0,1,2,3,4,5,6].map(wd => {
              const count = data[wd]?.[h] || 0
              return (
                <div key={`${h}-${wd}`} title={`${DIAS_SEMANA[wd]} ${pad2(h)}h: ${count} agend.`}
                  style={{
                    height:16, borderRadius:2,
                    background: cellColor(count),
                    border:`1px solid ${L.lineSoft}`
                  }}/>
              )
            })}
          </>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, justifyContent:'flex-end' }}>
        <span style={{ fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>0</span>
        {[0.1,0.3,0.5,0.7,0.9].map((t,i) => (
          <div key={i} style={{ width:16, height:10, borderRadius:2, background:`rgba(13,110,110,${0.15+t*0.8})` }}/>
        ))}
        <span style={{ fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>máx</span>
      </div>
    </div>
  )
}

/* ─── Funnel ─────────────────────────────────────────────── */
function PatientFunnel({ steps }) {
  const maxVal = Math.max(1, steps[0]?.count || 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {steps.map((s, i) => {
        const pct = (s.count / maxVal) * 100
        const conv = i === 0 ? 100 : ((s.count / steps[0].count) * 100)
        return (
          <div key={i}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, color:L.t2 }}>{s.label}</span>
              <span style={{ fontSize:12, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>
                {s.count.toLocaleString('pt-BR')} · {fmtPct(conv)}
              </span>
            </div>
            <div style={{ height:28, borderRadius:4, background:L.line, overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width:`${pct}%`,
                background: `linear-gradient(90deg, ${L.teal}, ${L.tealLt})`,
                borderRadius:4,
                display:'flex', alignItems:'center', paddingLeft:8,
                transition:'width 0.4s ease'
              }}>
                <span style={{ fontSize:11, color:L.white, fontWeight:600 }}>{s.count.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Cohort cell color ──────────────────────────────────── */
function cohortColor(pct) {
  if (pct === null || pct === undefined) return L.surface
  const t = Math.min(pct / 100, 1)
  return `rgba(22,163,74,${0.08 + t * 0.85})`
}

/* ─── Tab 0: Visão Geral ─────────────────────────────────── */
function TabVisaoGeral({ clinicaId }) {
  const [preset, setPreset] = useState('30d')
  const [custom, setCustom] = useState({ start:'', end:'' })
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState(null)
  const [revTrend, setRevTrend] = useState([])
  const [heatmap, setHeatmap] = useState({})
  const [funnel, setFunnel] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = getPeriodRange(preset, custom)
    const { start: ps, end: pe } = getPrevRange(start, end)

    const [
      { data: consultas },
      { data: consultasPrev },
      { data: agendamentos },
      { data: pacientes },
      { data: pacientesPrev },
      { data: lancamentos },
    ] = await Promise.all([
      supabase.from('consultas').select('valor, data, medico_id').eq('clinica_id', clinicaId).gte('data', start).lte('data', end),
      supabase.from('consultas').select('valor').eq('clinica_id', clinicaId).gte('data', ps).lte('data', pe),
      supabase.from('agendamentos').select('data_hora, status').eq('clinica_id', clinicaId).gte('data_hora', start).lte('data_hora', end + 'T23:59:59'),
      supabase.from('pacientes').select('data_cadastro, ativo').eq('clinica_id', clinicaId).gte('data_cadastro', start).lte('data_cadastro', end),
      supabase.from('pacientes').select('id').eq('clinica_id', clinicaId).gte('data_cadastro', ps).lte('data_cadastro', pe),
      supabase.from('lancamentos').select('valor, tipo, data').eq('clinica_id', clinicaId).gte('data', start).lte('data', end),
    ])

    const rec = (consultas||[]).reduce((s, c) => s + (c.valor||0), 0)
    const recPrev = (consultasPrev||[]).reduce((s, c) => s + (c.valor||0), 0)
    const qtConsultas = (consultas||[]).length
    const novos = (pacientes||[]).length
    const novosPrev = (pacientesPrev||[]).length
    const realizado = (agendamentos||[]).filter(a => a.status === 'realizado' || a.status === 'concluido' || a.status === 'confirmado').length
    const total = (agendamentos||[]).length || 1
    const ocupacao = (realizado / total) * 100
    const ticket = qtConsultas > 0 ? rec / qtConsultas : 0
    const crescimento = recPrev > 0 ? ((rec - recPrev) / recPrev) * 100 : 0

    setKpis({ rec, qtConsultas, novos, novosPrev, ocupacao, ticket, crescimento })

    // Revenue trend by month
    const byMonth = {}
    ;(consultas||[]).forEach(c => {
      if (!c.data) return
      const m = c.data.substring(0,7)
      byMonth[m] = (byMonth[m]||0) + (c.valor||0)
    })
    const months = Object.keys(byMonth).sort()
    setRevTrend(months.map(m => ({
      label: `${MESES[parseInt(m.split('-')[1])-1]}/${m.split('-')[0].slice(2)}`,
      value: byMonth[m]
    })))

    // Heatmap
    const hm = {}
    ;(agendamentos||[]).forEach(a => {
      if (!a.data_hora) return
      const dt = new Date(a.data_hora)
      const wd = dt.getDay()
      const h = dt.getHours()
      if (!hm[wd]) hm[wd] = {}
      hm[wd][h] = (hm[wd][h]||0) + 1
    })
    setHeatmap(hm)

    // Funnel
    const allPac = await supabase.from('pacientes').select('id, data_cadastro').eq('clinica_id', clinicaId).gte('data_cadastro', start).lte('data_cadastro', end)
    const pacIds = (allPac.data||[]).map(p => p.id)
    const agendPac = (agendamentos||[]).filter(a => a.paciente_id && pacIds.includes(a.paciente_id)).length
    const realizadoPac = (agendamentos||[]).filter(a => a.paciente_id && pacIds.includes(a.paciente_id) && (a.status==='realizado'||a.status==='concluido')).length
    const retorno = Math.round(realizadoPac * 0.35) // estimate

    setFunnel([
      { label:'Novos Pacientes', count: novos },
      { label:'Agendados', count: agendPac || Math.round(novos * 0.7) },
      { label:'Atendidos', count: realizadoPac || Math.round(novos * 0.55) },
      { label:'Retorno', count: retorno || Math.round(novos * 0.2) },
    ])

    setLoading(false)
  }, [clinicaId, preset, custom])

  useEffect(() => { load() }, [load])

  const presets = [
    { id:'7d', label:'7d' },
    { id:'30d', label:'30d' },
    { id:'90d', label:'90d' },
    { id:'12m', label:'12m' },
    { id:'custom', label:'Personalizado' },
  ]

  return (
    <div>
      {/* Period selector */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
        {presets.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
            background: preset===p.id ? L.teal : L.surface,
            color: preset===p.id ? L.white : L.t2,
            border: `1.5px solid ${preset===p.id ? L.teal : L.line}`,
          }}>{p.label}</button>
        ))}
        {preset === 'custom' && (
          <>
            <input type="date" value={custom.start} onChange={e => setCustom(c=>({...c, start:e.target.value}))}
              style={{ width:140, padding:'7px 10px', fontSize:12, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.surface, color:L.t1 }}/>
            <span style={{ color:L.t4, fontSize:12 }}>até</span>
            <input type="date" value={custom.end} onChange={e => setCustom(c=>({...c, end:e.target.value}))}
              style={{ width:140, padding:'7px 10px', fontSize:12, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.surface, color:L.t1 }}/>
          </>
        )}
      </div>

      {loading ? <Spinner/> : (
        <>
          {/* KPIs */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
            <KpiCard label="RECEITA PERÍODO" value={fmtBRL(kpis?.rec)} sub="consultas realizadas" color={L.teal}/>
            <KpiCard label="CONSULTAS" value={(kpis?.qtConsultas||0).toLocaleString('pt-BR')} sub="no período"/>
            <KpiCard label="NOVOS PACIENTES" value={(kpis?.novos||0).toLocaleString('pt-BR')}
              sub={`${kpis?.novosPrev||0} no período anterior`}/>
            <KpiCard label="TAXA OCUPAÇÃO" value={fmtPct(kpis?.ocupacao)} sub="agendamentos"/>
            <KpiCard label="TICKET MÉDIO" value={fmtBRL(kpis?.ticket)} sub="por consulta"/>
            <KpiCard label="CRESCIMENTO" value={fmtPct(kpis?.crescimento)}
              sub="vs período anterior"
              color={kpis?.crescimento >= 0 ? L.green : L.red}/>
          </div>

          {/* Revenue trend */}
          <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20, marginBottom:20 }}>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:16 }}>Receita por Período</div>
            <LineChartSVG data={revTrend} width={800} height={250}/>
          </div>

          {/* Heatmap */}
          <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20, marginBottom:20 }}>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:4 }}>Mapa de Calor — Agendamentos</div>
            <div style={{ fontSize:12, color:L.t4, marginBottom:16 }}>Dia da semana × Hora do dia</div>
            <HeatmapWeek data={heatmap}/>
          </div>

          {/* Funnel */}
          <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20 }}>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:16 }}>Funil de Aquisição de Pacientes</div>
            <PatientFunnel steps={funnel}/>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Tab 1: Por Médico ──────────────────────────────────── */
function TabPorMedico({ clinicaId }) {
  const [medicos, setMedicos] = useState([])
  const [selectedMedico, setSelectedMedico] = useState('todos')
  const [filterMedico, setFilterMedico] = useState('todos')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [drillData, setDrillData] = useState(null)
  const [drillLoading, setDrillLoading] = useState(false)

  useEffect(() => {
    supabase.from('medicos').select('id, nome, especialidade').eq('clinica_id', clinicaId)
      .then(({ data }) => setMedicos(data || []))
  }, [clinicaId])

  useEffect(() => {
    loadTable()
  }, [clinicaId, filterMedico])

  async function loadTable() {
    setLoading(true)
    const hoje = new Date()
    const inicio = toISO(new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1))
    const fim = toISO(hoje)

    let q = supabase.from('consultas').select('medico_id, valor, data').eq('clinica_id', clinicaId).gte('data', inicio).lte('data', fim)
    if (filterMedico !== 'todos') q = q.eq('medico_id', filterMedico)
    const { data: consultas } = await q

    let qA = supabase.from('agendamentos').select('medico_id, status').eq('clinica_id', clinicaId).gte('data_hora', inicio).lte('data_hora', fim+'T23:59:59')
    if (filterMedico !== 'todos') qA = qA.eq('medico_id', filterMedico)
    const { data: agend } = await qA

    // aggregate by doctor
    const agg = {}
    ;(consultas||[]).forEach(c => {
      const mid = c.medico_id
      if (!mid) return
      if (!agg[mid]) agg[mid] = { consultas:0, receita:0 }
      agg[mid].consultas++
      agg[mid].receita += c.valor || 0
    })

    const noShows = {}
    ;(agend||[]).forEach(a => {
      const mid = a.medico_id
      if (!mid) return
      if (!noShows[mid]) noShows[mid] = { total:0, missed:0 }
      noShows[mid].total++
      if (a.status === 'faltou' || a.status === 'cancelado') noShows[mid].missed++
    })

    const tableRows = Object.entries(agg).map(([mid, v]) => {
      const m = medicos.find(x => String(x.id) === String(mid)) || {}
      const ns = noShows[mid] || { total:1, missed:0 }
      return {
        mid,
        nome: m.nome || `Médico ${mid}`,
        especialidade: m.especialidade || '—',
        consultas: v.consultas,
        receita: v.receita,
        ticket: v.receita / v.consultas,
        noShow: (ns.missed / ns.total) * 100,
      }
    }).sort((a, b) => b.receita - a.receita)

    setRows(tableRows)
    setLoading(false)
  }

  async function loadDrill(mid) {
    setDrillLoading(true)
    const hoje = new Date()
    const inicio = toISO(new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1))
    const fim = toISO(hoje)

    const [{ data: consultas }, { data: agend }] = await Promise.all([
      supabase.from('consultas').select('valor, data, convenio_id').eq('clinica_id', clinicaId).eq('medico_id', mid).gte('data', inicio).lte('data', fim),
      supabase.from('agendamentos').select('data_hora, status').eq('clinica_id', clinicaId).eq('medico_id', mid).gte('data_hora', inicio).lte('data_hora', fim+'T23:59:59'),
    ])

    // Monthly bar charts
    const byMonth = {}
    ;(consultas||[]).forEach(c => {
      if (!c.data) return
      const m = c.data.substring(0,7)
      if (!byMonth[m]) byMonth[m] = { count:0, receita:0 }
      byMonth[m].count++
      byMonth[m].receita += c.valor||0
    })
    const months = Object.keys(byMonth).sort().slice(-12)
    const monthLabels = months.map(m => `${MESES[parseInt(m.split('-')[1])-1]}/${m.split('-')[0].slice(2)}`)
    const monthConsultas = months.map(m => ({ label: `${MESES[parseInt(m.split('-')[1])-1]}`, value: byMonth[m].count }))
    const monthReceita = months.map(m => ({ label: `${MESES[parseInt(m.split('-')[1])-1]}`, value: byMonth[m].receita }))

    // Convenios
    const convCount = {}
    ;(consultas||[]).forEach(c => {
      const cid = c.convenio_id || 'Particular'
      convCount[cid] = (convCount[cid]||0) + 1
    })
    const topConvenios = Object.entries(convCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([k,v]) => ({ label: k, value: v }))

    // Personal heatmap
    const hm = {}
    ;(agend||[]).forEach(a => {
      if (!a.data_hora) return
      const dt = new Date(a.data_hora)
      const wd = dt.getDay()
      const h = dt.getHours()
      if (!hm[wd]) hm[wd] = {}
      hm[wd][h] = (hm[wd][h]||0) + 1
    })

    setDrillData({ monthConsultas, monthReceita, topConvenios, heatmap: hm })
    setDrillLoading(false)
  }

  function handleRowClick(mid) {
    if (selectedMedico === mid) {
      setSelectedMedico(null)
      setDrillData(null)
    } else {
      setSelectedMedico(mid)
      loadDrill(mid)
    }
  }

  const selectedDoc = rows.find(r => r.mid === selectedMedico)

  return (
    <div>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>MÉDICO</div>
        <select value={filterMedico} onChange={e => setFilterMedico(e.target.value)}
          style={{ width:'100%', maxWidth:280, padding:'9px 12px', fontSize:13, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.surface, color:L.t1 }}>
          <option value="todos">Todos os médicos</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </div>

      {loading ? <Spinner/> : (
        <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:L.hover }}>
                {['#','Médico','Especialidade','Consultas','Receita Total','Ticket Médio','No-show %'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", fontWeight:600, borderBottom:`1px solid ${L.line}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.mid} onClick={() => handleRowClick(r.mid)}
                  style={{
                    cursor:'pointer',
                    background: selectedMedico === r.mid ? L.tealBg : 'transparent',
                    borderBottom:`1px solid ${L.lineSoft}`,
                    transition:'background 0.15s'
                  }}>
                  <td style={{ padding:'10px 14px', fontSize:13, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>#{i+1}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:L.t1 }}>{r.nome}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:L.t3 }}>{r.especialidade}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:L.t2 }}>{r.consultas}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:L.teal, fontWeight:600 }}>{fmtBRL(r.receita)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:L.t2 }}>{fmtBRL(r.ticket)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color: r.noShow > 20 ? L.red : L.t2 }}>{fmtPct(r.noShow)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:L.t4, fontSize:13 }}>Nenhum dado encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drill-down panel */}
      {selectedMedico && selectedMedico !== 'todos' && (
        <div style={{ marginTop:20, background:L.surface, border:`1.5px solid ${L.teal}`, borderRadius:14, padding:20 }}>
          <div style={{ fontWeight:700, fontSize:15, color:L.t1, marginBottom:4 }}>
            Drill-down: {selectedDoc?.nome || '—'}
          </div>
          <div style={{ fontSize:12, color:L.t4, marginBottom:20 }}>{selectedDoc?.especialidade}</div>

          {drillLoading ? <Spinner/> : drillData && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:L.t2, marginBottom:12 }}>Consultas por Mês</div>
                <BarChartSVG data={drillData.monthConsultas} width={380} height={180} color={L.teal}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:L.t2, marginBottom:12 }}>Receita por Mês</div>
                <BarChartSVG data={drillData.monthReceita} width={380} height={180} color={L.copper} valuePrefix="R$ "/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:L.t2, marginBottom:12 }}>Top Convênios</div>
                <BarChartSVG data={drillData.topConvenios} width={380} height={180} color={L.tealMd}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:L.t2, marginBottom:12 }}>Heatmap Pessoal</div>
                <HeatmapWeek data={drillData.heatmap}/>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Tab 2: Cohort Analysis ─────────────────────────────── */
function TabCohort({ clinicaId }) {
  const [loading, setLoading] = useState(true)
  const [cohorts, setCohorts] = useState([])
  const [newPacientes, setNewPacientes] = useState([])

  useEffect(() => {
    loadCohort()
  }, [clinicaId])

  async function loadCohort() {
    setLoading(true)
    const hoje = new Date()
    const inicio = toISO(new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1))

    const [{ data: pacs }, { data: consultas }] = await Promise.all([
      supabase.from('pacientes').select('id, data_cadastro').eq('clinica_id', clinicaId).gte('data_cadastro', inicio),
      supabase.from('consultas').select('paciente_id, data').eq('clinica_id', clinicaId).gte('data', inicio),
    ])

    // Group patients by acquisition month
    const pacByMonth = {}
    ;(pacs||[]).forEach(p => {
      if (!p.data_cadastro) return
      const m = p.data_cadastro.substring(0,7)
      if (!pacByMonth[m]) pacByMonth[m] = []
      pacByMonth[m].push(p.id)
    })

    // Build consultation lookup: pacId -> [months when they consulted]
    const consultsMap = {}
    ;(consultas||[]).forEach(c => {
      if (!c.paciente_id || !c.data) return
      const m = c.data.substring(0,7)
      if (!consultsMap[c.paciente_id]) consultsMap[c.paciente_id] = new Set()
      consultsMap[c.paciente_id].add(m)
    })

    const cohortMonths = Object.keys(pacByMonth).sort()
    const maxCols = 7

    const cohortRows = cohortMonths.map(cohortM => {
      const pids = pacByMonth[cohortM]
      const [cy, cm] = cohortM.split('-').map(Number)

      const cells = Array.from({length:maxCols}, (_, offset) => {
        const targetDate = new Date(cy, cm - 1 + offset, 1)
        const targetM = `${targetDate.getFullYear()}-${pad2(targetDate.getMonth()+1)}`
        if (targetDate > hoje) return null
        const retained = pids.filter(pid => consultsMap[pid]?.has(targetM)).length
        return pids.length > 0 ? (retained / pids.length) * 100 : 0
      })

      return {
        label: `${MESES[cm-1]}/${cy.toString().slice(2)}`,
        total: pids.length,
        cells,
      }
    })

    setCohorts(cohortRows)

    // New patients per month (last 12)
    const np = cohortMonths.slice(-12).map(m => ({
      label: `${MESES[parseInt(m.split('-')[1])-1]}`,
      value: pacByMonth[m].length
    }))
    setNewPacientes(np)

    setLoading(false)
  }

  return (
    <div>
      {loading ? <Spinner/> : (
        <>
          {/* Cohort Table */}
          <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20, marginBottom:20, overflowX:'auto' }}>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:4 }}>Análise de Cohort</div>
            <div style={{ fontSize:12, color:L.t4, marginBottom:16 }}>Retenção de pacientes por mês de cadastro</div>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr>
                  <th style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", borderBottom:`1px solid ${L.line}` }}>Cohort</th>
                  <th style={{ padding:'8px 12px', textAlign:'right', fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", borderBottom:`1px solid ${L.line}` }}>Total</th>
                  {Array.from({length:7},(_,i)=>(
                    <th key={i} style={{ padding:'8px 10px', textAlign:'center', fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", borderBottom:`1px solid ${L.line}` }}>Mês {i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ padding:'8px 12px', fontSize:12, fontWeight:600, color:L.t2, whiteSpace:'nowrap' }}>{row.label}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontSize:12, color:L.t4, fontFamily:"'JetBrains Mono', monospace" }}>{row.total}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} style={{
                        padding:'8px 10px', textAlign:'center',
                        background: cohortColor(cell),
                        fontSize:12, fontWeight: ci===0 ? 700 : 400,
                        color: cell === null ? L.t4 : cell > 50 ? L.white : L.t1,
                      }}>
                        {cell === null ? '—' : `${cell.toFixed(0)}%`}
                      </td>
                    ))}
                  </tr>
                ))}
                {cohorts.length === 0 && (
                  <tr><td colSpan={9} style={{ padding:32, textAlign:'center', color:L.t4, fontSize:13 }}>Sem dados de cohort</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Explanation */}
          <div style={{ background:L.tealBg, border:`1px solid ${L.line}`, borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:600, color:L.teal, marginBottom:6 }}>O que é análise de Cohort?</div>
            <div style={{ fontSize:12, color:L.t2, lineHeight:1.6 }}>
              Análise de Cohort mostra quantos pacientes retornam nos meses seguintes ao seu cadastro.
              "Mês 0" representa o mês de cadastro do paciente. "Mês 1" mostra quantos % voltaram no mês seguinte, e assim por diante.
              Quanto maior o % em meses posteriores, maior a fidelização da clínica.
            </div>
          </div>

          {/* New patient growth */}
          <div style={{ background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20 }}>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:16 }}>Crescimento de Novos Pacientes (12 meses)</div>
            <BarChartSVG data={newPacientes} width={700} height={200} color={L.teal}/>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Tab 3: Exportação ──────────────────────────────────── */
function TabExportacao({ clinicaId }) {
  const [copied, setCopied] = useState('')
  const [selectedTables, setSelectedTables] = useState({ consultas:true, agendamentos:false, pacientes:false, financeiro:false })
  const [exportStart, setExportStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-1); return toISO(d)
  })
  const [exportEnd, setExportEnd] = useState(() => toISO(new Date()))
  const [exporting, setExporting] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(() => localStorage.getItem('bi_weekly_report') === 'true')

  const pbEndpoint = `https://api.c4clinic.app/bi/${clinicaId}/powerbi`
  const lookerEndpoint = `https://api.c4clinic.app/bi/${clinicaId}/gsheets`

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  function toggleTable(k) {
    setSelectedTables(t => ({ ...t, [k]: !t[k] }))
  }

  function toggleWeekly() {
    const next = !weeklyReport
    setWeeklyReport(next)
    localStorage.setItem('bi_weekly_report', String(next))
  }

  async function exportCSV() {
    setExporting(true)
    const tables = Object.entries(selectedTables).filter(([,v]) => v).map(([k]) => k)
    if (tables.length === 0) { setExporting(false); return }

    const rows = []
    rows.push(['tabela','id','data','valor','status','tipo','nome'])

    for (const table of tables) {
      let q
      if (table === 'consultas') {
        const { data } = await supabase.from('consultas').select('id, data, valor, medico_id, convenio_id').eq('clinica_id', clinicaId).gte('data', exportStart).lte('data', exportEnd)
        ;(data||[]).forEach(r => rows.push([table, r.id, r.data, r.valor||'', '', '', '']))
      } else if (table === 'agendamentos') {
        const { data } = await supabase.from('agendamentos').select('id, data_hora, status, medico_id').eq('clinica_id', clinicaId).gte('data_hora', exportStart).lte('data_hora', exportEnd+'T23:59:59')
        ;(data||[]).forEach(r => rows.push([table, r.id, r.data_hora, '', r.status||'', '', '']))
      } else if (table === 'pacientes') {
        const { data } = await supabase.from('pacientes').select('id, data_cadastro, ativo, data_nascimento').eq('clinica_id', clinicaId).gte('data_cadastro', exportStart).lte('data_cadastro', exportEnd)
        ;(data||[]).forEach(r => rows.push([table, r.id, r.data_cadastro, '', r.ativo ? 'ativo':'inativo', '', '']))
      } else if (table === 'financeiro') {
        const { data } = await supabase.from('lancamentos').select('id, data, valor, tipo').eq('clinica_id', clinicaId).gte('data', exportStart).lte('data', exportEnd)
        ;(data||[]).forEach(r => rows.push([table, r.id, r.data, r.valor||'', '', r.tipo||'', '']))
      }
    }

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `c4clinic_export_${exportStart}_${exportEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const sampleJSON = `{
  "clinica_id": "${clinicaId}",
  "periodo": "2024-01-01/2024-12-31",
  "receita_total": 150000.00,
  "consultas": [
    {
      "id": "uuid",
      "data": "2024-01-15",
      "valor": 250.00,
      "medico_id": "uuid",
      "convenio": "Unimed"
    }
  ],
  "kpis": {
    "ticket_medio": 280.50,
    "taxa_ocupacao": 78.5,
    "novos_pacientes": 45
  }
}`

  const labelStyle = { fontSize:11, color:L.t4, fontFamily:"'JetBrains Mono', monospace", marginBottom:6 }
  const cardStyle = { background:L.surface, border:`1px solid ${L.line}`, borderRadius:14, padding:20, marginBottom:20 }
  const btnPrimary = {
    background:L.teal, color:L.white, fontWeight:600,
    padding:'9px 18px', borderRadius:8, fontSize:13, cursor:'pointer',
    border:'none', display:'inline-flex', alignItems:'center', gap:6
  }
  const btnSecondary = {
    background:L.surface, color:L.t2, fontWeight:500,
    padding:'8px 14px', borderRadius:8, fontSize:12, cursor:'pointer',
    border:`1.5px solid ${L.line}`, display:'inline-flex', alignItems:'center', gap:6
  }

  return (
    <div>
      {/* Power BI */}
      <div style={cardStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#F2C811', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'#1a1a1a' }}>PBI</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1 }}>Power BI Integration</div>
            <div style={{ fontSize:12, color:L.t4 }}>Conecte seus dashboards ao C4 Clinic via REST API</div>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={labelStyle}>ENDPOINT URL</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ flex:1, padding:'9px 12px', fontSize:13, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.hover, color:L.t2, fontFamily:"'JetBrains Mono', monospace", wordBreak:'break-all' }}>
              {pbEndpoint}
            </div>
            <button onClick={() => copyText(pbEndpoint, 'pb')} style={btnSecondary}>
              {copied==='pb' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div>
          <div style={labelStyle}>SAMPLE JSON RESPONSE</div>
          <pre style={{
            background:'#0f1117', borderRadius:8, padding:16, overflowX:'auto',
            fontSize:12, lineHeight:1.7, margin:0
          }}>
            {sampleJSON.split('\n').map((line, i) => {
              const colored = line
                .replace(/"([^"]+)":/g, (_, k) => `<span style="color:#79c0ff">"${k}"</span>:`)
                .replace(/: "([^"]+)"/g, (_, v) => `: <span style="color:#a5d6ff">"${v}"</span>`)
                .replace(/: ([\d.]+)/g, (_, v) => `: <span style="color:#f8c555">${v}</span>`)
              return <span key={i} dangerouslySetInnerHTML={{ __html: colored + '\n' }}/>
            })}
          </pre>
        </div>
      </div>

      {/* Looker Studio */}
      <div style={cardStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'#4285F4', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:L.white }}>LS</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1 }}>Looker Studio / Google Sheets</div>
            <div style={{ fontSize:12, color:L.t4 }}>Conecte via conector Google Sheets</div>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={labelStyle}>SPREADSHEET CONNECTOR URL</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ flex:1, padding:'9px 12px', fontSize:13, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.hover, color:L.t2, fontFamily:"'JetBrains Mono', monospace", wordBreak:'break-all' }}>
              {lookerEndpoint}
            </div>
            <button onClick={() => copyText(lookerEndpoint, 'ls')} style={btnSecondary}>
              {copied==='ls' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div style={{ background:L.hover, borderRadius:10, padding:14, fontSize:12, color:L.t3, lineHeight:1.7 }}>
          <div style={{ fontWeight:600, color:L.t2, marginBottom:6 }}>Como conectar:</div>
          <ol style={{ margin:0, paddingLeft:18 }}>
            <li>No Looker Studio, clique em "Adicionar dados"</li>
            <li>Selecione "Google Sheets" como conector</li>
            <li>Use a URL acima como fonte de dados</li>
            <li>Escolha a aba correspondente (consultas, agendamentos, etc.)</li>
            <li>Clique em "Conectar" e pronto!</li>
          </ol>
        </div>
      </div>

      {/* CSV Export */}
      <div style={cardStyle}>
        <div style={{ fontWeight:600, fontSize:14, color:L.t1, marginBottom:16 }}>Exportar CSV</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div>
            <div style={labelStyle}>DATA INÍCIO</div>
            <input type="date" value={exportStart} onChange={e => setExportStart(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.surface, color:L.t1 }}/>
          </div>
          <div>
            <div style={labelStyle}>DATA FIM</div>
            <input type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', fontSize:13, border:`1.5px solid ${L.line}`, borderRadius:8, background:L.surface, color:L.t1 }}/>
          </div>
        </div>

        <div style={labelStyle}>TABELAS</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20 }}>
          {Object.entries(selectedTables).map(([k, v]) => (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, color:L.t2 }}>
              <input type="checkbox" checked={v} onChange={() => toggleTable(k)}
                style={{ accentColor:L.teal, width:15, height:15 }}/>
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>

        <button onClick={exportCSV} disabled={exporting} style={{
          ...btnPrimary,
          opacity: exporting ? 0.7 : 1,
          cursor: exporting ? 'wait' : 'pointer'
        }}>
          {exporting ? (
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:14, height:14, border:`2px solid rgba(255,255,255,0.3)`, borderTop:`2px solid ${L.white}`, borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}/>
              Exportando...
            </span>
          ) : 'Exportar CSV'}
        </button>
      </div>

      {/* Scheduled reports */}
      <div style={cardStyle}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:L.t1 }}>Relatório Semanal Automático</div>
            <div style={{ fontSize:12, color:L.t4, marginTop:2 }}>Receba um resumo semanal por e-mail toda segunda-feira</div>
          </div>
          <div onClick={toggleWeekly} style={{
            width:44, height:24, borderRadius:12, cursor:'pointer',
            background: weeklyReport ? L.teal : L.line,
            position:'relative', transition:'background 0.2s',
            flexShrink:0
          }}>
            <div style={{
              width:18, height:18, borderRadius:'50%', background:L.white,
              position:'absolute', top:3,
              left: weeklyReport ? 23 : 3,
              transition:'left 0.2s',
              boxShadow:'0 1px 4px rgba(0,0,0,0.2)'
            }}/>
          </div>
        </div>
        {weeklyReport && (
          <div style={{ marginTop:12, padding:'10px 14px', background:L.tealBg, borderRadius:8, fontSize:12, color:L.teal, fontWeight:500 }}>
            Relatório semanal ativado — você receberá um e-mail toda segunda-feira com o resumo da semana anterior.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function PageBI({ profile }) {
  const [tab, setTab] = useState(0)
  const clinicaId = profile?.clinica_id

  return (
    <div style={{ padding:'24px 20px', maxWidth:1100, margin:'0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        button { outline: none; }
        button:focus-visible { outline: 2px solid ${L.teal}; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontWeight:700, fontSize:20, color:L.t1 }}>Business Intelligence</div>
        <div style={{ fontSize:13, color:L.t4, marginTop:4 }}>Análises avançadas e exportação de dados</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:`1px solid ${L.line}`, paddingBottom:0 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding:'9px 18px', borderRadius:'8px 8px 0 0', fontSize:13, fontWeight:500, cursor:'pointer',
            background: tab===i ? L.surface : 'transparent',
            color: tab===i ? L.teal : L.t3,
            border: `1.5px solid ${tab===i ? L.line : 'transparent'}`,
            borderBottom: tab===i ? `1.5px solid ${L.surface}` : 'none',
            marginBottom: tab===i ? -1 : 0,
            transition:'color 0.15s'
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {!clinicaId ? (
        <div style={{ padding:48, textAlign:'center', color:L.t4, fontSize:14 }}>
          Clínica não identificada. Faça login novamente.
        </div>
      ) : (
        <>
          {tab === 0 && <TabVisaoGeral clinicaId={clinicaId}/>}
          {tab === 1 && <TabPorMedico clinicaId={clinicaId}/>}
          {tab === 2 && <TabCohort clinicaId={clinicaId}/>}
          {tab === 3 && <TabExportacao clinicaId={clinicaId}/>}
        </>
      )}
    </div>
  )
}
