import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Utilities ───────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('pt-BR')
}

function initial(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysDiff(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d - now) / (1000 * 60 * 60 * 24))
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }
const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, borderRadius: 8,
  border: 'none', cursor: 'pointer', padding: '10px 20px', fontSize: 14,
}
const btnSecondary = {
  background: 'transparent', color: L.t2, fontWeight: 500, borderRadius: 8,
  border: `1.5px solid ${L.line}`, cursor: 'pointer', padding: '9px 18px', fontSize: 13,
}
const btnSmall = {
  background: 'transparent', color: L.t3, fontWeight: 500, borderRadius: 7,
  border: `1px solid ${L.line}`, cursor: 'pointer', padding: '6px 12px', fontSize: 12,
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Type colors ──────────────────────────────────────────────────────────────

const TIPO_MAP = {
  exame:       { label: 'Exame',        bg: L.blueBg,   color: L.blue,   bd: L.blueBd },
  medicamento: { label: 'Medicamento',  bg: L.purpleBg, color: L.purple, bd: L.purpleBd },
  consulta:    { label: 'Consulta',     bg: L.tealBg,   color: L.teal,   bd: L.line },
  orientacao:  { label: 'Orientação',   bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
  procedimento:{ label: 'Procedimento', bg: L.orangeBg, color: L.orange, bd: L.orangeBd },
}

function TipoBadge({ tipo }) {
  const t = TIPO_MAP[tipo] || { label: tipo, bg: L.surface, color: L.t3, bd: L.line }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
      background: t.bg, color: t.color, border: `1px solid ${t.bd}`,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
    }}>{t.label}</span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ativo:     { label: 'Ativo',     bg: L.tealBg,   color: L.teal },
    concluido: { label: 'Concluído', bg: L.greenBg,  color: L.green },
    suspenso:  { label: 'Suspenso',  bg: L.redBg,    color: L.red },
    pendente:  { label: 'Pendente',  bg: L.yellowBg, color: L.yellow },
  }
  const s = map[status] || { label: status, bg: L.surface, color: L.t3 }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
      background: s.bg, color: s.color,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{s.label}</span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }) {
  const c = color || (pct >= 80 ? L.green : pct >= 40 ? L.teal : L.yellow)
  return (
    <div style={{ height: 6, borderRadius: 99, background: L.line, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: c, transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ─── Overlay / bottom-sheet ───────────────────────────────────────────────────

function Overlay({ onClose, children, wide }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', zIndex: 1000,
      }}
    >
      <div style={{
        width: wide ? '860px' : '520px', maxWidth: '100vw',
        margin: wide ? '0 auto' : undefined,
        background: L.bg, borderRadius: '16px 16px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        paddingBottom: 32,
        marginLeft: wide ? 'auto' : undefined,
        marginRight: wide ? 'auto' : undefined,
        boxShadow: L.shadowLg,
      }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '20px 24px 16px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0, background: L.bg, zIndex: 1,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <button onClick={onClose} style={{ color: L.t3, fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>×</button>
    </div>
  )
}

// ─── Default templates ────────────────────────────────────────────────────────

const DEFAULT_PROTOCOLS = [
  {
    nome: 'Protocolo Hipertensão',
    especialidade: 'Cardiologia',
    descricao: 'Protocolo padrão para acompanhamento de pacientes hipertensos.',
    items: [
      { tipo: 'exame',        descricao: 'Hemograma completo',      obrigatorio: true,  prazo_dias: 30,  ordem: 1 },
      { tipo: 'exame',        descricao: 'Creatinina sérica',        obrigatorio: true,  prazo_dias: 30,  ordem: 2 },
      { tipo: 'exame',        descricao: 'Ureia',                    obrigatorio: true,  prazo_dias: 30,  ordem: 3 },
      { tipo: 'exame',        descricao: 'EAS (urina)',               obrigatorio: true,  prazo_dias: 30,  ordem: 4 },
      { tipo: 'exame',        descricao: 'ECG',                      obrigatorio: true,  prazo_dias: 60,  ordem: 5 },
      { tipo: 'exame',        descricao: 'Radiografia de tórax',     obrigatorio: false, prazo_dias: 90,  ordem: 6 },
      { tipo: 'exame',        descricao: 'Ecocardiograma',           obrigatorio: false, prazo_dias: 180, ordem: 7 },
      { tipo: 'orientacao',   descricao: 'Dieta hipossódica',        obrigatorio: true,  prazo_dias: null,ordem: 8 },
      { tipo: 'medicamento',  descricao: 'Anti-hipertensivo',        obrigatorio: true,  prazo_dias: null,ordem: 9 },
    ],
  },
  {
    nome: 'Protocolo Diabetes tipo 2',
    especialidade: 'Endocrinologia',
    descricao: 'Acompanhamento e controle metabólico para pacientes diabéticos tipo 2.',
    items: [
      { tipo: 'exame', descricao: 'Glicemia de jejum',         obrigatorio: true,  prazo_dias: 30,  ordem: 1 },
      { tipo: 'exame', descricao: 'Hemoglobina glicada (HbA1c)',obrigatorio: true,  prazo_dias: 90,  ordem: 2 },
      { tipo: 'exame', descricao: 'Perfil lipídico',           obrigatorio: true,  prazo_dias: 90,  ordem: 3 },
      { tipo: 'exame', descricao: 'Creatinina sérica',          obrigatorio: true,  prazo_dias: 90,  ordem: 4 },
      { tipo: 'exame', descricao: 'Microalbuminúria',           obrigatorio: true,  prazo_dias: 180, ordem: 5 },
      { tipo: 'exame', descricao: 'Fundo de olho',              obrigatorio: false, prazo_dias: 365, ordem: 6 },
    ],
  },
  {
    nome: 'Protocolo Pré-Natal',
    especialidade: 'Obstetrícia',
    descricao: 'Acompanhamento gestacional completo do 1º ao 3º trimestre.',
    items: [
      { tipo: 'consulta', descricao: 'Consulta 1º trimestre',          obrigatorio: true,  prazo_dias: 30,  ordem: 1 },
      { tipo: 'consulta', descricao: 'Consulta 2º trimestre',          obrigatorio: true,  prazo_dias: 90,  ordem: 2 },
      { tipo: 'consulta', descricao: 'Consulta 3º trimestre',          obrigatorio: true,  prazo_dias: 180, ordem: 3 },
      { tipo: 'exame',    descricao: 'Tipagem sanguínea',               obrigatorio: true,  prazo_dias: 15,  ordem: 4 },
      { tipo: 'exame',    descricao: 'VDRL',                           obrigatorio: true,  prazo_dias: 15,  ordem: 5 },
      { tipo: 'exame',    descricao: 'HIV',                            obrigatorio: true,  prazo_dias: 15,  ordem: 6 },
      { tipo: 'exame',    descricao: 'Hepatite B (HBsAg)',             obrigatorio: true,  prazo_dias: 15,  ordem: 7 },
      { tipo: 'exame',    descricao: 'Toxoplasmose IgG/IgM',           obrigatorio: true,  prazo_dias: 15,  ordem: 8 },
      { tipo: 'exame',    descricao: 'Glicemia de jejum',              obrigatorio: true,  prazo_dias: 30,  ordem: 9 },
      { tipo: 'exame',    descricao: 'Urina tipo I (EAS)',              obrigatorio: true,  prazo_dias: 30,  ordem: 10 },
    ],
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function PageProtocolos({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)

  // Tab 1: templates
  const [protocolos, setProtocolos] = useState([])
  const [loadingProts, setLoadingProts] = useState(true)
  const [showProtoModal, setShowProtoModal] = useState(false)
  const [editProto, setEditProto] = useState(null)
  const [applyTarget, setApplyTarget] = useState(null) // protocol to apply to patient

  // Tab 2: patient protocols
  const [pacProts, setPacProts] = useState([])
  const [loadingPacProts, setLoadingPacProts] = useState(true)
  const [searchPac, setSearchPac] = useState('')
  const [filterProto, setFilterProto] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [checklistTarget, setChecklistTarget] = useState(null)

  // ── Load protocols ──────────────────────────────────────────────────────────

  const loadProtocolos = useCallback(async () => {
    if (!clinicaId) return
    setLoadingProts(true)
    const { data } = await supabase
      .from('protocolos_clinicos')
      .select('*, items_protocolo(*)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setProtocolos(data || [])
    setLoadingProts(false)
  }, [clinicaId])

  // ── Load patient protocols ───────────────────────────────────────────────────

  const loadPacProts = useCallback(async () => {
    if (!clinicaId) return
    setLoadingPacProts(true)
    const { data } = await supabase
      .from('protocolo_paciente')
      .select(`
        *,
        pacientes(id, nome),
        protocolos_clinicos(id, nome, especialidade),
        protocolo_paciente_items(*, items_protocolo(tipo, descricao, obrigatorio, prazo_dias))
      `)
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setPacProts(data || [])
    setLoadingPacProts(false)
  }, [clinicaId])

  useEffect(() => { loadProtocolos() }, [loadProtocolos])
  useEffect(() => { loadPacProts() }, [loadPacProts])

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const kpiAtivos    = pacProts.filter(p => p.status === 'ativo').length
  const kpiConcluidos= pacProts.filter(p => p.status === 'concluido').length
  const kpiVencidos  = pacProts.reduce((acc, pp) => {
    const venc = (pp.protocolo_paciente_items || []).filter(it => {
      if (it.status !== 'pendente') return false
      const prazoDias = it.items_protocolo?.prazo_dias
      if (!prazoDias || !pp.data_inicio) return false
      const due = new Date(pp.data_inicio + 'T00:00:00')
      due.setDate(due.getDate() + prazoDias)
      return due < new Date()
    })
    return acc + venc.length
  }, 0)

  // ── Toggle ativo ─────────────────────────────────────────────────────────────

  const toggleAtivo = async (proto) => {
    await supabase.from('protocolos_clinicos').update({ ativo: !proto.ativo }).eq('id', proto.id)
    loadProtocolos()
  }

  // ── Create default protocols ─────────────────────────────────────────────────

  const criarPadroes = async () => {
    for (const tpl of DEFAULT_PROTOCOLS) {
      const { data: proto } = await supabase
        .from('protocolos_clinicos')
        .insert({ clinica_id: clinicaId, nome: tpl.nome, especialidade: tpl.especialidade, descricao: tpl.descricao, ativo: true })
        .select()
        .single()
      if (proto) {
        const items = tpl.items.map(it => ({ ...it, protocolo_id: proto.id }))
        await supabase.from('items_protocolo').insert(items)
      }
    }
    loadProtocolos()
  }

  // ── Filtered patient protocols ───────────────────────────────────────────────

  const filteredPacProts = pacProts.filter(pp => {
    const nomePac = pp.pacientes?.nome?.toLowerCase() || ''
    const nomeProto = pp.protocolos_clinicos?.nome?.toLowerCase() || ''
    const s = searchPac.toLowerCase()
    if (s && !nomePac.includes(s) && !nomeProto.includes(s)) return false
    if (filterProto && pp.protocolo_id !== filterProto) return false
    if (filterStatus && pp.status !== filterStatus) return false
    return true
  })

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .proto-card:hover { box-shadow: ${L.shadowMd} !important; border-color: ${L.tealLt} !important; }
        .pac-proto-card:hover { box-shadow: ${L.shadowMd} !important; }
        .item-row:hover { background: ${L.surface} !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Protocolos Clínicos</h1>
        <p style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>Gerencie protocolos e checklists clínicos para pacientes</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
        {['Protocolos (Templates)', 'Pacientes em Protocolo'].map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: tab === i ? 600 : 400,
              color: tab === i ? L.teal : L.t3, background: 'none', border: 'none',
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer', transition: 'color 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* ── Tab 1: Templates ────────────────────────────────────────────────── */}
      {tab === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: L.t3 }}>{protocolos.length} protocolo{protocolos.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {protocolos.length === 0 && !loadingProts && (
                <button onClick={criarPadroes} style={{ ...btnSecondary, borderColor: L.teal, color: L.teal }}>
                  ✦ Criar protocolos padrão
                </button>
              )}
              <button onClick={() => { setEditProto(null); setShowProtoModal(true) }} style={btnPrimary}>
                + Novo Protocolo
              </button>
            </div>
          </div>

          {loadingProts ? (
            <LoadingSpinner />
          ) : protocolos.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Nenhum protocolo cadastrado"
              desc="Crie um novo protocolo ou use os templates padrão."
            />
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {protocolos.map(proto => (
                <ProtoCard
                  key={proto.id}
                  proto={proto}
                  onEdit={() => { setEditProto(proto); setShowProtoModal(true) }}
                  onToggle={() => toggleAtivo(proto)}
                  onApply={() => setApplyTarget(proto)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Pacientes ────────────────────────────────────────────────── */}
      {tab === 1 && (
        <div>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Em protocolos ativos" value={kpiAtivos} color={L.teal} />
            <KpiCard label="Itens vencidos" value={kpiVencidos} color={L.red} />
            <KpiCard label="Concluídos" value={kpiConcluidos} color={L.green} />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              value={searchPac}
              onChange={e => setSearchPac(e.target.value)}
              placeholder="Buscar por paciente ou protocolo…"
              style={{ ...inp, flex: '1 1 200px', maxWidth: 320 }}
            />
            <select
              value={filterProto}
              onChange={e => setFilterProto(e.target.value)}
              style={{ ...inp, width: 'auto', flex: '1 1 160px' }}
            >
              <option value="">Todos os protocolos</option>
              {protocolos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inp, width: 'auto', flex: '0 0 140px' }}
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="concluido">Concluído</option>
              <option value="suspenso">Suspenso</option>
            </select>
            <button onClick={() => setShowApplyModal(true)} style={btnPrimary}>
              + Aplicar Protocolo
            </button>
          </div>

          {loadingPacProts ? (
            <LoadingSpinner />
          ) : filteredPacProts.length === 0 ? (
            <EmptyState icon="👤" title="Nenhum paciente em protocolo" desc="Aplique um protocolo a um paciente para começar." />
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {filteredPacProts.map(pp => (
                <PacProtoCard
                  key={pp.id}
                  pp={pp}
                  onChecklist={() => setChecklistTarget(pp)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showProtoModal && (
        <ProtoModal
          clinicaId={clinicaId}
          editProto={editProto}
          onClose={() => { setShowProtoModal(false); setEditProto(null) }}
          onSaved={() => { setShowProtoModal(false); setEditProto(null); loadProtocolos() }}
        />
      )}

      {applyTarget && (
        <ApplyModal
          clinicaId={clinicaId}
          proto={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSaved={() => { setApplyTarget(null); loadPacProts(); setTab(1) }}
        />
      )}

      {showApplyModal && (
        <ApplyModal
          clinicaId={clinicaId}
          proto={null}
          protocolos={protocolos.filter(p => p.ativo)}
          onClose={() => setShowApplyModal(false)}
          onSaved={() => { setShowApplyModal(false); loadPacProts() }}
        />
      )}

      {checklistTarget && (
        <ChecklistModal
          pp={checklistTarget}
          onClose={() => setChecklistTarget(null)}
          onUpdated={() => { setChecklistTarget(null); loadPacProts() }}
        />
      )}
    </div>
  )
}

// ─── ProtoCard ────────────────────────────────────────────────────────────────

function ProtoCard({ proto, onEdit, onToggle, onApply }) {
  const items = proto.items_protocolo || []
  const typeCounts = {}
  items.forEach(it => { typeCounts[it.tipo] = (typeCounts[it.tipo] || 0) + 1 })

  return (
    <div className="proto-card" style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '18px 20px', boxShadow: L.shadow, transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{proto.nome}</span>
            {proto.especialidade && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: L.tealBg, color: L.teal, fontFamily: "'JetBrains Mono', monospace",
              }}>{proto.especialidade}</span>
            )}
            {!proto.ativo && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: L.surface, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              }}>INATIVO</span>
            )}
          </div>
          {proto.descricao && (
            <p style={{ fontSize: 12, color: L.t3, marginTop: 5, lineHeight: 1.5,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {proto.descricao}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
              {items.length} iten{items.length !== 1 ? 's' : 's'}
            </span>
            {Object.entries(typeCounts).map(([tipo, count]) => (
              <span key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TipoBadge tipo={tipo} />
                <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>×{count}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {/* Toggle ativo */}
          <button
            onClick={onToggle}
            title={proto.ativo ? 'Desativar' : 'Ativar'}
            style={{
              width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: proto.ativo ? L.teal : L.line, position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: proto.ativo ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%', background: L.white,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={btnSmall}>Editar</button>
            <button onClick={onApply} style={{ ...btnSmall, borderColor: L.teal, color: L.teal }}>Aplicar a Paciente</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PacProtoCard ─────────────────────────────────────────────────────────────

function PacProtoCard({ pp, onChecklist }) {
  const items = pp.protocolo_paciente_items || []
  const total = items.length
  const done  = items.filter(it => it.status === 'concluido').length
  const pct   = total ? Math.round((done / total) * 100) : 0

  const hasOverdue = items.some(it => {
    if (it.status !== 'pendente') return false
    const prazoDias = it.items_protocolo?.prazo_dias
    if (!prazoDias || !pp.data_inicio) return false
    const due = new Date(pp.data_inicio + 'T00:00:00')
    due.setDate(due.getDate() + prazoDias)
    return due < new Date()
  })

  return (
    <div className="pac-proto-card" style={{
      background: L.bg, border: `1px solid ${hasOverdue ? L.redBd : L.line}`, borderRadius: 14,
      padding: '16px 18px', boxShadow: L.shadow, transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: L.tealBg, color: L.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, flexShrink: 0,
          }}>{initial(pp.pacientes?.nome)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{pp.pacientes?.nome || '—'}</span>
              <StatusBadge status={pp.status} />
              {hasOverdue && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: L.redBg, color: L.red,
                }}>⚠ VENCIDO</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
              {pp.protocolos_clinicos?.nome}
              {pp.protocolos_clinicos?.especialidade && (
                <span style={{ color: L.t4 }}> · {pp.protocolos_clinicos.especialidade}</span>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ProgressBar pct={pct} />
              <span style={{ fontSize: 11, fontWeight: 600, color: L.t2, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                {done}/{total}
              </span>
            </div>
            <div style={{ fontSize: 11, color: L.t4, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              Início: {fmtDate(pp.data_inicio)}
            </div>
          </div>
        </div>
        <button onClick={onChecklist} style={{ ...btnSmall, flexShrink: 0, borderColor: L.teal, color: L.teal }}>
          Ver Checklist
        </button>
      </div>
    </div>
  )
}

// ─── ProtoModal ───────────────────────────────────────────────────────────────

function ProtoModal({ clinicaId, editProto, onClose, onSaved }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [nome, setNome] = useState(editProto?.nome || '')
  const [especialidade, setEspecialidade] = useState(editProto?.especialidade || '')
  const [descricao, setDescricao] = useState(editProto?.descricao || '')

  // Step 2 items
  const [items, setItems] = useState([])
  const [newTipo, setNewTipo] = useState('exame')
  const [newDesc, setNewDesc] = useState('')
  const [newObrig, setNewObrig] = useState(true)
  const [newPrazo, setNewPrazo] = useState('')

  useEffect(() => {
    if (editProto?.items_protocolo) {
      const sorted = [...editProto.items_protocolo].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      setItems(sorted.map(it => ({ ...it, _key: it.id })))
    }
  }, [editProto])

  const addItem = () => {
    if (!newDesc.trim()) return
    setItems(prev => [
      ...prev,
      {
        _key: Date.now(),
        tipo: newTipo,
        descricao: newDesc.trim(),
        obrigatorio: newObrig,
        prazo_dias: newPrazo ? parseInt(newPrazo) : null,
        ordem: prev.length + 1,
      },
    ])
    setNewDesc('')
    setNewPrazo('')
    setNewObrig(true)
  }

  const removeItem = (key) => setItems(prev => prev.filter(it => it._key !== key))

  const moveItem = (key, dir) => {
    setItems(prev => {
      const idx = prev.findIndex(it => it._key === key)
      if (idx < 0) return prev
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next.map((it, i) => ({ ...it, ordem: i + 1 }))
    })
  }

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    try {
      let protoId = editProto?.id
      if (editProto) {
        await supabase.from('protocolos_clinicos').update({
          nome: nome.trim(), especialidade: especialidade.trim(), descricao: descricao.trim(),
        }).eq('id', protoId)
        await supabase.from('items_protocolo').delete().eq('protocolo_id', protoId)
      } else {
        const { data } = await supabase.from('protocolos_clinicos').insert({
          clinica_id: clinicaId, nome: nome.trim(),
          especialidade: especialidade.trim(), descricao: descricao.trim(), ativo: true,
        }).select().single()
        protoId = data?.id
      }
      if (protoId && items.length) {
        const rows = items.map((it, i) => ({
          protocolo_id: protoId, tipo: it.tipo, descricao: it.descricao,
          obrigatorio: it.obrigatorio, prazo_dias: it.prazo_dias, ordem: i + 1,
        }))
        await supabase.from('items_protocolo').insert(rows)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose} wide>
      <ModalHeader
        title={editProto ? 'Editar Protocolo' : 'Novo Protocolo'}
        subtitle={`Passo ${step} de 2 — ${step === 1 ? 'Informações' : 'Itens do protocolo'}`}
        onClose={onClose}
      />

      {/* Step nav */}
      <div style={{ display: 'flex', gap: 0, padding: '12px 24px 0', borderBottom: `1px solid ${L.line}`, marginBottom: 20 }}>
        {[1, 2].map(s => (
          <button
            key={s}
            onClick={() => s < step || (s === 2 && nome.trim()) ? setStep(s) : null}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: step === s ? 700 : 400,
              color: step === s ? L.teal : L.t4, background: 'none', border: 'none',
              borderBottom: step === s ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -1, cursor: 'pointer',
            }}
          >
            {s === 1 ? '① Informações' : '② Itens'}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 24px' }}>
        {step === 1 && (
          <div style={{ animation: 'up 0.2s ease' }}>
            <Field label="NOME DO PROTOCOLO *">
              <input value={nome} onChange={e => setNome(e.target.value)} style={inp} placeholder="Ex: Protocolo Hipertensão" />
            </Field>
            <Field label="ESPECIALIDADE">
              <input value={especialidade} onChange={e => setEspecialidade(e.target.value)} style={inp} placeholder="Ex: Cardiologia" />
            </Field>
            <Field label="DESCRIÇÃO">
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={ta} placeholder="Descreva o objetivo e indicações do protocolo…" />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button onClick={onClose} style={btnSecondary}>Cancelar</button>
              <button
                onClick={() => nome.trim() && setStep(2)}
                style={{ ...btnPrimary, opacity: nome.trim() ? 1 : 0.5 }}
              >Próximo →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'up 0.2s ease' }}>
            {/* Add item form */}
            <div style={{
              background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
              padding: 16, marginBottom: 18,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: L.t2, marginBottom: 12 }}>Adicionar item</div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 10, marginBottom: 10 }}>
                <Field label="TIPO">
                  <select value={newTipo} onChange={e => setNewTipo(e.target.value)} style={inp}>
                    <option value="exame">Exame</option>
                    <option value="medicamento">Medicamento</option>
                    <option value="consulta">Consulta</option>
                    <option value="orientacao">Orientação</option>
                    <option value="procedimento">Procedimento</option>
                  </select>
                </Field>
                <Field label="DESCRIÇÃO *">
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inp} placeholder="Descreva o item…" />
                </Field>
                <Field label="PRAZO (DIAS)">
                  <input value={newPrazo} onChange={e => setNewPrazo(e.target.value)} type="number" min="1" style={inp} placeholder="—" />
                </Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: L.t2, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newObrig} onChange={e => setNewObrig(e.target.checked)} style={{ accentColor: L.teal }} />
                  Obrigatório
                </label>
                <button
                  onClick={addItem}
                  style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13, opacity: newDesc.trim() ? 1 : 0.5 }}
                >+ Adicionar Item</button>
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: L.t4, fontSize: 13 }}>
                Nenhum item adicionado ainda
              </div>
            ) : (
              <div style={{ border: `1px solid ${L.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
                {items.map((it, idx) => (
                  <div key={it._key} className="item-row" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderBottom: idx < items.length - 1 ? `1px solid ${L.line}` : 'none',
                    background: L.bg, transition: 'background 0.15s',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveItem(it._key, -1)} style={{ ...btnSmall, padding: '1px 6px', fontSize: 10, lineHeight: 1.2 }}>▲</button>
                      <button onClick={() => moveItem(it._key, 1)}  style={{ ...btnSmall, padding: '1px 6px', fontSize: 10, lineHeight: 1.2 }}>▼</button>
                    </div>
                    <TipoBadge tipo={it.tipo} />
                    <span style={{ flex: 1, fontSize: 13, color: L.t1 }}>{it.descricao}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {it.obrigatorio && (
                        <span style={{ fontSize: 10, color: L.red, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>OBRIG.</span>
                      )}
                      {it.prazo_dias && (
                        <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{it.prazo_dias}d</span>
                      )}
                      <button onClick={() => removeItem(it._key)} style={{ ...btnSmall, color: L.red, borderColor: L.redBd, padding: '4px 8px' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Voltar</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={btnSecondary}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando…' : editProto ? 'Salvar Alterações' : 'Criar Protocolo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  )
}

// ─── ApplyModal ───────────────────────────────────────────────────────────────

function ApplyModal({ clinicaId, proto, protocolos, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [pacientes, setPacientes] = useState([])
  const [searchPac, setSearchPac] = useState('')
  const [selectedPac, setSelectedPac] = useState(null)
  const [selectedProto, setSelectedProto] = useState(proto?.id || '')
  const [dataInicio, setDataInicio] = useState(today())
  const [loadingPacs, setLoadingPacs] = useState(false)
  const [allProtocolos, setAllProtocolos] = useState(protocolos || [])

  useEffect(() => {
    if (!protocolos && clinicaId) {
      supabase.from('protocolos_clinicos').select('*, items_protocolo(*)')
        .eq('clinica_id', clinicaId).eq('ativo', true)
        .then(({ data }) => setAllProtocolos(data || []))
    }
  }, [clinicaId, protocolos])

  useEffect(() => {
    if (!searchPac.trim() || !clinicaId) { setPacientes([]); return }
    const t = setTimeout(async () => {
      setLoadingPacs(true)
      const { data } = await supabase.from('pacientes')
        .select('id, nome').eq('clinica_id', clinicaId)
        .ilike('nome', `%${searchPac}%`).limit(10)
      setPacientes(data || [])
      setLoadingPacs(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchPac, clinicaId])

  const handleApply = async () => {
    if (!selectedPac || !selectedProto || !dataInicio) return
    setSaving(true)
    try {
      const protoObj = allProtocolos.find(p => p.id === selectedProto)
      const { data: pp } = await supabase.from('protocolo_paciente').insert({
        clinica_id: clinicaId,
        protocolo_id: selectedProto,
        paciente_id: selectedPac.id,
        data_inicio: dataInicio,
        status: 'ativo',
      }).select().single()

      if (pp && protoObj?.items_protocolo?.length) {
        const ppiRows = protoObj.items_protocolo.map(it => ({
          protocolo_paciente_id: pp.id,
          item_id: it.id,
          status: 'pendente',
        }))
        await supabase.from('protocolo_paciente_items').insert(ppiRows)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const canSave = selectedPac && selectedProto && dataInicio

  return (
    <Overlay onClose={onClose}>
      <ModalHeader
        title="Aplicar Protocolo a Paciente"
        subtitle={proto ? `Protocolo: ${proto.nome}` : 'Selecione o protocolo e o paciente'}
        onClose={onClose}
      />
      <div style={{ padding: '20px 24px' }}>
        {/* Paciente search */}
        <Field label="PACIENTE *">
          {selectedPac ? (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', border: `1.5px solid ${L.teal}`, borderRadius: 8, background: L.tealBg,
            }}>
              <span style={{ fontSize: 13, color: L.t1 }}>{selectedPac.nome}</span>
              <button onClick={() => { setSelectedPac(null); setSearchPac('') }} style={{ color: L.t3, fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                value={searchPac}
                onChange={e => setSearchPac(e.target.value)}
                style={inp}
                placeholder="Buscar paciente por nome…"
              />
              {pacientes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8,
                  boxShadow: L.shadowMd, maxHeight: 200, overflowY: 'auto', marginTop: 4,
                }}>
                  {pacientes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPac(p); setSearchPac(''); setPacientes([]) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', fontSize: 13, color: L.t1, background: 'none', border: 'none',
                        borderBottom: `1px solid ${L.line}`, cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = L.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >{p.nome}</button>
                  ))}
                </div>
              )}
              {loadingPacs && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: L.t4 }}>buscando…</span>}
            </div>
          )}
        </Field>

        {/* Protocol select */}
        {!proto && (
          <Field label="PROTOCOLO *">
            <select value={selectedProto} onChange={e => setSelectedProto(e.target.value)} style={inp}>
              <option value="">Selecione um protocolo…</option>
              {allProtocolos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
        )}

        <Field label="DATA DE INÍCIO *">
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inp} />
        </Field>

        {selectedProto && (
          <div style={{ padding: '10px 14px', background: L.tealBg, borderRadius: 8, fontSize: 12, color: L.t3, marginBottom: 14 }}>
            {(() => {
              const p = allProtocolos.find(x => x.id === selectedProto)
              if (!p) return null
              const count = p.items_protocolo?.length || 0
              return `Serão criados ${count} item${count !== 1 ? 's' : ''} de checklist para este paciente.`
            })()}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleApply} disabled={saving || !canSave} style={{ ...btnPrimary, opacity: (saving || !canSave) ? 0.5 : 1 }}>
            {saving ? 'Aplicando…' : 'Aplicar Protocolo'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

// ─── ChecklistModal ───────────────────────────────────────────────────────────

function ChecklistModal({ pp, onClose, onUpdated }) {
  const [items, setItems] = useState(pp.protocolo_paciente_items || [])
  const [obs, setObs] = useState({})
  const [saving, setSaving] = useState(null)
  const [concluding, setConcluding] = useState(false)

  const total     = items.length
  const done      = items.filter(it => it.status === 'concluido').length
  const pct       = total ? Math.round((done / total) * 100) : 0

  const requiredItems = items.filter(it => it.items_protocolo?.obrigatorio)
  const allRequiredDone = requiredItems.length > 0 && requiredItems.every(it => it.status === 'concluido')

  const toggleItem = async (item) => {
    const newStatus = item.status === 'concluido' ? 'pendente' : 'concluido'
    setSaving(item.id)
    const update = { status: newStatus, data_conclusao: newStatus === 'concluido' ? today() : null }
    const { error } = await supabase.from('protocolo_paciente_items').update(update).eq('id', item.id)
    if (!error) {
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, ...update } : it))
    }
    setSaving(null)
  }

  const saveObs = async (item) => {
    const observacao = obs[item.id] ?? item.observacao ?? ''
    await supabase.from('protocolo_paciente_items').update({ observacao }).eq('id', item.id)
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, observacao } : it))
  }

  const concludeProtocol = async () => {
    setConcluding(true)
    await supabase.from('protocolo_paciente').update({ status: 'concluido' }).eq('id', pp.id)
    setConcluding(false)
    onUpdated()
  }

  const sortedItems = [...items].sort((a, b) => {
    const oa = a.items_protocolo?.ordem ?? 999
    const ob = b.items_protocolo?.ordem ?? 999
    return oa - ob
  })

  return (
    <Overlay onClose={onClose} wide>
      <ModalHeader
        title={`Checklist — ${pp.pacientes?.nome || '—'}`}
        subtitle={`${pp.protocolos_clinicos?.nome || ''} · Início: ${fmtDate(pp.data_inicio)}`}
        onClose={onClose}
      />
      <div style={{ padding: '16px 24px' }}>
        {/* Header info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <StatusBadge status={pp.status} />
          {pp.protocolos_clinicos?.especialidade && (
            <span style={{
              fontSize: 11, color: L.teal, background: L.tealBg, padding: '2px 8px', borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{pp.protocolos_clinicos.especialidade}</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
            <ProgressBar pct={pct} />
            <span style={{ fontSize: 13, fontWeight: 700, color: L.t1, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
              {done}/{total} ({pct}%)
            </span>
          </div>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {sortedItems.map(item => {
            const meta   = item.items_protocolo || {}
            const isDone = item.status === 'concluido'
            const prazoDias = meta.prazo_dias
            let prazLabel = null
            let prazColor = L.t4
            if (prazoDias && pp.data_inicio) {
              const due = new Date(pp.data_inicio + 'T00:00:00')
              due.setDate(due.getDate() + prazoDias)
              const diff = daysDiff(due.toISOString().slice(0, 10))
              if (!isDone) {
                if (diff < 0) {
                  prazLabel = `Venceu há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`
                  prazColor = L.red
                } else if (diff === 0) {
                  prazLabel = 'Vence hoje'
                  prazColor = L.orange
                } else {
                  prazLabel = `Vence em ${diff} dia${diff !== 1 ? 's' : ''}`
                  prazColor = diff <= 7 ? L.yellow : L.t4
                }
              } else {
                prazLabel = `Concluído em ${fmtDate(item.data_conclusao)}`
                prazColor = L.green
              }
            }

            const currentObs = obs[item.id] !== undefined ? obs[item.id] : (item.observacao || '')

            return (
              <div key={item.id} style={{
                border: `1px solid ${isDone ? L.greenBd : L.line}`, borderRadius: 10,
                background: isDone ? L.greenBg : L.bg, padding: '12px 14px',
                transition: 'border-color 0.2s, background 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleItem(item)}
                    disabled={saving === item.id || pp.status !== 'ativo'}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      border: `2px solid ${isDone ? L.green : L.line}`,
                      background: isDone ? L.green : L.bg,
                      cursor: pp.status === 'ativo' ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                  >
                    {isDone && <span style={{ color: L.white, fontSize: 12, lineHeight: 1 }}>✓</span>}
                    {saving === item.id && <span style={{ animation: 'spin 0.7s linear infinite', display: 'inline-block', fontSize: 10 }}>⟳</span>}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <TipoBadge tipo={meta.tipo} />
                      {meta.obrigatorio && (
                        <span style={{ fontSize: 10, color: L.red, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>OBRIG.</span>
                      )}
                      <span style={{
                        fontSize: 13, color: isDone ? L.t3 : L.t1, fontWeight: isDone ? 400 : 500,
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}>{meta.descricao || '—'}</span>
                    </div>
                    {prazLabel && (
                      <div style={{ fontSize: 11, color: prazColor, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                        {prazLabel}
                      </div>
                    )}
                    {/* Observação */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        value={currentObs}
                        onChange={e => setObs(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => saveObs(item)}
                        placeholder="Observação…"
                        style={{ ...inp, fontSize: 12, padding: '6px 10px', flex: 1, color: L.t3 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Concluir protocolo */}
        {allRequiredDone && pp.status === 'ativo' && (
          <div style={{
            background: L.greenBg, border: `1px solid ${L.greenBd}`,
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: L.green }}>✓ Todos os itens obrigatórios concluídos!</div>
              <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>Você pode concluir este protocolo agora.</div>
            </div>
            <button
              onClick={concludeProtocol}
              disabled={concluding}
              style={{ ...btnPrimary, background: L.green, opacity: concluding ? 0.7 : 1 }}
            >
              {concluding ? 'Concluindo…' : 'Concluir Protocolo'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Fechar</button>
        </div>
      </div>
    </Overlay>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '16px 20px', boxShadow: L.shadow,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Loading / Empty helpers ─────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid ${L.line}`, borderTopColor: L.teal,
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: L.t3 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: L.t2, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{desc}</div>
    </div>
  )
}
