import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function calcIdade(dn) {
  if (!dn) return null
  const diff = Date.now() - new Date(dn + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function fmtDateInput(iso) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function daysSince(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── shared styles ───────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

const sel = { ...inp }

const ta = { ...inp, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }

// ─── tipo config ─────────────────────────────────────────────────────────────

const TIPO_CFG = {
  vacinacao:       { label: 'Vacinação',        bg: L.greenBg,  bd: L.greenBd,  color: L.green  },
  rastreamento:    { label: 'Rastreamento',     bg: L.blueBg,   bd: L.blueBd,   color: L.blue   },
  doenca_cronica:  { label: 'Doença Crônica',   bg: L.orangeBg, bd: L.orangeBd, color: L.orange },
  prevencao:       { label: 'Prevenção',        bg: L.tealBg,   bd: '#99d6d6',  color: L.teal   },
  educacao_saude:  { label: 'Educação em Saúde',bg: L.purpleBg, bd: L.purpleBd, color: L.purple },
}

const STATUS_CFG = {
  planejada:  { label: 'Planejada',  bg: L.surface, bd: L.line,     color: L.t3    },
  ativa:      { label: 'Ativa',      bg: L.greenBg, bd: L.greenBd,  color: L.green, pulse: true },
  encerrada:  { label: 'Encerrada', bg: L.surface, bd: L.line,     color: L.t3    },
  suspensa:   { label: 'Suspensa',  bg: L.redBg,   bd: L.redBd,    color: L.red   },
}

const PART_STATUS_CFG = {
  convocado:      { label: 'Convocado',      bg: L.yellowBg, bd: L.yellowBd, color: L.yellow },
  confirmado:     { label: 'Confirmado',     bg: L.blueBg,   bd: L.blueBd,   color: L.blue   },
  atendido:       { label: 'Atendido',       bg: L.greenBg,  bd: L.greenBd,  color: L.green  },
  recusou:        { label: 'Recusou',        bg: L.redBg,    bd: L.redBd,    color: L.red    },
  nao_localizado: { label: 'Não localizado', bg: L.surface,  bd: L.line,     color: L.t3     },
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Badge({ cfg, pulse }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, border: `1px solid ${cfg.bd}`, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {(pulse || cfg.pulse) && (
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: cfg.color,
          animation: 'pulseDot 1.4s ease-in-out infinite',
          flexShrink: 0,
        }} />
      )}
      {cfg.label}
    </span>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '16px 20px', boxShadow: L.shadow,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.3px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function BottomSheet({ title, onClose, wide, children }) {
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
        width: '100%', maxWidth: wide ? 820 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, background: L.teal, color: '#fff', padding: '12px 24px',
      borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: L.shadowMd,
      animation: 'up 0.2s ease',
    }}>{msg}</div>
  )
}

// ─── Tab 0: Campanhas ────────────────────────────────────────────────────────

const EMPTY_CAMP = {
  nome: '', tipo: 'vacinacao', descricao: '', data_inicio: '', data_fim: '',
  meta_pacientes: '', status: 'planejada', responsavel: '', criterio_elegibilidade: '',
}

