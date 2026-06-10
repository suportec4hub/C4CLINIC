import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── keyframes injected once ─── */
const STYLE = `
@keyframes up { from { transform: translateY(60px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
`

/* ─── constants ─── */
const TIPOS = [
  { value: 'quase_falha',      label: 'Quase Falha',      color: L.yellow,  bg: L.yellowBg,  bd: L.yellowBd },
  { value: 'evento_adverso',   label: 'Evento Adverso',   color: L.orange,  bg: L.orangeBg,  bd: L.orangeBd },
  { value: 'evento_sentinela', label: 'Evento Sentinela', color: L.red,     bg: L.redBg,     bd: L.redBd },
  { value: 'reclamacao',       label: 'Reclamação',       color: L.purple,  bg: L.purpleBg,  bd: L.purpleBd },
  { value: 'sugestao',         label: 'Sugestão',         color: L.blue,    bg: L.blueBg,    bd: L.blueBd },
  { value: 'elogio',           label: 'Elogio',           color: L.green,   bg: L.greenBg,   bd: L.greenBd },
]

const CATEGORIAS = [
  { value: 'seguranca_paciente', label: 'Segurança do Paciente' },
  { value: 'medicacao',          label: 'Medicação' },
  { value: 'queda',              label: 'Queda' },
  { value: 'infeccao',           label: 'Infecção' },
  { value: 'equipamento',        label: 'Equipamento' },
  { value: 'atendimento',        label: 'Atendimento' },
  { value: 'administrativo',     label: 'Administrativo' },
  { value: 'outro',              label: 'Outro' },
]

const GRAVIDADES = [
  { value: 'sem_dano',      label: 'Sem Dano',      color: L.green,  num: 1 },
  { value: 'dano_leve',     label: 'Dano Leve',     color: L.yellow, num: 2 },
  { value: 'dano_moderado', label: 'Dano Moderado', color: L.orange, num: 3 },
  { value: 'dano_grave',    label: 'Dano Grave',    color: L.red,    num: 4 },
  { value: 'obito',         label: 'Óbito',         color: '#7f1d1d', num: 5 },
]

const STATUSES = [
  { value: 'aberto',           label: 'Aberto',           color: L.blue,   bg: L.blueBg   },
  { value: 'em_investigacao',  label: 'Em Investigação',  color: L.orange, bg: L.orangeBg },
  { value: 'concluido',        label: 'Concluído',        color: L.green,  bg: L.greenBg  },
  { value: 'arquivado',        label: 'Arquivado',        color: L.t4,     bg: L.surface  },
]

function tipoMeta(v)     { return TIPOS.find(t => t.value === v) || TIPOS[0] }
function gravidadeMeta(v){ return GRAVIDADES.find(g => g.value === v) || GRAVIDADES[0] }
function statusMeta(v)   { return STATUSES.find(s => s.value === v) || STATUSES[0] }
function categoriaMeta(v){ return CATEGORIAS.find(c => c.value === v) }

