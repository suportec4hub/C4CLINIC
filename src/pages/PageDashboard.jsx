import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function KpiCard({ icon, label, value, sub, color = L.teal, bg = L.tealBg }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14,
      transition: 'box-shadow 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: L.t3, marginBottom: 4 }}>{label}</div>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontWeight: 700,
          fontSize: 26, color: L.t1, lineHeight: 1
        }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    agendado:       { label: 'Agendado',       color: L.blue,   bg: L.blueBg },
    confirmado:     { label: 'Confirmado',     color: L.green,  bg: L.greenBg },
    em_atendimento: { label: 'Em atendimento', color: L.yellow, bg: L.yellowBg },
    realizado:      { label: 'Realizado',      color: L.green,  bg: L.greenBg },
    cancelado:      { label: 'Cancelado',      color: L.red,    bg: L.redBg },
    falta:          { label: 'Falta',          color: L.t3,     bg: L.surface },
  }
  const s = map[status] || { label: status, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg
    }}>{s.label}</span>
  )
}

// Dashboard para usuários C4HUB Admin — visão global do sistema
function DashboardMaster({ profile }) {
  const [stats, setStats] = useState({ clinicas: 0, hospitais: 0, usuarios: 0, ativos: 0 })
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: cls }, { data: us }] = await Promise.all([
          supabase.from('clinicas').select('id, nome, tipo, plano, ativo, cidade, estado').neq('tipo', 'c4hub').order('nome'),
          supabase.from('usuarios').select('id, cargo').neq('cargo', 'c4hub_admin').neq('cargo', 'c4hub'),
        ])
        const clinicasList = cls || []
        const usersList = us || []
        setClientes(clinicasList)
        setStats({
          clinicas:  clinicasList.filter(c => c.tipo === 'clinica').length,
          hospitais: clinicasList.filter(c => c.tipo === 'hospital').length,
          usuarios:  usersList.length,
          ativos:    clinicasList.filter(c => c.ativo).length,
        })
      } catch (e) {
        console.warn('Erro ao carregar dashboard master:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = dt => new Date(dt).toLocaleDateString('pt-BR')

  if (loading) return <Spinner />

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: L.t1 }}>
          Painel C4HUB 👋
        </div>
        <div style={{ fontSize: 14, color: L.t3, marginTop: 2 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="grid-cols-4">
        <KpiCard icon="🏥" label="Clínicas"         value={stats.clinicas}  sub="clientes ativos" color={L.blue}   bg={L.blueBg} />
        <KpiCard icon="🏨" label="Hospitais"         value={stats.hospitais} sub="clientes ativos" color={L.purple} bg={L.purpleBg} />
        <KpiCard icon="✅" label="Clientes ativos"   value={stats.ativos}    sub="total ativado"   color={L.green}  bg={L.greenBg} />
        <KpiCard icon="👥" label="Usuários clientes" value={stats.usuarios}  sub="nas clínicas"    color={L.teal}   bg={L.tealBg} />
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
          Clientes cadastrados ({clientes.length})
        </div>
        {clientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: L.t4 }}>
            Nenhum cliente cadastrado. Acesse "Clínicas & Hospitais" para adicionar.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                {['Nome', 'Tipo', 'Plano', 'Localização', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: 11, color: L.t4, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < clientes.length - 1 ? `1px solid ${L.lineSoft}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = L.surface}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 12px', fontWeight: 600, color: L.t1, fontSize: 13 }}>{c.nome}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: c.tipo === 'hospital' ? L.purpleBg : L.blueBg,
                      color: c.tipo === 'hospital' ? L.purple : L.blue
                    }}>{c.tipo === 'hospital' ? 'Hospital' : 'Clínica'}</span>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 12, color: L.t3, textTransform: 'capitalize' }}>{c.plano || 'básico'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 13, color: L.t2 }}>
                    {[c.cidade, c.estado].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: c.ativo ? L.greenBg : L.redBg,
                      color: c.ativo ? L.green : L.red
                    }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Dashboard para usuários de clínica — visão operacional
function DashboardClinica({ profile }) {
  const [kpis, setKpis] = useState({ hoje: 0, pacientes: 0, receita: 0, novosMes: 0 })
  const [agendamentosHoje, setAgendamentosHoje] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  const clinicaId = profile?.clinica_id

  useEffect(() => {
    if (!clinicaId) { setLoading(false); return }
    load()
  }, [clinicaId])

  async function load() {
    setLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [agHoje, totalPac, receitaMes, novosMes] = await Promise.all([
        supabase.from('agendamentos')
          .select('*, pacientes(nome), medicos(nome)')
          .eq('clinica_id', clinicaId)
          .gte('data_hora', `${hoje}T00:00:00`)
          .lte('data_hora', `${hoje}T23:59:59`)
          .order('data_hora'),
        supabase.from('pacientes')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .eq('ativo', true),
        supabase.from('financeiro_lancamentos')
          .select('valor')
          .eq('clinica_id', clinicaId)
          .eq('tipo', 'receita')
          .eq('status', 'pago')
          .gte('data_pagamento', inicioMes),
        supabase.from('pacientes')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .gte('criado_em', inicioMes),
      ])

      const receita = (receitaMes.data || []).reduce((s, r) => s + Number(r.valor), 0)
      setAgendamentosHoje(agHoje.data || [])
      setKpis({
        hoje: agHoje.data?.length || 0,
        pacientes: totalPac.count || 0,
        receita,
        novosMes: novosMes.count || 0,
      })

      // Gráfico: últimos 7 dias
      const dias = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' })

        const [{ count: qtd }, { data: fin }] = await Promise.all([
          supabase.from('agendamentos')
            .select('*', { count: 'exact', head: true })
            .eq('clinica_id', clinicaId)
            .gte('data_hora', `${ds}T00:00:00`)
            .lte('data_hora', `${ds}T23:59:59`),
          supabase.from('financeiro_lancamentos')
            .select('valor')
            .eq('clinica_id', clinicaId)
            .eq('tipo', 'receita')
            .eq('status', 'pago')
            .gte('data_pagamento', ds)
            .lte('data_pagamento', ds),
        ])

        const rec = (fin || []).reduce((s, r) => s + Number(r.valor), 0)
        dias.push({ dia: label, consultas: qtd || 0, receita: rec })
      }
      setChartData(dias)
    } catch (e) {
      console.warn('Erro ao carregar dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const fmt = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'
  const fmtHora = dt => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading) return <Spinner />

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: L.t1 }}>
          Bom dia! 👋
        </div>
        <div style={{ fontSize: 14, color: L.t3, marginTop: 2 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="grid-cols-4">
        <KpiCard icon="📅" label="Consultas hoje"  value={kpis.hoje}       sub="agendamentos do dia"    color={L.teal}   bg={L.tealBg} />
        <KpiCard icon="👥" label="Total pacientes" value={kpis.pacientes}  sub="pacientes ativos"       color={L.blue}   bg={L.blueBg} />
        <KpiCard icon="💰" label="Receita do mês"  value={fmt(kpis.receita)} sub="pagamentos recebidos" color={L.green}  bg={L.greenBg} />
        <KpiCard icon="🆕" label="Novos pacientes" value={kpis.novosMes}   sub="este mês"               color={L.purple} bg={L.purpleBg} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
            Consultas — últimos 7 dias
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={L.teal} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={L.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }}
                formatter={v => [v, 'consultas']} />
              <Area type="monotone" dataKey="consultas" stroke={L.teal} strokeWidth={2} fill="url(#tealGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
            Receita — últimos 7 dias
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: L.t4 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }}
                formatter={v => [fmt(v), 'receita']} />
              <Bar dataKey="receita" fill={L.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
          Agenda de hoje ({agendamentosHoje.length})
        </div>
        {agendamentosHoje.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: L.t4, fontSize: 14 }}>
            Nenhum agendamento para hoje
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 100px',
              padding: '8px 12px', fontSize: 11, color: L.t4,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
              borderBottom: `1px solid ${L.line}`
            }}>
              <span>HORA</span><span>PACIENTE</span><span>MÉDICO</span><span>TIPO</span><span>STATUS</span>
            </div>
            {agendamentosHoje.map(ag => (
              <div key={ag.id} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 100px',
                padding: '10px 12px', fontSize: 13, borderRadius: 8, transition: 'background 0.12s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = L.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: L.teal, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {fmtHora(ag.data_hora)}
                </span>
                <span style={{ color: L.t1, fontWeight: 500 }}>{ag.pacientes?.nome || '—'}</span>
                <span style={{ color: L.t2 }}>Dr(a). {ag.medicos?.nome || '—'}</span>
                <span style={{ color: L.t3, textTransform: 'capitalize' }}>{ag.tipo || 'consulta'}</span>
                <StatusBadge status={ag.status} />
              </div>
            ))}
          </div>
        )}
      </div>
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

export default function PageDashboard({ profile, isMaster }) {
  if (isMaster) return <DashboardMaster profile={profile} />
  return <DashboardClinica profile={profile} />
}
