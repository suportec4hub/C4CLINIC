import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const STATUS_FLOW = ['agendado', 'em_triagem', 'em_atendimento', 'realizado']

const COLUMNS = [
  {
    id: 'aguardando',
    label: 'Aguardando',
    statuses: ['agendado', 'confirmado'],
    color: L.blue,
    bg: L.blueBg,
    bd: L.blueBd,
    dot: L.blue,
  },
  {
    id: 'triagem',
    label: 'Triagem',
    statuses: ['em_triagem'],
    color: L.yellow,
    bg: L.yellowBg,
    bd: L.yellowBd,
    dot: L.yellow,
  },
  {
    id: 'consultorio',
    label: 'Consultório',
    statuses: ['em_atendimento'],
    color: L.teal,
    bg: L.tealBg,
    bd: `${L.teal}40`,
    dot: L.teal,
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    statuses: ['realizado', 'falta'],
    color: L.green,
    bg: L.greenBg,
    bd: L.greenBd,
    dot: L.green,
  },
]

function statusLabel(status) {
  const map = {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    em_triagem: 'Triagem',
    em_atendimento: 'Em atendimento',
    realizado: 'Realizado',
    falta: 'Falta',
  }
  return map[status] || status
}

function colForStatus(status) {
  return COLUMNS.find(c => c.statuses.includes(status)) || COLUMNS[0]
}

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

function prevStatus(current) {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx <= 0) return null
  return STATUS_FLOW[idx - 1]
}

function fmtTime(dt) {
  if (!dt) return '--'
  const d = new Date(dt)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function PageFluxo({ profile }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const clinicaId = profile?.clinica_id

  const load = useCallback(async () => {
    if (!clinicaId) { setLoading(false); return }
    setLoading(true)
    try {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const dayStart = `${yyyy}-${mm}-${dd}T00:00:00`
      const dayEnd   = `${yyyy}-${mm}-${dd}T23:59:59`

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          observacoes,
          pacientes(nome),
          medicos(nome)
        `)
        .eq('clinica_id', clinicaId)
        .gte('data_hora', dayStart)
        .lte('data_hora', dayEnd)
        .order('data_hora', { ascending: true })

      if (error) throw error
      setAgendamentos(data || [])
      setLastRefresh(new Date())
    } catch (err) {
      console.error('PageFluxo load error:', err)
    } finally {
      setLoading(false)
    }
  }, [clinicaId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  async function moveStatus(ag, targetStatus) {
    if (!targetStatus || moving === ag.id) return
    setMoving(ag.id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: targetStatus })
        .eq('id', ag.id)
      if (error) throw error
      setAgendamentos(prev =>
        prev.map(a => a.id === ag.id ? { ...a, status: targetStatus } : a)
      )
    } catch (err) {
      console.error('moveStatus error:', err)
    } finally {
      setMoving(null)
    }
  }

  // KPIs
  const total = agendamentos.length
  const emEspera = agendamentos.filter(a =>
    ['agendado', 'confirmado', 'em_triagem'].includes(a.status)
  ).length
  const emAtendimento = agendamentos.filter(a => a.status === 'em_atendimento').length
  const finalizados = agendamentos.filter(a =>
    ['realizado', 'falta'].includes(a.status)
  ).length

  const kpis = [
    { label: 'Total Hoje', value: total, color: L.t1, bg: L.surface },
    { label: 'Em Espera', value: emEspera, color: L.blue, bg: L.blueBg },
    { label: 'Em Atendimento', value: emAtendimento, color: L.teal, bg: L.tealBg },
    { label: 'Finalizados', value: finalizados, color: L.green, bg: L.greenBg },
  ]

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%' }}>
      {/* KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: k.bg,
            border: `1px solid ${L.line}`,
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ fontSize: 11, color: L.t3, fontWeight: 500, letterSpacing: '0.3px' }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: k.color,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.1,
            }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Refresh info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: L.t3 }}>
          {lastRefresh
            ? `Atualizado às ${lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · atualiza a cada 30s`
            : 'Carregando...'}
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '5px 14px',
            borderRadius: 7,
            border: `1px solid ${L.line}`,
            background: L.bg,
            fontSize: 12,
            color: L.t2,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      {/* Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        alignItems: 'start',
      }}>
        {COLUMNS.map(col => {
          const cards = agendamentos.filter(a => col.statuses.includes(a.status))
          return (
            <div key={col.id} style={{
              background: L.bg,
              border: `1px solid ${L.line}`,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* Column header */}
              <div style={{
                padding: '12px 14px',
                background: col.bg,
                borderBottom: `1px solid ${col.bd}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: col.color,
                    boxShadow: `0 0 6px ${col.color}80`,
                  }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: col.color,
                    letterSpacing: '-0.1px',
                  }}>{col.label}</span>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: col.color,
                  background: L.bg,
                  border: `1px solid ${col.bd}`,
                  borderRadius: 20,
                  padding: '1px 8px',
                  minWidth: 22,
                  textAlign: 'center',
                }}>{cards.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                {cards.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px 8px',
                    fontSize: 12,
                    color: L.t4,
                  }}>
                    Nenhum paciente
                  </div>
                )}
                {cards.map(ag => {
                  const pName = ag.pacientes?.nome || 'Paciente'
                  const mName = ag.medicos?.nome || '—'
                  const prev = prevStatus(ag.status === 'confirmado' ? 'agendado' : ag.status)
                  const next = nextStatus(ag.status === 'confirmado' ? 'agendado' : ag.status)
                  const isMoving = moving === ag.id
                  const curCol = colForStatus(ag.status)

                  return (
                    <div key={ag.id} style={{
                      background: L.bg,
                      border: `1px solid ${L.line}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      opacity: isMoving ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                    }}>
                      {/* Patient name */}
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: L.t1,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{pName}</div>

                      {/* Time + doctor */}
                      <div style={{
                        fontSize: 11,
                        color: L.t3,
                        marginBottom: 8,
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: L.t2,
                          fontWeight: 500,
                        }}>{fmtTime(ag.data_hora)}</span>
                        <span>·</span>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 120,
                        }}>{mName}</span>
                      </div>

                      {/* Status badge */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: curCol.bg,
                        border: `1px solid ${curCol.bd}`,
                        fontSize: 10,
                        fontWeight: 600,
                        color: curCol.color,
                        marginBottom: 8,
                      }}>
                        <div style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: curCol.color,
                        }} />
                        {statusLabel(ag.status)}
                      </div>

                      {/* Arrow buttons */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {prev && (
                          <button
                            onClick={() => moveStatus(ag, prev)}
                            disabled={isMoving}
                            title="Voltar status"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              border: `1px solid ${L.line}`,
                              background: L.hover,
                              color: L.t3,
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isMoving ? 'not-allowed' : 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => !isMoving && (e.currentTarget.style.background = L.line)}
                            onMouseLeave={e => (e.currentTarget.style.background = L.hover)}
                          >‹</button>
                        )}
                        {next && (
                          <button
                            onClick={() => moveStatus(ag, next)}
                            disabled={isMoving}
                            title="Avançar status"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              border: `1px solid ${L.teal}40`,
                              background: L.tealBg,
                              color: L.teal,
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isMoving ? 'not-allowed' : 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => !isMoving && (e.currentTarget.style.background = `${L.teal}20`)}
                            onMouseLeave={e => (e.currentTarget.style.background = L.tealBg)}
                          >›</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