/* ─── helpers ─── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ color, bg, bd, label, pulse }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      color, background: bg || color + '18', border: `1px solid ${bd || color + '40'}`,
      animation: pulse ? 'pulse 1.4s ease infinite' : undefined,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

/* ─── bottom-sheet modal ─── */
function Sheet({ title, onClose, children, wide }) {
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
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 760 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── main page ─── */
export default function PageOuvidoria({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [incidentes, setIncidentes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)

  /* modals */
  const [sheetRegistrar, setSheetRegistrar] = useState(false)
  const [sheetConcluir, setSheetConcluir]   = useState(null) // incidente obj
  const [sheetDetalhe, setSheetDetalhe]     = useState(null)
  const [sheetResponder, setSheetResponder] = useState(null)

  /* risk matrix filter */
  const [matrizCell, setMatrizCell] = useState(null) // {prob, grav}

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [{ data: inc }, { data: pac }] = await Promise.all([
      supabase.from('incidentes').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id,nome').eq('clinica_id', clinicaId),
    ])
    setIncidentes(inc || [])
    setPacientes(pac || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── sentinelas abertas ── */
  const sentinelasAbertas = incidentes.filter(i => i.tipo === 'evento_sentinela' && i.status === 'aberto')

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{STYLE}</style>

      {/* ── header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Ouvidoria & Gestão de Riscos</h1>
            <p style={{ fontSize: 13, color: L.t4, margin: '4px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
              Incidentes · Ouvidoria · Análise de Tendências
            </p>
          </div>
          <button
            onClick={() => setSheetRegistrar(true)}
            style={{
              background: L.teal, color: L.white, border: 'none', borderRadius: 8,
              padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            + Registrar Incidente
          </button>
        </div>
      </div>

      {/* ── sentinela alert ── */}
      {sentinelasAbertas.length > 0 && (
        <div style={{
          background: L.redBg, border: `2px solid ${L.red}`, borderRadius: 10,
          padding: '12px 18px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {sentinelasAbertas.map(s => (
            <div key={s.id} style={{ fontSize: 13, fontWeight: 700, color: L.red }}>
              ⚠ EVENTO SENTINELA ABERTO: {s.titulo}
            </div>
          ))}
        </div>
      )}

      {/* ── tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {['Painel de Gestão de Riscos', 'Ouvidoria', 'Análise & Tendências'].map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
            color: tab === i ? L.teal : L.t3,
            background: 'none', border: 'none',
            borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
            cursor: 'pointer', transition: 'all .15s',
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {tab === 0 && <TabPainel incidentes={incidentes} pacientes={pacientes} matrizCell={matrizCell} setMatrizCell={setMatrizCell} onIniciar={iniciarInvestigacao} onConcluir={i => setSheetConcluir(i)} onDetalhe={i => setSheetDetalhe(i)} fetchAll={fetchAll} />}
          {tab === 1 && <TabOuvidoria incidentes={incidentes} onResponder={i => setSheetResponder(i)} fetchAll={fetchAll} />}
          {tab === 2 && <TabAnalise incidentes={incidentes} />}
        </>
      )}

      {/* ── sheets ── */}
      {sheetRegistrar && <SheetRegistrar clinicaId={clinicaId} pacientes={pacientes} onClose={() => setSheetRegistrar(false)} onSaved={() => { setSheetRegistrar(false); fetchAll() }} />}
      {sheetConcluir  && <SheetConcluir incidente={sheetConcluir} onClose={() => setSheetConcluir(null)} onSaved={() => { setSheetConcluir(null); fetchAll() }} />}
      {sheetDetalhe   && <SheetDetalhe  incidente={sheetDetalhe}  pacientes={pacientes} onClose={() => setSheetDetalhe(null)} />}
      {sheetResponder && <SheetResponder incidente={sheetResponder} onClose={() => setSheetResponder(null)} onSaved={() => { setSheetResponder(null); fetchAll() }} />}
    </div>
  )

  async function iniciarInvestigacao(id) {
    await supabase.from('incidentes').update({ status: 'em_investigacao' }).eq('id', id)
    fetchAll()
  }
}

/* ═══════════════════════════════════════════════════
   TAB 0 — Painel de Gestão de Riscos
═══════════════════════════════════════════════════ */
function TabPainel({ incidentes, pacientes, matrizCell, setMatrizCell, onIniciar, onConcluir, onDetalhe }) {
  const now = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)

  const abertos         = incidentes.filter(i => i.status === 'aberto').length
  const emInvestigacao  = incidentes.filter(i => i.status === 'em_investigacao').length
  const sentinelas      = incidentes.filter(i => i.tipo === 'evento_sentinela').length
  const elogiosMes      = incidentes.filter(i => i.tipo === 'elogio' && new Date(i.criado_em) >= mesInicio).length

  /* gravity → num mapping for matrix */
  function gravNum(g) { return GRAVIDADES.find(x => x.value === g)?.num || 1 }
  /* probability proxy: tipo mapping */
  function probNum(tipo) {
    const m = { quase_falha: 4, evento_adverso: 3, evento_sentinela: 5, reclamacao: 2, sugestao: 1, elogio: 1 }
    return m[tipo] || 1
  }

  /* build 5x5 matrix counts */
  const matrix = {}
  incidentes.forEach(i => {
    const p = probNum(i.tipo)
    const g = gravNum(i.gravidade)
    const k = `${p}-${g}`
    matrix[k] = (matrix[k] || 0) + 1
  })

  function cellColor(p, g) {
    const score = p * g
    if (score <= 4)  return '#dcfce7'
    if (score <= 9)  return '#fef9c3'
    if (score <= 16) return '#fed7aa'
    return '#fecaca'
  }

  /* filtered incidents */
  let filtered = incidentes
  if (matrizCell) {
    filtered = incidentes.filter(i => probNum(i.tipo) === matrizCell.p && gravNum(i.gravidade) === matrizCell.g)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Abertos',          value: abertos,        color: L.blue,   bg: L.blueBg   },
          { label: 'Em Investigação',  value: emInvestigacao, color: L.orange, bg: L.orangeBg },
          { label: 'Eventos Sentinela',value: sentinelas,     color: L.red,    bg: L.redBg    },
          { label: 'Elogios (mês)',     value: elogiosMes,    color: L.green,  bg: L.greenBg  },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}30`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: L.t4, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Matriz de Risco */}
      <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 4 }}>Matriz de Risco</div>
        <div style={{ fontSize: 11, color: L.t4, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
          Probabilidade × Gravidade — clique para filtrar
          {matrizCell && <button onClick={() => setMatrizCell(null)} style={{ marginLeft: 10, fontSize: 11, color: L.teal, background: 'none', border: 'none', cursor: 'pointer' }}>Limpar filtro</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* Y label */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
            {[5,4,3,2,1].map(p => (
              <div key={p} style={{ width: 28, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>P{p}</div>
            ))}
            <div style={{ width: 28, height: 20 }} />
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 44px)', gap: 3 }}>
              {[5,4,3,2,1].map(p =>
                [1,2,3,4,5].map(g => {
                  const k = `${p}-${g}`
                  const cnt = matrix[k] || 0
                  const active = matrizCell && matrizCell.p === p && matrizCell.g === g
                  return (
                    <div key={k} onClick={() => setMatrizCell(cnt > 0 ? (active ? null : {p,g}) : null)}
                      style={{
                        width: 44, height: 44, borderRadius: 6, background: cellColor(p, g),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: cnt > 0 ? '#1a1a1a' : '#9ca3af',
                        cursor: cnt > 0 ? 'pointer' : 'default',
                        border: active ? '2px solid #0d6e6e' : '2px solid transparent',
                        transition: 'border .15s',
                      }}>
                      {cnt > 0 ? cnt : ''}
                    </div>
                  )
                })
              )}
            </div>
            {/* X axis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 44px)', gap: 3, marginTop: 4 }}>
              {[1,2,3,4,5].map(g => (
                <div key={g} style={{ textAlign: 'center', fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>G{g}</div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#fecaca', display: 'inline-block', borderRadius: 2 }} />Alto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#fed7aa', display: 'inline-block', borderRadius: 2 }} />Médio</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#fef9c3', display: 'inline-block', borderRadius: 2 }} />Baixo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#dcfce7', display: 'inline-block', borderRadius: 2 }} />Mínimo</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${L.line}`, fontSize: 14, fontWeight: 700, color: L.t1 }}>
          Incidentes {matrizCell ? `— Filtrado (P${matrizCell.p}, G${matrizCell.g})` : ''}
          <span style={{ fontSize: 12, fontWeight: 400, color: L.t4, marginLeft: 8 }}>{filtered.length} registros</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: L.bg }}>
                {['Título','Tipo','Categoria','Local','Data','Gravidade','Status','Notificador','Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, color: L.t4, fontWeight: 600, textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', borderBottom: `1px solid ${L.line}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: L.t4, fontSize: 13 }}>Nenhum incidente registrado</td></tr>
              ) : filtered.map(inc => {
                const tm = tipoMeta(inc.tipo)
                const gm = gravidadeMeta(inc.gravidade)
                const sm = statusMeta(inc.status)
                const isSentinela = inc.tipo === 'evento_sentinela'
                return (
                  <tr key={inc.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: L.t1, maxWidth: 180 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{inc.titulo}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge color={tm.color} bg={tm.bg} bd={tm.bd} label={tm.label} pulse={isSentinela} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: L.t3 }}>
                      {categoriaMeta(inc.categoria)?.label || inc.categoria || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: L.t3, whiteSpace: 'nowrap' }}>{inc.local || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: L.t3, whiteSpace: 'nowrap' }}>
                      {inc.data_ocorrencia ? new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: gm.color }}>{gm.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge color={sm.color} bg={sm.bg} label={sm.label} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: L.t3 }}>
                      {inc.anonimo ? <span style={{ fontStyle: 'italic', color: L.t4 }}>Anônimo</span> : (inc.notificador || '—')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {inc.status === 'aberto' && (
                          <button onClick={() => onIniciar(inc.id)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${L.orange}`, color: L.orange, background: L.orangeBg, cursor: 'pointer' }}>
                            Investigar
                          </button>
                        )}
                        {(inc.status === 'aberto' || inc.status === 'em_investigacao') && (
                          <button onClick={() => onConcluir(inc)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${L.green}`, color: L.green, background: L.greenBg, cursor: 'pointer' }}>
                            Concluir
                          </button>
                        )}
                        <button onClick={() => onDetalhe(inc)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${L.line}`, color: L.t3, background: 'none', cursor: 'pointer' }}>
                          Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   TAB 1 — Ouvidoria
═══════════════════════════════════════════════════ */
function TabOuvidoria({ incidentes, onResponder }) {
  const ouvidoria = incidentes.filter(i => ['reclamacao','sugestao','elogio'].includes(i.tipo))
  const [filtroTipo, setFiltroTipo] = useState('')

  const displayed = filtroTipo ? ouvidoria.filter(i => i.tipo === filtroTipo) : ouvidoria

  const reclamacoes = ouvidoria.filter(i => i.tipo === 'reclamacao')
  const resolvidas  = reclamacoes.filter(i => i.status === 'concluido' || i.status === 'arquivado')
  const elogios     = ouvidoria.filter(i => i.tipo === 'elogio')
  const ratio       = reclamacoes.length ? (elogios.length / reclamacoes.length).toFixed(2) : '—'

  /* tempo médio de resposta (dias entre criado_em e data_conclusao) */
  const tempoMedio = (() => {
    const tempos = resolvidas.filter(i => i.data_conclusao).map(i => {
      const d1 = new Date(i.criado_em), d2 = new Date(i.data_conclusao)
      return (d2 - d1) / (1000 * 60 * 60 * 24)
    })
    if (!tempos.length) return '—'
    return (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) + 'd'
  })()

  function cardBorder(tipo) {
    if (tipo === 'reclamacao') return L.red
    if (tipo === 'sugestao')   return L.blue
    return L.green
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Reclamações',        value: reclamacoes.length, color: L.red    },
          { label: 'Tempo Médio Resp.',   value: tempoMedio,        color: L.orange  },
          { label: '% Resolvidas',        value: reclamacoes.length ? Math.round(resolvidas.length / reclamacoes.length * 100) + '%' : '—', color: L.green },
          { label: 'Elogios/Reclamações', value: ratio,             color: L.teal   },
        ].map(s => (
          <div key={s.label} style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: L.t4, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['', 'Todos'], ['reclamacao', 'Reclamações'], ['sugestao', 'Sugestões'], ['elogio', 'Elogios']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroTipo(v)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filtroTipo === v ? L.teal : 'none',
            color: filtroTipo === v ? L.white : L.t3,
            border: `1.5px solid ${filtroTipo === v ? L.teal : L.line}`,
          }}>{l}</button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayed.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: L.t4, fontSize: 13 }}>Nenhum registro encontrado</div>
        )}
        {displayed.map(inc => {
          const tm = tipoMeta(inc.tipo)
          const sm = statusMeta(inc.status)
          const border = cardBorder(inc.tipo)
          return (
            <div key={inc.id} style={{
              background: L.surface, border: `1px solid ${L.line}`,
              borderLeft: `4px solid ${border}`, borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {inc.tipo === 'elogio' && <span style={{ color: L.yellow, fontSize: 16 }}>★</span>}
                    <Badge color={tm.color} bg={tm.bg} bd={tm.bd} label={tm.label} />
                    <Badge color={sm.color} bg={sm.bg} label={sm.label} />
                    <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {inc.data_ocorrencia ? new Date(inc.data_ocorrencia).toLocaleDateString('pt-BR') : new Date(inc.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 6 }}>{inc.titulo}</div>
                  <div style={{ fontSize: 13, color: L.t3, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {inc.descricao || '—'}
                  </div>
                  {inc.plano_acao && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: L.tealBg, borderRadius: 6, fontSize: 12, color: L.t2 }}>
                      <span style={{ fontWeight: 600, color: L.teal }}>Resposta: </span>{inc.plano_acao}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {inc.tipo !== 'elogio' && (
                    <button onClick={() => onResponder(inc)} style={{
                      padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                      background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                    }}>Responder</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   TAB 2 — Análise & Tendências
═══════════════════════════════════════════════════ */
function TabAnalise({ incidentes }) {
  /* last 6 months */
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push({ label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() })
  }

  function incMonth(inc, year, month) {
    const d = new Date(inc.criado_em)
    return d.getFullYear() === year && d.getMonth() === month
  }

  /* by tipo per month */
  const tiposChart = TIPOS.slice(0, 4) // quase_falha, adverso, sentinela, reclamacao
  const barData = months.map(m => ({
    label: m.label,
    counts: tiposChart.map(t => incidentes.filter(i => i.tipo === t.value && incMonth(i, m.year, m.month)).length),
  }))
  const barMax = Math.max(1, ...barData.flatMap(d => d.counts))

  /* by categoria — donut */
  const catCounts = CATEGORIAS.map(c => ({
    label: c.label,
    value: incidentes.filter(i => i.categoria === c.value).length,
    color: ['#0d6e6e','#2563eb','#ea580c','#7c3aed','#16a34a','#ca8a04','#6b7280','#dc2626'][CATEGORIAS.indexOf(c)],
  })).filter(c => c.value > 0)
  const catTotal = catCounts.reduce((s, c) => s + c.value, 0) || 1

  /* top 5 locations */
  const locMap = {}
  incidentes.forEach(i => { if (i.local) locMap[i.local] = (locMap[i.local] || 0) + 1 })
  const topLocs = Object.entries(locMap).sort((a,b) => b[1]-a[1]).slice(0,5)
  const locMax = topLocs[0]?.[1] || 1

  /* donut gradient */
  let cumDeg = 0
  const conicParts = catCounts.map(c => {
    const deg = (c.value / catTotal) * 360
    const part = `${c.color} ${cumDeg}deg ${cumDeg + deg}deg`
    cumDeg += deg
    return part
  })
  const conicGrad = `conic-gradient(${conicParts.join(', ')})`

  /* CSV export */
  function exportCSV() {
    const headers = ['id','tipo','categoria','titulo','local','data_ocorrencia','gravidade','status','notificador','criado_em']
    const rows = incidentes.map(i => headers.map(h => JSON.stringify(i[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `ouvidoria_relatorio_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={exportCSV} style={{
          padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7,
          background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
        }}>Exportar Relatório CSV</button>
      </div>

      {/* Chart 1 — incidentes por tipo por mês */}
      <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 4 }}>Incidentes por Tipo — Últimos 6 meses</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {tiposChart.map(t => (
            <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: L.t3 }}>
              <span style={{ width: 10, height: 10, background: t.color, borderRadius: 2, display: 'inline-block' }} />
              {t.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 8 }}>
          {barData.map((m, mi) => (
            <div key={mi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 70 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                {m.counts.map((cnt, ci) => (
                  <div key={ci} title={`${tiposChart[ci].label}: ${cnt}`} style={{
                    width: 12, borderRadius: '3px 3px 0 0',
                    height: cnt > 0 ? Math.max(4, (cnt / barMax) * 100) + 'px' : '4px',
                    background: cnt > 0 ? tiposChart[ci].color : L.line,
                    transition: 'height .3s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Chart 2 — Donut por categoria */}
        <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 16 }}>Por Categoria</div>
          {catTotal === 0 ? (
            <div style={{ fontSize: 13, color: L.t4 }}>Sem dados</div>
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 120, height: 120, borderRadius: '50%', background: conicGrad, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: L.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: L.t1 }}>{catTotal}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {catCounts.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: L.t2 }}>
                    <span style={{ width: 10, height: 10, background: c.color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                    {c.label} <span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>({c.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 3 — Top 5 locais */}
        <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 16 }}>Top 5 Locais com Mais Incidentes</div>
          {topLocs.length === 0 ? (
            <div style={{ fontSize: 13, color: L.t4 }}>Sem dados</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topLocs.map(([local, cnt]) => (
                <div key={local}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: L.t2, marginBottom: 4 }}>
                    <span>{local}</span>
                    <span style={{ fontWeight: 700, color: L.t1, fontFamily: "'JetBrains Mono', monospace" }}>{cnt}</span>
                  </div>
                  <div style={{ height: 8, background: L.line, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(cnt / locMax) * 100}%`, background: L.teal, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   SHEET — Registrar Incidente
═══════════════════════════════════════════════════ */
function SheetRegistrar({ clinicaId, pacientes, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: 'quase_falha', categoria: 'seguranca_paciente', titulo: '',
    descricao: '', local: '', data_ocorrencia: '', gravidade: 'sem_dano',
    anonimo: false, notificador: '', paciente_id: '', medidas_imediatas: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.titulo.trim()) { setErr('Título é obrigatório'); return }
    setSaving(true)
    setErr('')
    const payload = {
      clinica_id: clinicaId,
      tipo: form.tipo, categoria: form.categoria, titulo: form.titulo.trim(),
      descricao: form.descricao, local: form.local,
      data_ocorrencia: form.data_ocorrencia || null,
      gravidade: form.gravidade, status: 'aberto',
      anonimo: form.anonimo, notificador: form.anonimo ? null : form.notificador,
      paciente_id: form.paciente_id || null,
      medidas_imediatas: form.medidas_imediatas,
    }
    const { error } = await supabase.from('incidentes').insert(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Sheet title="Registrar Incidente" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Anonimo toggle — prominent */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: form.anonimo ? L.orangeBg : L.surface,
          border: `1.5px solid ${form.anonimo ? L.orange : L.line}`, borderRadius: 10, cursor: 'pointer',
        }} onClick={() => set('anonimo', !form.anonimo)}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: L.t1 }}>Relato Anônimo</div>
            <div style={{ fontSize: 11, color: L.t4 }}>Seu nome não será associado ao registro</div>
          </div>
          <div style={{
            width: 40, height: 22, borderRadius: 99, background: form.anonimo ? L.orange : L.line,
            position: 'relative', transition: 'background .2s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: form.anonimo ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%', background: L.white, transition: 'left .2s',
            }} />
          </div>
        </div>

        {!form.anonimo && (
          <Field label="NOTIFICADOR">
            <input style={inp} value={form.notificador} onChange={e => set('notificador', e.target.value)}
              onFocus={focus} onBlur={blur} placeholder="Nome do notificador" />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="TIPO">
            <select style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)} onFocus={focus} onBlur={blur}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="CATEGORIA">
            <select style={inp} value={form.categoria} onChange={e => set('categoria', e.target.value)} onFocus={focus} onBlur={blur}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="TÍTULO *">
          <input style={inp} value={form.titulo} onChange={e => set('titulo', e.target.value)}
            onFocus={focus} onBlur={blur} placeholder="Descreva brevemente o incidente" />
        </Field>

        <Field label="DESCRIÇÃO">
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }}
            value={form.descricao} onChange={e => set('descricao', e.target.value)}
            onFocus={focus} onBlur={blur} placeholder="Detalhes do ocorrido" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="LOCAL">
            <input style={inp} value={form.local} onChange={e => set('local', e.target.value)}
              onFocus={focus} onBlur={blur} placeholder="Ex: UTI, Sala 3..." />
          </Field>
          <Field label="DATA DA OCORRÊNCIA">
            <input type="datetime-local" style={inp} value={form.data_ocorrencia}
              onChange={e => set('data_ocorrencia', e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="GRAVIDADE">
            <select style={inp} value={form.gravidade} onChange={e => set('gravidade', e.target.value)} onFocus={focus} onBlur={blur}>
              {GRAVIDADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="PACIENTE (opcional)">
            <select style={inp} value={form.paciente_id} onChange={e => set('paciente_id', e.target.value)} onFocus={focus} onBlur={blur}>
              <option value="">Nenhum</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
        </div>

        <Field label="MEDIDAS IMEDIATAS">
          <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }}
            value={form.medidas_imediatas} onChange={e => set('medidas_imediatas', e.target.value)}
            onFocus={focus} onBlur={blur} placeholder="Ações tomadas imediatamente" />
        </Field>

        {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding: '8px 12px', borderRadius: 6 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: L.teal, color: L.white, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Registrar Incidente'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

/* ═══════════════════════════════════════════════════
   SHEET — Concluir Investigação
═══════════════════════════════════════════════════ */
function SheetConcluir({ incidente, onClose, onSaved }) {
  const [causa, setCausa] = useState(incidente.causa_raiz || '')
  const [plano, setPlano] = useState(incidente.plano_acao || '')
  const [responsavel, setResponsavel] = useState(incidente.responsavel || '')
  const [dataConclusao, setDataConclusao] = useState(incidente.data_conclusao || new Date().toISOString().slice(0,10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!causa.trim()) { setErr('Causa raiz é obrigatória'); return }
    if (!plano.trim()) { setErr('Plano de ação é obrigatório'); return }
    setSaving(true)
    const { error } = await supabase.from('incidentes').update({
      causa_raiz: causa, plano_acao: plano, responsavel,
      data_conclusao: dataConclusao || null, status: 'concluido',
    }).eq('id', incidente.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Sheet title="Concluir Investigação" onClose={onClose}>
      <div style={{ marginBottom: 16, padding: '10px 14px', background: L.surface, borderRadius: 8, fontSize: 13, color: L.t2 }}>
        <span style={{ fontWeight: 600, color: L.t1 }}>{incidente.titulo}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="CAUSA RAIZ *">
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }}
            value={causa} onChange={e => setCausa(e.target.value)}
            onFocus={focus} onBlur={blur} placeholder="Descreva a causa raiz identificada" />
        </Field>
        <Field label="PLANO DE AÇÃO *">
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }}
            value={plano} onChange={e => setPlano(e.target.value)}
            onFocus={focus} onBlur={blur} placeholder="Ações corretivas e preventivas" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="RESPONSÁVEL">
            <input style={inp} value={responsavel} onChange={e => setResponsavel(e.target.value)}
              onFocus={focus} onBlur={blur} placeholder="Nome do responsável" />
          </Field>
          <Field label="DATA DE CONCLUSÃO">
            <input type="date" style={inp} value={dataConclusao}
              onChange={e => setDataConclusao(e.target.value)} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
        {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding: '8px 12px', borderRadius: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: L.teal, color: L.white, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Concluir Investigação'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

/* ═══════════════════════════════════════════════════
   SHEET — Ver Detalhes
═══════════════════════════════════════════════════ */
function SheetDetalhe({ incidente: inc, pacientes, onClose }) {
  const pac = pacientes.find(p => p.id === inc.paciente_id)
  const tm = tipoMeta(inc.tipo)
  const gm = gravidadeMeta(inc.gravidade)
  const sm = statusMeta(inc.status)
  const cm = categoriaMeta(inc.categoria)

  function Row({ label, value }) {
    if (!value) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${L.lineSoft}` }}>
        <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", paddingTop: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: L.t1, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value}</div>
      </div>
    )
  }

  return (
    <Sheet title="Detalhes do Incidente" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <Badge color={tm.color} bg={tm.bg} bd={tm.bd} label={tm.label} />
          <Badge color={sm.color} bg={sm.bg} label={sm.label} />
          <span style={{ fontSize: 13, fontWeight: 700, color: gm.color }}>{gm.label}</span>
        </div>
        <Row label="TÍTULO" value={inc.titulo} />
        <Row label="CATEGORIA" value={cm?.label} />
        <Row label="LOCAL" value={inc.local} />
        <Row label="DATA OCORRÊNCIA" value={inc.data_ocorrencia ? new Date(inc.data_ocorrencia).toLocaleString('pt-BR') : null} />
        <Row label="NOTIFICADOR" value={inc.anonimo ? 'Anônimo' : inc.notificador} />
        <Row label="PACIENTE" value={pac?.nome} />
        <Row label="DESCRIÇÃO" value={inc.descricao} />
        <Row label="MEDIDAS IMEDIATAS" value={inc.medidas_imediatas} />
        <Row label="CAUSA RAIZ" value={inc.causa_raiz} />
        <Row label="PLANO DE AÇÃO" value={inc.plano_acao} />
        <Row label="RESPONSÁVEL" value={inc.responsavel} />
        <Row label="DATA CONCLUSÃO" value={inc.data_conclusao} />
        <Row label="CRIADO EM" value={new Date(inc.criado_em).toLocaleString('pt-BR')} />
        <button onClick={onClose} style={{ marginTop: 8, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer' }}>
          Fechar
        </button>
      </div>
    </Sheet>
  )
}

/* ═══════════════════════════════════════════════════
   SHEET — Responder (Ouvidoria)
═══════════════════════════════════════════════════ */
function SheetResponder({ incidente, onClose, onSaved }) {
  const [resposta, setResposta] = useState(incidente.plano_acao || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const tm = tipoMeta(incidente.tipo)

  async function save() {
    if (!resposta.trim()) { setErr('Resposta é obrigatória'); return }
    setSaving(true)
    const { error } = await supabase.from('incidentes').update({
      plano_acao: resposta.trim(),
      status: 'concluido',
      data_conclusao: new Date().toISOString().slice(0, 10),
    }).eq('id', incidente.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Sheet title="Responder" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '12px 16px', background: L.surface, borderRadius: 8, border: `1px solid ${L.line}` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <Badge color={tm.color} bg={tm.bg} bd={tm.bd} label={tm.label} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: L.t1 }}>{incidente.titulo}</div>
          <div style={{ fontSize: 13, color: L.t3, marginTop: 4, lineHeight: 1.5 }}>{incidente.descricao}</div>
        </div>
        <Field label="RESPOSTA *">
          <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }}
            value={resposta} onChange={e => setResposta(e.target.value)}
            onFocus={focus} onBlur={blur}
            placeholder="Escreva sua resposta ao solicitante..." />
        </Field>
        {err && <div style={{ fontSize: 12, color: L.red, background: L.redBg, padding: '8px 12px', borderRadius: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: L.teal, color: L.white, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enviando...' : 'Enviar Resposta'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
