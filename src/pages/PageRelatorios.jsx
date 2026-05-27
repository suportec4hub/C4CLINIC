import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function Card({ title, children }) {
  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function PeriodSelector({ periodo, setPeriodo }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {[
        { id: 'mes', label: 'Este mês' },
        { id: 'trimestre', label: 'Trimestre' },
        { id: 'ano', label: 'Este ano' },
      ].map(p => (
        <button key={p.id} onClick={() => setPeriodo(p.id)}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: periodo === p.id ? L.teal : L.bg,
            color: periodo === p.id ? L.white : L.t2,
            border: `1.5px solid ${periodo === p.id ? L.teal : L.line}`
          }}
        >{p.label}</button>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${L.line}`,
        borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
    </div>
  )
}

function getPeriodRange(periodo) {
  const hoje = new Date()
  let inicio, fim
  if (periodo === 'mes') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  } else if (periodo === 'trimestre') {
    const q = Math.floor(hoje.getMonth() / 3)
    inicio = new Date(hoje.getFullYear(), q * 3, 1)
    fim = new Date(hoje.getFullYear(), q * 3 + 3, 0)
  } else {
    inicio = new Date(hoje.getFullYear(), 0, 1)
    fim = new Date(hoje.getFullYear(), 11, 31)
  }
  return { isoI: inicio.toISOString(), isoF: fim.toISOString() }
}

function exportarCSV(data, filename) {
  const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Status', 'Forma Pagamento']
  const rows = data.map(l => [
    l.data_vencimento, l.tipo, l.categoria, l.descricao || '',
    l.valor, l.status, l.forma_pagamento || ''
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({ clinicaId }) {
  const [dados, setDados] = useState(null)
  const [finRaw, setFinRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  const ano = new Date().getFullYear()

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)
    const inicio = new Date(isoI)
    const fim = new Date(isoF)

    const [ags, cons, pacs, fin] = await Promise.all([
      supabase.from('agendamentos').select('status, data_hora, convenio_id, convenios(nome)')
        .eq('clinica_id', clinicaId).gte('data_hora', isoI).lte('data_hora', isoF),
      supabase.from('consultas').select('medico_id, medicos(nome), data_hora, valor, convenio_id')
        .eq('clinica_id', clinicaId).gte('data_hora', isoI).lte('data_hora', isoF),
      supabase.from('pacientes').select('sexo, criado_em')
        .eq('clinica_id', clinicaId).gte('criado_em', isoI),
      supabase.from('financeiro_lancamentos').select('tipo, valor, status, data_vencimento, categoria, descricao, forma_pagamento')
        .eq('clinica_id', clinicaId).gte('data_vencimento', inicio.toISOString().split('T')[0])
        .lte('data_vencimento', fim.toISOString().split('T')[0]),
    ])

    const agData = ags.data || []
    const consData = cons.data || []
    const pacData = pacs.data || []
    const finData = fin.data || []

    setFinRaw(finData)

    const statusCount = {}
    agData.forEach(a => { statusCount[a.status] = (statusCount[a.status] || 0) + 1 })
    const statusChart = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

    const medCount = {}
    consData.forEach(c => {
      const nome = c.medicos?.nome || 'Desconhecido'
      medCount[nome] = (medCount[nome] || 0) + 1
    })
    const medicoChart = Object.entries(medCount)
      .map(([medico, consultas]) => ({ medico, consultas }))
      .sort((a, b) => b.consultas - a.consultas).slice(0, 6)

    const finMes = MESES.map((mes, i) => {
      const mesData = finData.filter(f => {
        const d = new Date(f.data_vencimento + 'T12:00:00')
        return d.getMonth() === i
      })
      const receitas = mesData.filter(f => f.tipo === 'receita' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
      const despesas = mesData.filter(f => f.tipo === 'despesa' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
      return { mes, receitas, despesas }
    })

    const sexoCount = { Masculino: 0, Feminino: 0, Outro: 0 }
    pacData.forEach(p => { if (p.sexo) sexoCount[p.sexo] = (sexoCount[p.sexo] || 0) + 1 })
    const sexoChart = Object.entries(sexoCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

    const totalRec = finData.filter(f => f.tipo === 'receita' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
    const totalDes = finData.filter(f => f.tipo === 'despesa' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
    const totalPend = finData.filter(f => f.status === 'pendente').reduce((s, f) => s + Number(f.valor), 0)

    setDados({
      statusChart, medicoChart, finMes, sexoChart,
      totalAg: agData.length, totalCons: consData.length,
      totalPac: pacData.length,
      totalRec, totalDes, totalPend,
      taxaRealizacao: agData.length > 0
        ? Math.round((agData.filter(a => a.status === 'realizado').length / agData.length) * 100)
        : 0
    })
    setLoading(false)
  }

  function handleExportarCSV() {
    exportarCSV(finRaw, `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  function handleImprimir() {
    if (!dados) return
    const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const html = `
      <html><head><title>Relatório - Visão Geral</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { color: #666; font-size: 13px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f0f0f0; padding: 10px 14px; text-align: left; font-size: 12px; border-bottom: 2px solid #ddd; }
        td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #eee; }
        .green { color: #16a34a; font-weight: 700; }
        .red { color: #dc2626; font-weight: 700; }
        .blue { color: #2563eb; font-weight: 700; }
      </style></head><body>
      <h1>Visão Geral — Relatório Financeiro</h1>
      <p>Gerado em ${new Date().toLocaleString('pt-BR')} | Período: ${periodo === 'mes' ? 'Este Mês' : periodo === 'trimestre' ? 'Trimestre' : 'Este Ano'}</p>
      <table>
        <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
        <tbody>
          <tr><td>Agendamentos</td><td class="blue">${dados.totalAg}</td></tr>
          <tr><td>Consultas realizadas</td><td class="blue">${dados.totalCons}</td></tr>
          <tr><td>Novos pacientes</td><td class="blue">${dados.totalPac}</td></tr>
          <tr><td>Taxa de realização</td><td class="blue">${dados.taxaRealizacao}%</td></tr>
          <tr><td>Receitas pagas</td><td class="green">${fmt(dados.totalRec)}</td></tr>
          <tr><td>Despesas pagas</td><td class="red">${fmt(dados.totalDes)}</td></tr>
          <tr><td><strong>Saldo</strong></td><td class="${dados.totalRec >= dados.totalDes ? 'green' : 'red'}"><strong>${fmt(dados.totalRec - dados.totalDes)}</strong></td></tr>
        </tbody>
      </table>
      </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const PIE_COLORS = [L.teal, L.blue, L.green, L.yellow, L.red, L.purple, L.orange]
  const STATUS_COLORS = {
    agendado: L.blue, confirmado: L.green, em_atendimento: L.yellow,
    realizado: L.green, cancelado: L.red, falta: L.copper
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
        <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={handleExportarCSV} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: L.tealBg, color: L.teal, border: `1.5px solid ${L.teal}30`,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}>
            ↓ Exportar CSV
          </button>
          <button onClick={handleImprimir} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: L.surface, color: L.t2, border: `1.5px solid ${L.line}`,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}>
            ⎙ Imprimir
          </button>
        </div>
      </div>
      {loading ? <Spinner /> : dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="grid-cols-4">
            {[
              { label: 'Agendamentos', value: dados.totalAg, icon: '📅', color: L.teal, bg: L.tealBg },
              { label: 'Consultas realizadas', value: dados.totalCons, icon: '✦', color: L.blue, bg: L.blueBg },
              { label: 'Novos pacientes', value: dados.totalPac, icon: '👥', color: L.purple, bg: L.purpleBg },
              { label: 'Taxa de realização', value: `${dados.taxaRealizacao}%`, icon: '📊', color: L.green, bg: L.greenBg },
            ].map(k => (
              <div key={k.label} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11, background: k.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: L.t3 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 22, color: k.color }}>
                    {k.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Financeiro resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Receitas pagas', value: dados.totalRec, color: L.green, bg: L.greenBg, icon: '↑' },
              { label: 'Despesas pagas', value: dados.totalDes, color: L.red, bg: L.redBg, icon: '↓' },
              { label: 'Saldo', value: dados.totalRec - dados.totalDes, color: dados.totalRec >= dados.totalDes ? L.teal : L.red, bg: dados.totalRec >= dados.totalDes ? L.tealBg : L.redBg, icon: '=' },
            ].map(k => (
              <div key={k.label} style={{
                background: k.bg, border: `1px solid ${k.color}20`,
                borderRadius: 14, padding: '16px 20px',
                display: 'flex', gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: k.color, fontWeight: 700, fontSize: 18
                }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: k.color + 'cc' }}>{k.label}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: k.color }}>
                    {fmt(k.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Consultas por Médico">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dados.medicoChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={L.line} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="medico" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="consultas" fill={L.teal} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Status dos Agendamentos">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dados.statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={2}
                  >
                    {dados.statusChart.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => v} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title={`Receitas vs Despesas — ${ano}`}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dados.finMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v, n) => [fmt(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receitas" stroke={L.green} strokeWidth={2.5} dot={false} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke={L.red} strokeWidth={2.5} dot={false} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </>
  )
}

// ── Tab: Por Médico ───────────────────────────────────────────────────────────

function TabPorMedico({ clinicaId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [sortCol, setSortCol] = useState('consultas')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)

    const { data } = await supabase
      .from('consultas')
      .select('medico_id, medicos(nome, especialidade, repasse_percentual), valor, retorno_em')
      .eq('clinica_id', clinicaId)
      .gte('data_hora', isoI)
      .lte('data_hora', isoF)

    const consultas = data || []

    const map = {}
    consultas.forEach(c => {
      const mid = c.medico_id
      if (!map[mid]) {
        map[mid] = {
          nome: c.medicos?.nome || 'Desconhecido',
          especialidade: c.medicos?.especialidade || '—',
          consultas: 0,
          receita: 0,
          retornos: 0,
        }
      }
      map[mid].consultas += 1
      map[mid].receita += Number(c.valor || 0)
      if (c.retorno_em) map[mid].retornos += 1
    })

    const result = Object.values(map).map(r => ({
      ...r,
      ticket: r.consultas > 0 ? r.receita / r.consultas : 0,
      taxaRetorno: r.consultas > 0 ? Math.round((r.retornos / r.consultas) * 100) : 0,
    }))

    setRows(result)
    setLoading(false)
  }

  function toggleSort(col) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol]
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortAsc ? av - bv : bv - av
  })

  const maxConsultas = rows.length > 0 ? Math.max(...rows.map(r => r.consultas)) : 0

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const thStyle = (col) => ({
    padding: '10px 14px', textAlign: 'left', fontSize: 11,
    color: sortCol === col ? L.teal : L.t4,
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    borderBottom: `2px solid ${L.line}`,
  })

  const arrow = (col) => sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : ''

  return (
    <>
      <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />
      {loading ? <Spinner /> : (
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
              Nenhuma consulta registrada no período
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {[
                      { col: 'nome', label: 'MÉDICO' },
                      { col: 'especialidade', label: 'ESPECIALIDADE' },
                      { col: 'consultas', label: 'CONSULTAS' },
                      { col: 'receita', label: 'RECEITA BRUTA' },
                      { col: 'ticket', label: 'TICKET MÉDIO' },
                      { col: 'taxaRetorno', label: 'TAXA RETORNO' },
                    ].map(({ col, label }) => (
                      <th key={col} style={thStyle(col)} onClick={() => toggleSort(col)}>
                        {label}{arrow(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => {
                    const isTop = r.consultas === maxConsultas && maxConsultas > 0
                    return (
                      <tr key={i} style={{
                        background: isTop ? L.tealBg : (i % 2 === 0 ? L.bg : L.surface),
                        borderBottom: `1px solid ${L.line}`,
                      }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: L.t1 }}>
                          {isTop && <span style={{ color: L.teal, marginRight: 6, fontSize: 11 }}>★</span>}
                          {r.nome}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: L.t2 }}>{r.especialidade}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: L.t1, fontWeight: 600, textAlign: 'center' }}>
                          {r.consultas}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: L.green, fontFamily: "'JetBrains Mono', monospace" }}>
                          {fmt(r.receita)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                          {fmt(r.ticket)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13 }}>
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: r.taxaRetorno >= 30 ? L.greenBg : (r.taxaRetorno >= 10 ? L.yellowBg : L.redBg),
                            color: r.taxaRetorno >= 30 ? L.green : (r.taxaRetorno >= 10 ? L.yellow : L.red),
                          }}>
                            {r.taxaRetorno}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Tab: Repasse Médico ───────────────────────────────────────────────────────

function TabRepasse({ clinicaId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [pagos, setPagos] = useState({})

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)

    const [medRes, consRes] = await Promise.all([
      supabase.from('medicos')
        .select('id, nome, crm, repasse_percentual')
        .eq('clinica_id', clinicaId)
        .gt('repasse_percentual', 0),
      supabase.from('consultas')
        .select('medico_id, valor')
        .eq('clinica_id', clinicaId)
        .gte('data_hora', isoI)
        .lte('data_hora', isoF),
    ])

    const medicos = medRes.data || []
    const consultas = consRes.data || []

    const receitaMap = {}
    consultas.forEach(c => {
      receitaMap[c.medico_id] = (receitaMap[c.medico_id] || 0) + Number(c.valor || 0)
    })

    const result = medicos.map(m => ({
      id: m.id,
      nome: m.nome,
      crm: m.crm || '—',
      repasse_percentual: Number(m.repasse_percentual),
      receita: receitaMap[m.id] || 0,
      repasse: ((receitaMap[m.id] || 0) * Number(m.repasse_percentual)) / 100,
    }))

    setRows(result)
    setLoading(false)
  }

  function togglePago(id) {
    setPagos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function exportCSV() {
    const header = ['Nome', 'CRM', 'Repasse %', 'Receita Bruta', 'Valor Repasse', 'Status']
    const lines = rows.map(r => [
      r.nome,
      r.crm,
      r.repasse_percentual,
      r.receita.toFixed(2).replace('.', ','),
      r.repasse.toFixed(2).replace('.', ','),
      pagos[r.id] ? 'Pago' : 'Pendente',
    ])
    const totalRepasse = rows.reduce((s, r) => s + r.repasse, 0)
    lines.push(['TOTAL', '', '', '', totalRepasse.toFixed(2).replace('.', ','), ''])

    const csv = [header, ...lines].map(row => row.map(v => `"${v}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `repasse_medico_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const totalRepasse = rows.reduce((s, r) => s + r.repasse, 0)
  const totalReceita = rows.reduce((s, r) => s + r.receita, 0)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />
        {!loading && rows.length > 0 && (
          <button onClick={exportCSV} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: L.tealBg, color: L.teal, border: `1.5px solid ${L.teal}20`,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <div style={{
          background: L.tealBg, border: `1px solid ${L.teal}30`, borderRadius: 14,
          padding: '32px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.teal, marginBottom: 8 }}>
            Nenhum médico com repasse configurado
          </div>
          <div style={{ fontSize: 13, color: L.t3 }}>
            Acesse a aba Médicos e defina o percentual de repasse para cada profissional.
          </div>
        </div>
      ) : (
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['MÉDICO', 'CRM', 'REPASSE %', 'RECEITA BRUTA', 'VALOR REPASSE', 'STATUS'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11,
                      color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.3px', whiteSpace: 'nowrap',
                      borderBottom: `2px solid ${L.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{
                    background: i % 2 === 0 ? L.bg : L.surface,
                    borderBottom: `1px solid ${L.line}`,
                  }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: L.t1 }}>{r.nome}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>{r.crm}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: L.teal, fontWeight: 600 }}>{r.repasse_percentual}%</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.receita)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: L.green, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.repasse)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => togglePago(r.id)} style={{
                        padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: pagos[r.id] ? L.greenBg : L.yellowBg,
                        color: pagos[r.id] ? L.green : L.yellow,
                        border: `1.5px solid ${pagos[r.id] ? L.greenBd : L.yellowBd}`,
                        cursor: 'pointer',
                      }}>
                        {pagos[r.id] ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: L.tealBg, borderTop: `2px solid ${L.teal}30` }}>
                  <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700, fontSize: 13, color: L.teal }}>
                    TOTAL
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: L.t1, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(totalReceita)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: L.teal, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(totalRepasse)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab: DRE ─────────────────────────────────────────────────────────────────

function TabDRE({ clinicaId }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)
    const inicio = new Date(isoI)
    const fim = new Date(isoF)

    const { data: lancamentos } = await supabase
      .from('financeiro_lancamentos')
      .select('tipo, valor, status, data_vencimento, categoria')
      .eq('clinica_id', clinicaId)
      .gte('data_vencimento', inicio.toISOString().split('T')[0])
      .lte('data_vencimento', fim.toISOString().split('T')[0])

    const todos = lancamentos || []

    const receitas = todos.filter(f => f.tipo === 'receita' && f.status === 'pago')
    const deducoes = todos.filter(f => f.tipo === 'receita' && f.status === 'cancelado')
    const despesas = todos.filter(f => f.tipo === 'despesa' && f.status === 'pago')
    const despesasPendentes = todos.filter(f => f.tipo === 'despesa' && f.status === 'pendente')

    function groupByCategoria(arr) {
      const map = {}
      arr.forEach(f => {
        const cat = f.categoria || 'Sem categoria'
        map[cat] = (map[cat] || 0) + Number(f.valor)
      })
      return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor)
    }

    const receitasPorCat = groupByCategoria(receitas)
    const deducoesPorCat = groupByCategoria(deducoes)
    const despesasPorCat = groupByCategoria(despesas)

    const totalReceitas = receitas.reduce((s, f) => s + Number(f.valor), 0)
    const totalDeducoes = deducoes.reduce((s, f) => s + Number(f.valor), 0)
    const receitaLiquida = totalReceitas - totalDeducoes
    const totalDespesas = despesas.reduce((s, f) => s + Number(f.valor), 0)
    const resultado = receitaLiquida - totalDespesas

    // Build bar chart: group by month (for ano) or by week (for mes)
    let barData = []
    if (periodo === 'ano') {
      barData = MESES.map((mes, i) => {
        const mesRec = todos.filter(f => {
          const d = new Date(f.data_vencimento + 'T12:00:00')
          return d.getMonth() === i && f.tipo === 'receita' && f.status === 'pago'
        }).reduce((s, f) => s + Number(f.valor), 0)
        const mesDes = todos.filter(f => {
          const d = new Date(f.data_vencimento + 'T12:00:00')
          return d.getMonth() === i && f.tipo === 'despesa' && f.status === 'pago'
        }).reduce((s, f) => s + Number(f.valor), 0)
        return { label: mes, receitas: mesRec, despesas: mesDes }
      })
    } else {
      // Group by week of the period
      const weekMap = {}
      todos.forEach(f => {
        const d = new Date(f.data_vencimento + 'T12:00:00')
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const key = weekStart.toISOString().slice(0, 10)
        if (!weekMap[key]) weekMap[key] = { receitas: 0, despesas: 0 }
        if (f.tipo === 'receita' && f.status === 'pago') weekMap[key].receitas += Number(f.valor)
        if (f.tipo === 'despesa' && f.status === 'pago') weekMap[key].despesas += Number(f.valor)
      })
      barData = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({
        label: key.slice(5),
        receitas: v.receitas,
        despesas: v.despesas,
      }))
    }

    setDados({
      receitasPorCat, deducoesPorCat, despesasPorCat,
      totalReceitas, totalDeducoes, receitaLiquida, totalDespesas, resultado,
      barData,
      totalDespesasPendentes: despesasPendentes.reduce((s, f) => s + Number(f.valor), 0),
    })
    setLoading(false)
  }

  function handleImprimirDRE() {
    if (!dados) return
    const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const periodoLabel = periodo === 'mes' ? 'Este Mês' : periodo === 'trimestre' ? 'Trimestre' : 'Este Ano'

    const catRows = (arr, color) =>
      arr.map(r => `<tr><td style="padding:7px 14px;font-size:13px;color:#555;padding-left:32px;">${r.categoria}</td><td style="padding:7px 14px;font-size:13px;text-align:right;color:${color};font-family:monospace;">${fmt(r.valor)}</td></tr>`).join('')

    const html = `
      <html><head><title>DRE</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { color: #666; font-size: 13px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        tr.section { background: #f5f5f5; }
        tr.section td { padding: 9px 14px; font-size: 13px; font-weight: 700; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
        tr.subtotal td { padding: 10px 14px; font-size: 14px; font-weight: 700; border-bottom: 2px solid #ccc; }
        tr.resultado td { padding: 14px 14px; font-size: 16px; font-weight: 700; background: #f0f7f0; border-top: 2px solid #aaa; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>DRE — Demonstração do Resultado do Exercício</h1>
      <p>Período: ${periodoLabel} | Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <table>
        <tr class="section"><td colspan="2">(+) RECEITAS BRUTAS</td></tr>
        ${catRows(dados.receitasPorCat, '#16a34a')}
        <tr class="subtotal"><td>Total Receitas Brutas</td><td style="text-align:right;color:#16a34a;font-family:monospace;">${fmt(dados.totalReceitas)}</td></tr>

        <tr class="section"><td colspan="2">(−) DEDUÇÕES / CANCELAMENTOS</td></tr>
        ${catRows(dados.deducoesPorCat, '#dc2626')}
        <tr class="subtotal"><td>Total Deduções</td><td style="text-align:right;color:#dc2626;font-family:monospace;">(${fmt(dados.totalDeducoes)})</td></tr>

        <tr class="subtotal" style="background:#e0f2fe;"><td><strong>(=) RECEITA LÍQUIDA</strong></td><td style="text-align:right;color:#0369a1;font-family:monospace;"><strong>${fmt(dados.receitaLiquida)}</strong></td></tr>

        <tr class="section"><td colspan="2">(−) DESPESAS OPERACIONAIS</td></tr>
        ${catRows(dados.despesasPorCat, '#dc2626')}
        <tr class="subtotal"><td>Total Despesas</td><td style="text-align:right;color:#dc2626;font-family:monospace;">(${fmt(dados.totalDespesas)})</td></tr>

        <tr class="resultado">
          <td>(=) RESULTADO OPERACIONAL</td>
          <td style="text-align:right;color:${dados.resultado >= 0 ? '#16a34a' : '#dc2626'};font-family:monospace;">${fmt(dados.resultado)}</td>
        </tr>
      </table>
      </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const DRE_ROW_SECTION = { padding: '9px 14px', fontWeight: 700, fontSize: 13, color: L.t1, background: L.surface, borderTop: `1px solid ${L.line}`, borderBottom: `1px solid ${L.line}` }
  const DRE_ROW_CAT = { padding: '8px 14px 8px 32px', fontSize: 13, color: L.t2, borderBottom: `1px solid ${L.line}` }
  const DRE_ROW_SUBTOTAL = { padding: '10px 14px', fontWeight: 700, fontSize: 13, borderBottom: `2px solid ${L.line}` }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
        <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />
        <button onClick={handleImprimirDRE} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: L.surface, color: L.t2, border: `1.5px solid ${L.line}`,
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          ⎙ Imprimir DRE
        </button>
      </div>

      {loading ? <Spinner /> : dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* DRE Table */}
          <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {/* Receitas Brutas */}
                <tr>
                  <td colSpan={2} style={DRE_ROW_SECTION}>(+) RECEITAS BRUTAS</td>
                </tr>
                {dados.receitasPorCat.map((r, i) => (
                  <tr key={i}>
                    <td style={DRE_ROW_CAT}>{r.categoria}</td>
                    <td style={{ ...DRE_ROW_CAT, textAlign: 'right', color: L.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.valor)}</td>
                  </tr>
                ))}
                {dados.receitasPorCat.length === 0 && (
                  <tr><td colSpan={2} style={{ ...DRE_ROW_CAT, color: L.t4, fontStyle: 'italic' }}>Sem receitas no período</td></tr>
                )}
                <tr>
                  <td style={{ ...DRE_ROW_SUBTOTAL, color: L.t1 }}>Total Receitas Brutas</td>
                  <td style={{ ...DRE_ROW_SUBTOTAL, textAlign: 'right', color: L.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(dados.totalReceitas)}</td>
                </tr>

                {/* Deduções */}
                <tr>
                  <td colSpan={2} style={DRE_ROW_SECTION}>(−) DEDUÇÕES / CANCELAMENTOS</td>
                </tr>
                {dados.deducoesPorCat.map((r, i) => (
                  <tr key={i}>
                    <td style={DRE_ROW_CAT}>{r.categoria}</td>
                    <td style={{ ...DRE_ROW_CAT, textAlign: 'right', color: L.red, fontFamily: "'JetBrains Mono', monospace" }}>({fmt(r.valor)})</td>
                  </tr>
                ))}
                {dados.deducoesPorCat.length === 0 && (
                  <tr><td colSpan={2} style={{ ...DRE_ROW_CAT, color: L.t4, fontStyle: 'italic' }}>Sem cancelamentos no período</td></tr>
                )}
                <tr>
                  <td style={{ ...DRE_ROW_SUBTOTAL, color: L.t1 }}>Total Deduções</td>
                  <td style={{ ...DRE_ROW_SUBTOTAL, textAlign: 'right', color: L.red, fontFamily: "'JetBrains Mono', monospace" }}>({fmt(dados.totalDeducoes)})</td>
                </tr>

                {/* Receita Líquida */}
                <tr style={{ background: L.blueBg || L.tealBg }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 14, color: L.blue || L.teal, borderBottom: `2px solid ${L.line}` }}>
                    (=) RECEITA LÍQUIDA
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 14, textAlign: 'right', color: L.blue || L.teal, fontFamily: "'JetBrains Mono', monospace", borderBottom: `2px solid ${L.line}` }}>
                    {fmt(dados.receitaLiquida)}
                  </td>
                </tr>

                {/* Despesas Operacionais */}
                <tr>
                  <td colSpan={2} style={DRE_ROW_SECTION}>(−) DESPESAS OPERACIONAIS</td>
                </tr>
                {dados.despesasPorCat.map((r, i) => (
                  <tr key={i}>
                    <td style={DRE_ROW_CAT}>{r.categoria}</td>
                    <td style={{ ...DRE_ROW_CAT, textAlign: 'right', color: L.red, fontFamily: "'JetBrains Mono', monospace" }}>({fmt(r.valor)})</td>
                  </tr>
                ))}
                {dados.despesasPorCat.length === 0 && (
                  <tr><td colSpan={2} style={{ ...DRE_ROW_CAT, color: L.t4, fontStyle: 'italic' }}>Sem despesas no período</td></tr>
                )}
                <tr>
                  <td style={{ ...DRE_ROW_SUBTOTAL, color: L.t1 }}>Total Despesas Operacionais</td>
                  <td style={{ ...DRE_ROW_SUBTOTAL, textAlign: 'right', color: L.red, fontFamily: "'JetBrains Mono', monospace" }}>({fmt(dados.totalDespesas)})</td>
                </tr>

                {/* Resultado */}
                <tr style={{ background: dados.resultado >= 0 ? L.greenBg : L.redBg }}>
                  <td style={{ padding: '16px 14px', fontWeight: 700, fontSize: 16, color: dados.resultado >= 0 ? L.green : L.red }}>
                    (=) RESULTADO OPERACIONAL
                  </td>
                  <td style={{ padding: '16px 14px', fontWeight: 700, fontSize: 16, textAlign: 'right', color: dados.resultado >= 0 ? L.green : L.red, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(dados.resultado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pending note */}
          {dados.totalDespesasPendentes > 0 && (
            <div style={{
              background: L.yellowBg || L.surface, border: `1px solid ${L.yellowBd || L.line}`,
              borderRadius: 10, padding: '12px 16px', fontSize: 13, color: L.yellow || L.t2,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontWeight: 700 }}>Atenção:</span>
              Há {fmt(dados.totalDespesasPendentes)} em despesas pendentes não incluídas no resultado acima.
            </div>
          )}

          {/* Bar Chart */}
          <Card title={periodo === 'ano' ? 'Receitas vs Despesas por Mês' : 'Receitas vs Despesas por Semana'}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.barData}>
                <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v, n) => [fmt(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receitas" fill={L.green} radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="despesas" fill={L.red} radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </>
  )
}

// ── Tab: Procedimentos ────────────────────────────────────────────────────────

function TabProcedimentos({ clinicaId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')
  const [semCatalogo, setSemCatalogo] = useState(false)

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)

    const [procRes, consRes] = await Promise.all([
      supabase.from('procedimentos').select('id, nome, valor').eq('clinica_id', clinicaId),
      supabase.from('consultas').select('tipo, valor, data_hora')
        .eq('clinica_id', clinicaId)
        .gte('data_hora', isoI)
        .lte('data_hora', isoF),
    ])

    const procedimentos = procRes.data || []
    const consultas = consRes.data || []

    if (procedimentos.length === 0) {
      setSemCatalogo(true)
      setLoading(false)
      return
    }
    setSemCatalogo(false)

    // Count by tipo (tipo in consultas matches procedimento nome)
    const countMap = {}
    const receitaMap = {}
    consultas.forEach(c => {
      const tipo = c.tipo || ''
      countMap[tipo] = (countMap[tipo] || 0) + 1
      receitaMap[tipo] = (receitaMap[tipo] || 0) + Number(c.valor || 0)
    })

    const result = procedimentos.map(p => ({
      nome: p.nome,
      valorTabela: Number(p.valor || 0),
      usos: countMap[p.nome] || 0,
      receita: receitaMap[p.nome] || 0,
    })).sort((a, b) => b.usos - a.usos)

    setRows(result)
    setLoading(false)
  }

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const maxUsos = rows.length > 0 ? Math.max(...rows.map(r => r.usos)) : 0

  return (
    <>
      <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />
      {loading ? <Spinner /> : semCatalogo ? (
        <div style={{
          background: L.tealBg, border: `1px solid ${L.teal}30`, borderRadius: 14,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.teal, marginBottom: 8 }}>
            Tabela de procedimentos vazia
          </div>
          <div style={{ fontSize: 13, color: L.t3 }}>
            Configure a tabela de procedimentos em Configurações
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top chart */}
          {rows.filter(r => r.usos > 0).length > 0 && (
            <Card title="Top Procedimentos por Uso">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows.filter(r => r.usos > 0).slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={L.line} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="usos" fill={L.teal} radius={[0, 4, 4, 0]} name="Usos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Ranked table */}
          <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {['#', 'PROCEDIMENTO', 'VALOR TABELA', 'USOS NO PERÍODO', 'RECEITA GERADA'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: h === '#' || h === 'USOS NO PERÍODO' ? 'center' : 'left',
                        fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.3px', whiteSpace: 'nowrap',
                        borderBottom: `2px solid ${L.line}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{
                      background: i === 0 && r.usos > 0 ? L.tealBg : (i % 2 === 0 ? L.bg : L.surface),
                      borderBottom: `1px solid ${L.line}`,
                    }}>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: L.t1 }}>
                        {i === 0 && r.usos > 0 && <span style={{ color: L.teal, marginRight: 6, fontSize: 11 }}>★</span>}
                        {r.nome}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(r.valorTabela)}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: r.usos > 0 ? L.teal : L.t4 }}>
                        {r.usos}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: r.receita > 0 ? L.green : L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {r.receita > 0 ? fmt(r.receita) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab: Pacientes ────────────────────────────────────────────────────────────

function TabPacientes({ clinicaId }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const dozeAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1).toISOString()

    const [pacRes, agRes] = await Promise.all([
      supabase.from('pacientes').select('id, sexo, data_nascimento, criado_em, ativo').eq('clinica_id', clinicaId),
      supabase.from('agendamentos').select('paciente_id, convenio_id, convenios(nome)').eq('clinica_id', clinicaId),
    ])

    const pacientes = pacRes.data || []
    const agendamentos = agRes.data || []

    const ativos = pacientes.filter(p => p.ativo !== false)
    const novosMes = pacientes.filter(p => p.criado_em >= inicioMes)

    // Average age
    let totalIdade = 0, comIdade = 0
    pacientes.forEach(p => {
      if (p.data_nascimento) {
        const nascimento = new Date(p.data_nascimento)
        const idade = Math.floor((hoje - nascimento) / (365.25 * 24 * 60 * 60 * 1000))
        totalIdade += idade
        comIdade++
      }
    })
    const idadeMedia = comIdade > 0 ? Math.round(totalIdade / comIdade) : null

    // Sexo distribution
    const sexoMap = {}
    pacientes.forEach(p => {
      const s = p.sexo || 'Não informado'
      sexoMap[s] = (sexoMap[s] || 0) + 1
    })
    const sexoChart = Object.entries(sexoMap).map(([name, value]) => ({ name, value }))

    // Registration by month (last 12)
    const registroMes = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const label = MESES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2)
      const count = pacientes.filter(p => {
        if (!p.criado_em) return false
        const c = new Date(p.criado_em)
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
      }).length
      registroMes.push({ label, count })
    }

    // By convenio
    const convenioMap = {}
    agendamentos.forEach(a => {
      const nome = a.convenios?.nome || 'Particular'
      if (!convenioMap[nome]) convenioMap[nome] = new Set()
      if (a.paciente_id) convenioMap[nome].add(a.paciente_id)
    })
    const convenioRows = Object.entries(convenioMap)
      .map(([convenio, set]) => ({ convenio, pacientes: set.size }))
      .sort((a, b) => b.pacientes - a.pacientes)

    setDados({
      totalAtivos: ativos.length,
      novosMes: novosMes.length,
      idadeMedia,
      sexoChart,
      registroMes,
      convenioRows,
    })
    setLoading(false)
  }

  const PIE_COLORS = [L.teal, L.purple, L.blue, L.yellow, L.orange]

  return (
    <>
      {loading ? <Spinner /> : dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Pacientes ativos', value: dados.totalAtivos, color: L.teal, bg: L.tealBg, icon: '👥' },
              { label: 'Novos este mês', value: dados.novosMes, color: L.green, bg: L.greenBg, icon: '✦' },
              { label: 'Idade média', value: dados.idadeMedia !== null ? `${dados.idadeMedia} anos` : '—', color: L.blue, bg: L.blueBg, icon: '📋' },
              {
                label: 'Masc. / Fem.',
                value: (() => {
                  const m = dados.sexoChart.find(s => /masc/i.test(s.name))?.value || 0
                  const f = dados.sexoChart.find(s => /fem/i.test(s.name))?.value || 0
                  return `${m} / ${f}`
                })(),
                color: L.purple, bg: L.purpleBg, icon: '⚤',
              },
            ].map(k => (
              <div key={k.label} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11, background: k.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: L.t3 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: k.color }}>
                    {k.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Distribuição por Sexo">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dados.sexoChart} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                    dataKey="value" nameKey="name" paddingAngle={2}
                  >
                    {dados.sexoChart.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Novos Pacientes — Últimos 12 Meses">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dados.registroMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill={L.teal} radius={[4, 4, 0, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* By convenio */}
          {dados.convenioRows.length > 0 && (
            <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', fontWeight: 600, fontSize: 14, color: L.t1, borderBottom: `1px solid ${L.line}` }}>
                Pacientes por Convênio
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {['CONVÊNIO', 'PACIENTES', 'PARTICIPAÇÃO'].map(h => (
                      <th key={h} style={{
                        padding: '10px 20px', textAlign: h === 'CONVÊNIO' ? 'left' : 'center',
                        fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.3px', borderBottom: `2px solid ${L.line}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.convenioRows.map((r, i) => {
                    const total = dados.convenioRows.reduce((s, x) => s + x.pacientes, 0)
                    const pct = total > 0 ? Math.round((r.pacientes / total) * 100) : 0
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? L.bg : L.surface, borderBottom: `1px solid ${L.line}` }}>
                        <td style={{ padding: '11px 20px', fontWeight: 600, fontSize: 13, color: L.t1 }}>{r.convenio}</td>
                        <td style={{ padding: '11px 20px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: L.teal }}>
                          {r.pacientes}
                        </td>
                        <td style={{ padding: '11px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{
                              width: 80, height: 6, borderRadius: 3, background: L.line, overflow: 'hidden'
                            }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: L.teal, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'geral', label: 'Visão Geral' },
  { id: 'pormedico', label: 'Por Médico' },
  { id: 'repasse', label: 'Repasse Médico' },
  { id: 'dre', label: 'DRE' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'pacientes', label: 'Pacientes' },
]

export default function PageRelatorios({ profile }) {
  const [tab, setTab] = useState('geral')
  const clinicaId = profile?.clinica_id

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        borderBottom: `2px solid ${L.line}`, paddingBottom: 0,
        flexWrap: 'wrap',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600,
            borderRadius: '8px 8px 0 0',
            background: tab === t.id ? L.teal : 'transparent',
            color: tab === t.id ? L.white : L.t3,
            border: 'none',
            borderBottom: tab === t.id ? `2px solid ${L.teal}` : '2px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s',
            cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' && <TabVisaoGeral clinicaId={clinicaId} />}
      {tab === 'pormedico' && <TabPorMedico clinicaId={clinicaId} />}
      {tab === 'repasse' && <TabRepasse clinicaId={clinicaId} />}
      {tab === 'dre' && <TabDRE clinicaId={clinicaId} />}
      {tab === 'procedimentos' && <TabProcedimentos clinicaId={clinicaId} />}
      {tab === 'pacientes' && <TabPacientes clinicaId={clinicaId} />}
    </div>
  )
}
