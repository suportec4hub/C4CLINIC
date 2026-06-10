import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function getPeriodRange(periodo) {
  const hoje = new Date()
  let inicio, fim
  if (periodo === 'mes') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
  } else if (periodo === 'trimestre') {
    const q = Math.floor(hoje.getMonth() / 3)
    inicio = new Date(hoje.getFullYear(), q * 3, 1)
    fim = new Date(hoje.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
  } else {
    inicio = new Date(hoje.getFullYear(), 0, 1)
    fim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59)
  }
  return { isoI: inicio.toISOString(), isoF: fim.toISOString() }
}

function calcNPS(respostas) {
  if (!respostas.length) return null
  const total = respostas.length
  const promotores = respostas.filter(r => r.nota_nps >= 9).length
  const detratores = respostas.filter(r => r.nota_nps <= 6).length
  const nps = Math.round((promotores / total) * 100 - (detratores / total) * 100)
  return { nps, promotores, detratores, neutros: total - promotores - detratores, total }
}

function npsColor(score) {
  if (score === null) return L.t3
  if (score >= 50) return L.green
  if (score >= 0) return L.yellow
  return L.red
}

function npsZone(score) {
  if (score === null) return '—'
  if (score >= 75) return 'Zona de Excelência'
  if (score >= 50) return 'Zona de Qualidade'
  if (score >= 0) return 'Zona de Aperfeiçoamento'
  return 'Zona Crítica'
}

function npsBarColor(nota) {
  if (nota <= 6) return L.red
  if (nota <= 8) return L.yellow
  return L.green
}

function npsBadgeStyle(nota) {
  if (nota === null || nota === undefined) return { bg: L.surface, color: L.t3 }
  if (nota <= 6) return { bg: L.redBg, color: L.red }
  if (nota <= 8) return { bg: L.yellowBg, color: L.yellow }
  return { bg: L.greenBg, color: L.green }
}

function stripPhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
}

function Stars({ value, max = 5 }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? L.yellow : L.line }}>★</span>
      ))}
    </span>
  )
}

function NPSBadge({ nota }) {
  const s = npsBadgeStyle(nota)
  if (nota === null || nota === undefined) return <span style={{ color: L.t4, fontSize: 12 }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color
    }}>{nota}</span>
  )
}

