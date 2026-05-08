import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function KpiCard({ icon, label, value, sub, color = L.teal, bg = L.tealBg, trend }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      borderLeft: `4px solid ${color}`,
      padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14,
      transition: 'box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: L.t3, marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 700,
            fontSize: 26, color: L.t1, lineHeight: 1
          }}>{value}</div>
          {trend !== undefined && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: trend >= 0 ? L.green : L.red,
            }}>
              {trend >= 0 ? '▲' : '▼'}
            </span>
          )}
        </div>
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

// ─── Metas Mensais ────────────────────────────────────────────────────────────
function MetasMensais({ clinicaId, consultasReais, receitaReal }) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  const [meta, setMeta]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState({ meta_consultas: '', meta_receita: '' })
  const [saving, setSaving]       = useState(false)

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const loadMeta = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('metas_mensais')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('mes', currentMonth)
        .eq('ano', currentYear)
        .single()
      setMeta(data || null)
    } catch {
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [clinicaId, currentMonth, currentYear])

  useEffect(() => { if (clinicaId) loadMeta() }, [loadMeta])

  async function saveMeta() {
    setSaving(true)
    try {
      const payload = {
        clinica_id:     clinicaId,
        mes:            currentMonth,
        ano:            currentYear,
        meta_consultas: parseInt(form.meta_consultas) || 0,
        meta_receita:   parseFloat(form.meta_receita) || 0,
      }
      if (meta?.id) {
        await supabase.from('metas_mensais').update(payload).eq('id', meta.id)
      } else {
        await supabase.from('metas_mensais').insert(payload)
      }
      setModalOpen(false)
      loadMeta()
    } catch (e) {
      console.warn('Erro ao salvar meta:', e)
    } finally {
      setSaving(false)
    }
  }

  function openModal() {
    setForm({
      meta_consultas: meta?.meta_consultas ?? '',
      meta_receita:   meta?.meta_receita   ?? '',
    })
    setModalOpen(true)
  }

  function ProgressBar({ label, actual, total, color, formatFn }) {
    const pct   = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0
    const fmtAc = formatFn ? formatFn(actual) : actual
    const fmtTo = formatFn ? formatFn(total)  : total
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: L.t2, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtAc} / {fmtTo} &nbsp;
            <span style={{ fontWeight: 700, color: pct >= 100 ? L.green : color }}>{pct}%</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: L.line, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${pct}%`, background: color,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    )
  }

  if (loading) return null

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <>
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>
              Metas do Mês
            </div>
            <span style={{ fontSize: 12, color: L.t4, textTransform: 'capitalize' }}>{monthLabel}</span>
          </div>
          <button onClick={openModal} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}>
            {meta ? '✏️ Editar Metas' : '+ Definir Metas'}
          </button>
        </div>

        {!meta ? (
          <div style={{
            textAlign: 'center', padding: '20px 0', color: L.t4, fontSize: 13,
            border: `1px dashed ${L.line}`, borderRadius: 10,
          }}>
            Nenhuma meta definida para este mês.{' '}
            <button onClick={openModal} style={{ color: L.teal, fontWeight: 600, textDecoration: 'underline' }}>
              Definir metas
            </button>
          </div>
        ) : (
          <>
            <ProgressBar
              label="Meta de Consultas"
              actual={consultasReais}
              total={meta.meta_consultas || 0}
              color={L.teal}
            />
            <ProgressBar
              label="Meta de Receita"
              actual={receitaReal}
              total={Number(meta.meta_receita) || 0}
              color={L.green}
              formatFn={fmt}
            />
          </>
        )}
      </div>

      {/* Modal Definir Metas */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{
            background: L.bg, borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: L.t1, marginBottom: 20 }}>
              🎯 Definir Metas — {monthLabel}
            </div>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: L.t3, marginBottom: 6, fontWeight: 500 }}>Meta de Consultas</div>
              <input
                type="number"
                min="0"
                value={form.meta_consultas}
                onChange={e => setForm(f => ({ ...f, meta_consultas: e.target.value }))}
                placeholder="Ex: 150"
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
                  border: `1px solid ${L.line}`, background: L.surface,
                  fontSize: 14, outline: 'none',
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: L.t3, marginBottom: 6, fontWeight: 500 }}>Meta de Receita (R$)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.meta_receita}
                onChange={e => setForm(f => ({ ...f, meta_receita: e.target.value }))}
                placeholder="Ex: 50000"
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
                  border: `1px solid ${L.line}`, background: L.surface,
                  fontSize: 14, outline: 'none',
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} className="btn-ghost">
                Cancelar
              </button>
              <button onClick={saveMeta} disabled={saving} className="btn-primary">
                {saving ? 'Salvando…' : 'Salvar Metas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Aniversariantes ──────────────────────────────────────────────────────────
function Aniversariantes({ clinicaId }) {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading]    = useState(true)
  const [tab, setTab]            = useState('semana') // 'semana' | 'mes'
  const [showAll, setShowAll]    = useState(false)

  useEffect(() => {
    if (!clinicaId) { setLoading(false); return }
    async function load() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('pacientes')
          .select('id, nome, data_nascimento, telefone')
          .eq('clinica_id', clinicaId)
          .eq('ativo', true)
          .not('data_nascimento', 'is', null)
        setPacientes(data || [])
      } catch {
        setPacientes([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clinicaId])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function parseNasc(dt) {
    return new Date(dt + 'T12:00:00')
  }

  function isBirthdayInRange(dt, fromDate, toDate) {
    const d = parseNasc(dt)
    const year = today.getFullYear()
    // Try this year and next year for wrap-around
    for (const y of [year, year + 1]) {
      const bday = new Date(y, d.getMonth(), d.getDate())
      if (bday >= fromDate && bday <= toDate) return true
    }
    return false
  }

  function isToday(dt) {
    const d = parseNasc(dt)
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }

  function age(dt) {
    const d = parseNasc(dt)
    let a = today.getFullYear() - d.getFullYear()
    const bdayThisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
    if (today < bdayThisYear) a--
    return a + 1 // age they're turning
  }

  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const semana = pacientes
    .filter(p => isBirthdayInRange(p.data_nascimento, today, endOfWeek))
    .sort((a, b) => {
      const dA = parseNasc(a.data_nascimento)
      const dB = parseNasc(b.data_nascimento)
      return dA.getMonth() * 31 + dA.getDate() - (dB.getMonth() * 31 + dB.getDate())
    })

  const mes = pacientes
    .filter(p => parseNasc(p.data_nascimento).getMonth() === today.getMonth())
    .sort((a, b) => parseNasc(a.data_nascimento).getDate() - parseNasc(b.data_nascimento).getDate())

  const list  = tab === 'semana' ? semana : mes
  const shown = showAll ? list : list.slice(0, 6)

  const fmtNasc = dt => parseNasc(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const fmtTel  = t  => t || '—'

  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: 20, marginBottom: 20,
      borderLeft: `4px solid ${L.yellow}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎂</span>
          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>Aniversariantes</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['semana', 'mes'].map(t => (
            <button key={t} onClick={() => { setTab(t); setShowAll(false) }} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: tab === t ? L.yellow : L.surface,
              color: tab === t ? '#fff' : L.t3,
              border: `1px solid ${tab === t ? L.yellow : L.line}`,
              transition: 'all 0.15s',
            }}>
              {t === 'semana' ? 'Esta Semana' : 'Este Mês'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: L.t4, fontSize: 13 }}>Carregando…</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: L.t4, fontSize: 13 }}>
          {tab === 'semana' ? 'Nenhum aniversariante esta semana' : 'Nenhum aniversariante este mês'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shown.map(p => {
              const hoje = isToday(p.data_nascimento)
              const turningAge = age(p.data_nascimento)
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10,
                  background: hoje ? L.yellowBg : 'transparent',
                  border: `1px solid ${hoje ? L.yellowBd : 'transparent'}`,
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => { if (!hoje) e.currentTarget.style.background = L.hover }}
                  onMouseLeave={e => { if (!hoje) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>🎂</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: L.t1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nome}
                      </span>
                      {hoje && (
                        <span style={{
                          padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: L.yellow, color: '#fff', flexShrink: 0,
                        }}>🎉 Hoje!</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 1 }}>
                      <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtNasc(p.data_nascimento)} · {turningAge} anos
                      </span>
                      {p.telefone && (
                        <span style={{ fontSize: 11, color: L.t4 }}>{fmtTel(p.telefone)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {list.length > 6 && (
            <button onClick={() => setShowAll(v => !v)} style={{
              marginTop: 10, width: '100%', padding: '7px 0',
              background: L.surface, border: `1px solid ${L.line}`,
              borderRadius: 8, fontSize: 12, color: L.t3,
              fontWeight: 500, transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = L.hover}
              onMouseLeave={e => e.currentTarget.style.background = L.surface}
            >
              {showAll ? 'Ver menos ▲' : `Ver todos (${list.length}) ▼`}
            </button>
          )}
        </>
      )}
    </div>
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
  const [kpis, setKpis] = useState({ hoje: 0, pacientes: 0, receita: 0, novosMes: 0, consultasMes: 0 })
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

      const [agHoje, totalPac, receitaMes, novosMes, consultasMes] = await Promise.all([
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
        supabase.from('agendamentos')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .gte('data_hora', inicioMes),
      ])

      const receita = (receitaMes.data || []).reduce((s, r) => s + Number(r.valor), 0)
      setAgendamentosHoje(agHoje.data || [])
      setKpis({
        hoje:         agHoje.data?.length || 0,
        pacientes:    totalPac.count || 0,
        receita,
        novosMes:     novosMes.count || 0,
        consultasMes: consultasMes.count || 0,
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="grid-cols-4">
        <KpiCard icon="📅" label="Consultas hoje"  value={kpis.hoje}             sub="agendamentos do dia"    color={L.teal}   bg={L.tealBg} />
        <KpiCard icon="👥" label="Total pacientes" value={kpis.pacientes}        sub="pacientes ativos"       color={L.blue}   bg={L.blueBg} />
        <KpiCard icon="💰" label="Receita do mês"  value={fmt(kpis.receita)}     sub="pagamentos recebidos"   color={L.green}  bg={L.greenBg} />
        <KpiCard icon="🆕" label="Novos pacientes" value={kpis.novosMes}         sub="este mês"               color={L.purple} bg={L.purpleBg} />
      </div>

      {/* Metas do Mês */}
      <MetasMensais
        clinicaId={clinicaId}
        consultasReais={kpis.consultasMes}
        receitaReal={kpis.receita}
      />

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>
            Consultas — últimos 7 dias
          </div>
          <ResponsiveContainer width="100%" height={200}>
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
          <ResponsiveContainer width="100%" height={200}>
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

      {/* Agenda de hoje */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
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

      {/* Aniversariantes */}
      <Aniversariantes clinicaId={clinicaId} />
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