function TabCampanhas({ clinicaId, campanhas, participantes, onReload, setToast }) {
  const [modal, setModal]   = useState(null) // null | 'nova' | {id, ...}
  const [form, setForm]     = useState(EMPTY_CAMP)
  const [saving, setSaving] = useState(false)

  function openNova() { setForm(EMPTY_CAMP); setModal('nova') }
  function openEdit(c) {
    setForm({
      nome: c.nome || '', tipo: c.tipo || 'vacinacao', descricao: c.descricao || '',
      data_inicio: fmtDateInput(c.data_inicio), data_fim: fmtDateInput(c.data_fim),
      meta_pacientes: c.meta_pacientes || '', status: c.status || 'planejada',
      responsavel: c.responsavel || '', criterio_elegibilidade: c.criterio_elegibilidade || '',
    })
    setModal(c)
  }

  async function save() {
    if (!form.nome.trim()) return
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      nome: form.nome.trim(),
      tipo: form.tipo,
      descricao: form.descricao || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      meta_pacientes: form.meta_pacientes ? Number(form.meta_pacientes) : null,
      status: form.status,
      responsavel: form.responsavel || null,
      criterio_elegibilidade: form.criterio_elegibilidade || null,
    }
    if (modal === 'nova') {
      await supabase.from('campanhas').insert(payload)
    } else {
      await supabase.from('campanhas').update(payload).eq('id', modal.id)
    }
    setSaving(false)
    setModal(null)
    onReload()
  }

  async function toggleStatus(c, newStatus) {
    await supabase.from('campanhas').update({ status: newStatus }).eq('id', c.id)
    onReload()
  }

  // KPIs
  const ativas       = campanhas.filter(c => c.status === 'ativa').length
  const totalConvoc  = participantes.length
  const hoje         = new Date()
  const mesAtual     = hoje.getMonth()
  const anoAtual     = hoje.getFullYear()
  const atendidosMes = participantes.filter(p => {
    if (p.status !== 'atendido' || !p.data_atendimento) return false
    const d = new Date(p.data_atendimento + 'T00:00:00')
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  }).length
  const taxa = totalConvoc > 0
    ? Math.round((participantes.filter(p => p.status === 'atendido').length / totalConvoc) * 100)
    : 0

  // map participantes per campaign
  const partMap = {}
  participantes.forEach(p => {
    if (!partMap[p.campanha_id]) partMap[p.campanha_id] = []
    partMap[p.campanha_id].push(p)
  })

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="CAMPANHAS ATIVAS" value={ativas} color={L.green} />
        <KpiCard label="PACIENTES CONVOCADOS" value={totalConvoc} />
        <KpiCard label="ATENDIDOS (MÊS)" value={atendidosMes} color={L.teal} />
        <KpiCard label="TAXA DE ADESÃO" value={`${taxa}%`} color={taxa >= 60 ? L.green : taxa >= 30 ? L.yellow : L.red} sub="atendidos / convocados" />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>
          {campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''}
        </div>
        <button onClick={openNova} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
          boxShadow: '0 1px 4px rgba(13,110,110,0.25)',
        }}>+ Nova Campanha</button>
      </div>

      {/* Cards */}
      {campanhas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: L.t3 }}>
          Nenhuma campanha cadastrada ainda.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {campanhas.map(c => {
          const parts  = partMap[c.id] || []
          const meta   = c.meta_pacientes || 0
          const pct    = meta > 0 ? Math.min(100, Math.round((parts.length / meta) * 100)) : 0
          const tipoCfg   = TIPO_CFG[c.tipo]   || TIPO_CFG.prevencao
          const statusCfg = STATUS_CFG[c.status] || STATUS_CFG.planejada
          return (
            <div key={c.id} style={{
              background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
              padding: '18px 20px', boxShadow: L.shadow,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{c.nome}</div>
                    <Badge cfg={tipoCfg} />
                    <Badge cfg={statusCfg} />
                  </div>
                  {c.descricao && (
                    <div style={{ fontSize: 12, color: L.t3, marginBottom: 8, lineHeight: 1.5 }}>{c.descricao}</div>
                  )}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: L.t3, marginBottom: 10 }}>
                    {c.data_inicio && <span>Início: <b style={{ color: L.t2 }}>{fmtDate(c.data_inicio)}</b></span>}
                    {c.data_fim    && <span>Fim: <b style={{ color: L.t2 }}>{fmtDate(c.data_fim)}</b></span>}
                    {c.responsavel && <span>Responsável: <b style={{ color: L.t2 }}>{c.responsavel}</b></span>}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: L.t4, marginBottom: 4 }}>
                      <span>{parts.length} participante{parts.length !== 1 ? 's' : ''}</span>
                      <span>Meta: {meta > 0 ? meta : '—'} {meta > 0 ? `(${pct}%)` : ''}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: L.line, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${pct}%`,
                        background: pct >= 100 ? L.green : pct >= 60 ? L.teal : L.yellow,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 120, alignItems: 'flex-end' }}>
                  <button onClick={() => openEdit(c)} style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2,
                    cursor: 'pointer', width: '100%',
                  }}>Editar</button>

                  {c.status === 'planejada' && (
                    <button onClick={() => toggleStatus(c, 'ativa')} style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${L.greenBd}`, background: L.greenBg, color: L.green,
                      cursor: 'pointer', width: '100%',
                    }}>Ativar</button>
                  )}
                  {c.status === 'ativa' && (
                    <>
                      <button onClick={() => toggleStatus(c, 'encerrada')} style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: `1.5px solid ${L.line}`, background: L.surface, color: L.t3,
                        cursor: 'pointer', width: '100%',
                      }}>Encerrar</button>
                      <button onClick={() => toggleStatus(c, 'suspensa')} style={{
                        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        border: `1.5px solid ${L.redBd}`, background: L.redBg, color: L.red,
                        cursor: 'pointer', width: '100%',
                      }}>Suspender</button>
                    </>
                  )}
                  {c.status === 'suspensa' && (
                    <button onClick={() => toggleStatus(c, 'ativa')} style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${L.greenBd}`, background: L.greenBg, color: L.green,
                      cursor: 'pointer', width: '100%',
                    }}>Reativar</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Nova / Editar */}
      {modal && (
        <BottomSheet
          title={modal === 'nova' ? 'Nova Campanha' : 'Editar Campanha'}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="NOME DA CAMPANHA *">
              <input style={inp} value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome da campanha" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select style={sel} value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="vacinacao">Vacinação</option>
                  <option value="rastreamento">Rastreamento</option>
                  <option value="doenca_cronica">Doença Crônica</option>
                  <option value="prevencao">Prevenção</option>
                  <option value="educacao_saude">Educação em Saúde</option>
                </select>
              </Field>
              <Field label="STATUS">
                <select style={sel} value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="planejada">Planejada</option>
                  <option value="ativa">Ativa</option>
                  <option value="encerrada">Encerrada</option>
                  <option value="suspensa">Suspensa</option>
                </select>
              </Field>
            </div>
            <Field label="DESCRIÇÃO">
              <textarea style={ta} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Objetivo e detalhes da campanha..." />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DATA INÍCIO">
                <input type="date" style={inp} value={form.data_inicio}
                  onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </Field>
              <Field label="DATA FIM">
                <input type="date" style={inp} value={form.data_fim}
                  onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="META DE PACIENTES">
                <input type="number" style={inp} value={form.meta_pacientes}
                  onChange={e => setForm(f => ({ ...f, meta_pacientes: e.target.value }))}
                  placeholder="Ex: 200" min="0" />
              </Field>
              <Field label="RESPONSÁVEL">
                <input style={inp} value={form.responsavel}
                  onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                  placeholder="Nome do responsável" />
              </Field>
            </div>
            <Field label="CRITÉRIO DE ELEGIBILIDADE">
              <textarea style={{ ...ta, minHeight: 60 }} value={form.criterio_elegibilidade}
                onChange={e => setForm(f => ({ ...f, criterio_elegibilidade: e.target.value }))}
                placeholder="Quem deve participar desta campanha..." />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={() => setModal(null)} style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={save} disabled={saving || !form.nome.trim()} style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
                opacity: saving || !form.nome.trim() ? 0.6 : 1,
              }}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 1: Participantes & Convocação ───────────────────────────────────────

function FunnelChart({ convocado, confirmado, atendido }) {
  const max = Math.max(convocado, 1)
  const steps = [
    { label: 'Convocados',  value: convocado,  color: L.yellow },
    { label: 'Confirmados', value: confirmado, color: L.blue   },
    { label: 'Atendidos',   value: atendido,   color: L.green  },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', padding: '8px 0' }}>
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ width: `${Math.max(20, pct)}%`, height: 28, borderRadius: 4, background: s.color, opacity: 0.85, minWidth: 28 }} />
            <div style={{ fontSize: 11, color: L.t4, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const EMPTY_PART = { status: 'convocado', data_convocacao: '', data_atendimento: '', observacoes: '' }

function TabParticipantes({ clinicaId, campanhas, participantes, pacientes, onReload, setToast }) {
  const [campId, setCampId]         = useState('')
  const [editPart, setEditPart]     = useState(null)
  const [partForm, setPartForm]     = useState(EMPTY_PART)
  const [saving, setSaving]         = useState(false)
  const [showConvocar, setShowConvocar] = useState(false)

  // Convocar em lote state
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('')
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('')
  const [filtroNome, setFiltroNome]         = useState('')
  const [selecionados, setSelecionados]     = useState([])
  const [convocando, setConvocando]         = useState(false)

  const camp = campanhas.find(c => c.id === campId)

  const partsDaCamp = participantes.filter(p => p.campanha_id === campId)
  const partPacIds  = new Set(partsDaCamp.map(p => p.paciente_id))

  // enrich participants with patient data
  const pacMap = {}
  pacientes.forEach(p => { pacMap[p.id] = p })

  const enriched = partsDaCamp.map(p => ({ ...p, _pac: pacMap[p.paciente_id] || null }))

  // funnel
  const fConv  = partsDaCamp.filter(p => p.status === 'convocado').length
  const fConf  = partsDaCamp.filter(p => p.status === 'confirmado').length
  const fAtend = partsDaCamp.filter(p => p.status === 'atendido').length
  const fTotal = partsDaCamp.length
  const taxaConv = fTotal > 0 ? Math.round((fAtend / fTotal) * 100) : 0

  function openEdit(p) {
    setPartForm({
      status: p.status || 'convocado',
      data_convocacao: fmtDateInput(p.data_convocacao),
      data_atendimento: fmtDateInput(p.data_atendimento),
      observacoes: p.observacoes || '',
    })
    setEditPart(p)
  }

  async function savePart() {
    if (!editPart) return
    setSaving(true)
    await supabase.from('campanha_participantes').update({
      status: partForm.status,
      data_convocacao: partForm.data_convocacao || null,
      data_atendimento: partForm.data_atendimento || null,
      observacoes: partForm.observacoes || null,
    }).eq('id', editPart.id)
    setSaving(false)
    setEditPart(null)
    onReload()
  }

  // Filter patients for batch convocation
  const pacFiltrados = pacientes.filter(p => {
    if (partPacIds.has(p.id)) return false
    const idade = calcIdade(p.data_nascimento)
    if (filtroIdadeMin && (idade === null || idade < Number(filtroIdadeMin))) return false
    if (filtroIdadeMax && (idade === null || idade > Number(filtroIdadeMax))) return false
    if (filtroNome && !p.nome?.toLowerCase().includes(filtroNome.toLowerCase())) return false
    return true
  })

  function toggleSel(id) {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelecionados(pacFiltrados.map(p => p.id))
  }

  function clearSel() {
    setSelecionados([])
  }

  async function convocarLote() {
    if (!campId || selecionados.length === 0) return
    setConvocando(true)
    const hoje = new Date().toISOString().slice(0, 10)
    const rows = selecionados.map(pid => ({
      campanha_id: campId,
      clinica_id: clinicaId,
      paciente_id: pid,
      status: 'convocado',
      data_convocacao: hoje,
    }))
    await supabase.from('campanha_participantes').insert(rows)
    setConvocando(false)
    setShowConvocar(false)
    setSelecionados([])
    setFiltroNome('')
    setFiltroIdadeMin('')
    setFiltroIdadeMax('')
    setToast(`${rows.length} paciente${rows.length !== 1 ? 's' : ''} convocado${rows.length !== 1 ? 's' : ''} com sucesso!`)
    onReload()
  }

  function enviarLembretes() {
    const total = partsDaCamp.filter(p => p.status === 'convocado' || p.status === 'confirmado').length
    setToast(`${total} lembrete${total !== 1 ? 's' : ''} enviado${total !== 1 ? 's' : ''} via WhatsApp/SMS`)
  }

  return (
    <div>
      {/* Campaign selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <select style={{ ...sel, fontWeight: campId ? 600 : 400 }}
            value={campId} onChange={e => setCampId(e.target.value)}>
            <option value="">— Selecione uma campanha —</option>
            {campanhas.map(c => (
              <option key={c.id} value={c.id}>{c.nome} ({STATUS_CFG[c.status]?.label || c.status})</option>
            ))}
          </select>
        </div>
        {campId && (
          <>
            <button onClick={() => { setSelecionados([]); setShowConvocar(true) }} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
              boxShadow: '0 1px 4px rgba(13,110,110,0.2)',
            }}>Convocar em Lote</button>
            <button onClick={enviarLembretes} style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${L.blueBd}`, background: L.blueBg, color: L.blue,
              cursor: 'pointer',
            }}>Enviar Lembretes</button>
          </>
        )}
      </div>

      {!campId && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: L.t3 }}>
          Selecione uma campanha para ver os participantes.
        </div>
      )}

      {campId && camp && (
        <>
          {/* Stats + Funnel */}
          <div style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>{camp.nome}</div>
              <div style={{ fontSize: 12, color: L.t3 }}>
                Taxa de conversão: <b style={{ color: taxaConv >= 50 ? L.green : L.yellow }}>{taxaConv}%</b>
              </div>
            </div>
            <FunnelChart convocado={fConv + fConf + fAtend} confirmado={fConf + fAtend} atendido={fAtend} />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              {Object.entries(PART_STATUS_CFG).map(([k, v]) => {
                const cnt = partsDaCamp.filter(p => p.status === k).length
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, display: 'inline-block' }} />
                    <span style={{ color: L.t3 }}>{v.label}:</span>
                    <span style={{ fontWeight: 700, color: L.t2 }}>{cnt}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Participants table */}
          {enriched.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: L.t3 }}>
              Nenhum participante nesta campanha ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enriched.map(p => {
                const pac = p._pac
                const idade = pac ? calcIdade(pac.data_nascimento) : null
                const cfg = PART_STATUS_CFG[p.status] || PART_STATUS_CFG.convocado
                return (
                  <div key={p.id} style={{
                    background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>
                        {pac?.nome || `Paciente #${p.paciente_id?.slice(0, 6)}`}
                      </div>
                      <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>
                        {idade !== null ? `${idade} anos` : ''}{pac?.telefone ? ` · ${pac.telefone}` : ''}
                      </div>
                    </div>
                    <Badge cfg={cfg} />
                    <div style={{ fontSize: 11, color: L.t4, minWidth: 80 }}>
                      {p.data_convocacao ? `Conv: ${fmtDate(p.data_convocacao)}` : ''}
                      {p.data_atendimento ? <><br />{`Atend: ${fmtDate(p.data_atendimento)}`}</> : ''}
                    </div>
                    {p.observacoes && (
                      <div style={{ fontSize: 11, color: L.t3, fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.observacoes}
                      </div>
                    )}
                    <button onClick={() => openEdit(p)} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2, cursor: 'pointer',
                    }}>Editar</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Edit participant modal */}
      {editPart && (
        <BottomSheet title="Atualizar Participante" onClose={() => setEditPart(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: L.t2, fontWeight: 600, marginBottom: 4 }}>
              {pacMap[editPart.paciente_id]?.nome || 'Paciente'}
            </div>
            <Field label="STATUS">
              <select style={sel} value={partForm.status}
                onChange={e => setPartForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(PART_STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="DATA CONVOCAÇÃO">
                <input type="date" style={inp} value={partForm.data_convocacao}
                  onChange={e => setPartForm(f => ({ ...f, data_convocacao: e.target.value }))} />
              </Field>
              <Field label="DATA ATENDIMENTO">
                <input type="date" style={inp} value={partForm.data_atendimento}
                  onChange={e => setPartForm(f => ({ ...f, data_atendimento: e.target.value }))} />
              </Field>
            </div>
            <Field label="OBSERVAÇÕES">
              <textarea style={ta} value={partForm.observacoes}
                onChange={e => setPartForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Anotações sobre este participante..." />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditPart(null)} style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={savePart} disabled={saving} style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
                opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Convocar em Lote modal */}
      {showConvocar && (
        <BottomSheet title="Convocar Pacientes em Lote" onClose={() => setShowConvocar(false)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: L.tealBg, border: `1px solid #99d6d6`, borderRadius: 10,
              padding: '10px 14px', fontSize: 12, color: L.teal,
            }}>
              Campanha: <b>{camp?.nome}</b>
            </div>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="BUSCAR POR NOME">
                <input style={inp} value={filtroNome} placeholder="Nome do paciente"
                  onChange={e => { setFiltroNome(e.target.value); setSelecionados([]) }} />
              </Field>
              <Field label="IDADE MÍNIMA">
                <input type="number" style={inp} value={filtroIdadeMin} placeholder="Ex: 40"
                  onChange={e => { setFiltroIdadeMin(e.target.value); setSelecionados([]) }} />
              </Field>
              <Field label="IDADE MÁXIMA">
                <input type="number" style={inp} value={filtroIdadeMax} placeholder="Ex: 70"
                  onChange={e => { setFiltroIdadeMax(e.target.value); setSelecionados([]) }} />
              </Field>
            </div>

            {/* Preview count */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`,
            }}>
              <span style={{ fontSize: 13, color: L.t2 }}>
                <b style={{ color: L.t1 }}>{pacFiltrados.length}</b> paciente{pacFiltrados.length !== 1 ? 's' : ''} disponíve{pacFiltrados.length !== 1 ? 'is' : 'l'}
                {selecionados.length > 0 && (
                  <span style={{ marginLeft: 8, color: L.teal, fontWeight: 700 }}>
                    · {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAll} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${L.line}`, background: L.bg, color: L.t2, cursor: 'pointer',
                }}>Selecionar todos</button>
                <button onClick={clearSel} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${L.line}`, background: L.bg, color: L.t3, cursor: 'pointer',
                }}>Limpar</button>
              </div>
            </div>

            {/* Patient list */}
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pacFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: L.t3, fontSize: 13 }}>
                  Nenhum paciente encontrado com os filtros aplicados.
                </div>
              )}
              {pacFiltrados.map(p => {
                const sel2 = selecionados.includes(p.id)
                const idade = calcIdade(p.data_nascimento)
                return (
                  <div key={p.id} onClick={() => toggleSel(p.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${sel2 ? L.teal : L.line}`,
                    background: sel2 ? L.tealBg : L.bg,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${sel2 ? L.teal : L.line}`,
                      background: sel2 ? L.teal : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel2 && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: L.t3 }}>
                        {idade !== null ? `${idade} anos` : ''}
                        {p.telefone ? ` · ${p.telefone}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={() => setShowConvocar(false)} style={{
                padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={convocarLote}
                disabled={convocando || selecionados.length === 0}
                style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: L.teal, color: L.white, cursor: 'pointer', border: 'none',
                  opacity: convocando || selecionados.length === 0 ? 0.5 : 1,
                }}>
                {convocando ? 'Convocando…' : `Convocar ${selecionados.length > 0 ? selecionados.length : ''} Paciente${selecionados.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 2: Acompanhamento ───────────────────────────────────────────────────

function TabAcompanhamento({ campanhas, participantes, pacientes }) {
  const pacMap = {}
  pacientes.forEach(p => { pacMap[p.id] = p })

  const campMap = {}
  campanhas.forEach(c => { campMap[c.id] = c })

  // Build per-patient summary across all campaigns
  const byPaciente = {}
  participantes.forEach(p => {
    if (!byPaciente[p.paciente_id]) byPaciente[p.paciente_id] = []
    byPaciente[p.paciente_id].push(p)
  })

  // Group by disease type
  const byTipo = {}
  Object.entries(byPaciente).forEach(([pacId, parts]) => {
    const pac = pacMap[pacId]
    if (!pac) return
    parts.forEach(p => {
      const camp = campMap[p.campanha_id]
      if (!camp) return
      const tipo = camp.tipo
      if (!byTipo[tipo]) byTipo[tipo] = []
      // avoid duplicate patient per tipo
      if (!byTipo[tipo].find(e => e.pacId === pacId)) {
        byTipo[tipo].push({ pacId, pac, allParts: parts })
      }
    })
  })

  // Patients without follow-up in 90+ days
  const hoje = new Date()
  const semAcomp = Object.entries(byPaciente).map(([pacId, parts]) => {
    const pac = pacMap[pacId]
    if (!pac) return null
    // find last attendance
    const atendidas = parts.filter(p => p.data_atendimento).sort((a, b) =>
      new Date(b.data_atendimento) - new Date(a.data_atendimento)
    )
    const lastAtend = atendidas[0]?.data_atendimento || null
    // last contact = last convocacao or atendimento
    const allDates = parts
      .flatMap(p => [p.data_atendimento, p.data_convocacao].filter(Boolean))
      .sort().reverse()
    const lastContact = allDates[0] || null
    const days = lastContact ? daysSince(lastContact) : 999
    return { pacId, pac, lastAtend, lastContact, days, parts }
  }).filter(Boolean).filter(e => e.days > 90)
    .sort((a, b) => b.days - a.days)

  const tipoOrdem = ['doenca_cronica', 'rastreamento', 'vacinacao', 'prevencao', 'educacao_saude']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* By disease type */}
      {tipoOrdem.map(tipo => {
        const entries = byTipo[tipo]
        if (!entries || entries.length === 0) return null
        const cfg = TIPO_CFG[tipo] || TIPO_CFG.prevencao
        return (
          <div key={tipo}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: cfg.bg, border: `1px solid ${cfg.bd}`, color: cfg.color,
              }}>{cfg.label}</span>
              <span style={{ fontSize: 12, color: L.t3 }}>{entries.length} paciente{entries.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(({ pacId, pac, allParts }) => {
                const idade = calcIdade(pac.data_nascimento)
                const atendidas = allParts.filter(p => p.data_atendimento)
                  .sort((a, b) => new Date(b.data_atendimento) - new Date(a.data_atendimento))
                const lastAtend = atendidas[0]?.data_atendimento
                const campNomes = [...new Set(allParts.map(p => campMap[p.campanha_id]?.nome).filter(Boolean))]

                // next action: find next convocacao upcoming
                const proximaConvoc = allParts
                  .filter(p => p.data_convocacao && new Date(p.data_convocacao + 'T00:00:00') > new Date())
                  .sort((a, b) => new Date(a.data_convocacao) - new Date(b.data_convocacao))[0]

                return (
                  <div key={pacId} style={{
                    background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                    padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{pac.nome}</div>
                      <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>
                        {idade !== null ? `${idade} anos` : ''}
                        {pac.telefone ? ` · ${pac.telefone}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: L.t3, flex: 1, minWidth: 140 }}>
                      <div style={{ marginBottom: 3 }}>
                        <span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>CAMPANHAS </span>
                        <span style={{ color: L.t2, fontWeight: 600 }}>{campNomes.slice(0, 2).join(', ')}{campNomes.length > 2 ? `…` : ''}</span>
                      </div>
                      <div>
                        <span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>ÚLT. ATENDIMENTO </span>
                        <span style={{ color: lastAtend ? L.t2 : L.red, fontWeight: 600 }}>
                          {lastAtend ? fmtDate(lastAtend) : 'Nunca'}
                        </span>
                      </div>
                    </div>
                    {proximaConvoc && (
                      <div style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 8,
                        background: L.tealBg, border: `1px solid #99d6d6`, color: L.teal, fontWeight: 600,
                      }}>
                        Próx: {fmtDate(proximaConvoc.data_convocacao)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {Object.keys(byTipo).length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: L.t3 }}>
          Nenhum dado de acompanhamento disponível ainda.
        </div>
      )}

      {/* Sem acompanhamento > 90 dias */}
      {semAcomp.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: L.redBg, border: `1px solid ${L.redBd}`, color: L.red,
            }}>Sem acompanhamento &gt; 90 dias</span>
            <span style={{ fontSize: 12, color: L.t3 }}>{semAcomp.length} paciente{semAcomp.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {semAcomp.map(({ pacId, pac, lastContact, days, parts }) => {
              const idade = calcIdade(pac.data_nascimento)
              const campNomes = [...new Set(parts.map(p => campMap[p.campanha_id]?.nome).filter(Boolean))]
              return (
                <div key={pacId} style={{
                  background: L.bg, border: `1px solid ${L.redBd}`, borderRadius: 12,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{pac.nome}</div>
                    <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>
                      {idade !== null ? `${idade} anos` : ''}
                      {pac.telefone ? ` · ${pac.telefone}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: L.t3 }}>
                    {campNomes.slice(0, 2).join(', ')}
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: L.redBg, border: `1px solid ${L.redBd}`, color: L.red,
                  }}>
                    {days === 999 ? 'Nunca atendido' : `${days} dias sem contato`}
                  </div>
                  <div style={{ fontSize: 11, color: L.t4 }}>
                    Último contato: {lastContact ? fmtDate(lastContact) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PageCampanhas({ profile }) {
  const [tab, setTab]             = useState(0)
  const [campanhas, setCampanhas] = useState([])
  const [participantes, setParticipantes] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)

  const clinicaId = profile?.clinica_id

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [c, p, pac] = await Promise.all([
      supabase.from('campanhas').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('campanha_participantes').select('*').eq('clinica_id', clinicaId),
      supabase.from('pacientes').select('id, nome, data_nascimento, telefone, email').eq('clinica_id', clinicaId).order('nome'),
    ])
    setCampanhas(c.data || [])
    setParticipantes(p.data || [])
    setPacientes(pac.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const TABS = ['Campanhas', 'Participantes & Convocação', 'Acompanhamento']

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: L.t1, marginBottom: 4 }}>Campanhas de Saúde</div>
        <div style={{ fontSize: 13, color: L.t3 }}>
          Gestão de campanhas, convocações e acompanhamento de pacientes crônicos.
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24,
        borderBottom: `1px solid ${L.line}`, paddingBottom: 0,
      }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
            color: tab === i ? L.teal : L.t3, background: 'transparent', border: 'none',
            borderBottom: tab === i ? `2.5px solid ${L.teal}` : '2.5px solid transparent',
            cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: 10, color: L.t3 }}>
          <span style={{ width: 20, height: 20, border: `2px solid ${L.line}`, borderTopColor: L.teal,
            borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          Carregando campanhas…
        </div>
      ) : (
        <div style={{ animation: 'up 0.2s ease' }}>
          {tab === 0 && (
            <TabCampanhas
              clinicaId={clinicaId}
              campanhas={campanhas}
              participantes={participantes}
              onReload={load}
              setToast={setToast}
            />
          )}
          {tab === 1 && (
            <TabParticipantes
              clinicaId={clinicaId}
              campanhas={campanhas}
              participantes={participantes}
              pacientes={pacientes}
              onReload={load}
              setToast={setToast}
            />
          )}
          {tab === 2 && (
            <TabAcompanhamento
              campanhas={campanhas}
              participantes={participantes}
              pacientes={pacientes}
            />
          )}
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