// ─── shared UI ───────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, border: `3px solid ${L.line}`,
      borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`,
      borderRadius: 14, padding: 20, ...style
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 16 }}>{children}</div>
  )
}

function PeriodSelector({ periodo, setPeriodo }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
      {[
        { id: 'mes', label: 'Este mês' },
        { id: 'trimestre', label: 'Trimestre' },
        { id: 'ano', label: 'Este ano' },
      ].map(p => (
        <button key={p.id} onClick={() => setPeriodo(p.id)} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          background: periodo === p.id ? L.teal : L.bg,
          color: periodo === p.id ? L.white : L.t2,
          border: `1.5px solid ${periodo === p.id ? L.teal : L.line}`,
          transition: 'all 0.15s',
        }}>{p.label}</button>
      ))}
    </div>
  )
}

// ─── Tab 1: Dashboard NPS ────────────────────────────────────────────────────

function TabDashboard({ clinicaId }) {
  const [periodo, setPeriodo] = useState('mes')
  const [pesquisas, setPesquisas] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { isoI, isoF } = getPeriodRange(periodo)
    const { data } = await supabase
      .from('pesquisas_satisfacao')
      .select('*, pacientes(nome), medicos(nome, especialidade)')
      .eq('clinica_id', clinicaId)
      .gte('criado_em', isoI)
      .lte('criado_em', isoF)
      .order('criado_em', { ascending: false })
    setPesquisas(data || [])
    setLoading(false)
  }, [clinicaId, periodo])

  useEffect(() => { load() }, [load])

  const respondidas = pesquisas.filter(p => p.respondido && p.nota_nps !== null)
  const npsData = calcNPS(respondidas)
  const totalEnviadas = pesquisas.length
  const totalRespondidas = respondidas.length
  const taxaResposta = totalEnviadas > 0 ? Math.round((totalRespondidas / totalEnviadas) * 100) : 0
  const mediaAtend = respondidas.length > 0
    ? (respondidas.reduce((s, r) => s + (r.nota_atendimento || 0), 0) / respondidas.filter(r => r.nota_atendimento).length || 0).toFixed(1)
    : '—'
  const mediaEstrut = respondidas.length > 0
    ? (respondidas.reduce((s, r) => s + (r.nota_estrutura || 0), 0) / respondidas.filter(r => r.nota_estrutura).length || 0).toFixed(1)
    : '—'

  // Distribution 0-10
  const distrib = Array.from({ length: 11 }, (_, i) => ({
    nota: i,
    count: respondidas.filter(r => r.nota_nps === i).length,
  }))

  // By doctor
  const byDoc = {}
  pesquisas.forEach(p => {
    const key = p.medico_id || 'desconhecido'
    const nome = p.medicos?.nome || 'Desconhecido'
    if (!byDoc[key]) byDoc[key] = { nome, enviado: 0, respondido: [], atend: [], estrut: [] }
    byDoc[key].enviado++
    if (p.respondido && p.nota_nps !== null) {
      byDoc[key].respondido.push(p.nota_nps)
      if (p.nota_atendimento) byDoc[key].atend.push(p.nota_atendimento)
      if (p.nota_estrutura) byDoc[key].estrut.push(p.nota_estrutura)
    }
  })
  const docRows = Object.values(byDoc).map(d => {
    const r = calcNPS(d.respondido.map(n => ({ nota_nps: n })))
    const mA = d.atend.length ? (d.atend.reduce((a, b) => a + b, 0) / d.atend.length).toFixed(1) : '—'
    const mE = d.estrut.length ? (d.estrut.reduce((a, b) => a + b, 0) / d.estrut.length).toFixed(1) : '—'
    return { nome: d.nome, enviado: d.enviado, respondido: d.respondido.length, nps: r?.nps ?? null, mA, mE }
  }).sort((a, b) => (b.nps ?? -999) - (a.nps ?? -999))

  // Recent comments
  const comentarios = respondidas.filter(r => r.comentario).slice(0, 10)

  const score = npsData?.nps ?? null
  const scoreColor = npsColor(score)

  return (
    <div>
      <PeriodSelector periodo={periodo} setPeriodo={setPeriodo} />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* NPS Score card */}
          <Card>
            <SectionTitle>Score NPS</SectionTitle>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: scoreColor }}>
                  {score !== null ? score : '—'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor, marginTop: 6 }}>
                  {npsZone(score)}
                </div>
                {npsData && (
                  <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>
                    {npsData.total} resposta{npsData.total !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {npsData && npsData.total > 0 ? (
                <div style={{ flex: 1, minWidth: 200 }}>
                  {/* Segment bar */}
                  <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: L.line }}>
                    {npsData.promotores > 0 && (
                      <div style={{ width: `${(npsData.promotores / npsData.total) * 100}%`, background: L.green, transition: 'width 0.5s' }} />
                    )}
                    {npsData.neutros > 0 && (
                      <div style={{ width: `${(npsData.neutros / npsData.total) * 100}%`, background: L.yellow, transition: 'width 0.5s' }} />
                    )}
                    {npsData.detratores > 0 && (
                      <div style={{ width: `${(npsData.detratores / npsData.total) * 100}%`, background: L.red, transition: 'width 0.5s' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Promotores (9-10)', count: npsData.promotores, color: L.green },
                      { label: 'Neutros (7-8)', count: npsData.neutros, color: L.yellow },
                      { label: 'Detratores (0-6)', count: npsData.detratores, color: L.red },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                        <span style={{ color: L.t2 }}>{item.label}:</span>
                        <span style={{ fontWeight: 700, color: item.color }}>{item.count}</span>
                        <span style={{ color: L.t4 }}>({Math.round((item.count / npsData.total) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: L.t4, fontSize: 13 }}>Nenhuma resposta no período.</div>
              )}
            </div>
          </Card>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Enviadas', value: totalEnviadas, color: L.t1 },
              { label: 'Respondidas', value: totalRespondidas, color: L.teal },
              { label: 'Taxa de Resposta', value: `${taxaResposta}%`, color: taxaResposta >= 50 ? L.green : L.yellow },
              { label: 'Média Atendimento', value: mediaAtend, color: L.blue },
              { label: 'Média Estrutura', value: mediaEstrut, color: L.purple },
            ].map(kpi => (
              <Card key={kpi.label} style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: L.t4, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>{kpi.label}</div>
              </Card>
            ))}
          </div>

          {/* Distribution chart */}
          <Card>
            <SectionTitle>Distribuição de Notas NPS</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distrib} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={L.line} />
                <XAxis dataKey="nota" tick={{ fontSize: 12, fill: L.t3 }} />
                <YAxis tick={{ fontSize: 12, fill: L.t3 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [v, 'Respostas']}
                  labelFormatter={(l) => `Nota ${l}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distrib.map((entry) => (
                    <Cell key={entry.nota} fill={npsBarColor(entry.nota)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* By doctor */}
          <Card>
            <SectionTitle>NPS por Médico</SectionTitle>
            {docRows.length === 0 ? (
              <div style={{ color: L.t4, fontSize: 13 }}>Nenhum dado disponível.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: L.surface }}>
                      {['Médico', 'Enviado', 'Respondido', 'NPS', 'Atendimento', 'Estrutura'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${L.line}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: L.t1 }}>{row.nome}</td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{row.enviado}</td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{row.respondido}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.nps !== null ? (
                            <span style={{ fontWeight: 700, color: npsColor(row.nps) }}>{row.nps}</span>
                          ) : <span style={{ color: L.t4 }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{row.mA}</td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{row.mE}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Recent comments */}
          <Card>
            <SectionTitle>Comentários Recentes</SectionTitle>
            {comentarios.length === 0 ? (
              <div style={{ color: L.t4, fontSize: 13 }}>Nenhum comentário no período.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comentarios.map((r, i) => {
                  const s = npsBadgeStyle(r.nota_nps)
                  return (
                    <div key={r.id || i} style={{ display: 'flex', gap: 12, padding: '12px', background: L.surface, borderRadius: 10, alignItems: 'flex-start' }}>
                      <NPSBadge nota={r.nota_nps} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{r.pacientes?.nome || '—'}</div>
                        <div style={{ fontSize: 13, color: L.t2, marginTop: 4 }}>{r.comentario}</div>
                      </div>
                      <div style={{ fontSize: 11, color: L.t4, whiteSpace: 'nowrap', marginTop: 2 }}>{fmtDate(r.respondido_em || r.criado_em)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Enviar Pesquisas ─────────────────────────────────────────────────

function ModalSendConfirm({ pesquisa, paciente, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = `https://clinic.app/pesquisa/${pesquisa.token}`
  const phone = stripPhone(paciente?.telefone || '')
  const nomePaciente = paciente?.nome || 'Paciente'
  const msg = `Olá ${nomePaciente}! Como foi sua consulta conosco? Avalie em 1 minuto: ${link} — Clínica`
  const waLink = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : null

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
      <style>{`@keyframes up { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ width: '100%', background: L.bg, borderRadius: '16px 16px 0 0', maxHeight: '92vh', overflowY: 'auto', padding: 24, animation: 'up 0.25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Enviar Pesquisa</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: L.surface, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>PACIENTE</div>
            <div style={{ fontWeight: 600, color: L.t1 }}>{nomePaciente}</div>
            {paciente?.telefone && <div style={{ fontSize: 13, color: L.t3, marginTop: 2 }}>{paciente.telefone}</div>}
          </div>

          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>LINK DA PESQUISA</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input readOnly value={link} style={{ ...inp, flex: 1, color: L.teal, fontSize: 12 }} />
              <button onClick={handleCopy} style={{
                padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: copied ? L.green : L.teal, color: L.white, border: 'none', whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}>{copied ? '✓ Copiado' : 'Copiar'}</button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>MENSAGEM WHATSAPP</div>
            <textarea readOnly value={msg} rows={3} style={{ ...inp, resize: 'none', fontSize: 12, lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', borderRadius: 9, background: '#25d366', color: L.white,
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>
                <span>📱</span> Abrir WhatsApp
              </a>
            ) : (
              <div style={{ flex: 1, padding: '11px 0', borderRadius: 9, background: L.surface, color: L.t4, textAlign: 'center', fontSize: 13 }}>
                Sem telefone cadastrado
              </div>
            )}
            <button onClick={onClose} style={{
              padding: '11px 20px', borderRadius: 9, border: `1px solid ${L.line}`, background: L.bg,
              color: L.t2, fontWeight: 500, fontSize: 14, cursor: 'pointer',
            }}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabEnviar({ clinicaId }) {
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [sending, setSending] = useState(new Set())
  const [sendingBulk, setSendingBulk] = useState(false)
  const [modalData, setModalData] = useState(null) // { pesquisa, paciente }

  // Manual form
  const [pacientes, setPacientes] = useState([])
  const [pacSearch, setPacSearch] = useState('')
  const [pacSel, setPacSel] = useState(null)
  const [showPacDrop, setShowPacDrop] = useState(false)
  const [manualConsultaId, setManualConsultaId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genLink, setGenLink] = useState(null)
  const [genCopied, setGenCopied] = useState(false)

  const loadConsultas = useCallback(async () => {
    setLoading(true)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Load consultas from last 7 days
    const { data: consultasData } = await supabase
      .from('consultas')
      .select('id, data_hora, paciente_id, medico_id, pacientes(nome, telefone), medicos(nome)')
      .eq('clinica_id', clinicaId)
      .gte('data_hora', sevenDaysAgo.toISOString())
      .order('data_hora', { ascending: false })

    if (!consultasData || consultasData.length === 0) {
      setConsultas([])
      setLoading(false)
      return
    }

    // Get existing pesquisas for these consultas
    const consultaIds = consultasData.map(c => c.id)
    const { data: pesquisasData } = await supabase
      .from('pesquisas_satisfacao')
      .select('consulta_id')
      .eq('clinica_id', clinicaId)
      .in('consulta_id', consultaIds)

    const withPesquisa = new Set((pesquisasData || []).map(p => p.consulta_id))
    setConsultas(consultasData.filter(c => !withPesquisa.has(c.id)))
    setLoading(false)
  }, [clinicaId])

  const loadPacientes = useCallback(async () => {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, telefone')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setPacientes(data || [])
  }, [clinicaId])

  useEffect(() => { loadConsultas(); loadPacientes() }, [loadConsultas, loadPacientes])

  async function sendPesquisa(consulta) {
    const token = generateToken()
    const { data: inserted, error } = await supabase
      .from('pesquisas_satisfacao')
      .insert({
        clinica_id: clinicaId,
        consulta_id: consulta.id,
        paciente_id: consulta.paciente_id,
        medico_id: consulta.medico_id,
        token,
        respondido: false,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { pesquisa: inserted, paciente: consulta.pacientes }
  }

  async function handleSendSingle(consulta) {
    setSending(prev => new Set([...prev, consulta.id]))
    try {
      const { pesquisa, paciente } = await sendPesquisa(consulta)
      setModalData({ pesquisa, paciente })
      setConsultas(prev => prev.filter(c => c.id !== consulta.id))
      setSelected(prev => { const n = new Set(prev); n.delete(consulta.id); return n })
    } catch (e) {
      alert('Erro ao enviar pesquisa: ' + e.message)
    }
    setSending(prev => { const n = new Set(prev); n.delete(consulta.id); return n })
  }

  async function handleSendBulk() {
    if (selected.size === 0) return
    setSendingBulk(true)
    const toSend = consultas.filter(c => selected.has(c.id))
    let firstModal = null
    for (const consulta of toSend) {
      try {
        const result = await sendPesquisa(consulta)
        if (!firstModal) firstModal = result
        setConsultas(prev => prev.filter(c => c.id !== consulta.id))
        setSelected(prev => { const n = new Set(prev); n.delete(consulta.id); return n })
      } catch (e) {
        // continue
      }
    }
    setSendingBulk(false)
    if (firstModal) setModalData(firstModal)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    if (selected.size === consultas.length) setSelected(new Set())
    else setSelected(new Set(consultas.map(c => c.id)))
  }

  const filteredPacientes = pacientes.filter(p =>
    p.nome.toLowerCase().includes(pacSearch.toLowerCase())
  ).slice(0, 8)

  async function handleGenerateLink() {
    if (!pacSel) return
    setGenerating(true)
    const token = generateToken()
    const { data: inserted, error } = await supabase
      .from('pesquisas_satisfacao')
      .insert({
        clinica_id: clinicaId,
        consulta_id: manualConsultaId || null,
        paciente_id: pacSel.id,
        token,
        respondido: false,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single()
    setGenerating(false)
    if (error) { alert('Erro: ' + error.message); return }
    const link = `https://clinic.app/pesquisa/${token}`
    setGenLink(link)
    navigator.clipboard.writeText(link).catch(() => {})
    setGenCopied(true)
    setTimeout(() => setGenCopied(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Consultas sem pesquisa */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <SectionTitle>Consultas sem Pesquisa (últimos 7 dias)</SectionTitle>
          {selected.size > 0 && (
            <button
              onClick={handleSendBulk}
              disabled={sendingBulk}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: L.teal, color: L.white, border: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {sendingBulk ? <Spinner size={16} /> : null}
              Enviar {selected.size} Selecionada{selected.size !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : consultas.length === 0 ? (
          <div style={{ color: L.t4, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            Todas as consultas recentes já possuem pesquisa enviada.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === consultas.length && consultas.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: L.teal }}
                    />
                  </th>
                  {['Data', 'Paciente', 'Médico', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consultas.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        style={{ cursor: 'pointer', accentColor: L.teal }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>{fmtDt(c.data_hora)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: L.t1 }}>{c.pacientes?.nome || '—'}</td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>{c.medicos?.nome || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => handleSendSingle(c)}
                        disabled={sending.has(c.id)}
                        style={{
                          padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}30`,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {sending.has(c.id) ? <Spinner size={14} /> : null}
                        Enviar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual send form */}
      <Card>
        <SectionTitle>Envio Manual</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
          <Field label="PACIENTE">
            <div style={{ position: 'relative' }}>
              <input
                style={inp}
                placeholder="Buscar paciente..."
                value={pacSel ? pacSel.nome : pacSearch}
                onChange={e => { setPacSearch(e.target.value); setPacSel(null); setShowPacDrop(true); setGenLink(null) }}
                onFocus={() => setShowPacDrop(true)}
              />
              {showPacDrop && !pacSel && filteredPacientes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8,
                  boxShadow: L.shadowMd, maxHeight: 220, overflowY: 'auto', marginTop: 2,
                }}>
                  {filteredPacientes.map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => { setPacSel(p); setPacSearch(p.nome); setShowPacDrop(false) }}
                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: L.t1 }}
                      onMouseEnter={e => e.currentTarget.style.background = L.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 500 }}>{p.nome}</div>
                      {p.telefone && <div style={{ fontSize: 11, color: L.t4 }}>{p.telefone}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="CONSULTA (OPCIONAL)">
            <input
              style={inp}
              placeholder="ID da consulta (opcional)"
              value={manualConsultaId}
              onChange={e => setManualConsultaId(e.target.value)}
            />
          </Field>

          <button
            onClick={handleGenerateLink}
            disabled={!pacSel || generating}
            style={{
              padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: pacSel ? L.teal : L.surface,
              color: pacSel ? L.white : L.t4,
              border: 'none', cursor: pacSel ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content',
            }}
          >
            {generating ? <Spinner size={16} /> : null}
            Gerar Link
          </button>

          {genLink && (
            <div style={{ background: L.greenBg, border: `1px solid ${L.greenBd}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>LINK GERADO</div>
              <div style={{ fontSize: 12, color: L.teal, wordBreak: 'break-all', marginBottom: 8 }}>{genLink}</div>
              <div style={{ fontSize: 12, color: L.green }}>{genCopied ? '✓ Copiado para a área de transferência!' : 'Link gerado com sucesso.'}</div>
            </div>
          )}
        </div>
      </Card>

      {modalData && (
        <ModalSendConfirm
          pesquisa={modalData.pesquisa}
          paciente={modalData.paciente}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}

// ─── Tab 3: Respostas ────────────────────────────────────────────────────────

function TabRespostas({ clinicaId }) {
  const [pesquisas, setPesquisas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('all') // 'all' | 'respondido' | 'nao_respondido'

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('pesquisas_satisfacao')
      .select('*, pacientes(nome), medicos(nome)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
      .limit(200)

    if (filtro === 'respondido') q = q.eq('respondido', true)
    else if (filtro === 'nao_respondido') q = q.eq('respondido', false)

    const { data } = await q
    setPesquisas(data || [])
    setLoading(false)
  }, [clinicaId, filtro])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Todas' },
          { id: 'respondido', label: 'Respondidas' },
          { id: 'nao_respondido', label: 'Não respondidas' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: filtro === f.id ? L.teal : L.bg,
            color: filtro === f.id ? L.white : L.t2,
            border: `1.5px solid ${filtro === f.id ? L.teal : L.line}`,
          }}>{f.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: L.t4, alignSelf: 'center' }}>
          {pesquisas.length} registro{pesquisas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : pesquisas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: L.t4, fontSize: 13 }}>
          Nenhuma pesquisa encontrada.
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['Data', 'Paciente', 'Médico', 'NPS', 'Atendimento', 'Estrutura', 'Comentário', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pesquisas.map((p, i) => (
                  <tr key={p.id || i} style={{ borderBottom: `1px solid ${L.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = L.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', color: L.t3, whiteSpace: 'nowrap' }}>{fmtDate(p.criado_em)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: L.t1, whiteSpace: 'nowrap' }}>{p.pacientes?.nome || '—'}</td>
                    <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>{p.medicos?.nome || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.respondido ? <NPSBadge nota={p.nota_nps} /> : <span style={{ color: L.t5 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.nota_atendimento ? <Stars value={p.nota_atendimento} /> : <span style={{ color: L.t5 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.nota_estrutura ? <Stars value={p.nota_estrutura} /> : <span style={{ color: L.t5 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                      {p.comentario ? (
                        <span title={p.comentario} style={{ color: L.t2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {p.comentario}
                        </span>
                      ) : <span style={{ color: L.t5 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.respondido ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: L.greenBg, color: L.green }}>
                          ✓ Respondida
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: L.surface, color: L.t4 }}>
                          Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PageNPS({ profile }) {
  const [tab, setTab] = useState('dashboard')
  const clinicaId = profile?.clinica_id

  const TABS = [
    { id: 'dashboard', label: 'Dashboard NPS' },
    { id: 'enviar', label: 'Enviar Pesquisas' },
    { id: 'respostas', label: 'Respostas' },
  ]

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.t1 }}>Pesquisas de Satisfação</div>
        <div style={{ fontSize: 13, color: L.t4, marginTop: 4 }}>NPS e avaliação de atendimento</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: `2px solid ${L.line}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none', color: tab === t.id ? L.teal : L.t3,
              borderBottom: `2px solid ${tab === t.id ? L.teal : 'transparent'}`,
              marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {tab === 'dashboard' && <TabDashboard clinicaId={clinicaId} />}
      {tab === 'enviar' && <TabEnviar clinicaId={clinicaId} />}
      {tab === 'respostas' && <TabRespostas clinicaId={clinicaId} />}
    </div>
  )
}
