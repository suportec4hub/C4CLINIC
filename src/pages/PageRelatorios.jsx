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

export default function PageRelatorios({ profile }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  const clinicaId = profile?.clinica_id
  const ano = new Date().getFullYear()

  useEffect(() => { if (clinicaId) load() }, [clinicaId, periodo])

  async function load() {
    setLoading(true)

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

    const isoI = inicio.toISOString()
    const isoF = fim.toISOString()

    const [ags, cons, pacs, fin] = await Promise.all([
      supabase.from('agendamentos').select('status, data_hora, convenio_id, convenios(nome)')
        .eq('clinica_id', clinicaId).gte('data_hora', isoI).lte('data_hora', isoF),
      supabase.from('consultas').select('medico_id, medicos(nome), data_hora, valor, convenio_id')
        .eq('clinica_id', clinicaId).gte('data_hora', isoI).lte('data_hora', isoF),
      supabase.from('pacientes').select('sexo, criado_em')
        .eq('clinica_id', clinicaId).gte('criado_em', isoI),
      supabase.from('financeiro_lancamentos').select('tipo, valor, status, data_vencimento, categoria')
        .eq('clinica_id', clinicaId).gte('data_vencimento', inicio.toISOString().split('T')[0])
        .lte('data_vencimento', fim.toISOString().split('T')[0]),
    ])

    const agData = ags.data || []
    const consData = cons.data || []
    const pacData = pacs.data || []
    const finData = fin.data || []

    // Status dos agendamentos
    const statusCount = {}
    agData.forEach(a => { statusCount[a.status] = (statusCount[a.status] || 0) + 1 })
    const statusChart = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

    // Por médico
    const medCount = {}
    consData.forEach(c => {
      const nome = c.medicos?.nome || 'Desconhecido'
      medCount[nome] = (medCount[nome] || 0) + 1
    })
    const medicoChart = Object.entries(medCount)
      .map(([medico, consultas]) => ({ medico, consultas }))
      .sort((a, b) => b.consultas - a.consultas).slice(0, 6)

    // Financeiro por mês (anual)
    const finMes = MESES.map((mes, i) => {
      const mesData = finData.filter(f => {
        const d = new Date(f.data_vencimento + 'T12:00:00')
        return d.getMonth() === i
      })
      const receitas = mesData.filter(f => f.tipo === 'receita' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
      const despesas = mesData.filter(f => f.tipo === 'despesa' && f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0)
      return { mes, receitas, despesas }
    })

    // Sexo pacientes
    const sexoCount = { Masculino: 0, Feminino: 0, Outro: 0 }
    pacData.forEach(p => { if (p.sexo) sexoCount[p.sexo] = (sexoCount[p.sexo] || 0) + 1 })
    const sexoChart = Object.entries(sexoCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

    // Totais financeiros
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

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const PIE_COLORS = [L.teal, L.blue, L.green, L.yellow, L.red, L.purple, L.orange]
  const STATUS_COLORS = {
    agendado: L.blue, confirmado: L.green, em_atendimento: L.yellow,
    realizado: L.green, cancelado: L.red, falta: L.copper
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Período */}
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

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{
            width: 28, height: 28, border: `3px solid ${L.line}`,
            borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite'
          }} />
        </div>
      ) : dados && (
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
    </div>
  )
}
