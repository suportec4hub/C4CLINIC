import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const TIPOS = ['consulta', 'retorno', 'exame', 'procedimento', 'avaliação']
const STATUS_OPTS = ['agendado', 'confirmado', 'em_atendimento', 'realizado', 'cancelado', 'falta']

const STATUS_MAP = {
  agendado:       { label: 'Agendado',       color: L.blue,   bg: L.blueBg },
  confirmado:     { label: 'Confirmado',     color: L.green,  bg: L.greenBg },
  em_atendimento: { label: 'Em atendimento', color: L.yellow, bg: L.yellowBg },
  realizado:      { label: 'Realizado',      color: L.green,  bg: L.greenBg },
  cancelado:      { label: 'Cancelado',      color: L.red,    bg: L.redBg },
  falta:          { label: 'Falta',          color: L.copper, bg: L.surface },
}

const PRIORIDADE_MAP = {
  urgente: { label: 'Urgente', color: L.red,    bg: L.redBg },
  alta:    { label: 'Alta',    color: L.orange, bg: L.orangeBg },
  normal:  { label: 'Normal',  color: L.blue,   bg: L.blueBg },
  baixa:   { label: 'Baixa',   color: L.t3,     bg: L.surface },
}

function StatusBadge({ status, onClick, small }) {
  const s = STATUS_MAP[status] || { label: status, color: L.t3, bg: L.surface }
  return (
    <span
      onClick={onClick}
      style={{
        padding: small ? '2px 7px' : '4px 10px', borderRadius: 20,
        fontSize: small ? 10 : 11, fontWeight: 600,
        color: s.color, background: s.bg,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >{s.label}</span>
  )
}

function PrioridadeBadge({ prioridade }) {
  const p = PRIORIDADE_MAP[prioridade] || { label: prioridade, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      color: p.color, background: p.bg
    }}>{p.label}</span>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-wrap" style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px'
      }}>{label}</label>
      {children}
    </div>
  )
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function tempoEspera(criadoEm) {
  const diff = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 1000 / 60)
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`
}

export default function PageAgenda({ profile }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [selecionado, setSelecionado] = useState(null)

  // Lista de espera & bloqueios
  const [listaEspera, setListaEspera] = useState([])
  const [bloqueios, setBloqueios] = useState([])
  const [sideTab, setSideTab] = useState('espera') // 'espera' | 'bloqueios'
  const [formEspera, setFormEspera] = useState({})
  const [formBloqueio, setFormBloqueio] = useState({})
  const [savingEspera, setSavingEspera] = useState(false)
  const [savingBloqueio, setSavingBloqueio] = useState(false)

  const hoje = new Date()
  const [dataSel, setDataSel] = useState(hoje.toISOString().split('T')[0])
  const [mesAno, setMesAno] = useState({ mes: hoje.getMonth(), ano: hoje.getFullYear() })

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId, mesAno])
  useEffect(() => { if (clinicaId) loadSidePanel() }, [clinicaId])

  async function load() {
    setLoading(true)
    const inicio = new Date(mesAno.ano, mesAno.mes, 1).toISOString()
    const fim = new Date(mesAno.ano, mesAno.mes + 1, 0, 23, 59, 59).toISOString()

    const [ags, pacs, meds, convs] = await Promise.all([
      supabase.from('agendamentos')
        .select('*, pacientes(id,nome), medicos(id,nome), convenios(nome)')
        .eq('clinica_id', clinicaId)
        .gte('data_hora', inicio).lte('data_hora', fim)
        .order('data_hora'),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('medicos').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true),
    ])

    setAgendamentos(ags.data || [])
    setPacientes(pacs.data || [])
    setMedicos(meds.data || [])
    setConvenios(convs.data || [])
    setLoading(false)
  }

  async function loadSidePanel() {
    const agora = new Date().toISOString()
    const [espera, bloqs] = await Promise.all([
      supabase.from('lista_espera')
        .select('*, pacientes(nome), medicos(nome)')
        .eq('clinica_id', clinicaId)
        .eq('status', 'aguardando')
        .order('prioridade')
        .order('criado_em'),
      supabase.from('agenda_bloqueios')
        .select('*, medicos(nome)')
        .eq('clinica_id', clinicaId)
        .gte('data_fim', agora)
        .order('data_inicio'),
    ])
    // Sort espera: urgente first
    const ordemPrioridade = { urgente: 0, alta: 1, normal: 2, baixa: 3 }
    const sorted = (espera.data || []).slice().sort((a, b) => {
      const pa = ordemPrioridade[a.prioridade] ?? 99
      const pb = ordemPrioridade[b.prioridade] ?? 99
      if (pa !== pb) return pa - pb
      return new Date(a.criado_em) - new Date(b.criado_em)
    })
    setListaEspera(sorted)
    setBloqueios(bloqs.data || [])
  }

  function abrirNovo(data) {
    const dt = data || dataSel
    setForm({
      clinica_id: clinicaId,
      data_hora: `${dt}T08:00`,
      duracao_min: 30,
      tipo: 'consulta',
      status: 'agendado'
    })
    setModal('form')
  }

  async function salvar() {
    setSaving(true)
    if (modal === 'form' && !selecionado) {
      await supabase.from('agendamentos').insert(form)
    } else if (selecionado) {
      const { id, pacientes: _, medicos: __, convenios: ___, ...rest } = form
      await supabase.from('agendamentos').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    setSelecionado(null)
    load()
  }

  async function alterarStatus(id, status) {
    await supabase.from('agendamentos').update({ status }).eq('id', id)
    load()
  }

  async function excluir(id) {
    if (!confirm('Cancelar este agendamento?')) return
    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
    load()
  }

  // Lista de espera actions
  async function adicionarEspera() {
    setSavingEspera(true)
    await supabase.from('lista_espera').insert({
      clinica_id: clinicaId,
      paciente_id: formEspera.paciente_id,
      medico_id: formEspera.medico_id || null,
      tipo: formEspera.tipo || 'consulta',
      prioridade: formEspera.prioridade || 'normal',
      observacoes: formEspera.observacoes || null,
      status: 'aguardando',
    })
    setSavingEspera(false)
    setModal(null)
    setFormEspera({})
    loadSidePanel()
  }

  async function agendarDaEspera(id) {
    await supabase.from('lista_espera').update({ status: 'agendado' }).eq('id', id)
    loadSidePanel()
  }

  async function removerDaEspera(id) {
    await supabase.from('lista_espera').update({ status: 'cancelado' }).eq('id', id)
    loadSidePanel()
  }

  // Bloqueios actions
  async function salvarBloqueio() {
    setSavingBloqueio(true)
    await supabase.from('agenda_bloqueios').insert({
      clinica_id: clinicaId,
      medico_id: formBloqueio.medico_id || null,
      data_inicio: formBloqueio.data_inicio,
      data_fim: formBloqueio.data_fim,
      motivo: formBloqueio.motivo || null,
    })
    setSavingBloqueio(false)
    setModal(null)
    setFormBloqueio({})
    loadSidePanel()
  }

  async function excluirBloqueio(id) {
    if (!confirm('Excluir este bloqueio?')) return
    await supabase.from('agenda_bloqueios').delete().eq('id', id)
    loadSidePanel()
  }

  const agDoDia = (dia) => agendamentos.filter(ag => {
    const d = new Date(ag.data_hora)
    return d.getFullYear() === mesAno.ano &&
           d.getMonth() === mesAno.mes &&
           d.getDate() === dia
  })

  const agDoDay = agendamentos.filter(ag => {
    return ag.data_hora.startsWith(dataSel)
  })

  const fmtHora = dt => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtDtHora = dt => new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const nomeMes = new Date(mesAno.ano, mesAno.mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const diasMes = getDaysInMonth(mesAno.ano, mesAno.mes)
  const primeiroDia = getFirstDayOfMonth(mesAno.ano, mesAno.mes)

  function prevMes() {
    setMesAno(m => {
      if (m.mes === 0) return { mes: 11, ano: m.ano - 1 }
      return { mes: m.mes - 1, ano: m.ano }
    })
  }
  function nextMes() {
    setMesAno(m => {
      if (m.mes === 11) return { mes: 0, ano: m.ano + 1 }
      return { mes: m.mes + 1, ano: m.ano }
    })
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={prevMes} style={{
          width: 34, height: 34, borderRadius: 8, background: L.hover,
          color: L.t2, fontSize: 16
        }}>‹</button>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontWeight: 700,
          fontSize: 17, color: L.t1, textTransform: 'capitalize', minWidth: 180
        }}>{nomeMes}</div>
        <button onClick={nextMes} style={{
          width: 34, height: 34, borderRadius: 8, background: L.hover,
          color: L.t2, fontSize: 16
        }}>›</button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMesAno({ mes: hoje.getMonth(), ano: hoje.getFullYear() })}
            style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${L.line}`,
              background: L.bg, color: L.t2, fontSize: 12, fontWeight: 500
            }}
          >Hoje</button>
          <button onClick={() => abrirNovo()} style={{
            padding: '7px 18px', borderRadius: 8, background: L.teal,
            color: L.white, fontSize: 13, fontWeight: 600
          }}>+ Agendar</button>
        </div>
      </div>

      {/* Main layout: calendar + day panel + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 300px', gap: 20 }}>
        {/* Calendário */}
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* Dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: L.surface }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} style={{
                padding: '10px 0', textAlign: 'center', fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace", color: L.t4,
                borderBottom: `1px solid ${L.line}`
              }}>{d}</div>
            ))}
          </div>

          {/* Grid de dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 80, borderBottom: `1px solid ${L.lineSoft}`, borderRight: `1px solid ${L.lineSoft}` }} />
            ))}
            {Array.from({ length: diasMes }).map((_, i) => {
              const dia = i + 1
              const isHoje = dia === hoje.getDate() && mesAno.mes === hoje.getMonth() && mesAno.ano === hoje.getFullYear()
              const agsDia = agDoDia(dia)
              const dStr = `${mesAno.ano}-${String(mesAno.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
              const isSel = dStr === dataSel

              return (
                <div key={dia}
                  onClick={() => setDataSel(dStr)}
                  style={{
                    minHeight: 80, padding: '6px', cursor: 'pointer',
                    background: isSel ? L.tealBg : 'transparent',
                    borderBottom: `1px solid ${L.lineSoft}`,
                    borderRight: `1px solid ${L.lineSoft}`,
                    transition: 'background 0.12s'
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = L.hover }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isHoje ? L.teal : 'transparent',
                    color: isHoje ? L.white : isSel ? L.teal : L.t2,
                    marginBottom: 4
                  }}>{dia}</div>
                  {agsDia.slice(0, 3).map(ag => (
                    <div key={ag.id} style={{
                      fontSize: 10, padding: '2px 4px', borderRadius: 4,
                      background: STATUS_MAP[ag.status]?.bg || L.surface,
                      color: STATUS_MAP[ag.status]?.color || L.t3,
                      marginBottom: 2, truncate: true, overflow: 'hidden',
                      whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                    }}>
                      {fmtHora(ag.data_hora)} {ag.pacientes?.nome}
                    </div>
                  ))}
                  {agsDia.length > 3 && (
                    <div style={{ fontSize: 9, color: L.t4, textAlign: 'right' }}>+{agsDia.length - 3}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Painel lateral — agenda do dia selecionado */}
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '16px', borderBottom: `1px solid ${L.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>
                {new Date(dataSel + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 12, color: L.t3 }}>{agDoDay.length} agendamento{agDoDay.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={() => abrirNovo(dataSel)} style={{
              padding: '6px 12px', borderRadius: 7, background: L.tealBg,
              color: L.teal, fontSize: 12, fontWeight: 600
            }}>+ Novo</button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 500 }}>
            {agDoDay.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                Sem agendamentos neste dia
              </div>
            ) : (
              agDoDay.map(ag => (
                <div key={ag.id} style={{
                  padding: '12px 16px', borderBottom: `1px solid ${L.lineSoft}`,
                  cursor: 'pointer', transition: 'background 0.12s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => {
                    setForm({ ...ag })
                    setSelecionado(ag)
                    setModal('detalhe')
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                      color: L.teal, fontWeight: 600
                    }}>{fmtHora(ag.data_hora)}</span>
                    <StatusBadge status={ag.status} small />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{ag.pacientes?.nome}</div>
                  <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                    Dr(a). {ag.medicos?.nome} · {ag.tipo}
                  </div>
                  {ag.convenios && (
                    <div style={{ fontSize: 11, color: L.t4, marginTop: 2 }}>{ag.convenios.nome}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side panel — Lista de Espera & Bloqueios */}
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${L.line}` }}>
            {[
              { key: 'espera', label: 'Lista de Espera', count: listaEspera.length },
              { key: 'bloqueios', label: 'Bloqueios', count: bloqueios.length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setSideTab(tab.key)} style={{
                flex: 1, padding: '12px 8px', fontSize: 12, fontWeight: 600,
                color: sideTab === tab.key ? L.teal : L.t3,
                borderBottom: sideTab === tab.key ? `2px solid ${L.teal}` : '2px solid transparent',
                background: 'transparent', transition: 'color 0.15s',
              }}>
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    marginLeft: 5, padding: '1px 6px', borderRadius: 20,
                    background: sideTab === tab.key ? L.tealBg : L.surface,
                    color: sideTab === tab.key ? L.teal : L.t4,
                    fontSize: 10, fontWeight: 700
                  }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {sideTab === 'espera' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${L.lineSoft}` }}>
                <button onClick={() => { setFormEspera({ tipo: 'consulta', prioridade: 'normal' }); setModal('addEspera') }} style={{
                  width: '100%', padding: '7px 0', borderRadius: 7,
                  background: L.tealBg, color: L.teal, fontSize: 12, fontWeight: 600
                }}>+ Adicionar à Lista</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: 480 }}>
                {listaEspera.length === 0 ? (
                  <div style={{ padding: '32px 12px', textAlign: 'center', color: L.t4, fontSize: 12 }}>
                    Nenhum paciente aguardando
                  </div>
                ) : (
                  listaEspera.map(item => (
                    <div key={item.id} style={{
                      padding: '10px 12px', borderBottom: `1px solid ${L.lineSoft}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{item.pacientes?.nome}</div>
                        <PrioridadeBadge prioridade={item.prioridade} />
                      </div>
                      {item.medicos && (
                        <div style={{ fontSize: 11, color: L.t3, marginBottom: 2 }}>Dr(a). {item.medicos.nome}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: L.t4, textTransform: 'capitalize' }}>{item.tipo}</span>
                        <span style={{ fontSize: 10, color: L.t4 }}>·</span>
                        <span style={{ fontSize: 11, color: L.t4 }}>{tempoEspera(item.criado_em)}</span>
                      </div>
                      {item.observacoes && (
                        <div style={{ fontSize: 11, color: L.t3, marginBottom: 6, fontStyle: 'italic' }}>{item.observacoes}</div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => agendarDaEspera(item.id)} style={{
                          flex: 1, padding: '4px 0', borderRadius: 6,
                          background: L.greenBg, color: L.green, fontSize: 11, fontWeight: 600
                        }}>Agendar</button>
                        <button onClick={() => removerDaEspera(item.id)} style={{
                          padding: '4px 8px', borderRadius: 6,
                          background: L.redBg, color: L.red, fontSize: 11, fontWeight: 600
                        }}>Remover</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {sideTab === 'bloqueios' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${L.lineSoft}` }}>
                <button onClick={() => { setFormBloqueio({}); setModal('addBloqueio') }} style={{
                  width: '100%', padding: '7px 0', borderRadius: 7,
                  background: L.redBg, color: L.red, fontSize: 12, fontWeight: 600
                }}>+ Novo Bloqueio</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: 480 }}>
                {bloqueios.length === 0 ? (
                  <div style={{ padding: '32px 12px', textAlign: 'center', color: L.t4, fontSize: 12 }}>
                    Nenhum bloqueio ativo
                  </div>
                ) : (
                  bloqueios.map(b => (
                    <div key={b.id} style={{
                      padding: '10px 12px', borderBottom: `1px solid ${L.lineSoft}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>
                            {b.medicos?.nome || 'Todos os médicos'}
                          </div>
                          <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>
                            {fmtDtHora(b.data_inicio)} → {fmtDtHora(b.data_fim)}
                          </div>
                          {b.motivo && (
                            <div style={{ fontSize: 11, color: L.t4, marginTop: 3 }}>{b.motivo}</div>
                          )}
                        </div>
                        <button onClick={() => excluirBloqueio(b.id)} style={{
                          padding: '3px 7px', borderRadius: 6,
                          background: L.redBg, color: L.red, fontSize: 12, flexShrink: 0
                        }}>×</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal form agendamento */}
      {modal === 'form' && (
        <Modal title="Novo Agendamento" onClose={() => { setModal(null); setSelecionado(null) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="PACIENTE *">
              <select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''}
                onChange={e => setForm({ ...form, paciente_id: e.target.value })}
              >
                <option value="">Selecione o paciente</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="MÉDICO *">
              <select style={{ ...inp, appearance: 'none' }} value={form.medico_id || ''}
                onChange={e => setForm({ ...form, medico_id: e.target.value })}
              >
                <option value="">Selecione o médico</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DATA E HORA *">
                <input type="datetime-local" style={inp} value={form.data_hora || ''}
                  onChange={e => setForm({ ...form, data_hora: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="DURAÇÃO (min)">
                <input type="number" style={inp} value={form.duracao_min || 30} min={10} max={240} step={10}
                  onChange={e => setForm({ ...form, duracao_min: Number(e.target.value) })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select style={{ ...inp, appearance: 'none' }} value={form.tipo || 'consulta'}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="CONVÊNIO">
                <select style={{ ...inp, appearance: 'none' }} value={form.convenio_id || ''}
                  onChange={e => setForm({ ...form, convenio_id: e.target.value })}
                >
                  <option value="">Particular</option>
                  {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
            <Field label="SALA / LOCAL">
              <input style={inp} value={form.sala || ''} placeholder="Ex: Sala 1, Consultório A"
                onChange={e => setForm({ ...form, sala: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }}
                value={form.observacoes || ''} placeholder="Observações sobre o agendamento..."
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.paciente_id || !form.medico_id} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Agendar'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal detalhe do agendamento */}
      {modal === 'detalhe' && selecionado && (
        <Modal title="Agendamento" onClose={() => { setModal(null); setSelecionado(null) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 16, background: L.tealBg, borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{selecionado.pacientes?.nome}</div>
              <div style={{ fontSize: 13, color: L.teal, marginTop: 2 }}>
                {new Date(selecionado.data_hora).toLocaleDateString('pt-BR', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })} às {fmtHora(selecionado.data_hora)}
              </div>
            </div>

            {[
              ['Médico', `Dr(a). ${selecionado.medicos?.nome || '—'}`],
              ['Tipo', selecionado.tipo],
              ['Duração', `${selecionado.duracao_min || 30} min`],
              ['Convênio', selecionado.convenios?.nome || 'Particular'],
              ['Sala', selecionado.sala],
              ['Observações', selecionado.observacoes],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${L.lineSoft}` }}>
                <div style={{ fontSize: 11, color: L.t4, width: 90, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{k}</div>
                <div style={{ fontSize: 13, color: L.t1, textTransform: 'capitalize' }}>{v}</div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 11, color: L.t4, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>ALTERAR STATUS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUS_OPTS.map(s => (
                  <button key={s} onClick={() => { alterarStatus(selecionado.id, s); setModal(null); setSelecionado(null) }}
                    style={{
                      padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: STATUS_MAP[s]?.bg || L.surface,
                      color: STATUS_MAP[s]?.color || L.t3,
                      border: selecionado.status === s ? `1.5px solid ${STATUS_MAP[s]?.color || L.t3}` : '1.5px solid transparent'
                    }}
                  >{STATUS_MAP[s]?.label || s}</button>
                ))}
              </div>
            </div>

            <button onClick={() => excluir(selecionado.id)} style={{
              padding: '10px 0', borderRadius: 8, background: L.redBg,
              color: L.red, fontSize: 13, fontWeight: 500
            }}>Cancelar Agendamento</button>
          </div>
        </Modal>
      )}

      {/* Modal adicionar à lista de espera */}
      {modal === 'addEspera' && (
        <Modal title="Adicionar à Lista de Espera" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="PACIENTE *">
              <select style={{ ...inp, appearance: 'none' }} value={formEspera.paciente_id || ''}
                onChange={e => setFormEspera({ ...formEspera, paciente_id: e.target.value })}
              >
                <option value="">Selecione o paciente</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="MÉDICO">
              <select style={{ ...inp, appearance: 'none' }} value={formEspera.medico_id || ''}
                onChange={e => setFormEspera({ ...formEspera, medico_id: e.target.value })}
              >
                <option value="">Qualquer médico</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select style={{ ...inp, appearance: 'none' }} value={formEspera.tipo || 'consulta'}
                  onChange={e => setFormEspera({ ...formEspera, tipo: e.target.value })}
                >
                  {['consulta', 'retorno', 'exame'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="PRIORIDADE">
                <select style={{ ...inp, appearance: 'none' }} value={formEspera.prioridade || 'normal'}
                  onChange={e => setFormEspera({ ...formEspera, prioridade: e.target.value })}
                >
                  {['urgente', 'alta', 'normal', 'baixa'].map(p => (
                    <option key={p} value={p}>{PRIORIDADE_MAP[p]?.label || p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }}
                value={formEspera.observacoes || ''} placeholder="Observações..."
                onChange={e => setFormEspera({ ...formEspera, observacoes: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13
              }}>Cancelar</button>
              <button onClick={adicionarEspera} disabled={savingEspera || !formEspera.paciente_id} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: savingEspera ? 0.7 : 1
              }}>{savingEspera ? 'Salvando...' : 'Adicionar'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal novo bloqueio */}
      {modal === 'addBloqueio' && (
        <Modal title="Novo Bloqueio de Agenda" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="MÉDICO">
              <select style={{ ...inp, appearance: 'none' }} value={formBloqueio.medico_id || ''}
                onChange={e => setFormBloqueio({ ...formBloqueio, medico_id: e.target.value })}
              >
                <option value="">Todos os médicos</option>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </Field>
            <Field label="INÍCIO *">
              <input type="datetime-local" style={inp} value={formBloqueio.data_inicio || ''}
                onChange={e => setFormBloqueio({ ...formBloqueio, data_inicio: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="FIM *">
              <input type="datetime-local" style={inp} value={formBloqueio.data_fim || ''}
                onChange={e => setFormBloqueio({ ...formBloqueio, data_fim: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="MOTIVO">
              <input style={inp} value={formBloqueio.motivo || ''} placeholder="Ex: Congresso, Férias..."
                onChange={e => setFormBloqueio({ ...formBloqueio, motivo: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13
              }}>Cancelar</button>
              <button onClick={salvarBloqueio}
                disabled={savingBloqueio || !formBloqueio.data_inicio || !formBloqueio.data_fim}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 8, background: L.red,
                  color: L.white, fontWeight: 600, fontSize: 13, opacity: savingBloqueio ? 0.7 : 1
                }}>{savingBloqueio ? 'Salvando...' : 'Criar Bloqueio'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
