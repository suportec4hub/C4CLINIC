import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Shared helpers ─────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

function onFocus(e) { e.target.style.borderColor = L.teal }
function onBlur(e)  { e.target.style.borderColor = L.line  }

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

function Row({ children, gap = 12 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>{children}</div>
}

function Modal({ title, onClose, children, wide = false }) {
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
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 720 : 560, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      </div>
    </div>
  )
}

function KPI({ label, value, color, sub }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 140
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.t1, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Badge({ label, bg, color, bd, pulse = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: bg, color, border: `1px solid ${bd || 'transparent'}`,
      animation: pulse ? 'pulse 1.4s ease-in-out infinite' : 'none',
      textTransform: 'capitalize',
    }}>{label}</span>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      border: `2.5px solid ${L.line}`, borderTopColor: L.teal,
      animation: 'spin 0.7s linear infinite', margin: '0 auto'
    }} />
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

function dateColor(d) {
  if (!d) return L.t3
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const dt = new Date(d + 'T00:00:00')
  const diff = (dt - now) / 86400000
  if (diff < 0) return L.red
  if (diff <= 30) return L.yellow
  return L.t2
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMoney(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Badge helpers ───────────────────────────────────────────────────────────

const EQ_STATUS = {
  ativo:          { label: 'Ativo',          bg: L.greenBg,  color: L.green,  bd: L.greenBd  },
  em_manutencao:  { label: 'Em Manutenção',  bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
  desativado:     { label: 'Desativado',     bg: L.surface,  color: L.t3,     bd: L.line     },
}

const OS_TIPO = {
  preventiva:  { label: 'Preventiva',  bg: L.blueBg,   color: L.blue   },
  corretiva:   { label: 'Corretiva',   bg: L.redBg,    color: L.red    },
  calibracao:  { label: 'Calibração',  bg: L.purpleBg, color: L.purple },
  higienizacao:{ label: 'Higienização',bg: L.tealBg,   color: L.teal   },
}

const OS_PRIO = {
  baixa:   { label: 'Baixa',   bg: L.surface,  color: L.t3,    bd: L.line,    pulse: false },
  media:   { label: 'Média',   bg: L.yellowBg, color: L.yellow,bd: L.yellowBd,pulse: false },
  alta:    { label: 'Alta',    bg: L.orangeBg, color: L.orange,bd: L.orangeBd,pulse: false },
  critica: { label: 'Crítica', bg: L.redBg,    color: L.red,   bd: L.redBd,   pulse: true  },
}

const OS_STATUS = {
  aberta:       { label: 'Aberta',       bg: L.blueBg,   color: L.blue   },
  em_andamento: { label: 'Em Andamento', bg: L.yellowBg, color: L.yellow },
  concluida:    { label: 'Concluída',    bg: L.greenBg,  color: L.green  },
  cancelada:    { label: 'Cancelada',    bg: L.surface,  color: L.t3     },
}

const SETORES = ['Recepção','Consultório','Sala de Procedimentos','Laboratório','Farmácia','UTI','Centro Cirúrgico','Administração','Outros']

// ─── Tab 0 — Equipamentos ────────────────────────────────────────────────────

function TabEquipamentos({ clinicaId, equipamentos, loading, reload, onAbrirOS }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [busca, setBusca]     = useState('')

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const hoje = today()

  const kpis = {
    total:       equipamentos.length,
    manutencao:  equipamentos.filter(e => e.status === 'em_manutencao').length,
    manVencida:  equipamentos.filter(e => e.proxima_manutencao && e.proxima_manutencao < hoje).length,
    calVencida:  equipamentos.filter(e => e.proxima_calibracao  && e.proxima_calibracao  < hoje).length,
  }

  const lista = equipamentos.filter(e => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      (e.nome        || '').toLowerCase().includes(q) ||
      (e.fabricante  || '').toLowerCase().includes(q) ||
      (e.modelo      || '').toLowerCase().includes(q) ||
      (e.numero_serie|| '').toLowerCase().includes(q) ||
      (e.setor       || '').toLowerCase().includes(q)
    )
  })

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, status: 'ativo' })
    setShowForm(true)
  }

  function abrirEditar(eq) {
    setForm({ ...eq })
    setShowForm(true)
  }

  async function salvar() {
    if (!form.nome) return
    setSaving(true)
    if (form.id) {
      const { id, ...rest } = form
      await supabase.from('equipamentos').update(rest).eq('id', id)
    } else {
      await supabase.from('equipamentos').insert({ ...form, criado_em: new Date().toISOString() })
    }
    setSaving(false)
    setShowForm(false)
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="TOTAL EQUIPAMENTOS" value={kpis.total} />
        <KPI label="EM MANUTENÇÃO"       value={kpis.manutencao}  color={kpis.manutencao  > 0 ? L.yellow : L.green} />
        <KPI label="MANUTENÇÃO VENCIDA"  value={kpis.manVencida}  color={kpis.manVencida  > 0 ? L.red    : L.green} />
        <KPI label="CALIBRAÇÕES VENCIDAS"value={kpis.calVencida}  color={kpis.calVencida  > 0 ? L.red    : L.green} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ ...inp, flex: 1, minWidth: 200, maxWidth: 360 }}
          placeholder="Buscar equipamento, setor, fabricante…"
          value={busca} onChange={e => setBusca(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
        />
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>+ Novo Equipamento</button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: L.t4, fontSize: 14 }}>
          Nenhum equipamento encontrado.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {lista.map(eq => {
            const st  = EQ_STATUS[eq.status] || EQ_STATUS.ativo
            const mcol = dateColor(eq.proxima_manutencao)
            const ccol = dateColor(eq.proxima_calibracao)
            return (
              <div key={eq.id} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
                padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: L.shadow
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{eq.nome}</div>
                    <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                      {[eq.fabricante, eq.modelo].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Badge label={st.label} bg={st.bg} color={st.color} bd={st.bd} />
                </div>

                {/* Info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {eq.setor && (
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: L.tealBg, color: L.teal }}>
                      {eq.setor}
                    </span>
                  )}
                  {eq.numero_serie && (
                    <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                      S/N: {eq.numero_serie}
                    </span>
                  )}
                </div>

                {/* Datas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>PRÓX. MANUTENÇÃO</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: mcol }}>{fmtDate(eq.proxima_manutencao)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>PRÓX. CALIBRAÇÃO</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ccol }}>{fmtDate(eq.proxima_calibracao)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${L.line}`, paddingTop: 12 }}>
                  <button onClick={() => onAbrirOS(eq)} style={{
                    flex: 1, padding: '7px 0', background: L.teal, color: L.white,
                    borderRadius: 8, fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer'
                  }}>Abrir OS</button>
                  <button onClick={() => abrirEditar(eq)} style={{
                    flex: 1, padding: '7px 0', background: 'transparent', color: L.t2,
                    borderRadius: 8, fontWeight: 500, fontSize: 12,
                    border: `1px solid ${L.line}`, cursor: 'pointer'
                  }}>Editar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <Modal title={form.id ? 'Editar Equipamento' : 'Novo Equipamento'} onClose={() => setShowForm(false)}>
          <Field label="NOME DO EQUIPAMENTO *">
            <input style={inp} value={form.nome || ''} onChange={e => f('nome', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Ex: Autoclave vertical" />
          </Field>
          <Row>
            <Field label="FABRICANTE">
              <input style={inp} value={form.fabricante || ''} onChange={e => f('fabricante', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Ex: Cristofoli" />
            </Field>
            <Field label="MODELO">
              <input style={inp} value={form.modelo || ''} onChange={e => f('modelo', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Ex: MSS 21L" />
            </Field>
          </Row>
          <Row>
            <Field label="NÚMERO DE SÉRIE">
              <input style={inp} value={form.numero_serie || ''} onChange={e => f('numero_serie', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label="SETOR">
              <select style={inp} value={form.setor || ''} onChange={e => f('setor', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Selecionar…</option>
                {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="DATA DE AQUISIÇÃO">
              <input type="date" style={inp} value={form.data_aquisicao || ''} onChange={e => f('data_aquisicao', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label="VALOR DE AQUISIÇÃO (R$)">
              <input type="number" style={inp} value={form.valor_aquisicao || ''} onChange={e => f('valor_aquisicao', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="0,00" min="0" step="0.01" />
            </Field>
          </Row>
          <Row>
            <Field label="PRÓXIMA MANUTENÇÃO">
              <input type="date" style={inp} value={form.proxima_manutencao || ''} onChange={e => f('proxima_manutencao', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label="PRÓXIMA CALIBRAÇÃO">
              <input type="date" style={inp} value={form.proxima_calibracao || ''} onChange={e => f('proxima_calibracao', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          </Row>
          <Field label="STATUS">
            <select style={inp} value={form.status || 'ativo'} onChange={e => f('status', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
              <option value="ativo">Ativo</option>
              <option value="em_manutencao">Em Manutenção</option>
              <option value="desativado">Desativado</option>
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={() => setShowForm(false)} style={{
              padding: '9px 20px', background: 'transparent', color: L.t2,
              border: `1px solid ${L.line}`, borderRadius: 9, fontWeight: 500, fontSize: 13, cursor: 'pointer'
            }}>Cancelar</button>
            <button onClick={salvar} disabled={saving} style={{
              padding: '9px 20px', background: L.teal, color: L.white,
              border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6
            }}>
              {saving ? <><span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /></> : null}
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab 1 — Ordens de Serviço ───────────────────────────────────────────────

function TabOrdens({ clinicaId, equipamentos, reload }) {
  const [ordens, setOrdens]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [viewOS, setViewOS]       = useState(null)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [fTipo, setFTipo]         = useState('')
  const [fPrio, setFPrio]         = useState('')
  const [fStatus, setFStatus]     = useState('')
  const [fEq, setFEq]             = useState('')

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const loadOrdens = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const { data } = await supabase.from('ordens_servico')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
    setOrdens(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { loadOrdens() }, [loadOrdens])

  const hoje = today()
  const iniMes = hoje.slice(0, 7) + '-01'

  const kpis = {
    abertas:      ordens.filter(o => o.status === 'aberta').length,
    emAndamento:  ordens.filter(o => o.status === 'em_andamento').length,
    criticas:     ordens.filter(o => o.prioridade === 'critica' && o.status !== 'concluida' && o.status !== 'cancelada').length,
    concluidasMes:ordens.filter(o => o.status === 'concluida' && o.data_conclusao >= iniMes).length,
  }

  const lista = ordens.filter(o => {
    if (fTipo   && o.tipo      !== fTipo)   return false
    if (fPrio   && o.prioridade!== fPrio)   return false
    if (fStatus && o.status    !== fStatus) return false
    if (fEq     && String(o.equipamento_id) !== fEq) return false
    return true
  })

  function abrirNovaOS(eq = null) {
    setForm({
      clinica_id: clinicaId,
      tipo: 'preventiva', prioridade: 'media', status: 'aberta',
      data_abertura: hoje,
      equipamento_id: eq ? eq.id : '',
    })
    setShowForm(true)
  }

  async function salvarOS() {
    if (!form.titulo || !form.equipamento_id) return
    setSaving(true)
    const payload = {
      ...form,
      custo: form.custo ? Number(form.custo) : null,
      equipamento_id: Number(form.equipamento_id),
    }
    if (form.id) {
      const { id, ...rest } = payload
      await supabase.from('ordens_servico').update(rest).eq('id', id)
    } else {
      await supabase.from('ordens_servico').insert({ ...payload, criado_em: new Date().toISOString() })
    }
    setSaving(false)
    setShowForm(false)
    loadOrdens()
  }

  async function iniciarOS(os) {
    await supabase.from('ordens_servico').update({ status: 'em_andamento' }).eq('id', os.id)
    loadOrdens()
  }

  async function concluirOS(os) {
    await supabase.from('ordens_servico').update({ status: 'concluida', data_conclusao: hoje }).eq('id', os.id)
    loadOrdens()
  }

  function nomeEq(id) {
    const e = equipamentos.find(x => x.id === id)
    return e ? e.nome : `#${id}`
  }

  const sel = { ...inp, height: 36 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KPI label="ABERTAS"          value={kpis.abertas}       color={kpis.abertas       > 0 ? L.blue   : L.t1} />
        <KPI label="EM ANDAMENTO"     value={kpis.emAndamento}   color={kpis.emAndamento   > 0 ? L.yellow : L.t1} />
        <KPI label="CRÍTICAS ABERTAS" value={kpis.criticas}      color={kpis.criticas      > 0 ? L.red    : L.t1} />
        <KPI label="CONCLUÍDAS (MÊS)" value={kpis.concluidasMes} color={L.green} />
      </div>

      {/* Filters + button */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...sel, flex: '0 0 auto', minWidth: 130 }} value={fTipo} onChange={e => setFTipo(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Todos os tipos</option>
          {Object.entries(OS_TIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={{ ...sel, flex: '0 0 auto', minWidth: 130 }} value={fPrio} onChange={e => setFPrio(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Todas prioridades</option>
          {Object.entries(OS_PRIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={{ ...sel, flex: '0 0 auto', minWidth: 130 }} value={fStatus} onChange={e => setFStatus(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Todos status</option>
          {Object.entries(OS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={{ ...sel, flex: '1', minWidth: 160, maxWidth: 260 }} value={fEq} onChange={e => setFEq(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Todos equipamentos</option>
          {equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => abrirNovaOS()} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
          cursor: 'pointer', whiteSpace: 'nowrap'
        }}>+ Nova OS</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : lista.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: L.t4, fontSize: 14 }}>
          Nenhuma ordem de serviço encontrada.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${L.line}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['#', 'Equipamento', 'Tipo', 'Título', 'Prioridade', 'Status', 'Responsável', 'Prev.', 'Custo', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left', fontWeight: 600,
                    fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                    borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((os, i) => {
                const tipo   = OS_TIPO[os.tipo]   || OS_TIPO.preventiva
                const prio   = OS_PRIO[os.prioridade] || OS_PRIO.media
                const status = OS_STATUS[os.status]   || OS_STATUS.aberta
                const prevColor = dateColor(os.data_prevista)
                const even = i % 2 === 0
                return (
                  <tr key={os.id} style={{ background: even ? L.bg : L.surface }}>
                    <td style={{ padding: '11px 14px', color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>#{os.id}</td>
                    <td style={{ padding: '11px 14px', color: L.t2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeEq(os.equipamento_id)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <Badge label={tipo.label} bg={tipo.bg} color={tipo.color} />
                    </td>
                    <td style={{ padding: '11px 14px', color: L.t1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.titulo}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <Badge label={prio.label} bg={prio.bg} color={prio.color} bd={prio.bd} pulse={prio.pulse} />
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <Badge label={status.label} bg={status.bg} color={status.color} />
                    </td>
                    <td style={{ padding: '11px 14px', color: L.t3, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.responsavel || '—'}</td>
                    <td style={{ padding: '11px 14px', color: prevColor, fontWeight: prevColor === L.red ? 600 : 400, whiteSpace: 'nowrap' }}>{fmtDate(os.data_prevista)}</td>
                    <td style={{ padding: '11px 14px', color: L.t2, whiteSpace: 'nowrap' }}>{fmtMoney(os.custo)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {os.status === 'aberta' && (
                          <button onClick={() => iniciarOS(os)} style={{
                            padding: '4px 10px', background: L.yellowBg, color: L.yellow,
                            border: `1px solid ${L.yellowBd}`, borderRadius: 7, fontSize: 11,
                            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                          }}>Iniciar</button>
                        )}
                        {(os.status === 'aberta' || os.status === 'em_andamento') && (
                          <button onClick={() => concluirOS(os)} style={{
                            padding: '4px 10px', background: L.greenBg, color: L.green,
                            border: `1px solid ${L.greenBd}`, borderRadius: 7, fontSize: 11,
                            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                          }}>Concluir</button>
                        )}
                        <button onClick={() => setViewOS(os)} style={{
                          padding: '4px 10px', background: L.surface, color: L.t2,
                          border: `1px solid ${L.line}`, borderRadius: 7, fontSize: 11,
                          fontWeight: 500, cursor: 'pointer'
                        }}>Ver</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nova OS modal */}
      {showForm && (
        <Modal title="Nova Ordem de Serviço" onClose={() => setShowForm(false)} wide>
          <Field label="EQUIPAMENTO *">
            <select style={inp} value={form.equipamento_id || ''} onChange={e => f('equipamento_id', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
              <option value="">Selecionar equipamento…</option>
              {equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Field>
          <Row>
            <Field label="TIPO">
              <select style={inp} value={form.tipo || 'preventiva'} onChange={e => f('tipo', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                {Object.entries(OS_TIPO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="PRIORIDADE">
              <select style={inp} value={form.prioridade || 'media'} onChange={e => f('prioridade', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                {Object.entries(OS_PRIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </Row>
          <Field label="TÍTULO *">
            <input style={inp} value={form.titulo || ''} onChange={e => f('titulo', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Descreva brevemente a OS" />
          </Field>
          <Field label="DESCRIÇÃO">
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={form.descricao || ''} onChange={e => f('descricao', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Detalhes, sintomas, procedimentos…" />
          </Field>
          <Row>
            <Field label="RESPONSÁVEL">
              <input style={inp} value={form.responsavel || ''} onChange={e => f('responsavel', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Nome do técnico" />
            </Field>
            <Field label="FORNECEDOR">
              <input style={inp} value={form.fornecedor || ''} onChange={e => f('fornecedor', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Empresa prestadora" />
            </Field>
          </Row>
          <Row>
            <Field label="CUSTO ESTIMADO (R$)">
              <input type="number" style={inp} value={form.custo || ''} onChange={e => f('custo', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="0,00" min="0" step="0.01" />
            </Field>
            <Field label="STATUS">
              <select style={inp} value={form.status || 'aberta'} onChange={e => f('status', e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                {Object.entries(OS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="DATA DE ABERTURA">
              <input type="date" style={inp} value={form.data_abertura || hoje} onChange={e => f('data_abertura', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
            <Field label="DATA PREVISTA">
              <input type="date" style={inp} value={form.data_prevista || ''} onChange={e => f('data_prevista', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
            </Field>
          </Row>
          <Field label="OBSERVAÇÕES">
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }} value={form.observacoes || ''} onChange={e => f('observacoes', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={() => setShowForm(false)} style={{
              padding: '9px 20px', background: 'transparent', color: L.t2,
              border: `1px solid ${L.line}`, borderRadius: 9, fontWeight: 500, fontSize: 13, cursor: 'pointer'
            }}>Cancelar</button>
            <button onClick={salvarOS} disabled={saving} style={{
              padding: '9px 20px', background: L.teal, color: L.white,
              border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
              cursor: 'pointer', opacity: saving ? 0.7 : 1
            }}>{saving ? 'Salvando…' : 'Criar OS'}</button>
          </div>
        </Modal>
      )}

      {/* View OS detail */}
      {viewOS && (
        <Modal title={`OS #${viewOS.id} — ${viewOS.titulo}`} onClose={() => setViewOS(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>EQUIPAMENTO</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>{nomeEq(viewOS.equipamento_id)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>TIPO</div>
              <Badge label={(OS_TIPO[viewOS.tipo] || OS_TIPO.preventiva).label} bg={(OS_TIPO[viewOS.tipo] || OS_TIPO.preventiva).bg} color={(OS_TIPO[viewOS.tipo] || OS_TIPO.preventiva).color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>PRIORIDADE</div>
              <Badge {...(OS_PRIO[viewOS.prioridade] || OS_PRIO.media)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>STATUS</div>
              <Badge label={(OS_STATUS[viewOS.status] || OS_STATUS.aberta).label} bg={(OS_STATUS[viewOS.status] || OS_STATUS.aberta).bg} color={(OS_STATUS[viewOS.status] || OS_STATUS.aberta).color} />
            </div>
            {viewOS.responsavel && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>RESPONSÁVEL</div>
                <div style={{ fontSize: 13, color: L.t1 }}>{viewOS.responsavel}</div>
              </div>
            )}
            {viewOS.fornecedor && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>FORNECEDOR</div>
                <div style={{ fontSize: 13, color: L.t1 }}>{viewOS.fornecedor}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>DATA ABERTURA</div>
              <div style={{ fontSize: 13, color: L.t1 }}>{fmtDate(viewOS.data_abertura)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>DATA PREVISTA</div>
              <div style={{ fontSize: 13, color: dateColor(viewOS.data_prevista) }}>{fmtDate(viewOS.data_prevista)}</div>
            </div>
            {viewOS.data_conclusao && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>DATA CONCLUSÃO</div>
                <div style={{ fontSize: 13, color: L.green }}>{fmtDate(viewOS.data_conclusao)}</div>
              </div>
            )}
            {viewOS.custo != null && (
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>CUSTO</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{fmtMoney(viewOS.custo)}</div>
              </div>
            )}
          </div>
          {viewOS.descricao && (
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>DESCRIÇÃO</div>
              <div style={{ fontSize: 13, color: L.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: L.surface, borderRadius: 8, padding: '12px 14px' }}>{viewOS.descricao}</div>
            </div>
          )}
          {viewOS.observacoes && (
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>OBSERVAÇÕES</div>
              <div style={{ fontSize: 13, color: L.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', background: L.surface, borderRadius: 8, padding: '12px 14px' }}>{viewOS.observacoes}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            {viewOS.status === 'aberta' && (
              <button onClick={async () => { await iniciarOS(viewOS); setViewOS(null) }} style={{
                padding: '9px 18px', background: L.yellowBg, color: L.yellow,
                border: `1px solid ${L.yellowBd}`, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}>Iniciar OS</button>
            )}
            {(viewOS.status === 'aberta' || viewOS.status === 'em_andamento') && (
              <button onClick={async () => { await concluirOS(viewOS); setViewOS(null) }} style={{
                padding: '9px 18px', background: L.greenBg, color: L.green,
                border: `1px solid ${L.greenBd}`, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}>Concluir OS</button>
            )}
            <button onClick={() => setViewOS(null)} style={{
              padding: '9px 18px', background: 'transparent', color: L.t2,
              border: `1px solid ${L.line}`, borderRadius: 9, fontWeight: 500, fontSize: 13, cursor: 'pointer'
            }}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab 2 — Agenda de Manutenção ────────────────────────────────────────────

function TabAgenda({ clinicaId, equipamentos }) {
  const [ordens, setOrdens]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicaId) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('ordens_servico')
        .select('*')
        .eq('clinica_id', clinicaId)
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true })
      setOrdens(data || [])
      setLoading(false)
    })()
  }, [clinicaId])

  const hoje = today()
  const dt90 = new Date(); dt90.setDate(dt90.getDate() + 90)
  const dt90str = dt90.toISOString().slice(0, 10)

  // Auto-generated upcoming preventive from equipamentos
  const preventivas = equipamentos
    .filter(e => e.proxima_manutencao && e.proxima_manutencao <= dt90str && e.proxima_manutencao >= hoje)
    .map(e => ({
      _synthetic: true,
      id: `eq-${e.id}`,
      equipamento_id: e.id,
      _eq_nome: e.nome,
      tipo: 'preventiva',
      titulo: `Manutenção preventiva — ${e.nome}`,
      prioridade: e.proxima_manutencao < hoje ? 'alta' : 'media',
      status: 'aberta',
      data_prevista: e.proxima_manutencao,
    }))

  // Merge and sort
  const merged = [
    ...ordens,
    ...preventivas.filter(p => !ordens.find(o =>
      o.equipamento_id === p.equipamento_id &&
      o.tipo === 'preventiva' &&
      o.data_prevista === p.data_prevista
    )),
  ].sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''))

  // Group by month
  const groups = {}
  merged.forEach(item => {
    const ym = (item.data_prevista || 'sem-data').slice(0, 7)
    if (!groups[ym]) groups[ym] = []
    groups[ym].push(item)
  })

  function monthLabel(ym) {
    if (ym === 'sem-data') return 'Sem data prevista'
    const [y, m] = ym.split('-')
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    return `${months[parseInt(m) - 1]} ${y}`
  }

  function nomeEq(id) {
    const e = equipamentos.find(x => x.id === id)
    return e ? e.nome : `#${id}`
  }

  function exportCSV() {
    const rows = [
      ['ID','Equipamento','Tipo','Título','Prioridade','Status','Data Prevista','Responsável','Custo'],
      ...merged.map(o => [
        o._synthetic ? o.id : `#${o.id}`,
        o._synthetic ? o._eq_nome : nomeEq(o.equipamento_id),
        (OS_TIPO[o.tipo]||OS_TIPO.preventiva).label,
        o.titulo || '',
        (OS_PRIO[o.prioridade]||OS_PRIO.media).label,
        (OS_STATUS[o.status]||OS_STATUS.aberta).label,
        fmtDate(o.data_prevista),
        o.responsavel || '',
        o.custo != null ? Number(o.custo).toFixed(2) : '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'agenda_manutencao.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Agenda de Manutenção</div>
          <div style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
            OS por data prevista + manutenções preventivas dos próximos 90 dias
          </div>
        </div>
        <button onClick={exportCSV} style={{
          padding: '9px 18px', background: 'transparent', color: L.teal,
          border: `1.5px solid ${L.teal}`, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer'
        }}>Exportar Agenda CSV</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : merged.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: L.t4, fontSize: 14 }}>
          Nenhum item de agenda encontrado.
        </div>
      ) : (
        Object.entries(groups).map(([ym, items]) => (
          <div key={ym}>
            {/* Month header */}
            <div style={{
              fontSize: 13, fontWeight: 700, color: L.teal,
              fontFamily: "'JetBrains Mono', monospace",
              padding: '10px 0 8px',
              borderBottom: `2px solid ${L.tealBg}`,
              marginBottom: 12,
              letterSpacing: '0.5px'
            }}>{monthLabel(ym)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => {
                const prio   = OS_PRIO[item.prioridade]   || OS_PRIO.media
                const tipo   = OS_TIPO[item.tipo]         || OS_TIPO.preventiva
                const status = OS_STATUS[item.status]     || OS_STATUS.aberta
                const past   = item.data_prevista && item.data_prevista < hoje
                return (
                  <div key={item.id} style={{
                    background: L.bg, border: `1px solid ${L.line}`, borderRadius: 10,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    borderLeft: `4px solid ${prio.color}`,
                    boxShadow: L.shadow, flexWrap: 'wrap'
                  }}>
                    {/* Date */}
                    <div style={{ minWidth: 80, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: past ? L.red : L.t1, fontFamily: "'Outfit', sans-serif" }}>
                        {item.data_prevista ? item.data_prevista.slice(8) : '??'}
                      </div>
                      <div style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.data_prevista ? item.data_prevista.slice(5, 7) + '/' + item.data_prevista.slice(0, 4) : ''}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, height: 40, background: L.line, flexShrink: 0 }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.titulo || '(sem título)'}
                      </div>
                      <div style={{ fontSize: 12, color: L.t3, marginTop: 3 }}>
                        {item._synthetic ? item._eq_nome : nomeEq(item.equipamento_id)}
                        {item.responsavel ? ` · ${item.responsavel}` : ''}
                        {item._synthetic ? ' · Auto-agendado' : ''}
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                      <Badge label={tipo.label}   bg={tipo.bg}   color={tipo.color} />
                      <Badge label={prio.label}   bg={prio.bg}   color={prio.color} bd={prio.bd} pulse={prio.pulse} />
                      <Badge label={status.label} bg={status.bg} color={status.color} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS = ['Equipamentos', 'Ordens de Serviço', 'Agenda de Manutenção']

export default function PageManutencao({ profile }) {
  const [tab, setTab]               = useState(0)
  const [equipamentos, setEquipamentos] = useState([])
  const [loadingEq, setLoadingEq]   = useState(true)
  const [preFilledEq, setPreFilledEq] = useState(null)

  const clinicaId = profile?.clinica_id

  const loadEquipamentos = useCallback(async () => {
    if (!clinicaId) return
    setLoadingEq(true)
    const { data } = await supabase.from('equipamentos')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setEquipamentos(data || [])
    setLoadingEq(false)
  }, [clinicaId])

  useEffect(() => { loadEquipamentos() }, [loadEquipamentos])

  function handleAbrirOS(eq) {
    setPreFilledEq(eq)
    setTab(1)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto' }}>
      <style>{`
        @keyframes up   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: L.t1, fontFamily: "'Outfit', sans-serif" }}>
          Manutenção de Equipamentos
        </div>
        <div style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
          Gestão de manutenções preventivas, corretivas, calibrações e ordens de serviço
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: `1px solid ${L.line}`, marginBottom: 24,
        overflowX: 'auto', paddingBottom: 1
      }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '10px 18px', fontWeight: tab === i ? 700 : 500,
            fontSize: 13, color: tab === i ? L.teal : L.t3,
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2.5px solid ${tab === i ? L.teal : 'transparent'}`,
            transition: 'color 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap', marginBottom: -1
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ animation: 'up 0.2s ease' }} key={tab}>
        {tab === 0 && (
          <TabEquipamentos
            clinicaId={clinicaId}
            equipamentos={equipamentos}
            loading={loadingEq}
            reload={loadEquipamentos}
            onAbrirOS={handleAbrirOS}
          />
        )}
        {tab === 1 && (
          <TabOrdens
            clinicaId={clinicaId}
            equipamentos={equipamentos}
            reload={loadEquipamentos}
            preFilledEq={preFilledEq}
          />
        )}
        {tab === 2 && (
          <TabAgenda
            clinicaId={clinicaId}
            equipamentos={equipamentos}
          />
        )}
      </div>
    </div>
  )
}
