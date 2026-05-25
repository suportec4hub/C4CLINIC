import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── helpers ─────────────────────────────────────────────────── */
function fmtTime(iso) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function fmtDuration(min) {
  if (!min && min !== 0) return '-'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function plusDaysISO(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/* ─── design tokens ───────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const btnPrimary = {
  background: L.teal, color: L.white, border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnGhost = {
  background: 'none', color: L.t2, border: `1.5px solid ${L.line}`,
  borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

const PORTE_MAP = {
  pequeno:  { label: 'Pequeno',  color: L.green,  bg: L.greenBg },
  medio:    { label: 'Médio',    color: L.yellow, bg: L.yellowBg },
  grande:   { label: 'Grande',   color: L.orange, bg: L.orangeBg },
  especial: { label: 'Especial', color: L.red,    bg: L.redBg },
}
const STATUS_MAP = {
  agendada:     { label: 'Agendada',     color: L.blue,   bg: L.blueBg },
  em_andamento: { label: 'Em Andamento', color: L.teal,   bg: L.tealBg },
  concluida:    { label: 'Concluída',    color: L.green,  bg: L.greenBg },
  cancelada:    { label: 'Cancelada',    color: L.red,    bg: L.redBg },
  suspensa:     { label: 'Suspensa',     color: L.yellow, bg: L.yellowBg },
}

/* ─── shared components ───────────────────────────────────────── */
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

function PorteBadge({ porte }) {
  const p = PORTE_MAP[porte] || { label: porte, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      color: p.color, background: p.bg,
    }}>{p.label}</span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: L.t3, bg: L.surface }
  const pulse = status === 'em_andamento'
    ? { animation: 'pulse 1.4s ease infinite' } : {}
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg, ...pulse,
    }}>{s.label}</span>
  )
}

function Modal({ title, onClose, wide, children }) {
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
        width: '100%', maxWidth: wide ? 780 : 560,
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
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: `2px solid ${L.line}`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.surface, borderRadius: 12, padding: '14px 18px',
      flex: 1, minWidth: 120, border: `1px solid ${L.line}`,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || L.t1 }}>{value}</div>
    </div>
  )
}

/* ─── Tab 1: Programação Cirúrgica ───────────────────────────── */
function TabProgramacao({ profile }) {
  const [cirurgias, setCirurgias] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [salas, setSalas] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(todayISO())
  const [dateTo, setDateTo]   = useState(plusDaysISO(7))
  const [showNova, setShowNova] = useState(false)
  const [concluirModal, setConcluirModal] = useState(null)   // cirurgia obj
  const [cancelarModal, setCancelarModal] = useState(null)   // cirurgia obj
  const [saving, setSaving] = useState(false)
  const [pacienteSearch, setPacienteSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cirurgias')
      .select(`
        *,
        pacientes(id, nome, data_nascimento),
        medicos(id, nome),
        salas(id, nome)
      `)
      .eq('clinica_id', profile.clinica_id)
      .gte('data_hora_inicio', dateFrom + 'T00:00:00')
      .lte('data_hora_inicio', dateTo + 'T23:59:59')
      .order('data_hora_inicio')
    setCirurgias(data || [])
    setLoading(false)
  }, [profile.clinica_id, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('pacientes').select('id,nome,data_nascimento').eq('clinica_id', profile.clinica_id)
      .then(({ data }) => setPacientes(data || []))
    supabase.from('medicos').select('id,nome,especialidade').eq('clinica_id', profile.clinica_id)
      .then(({ data }) => setMedicos(data || []))
    supabase.from('salas').select('id,nome,tipo').eq('clinica_id', profile.clinica_id)
      .then(({ data }) => setSalas(data || []))
  }, [profile.clinica_id])

  const todayStr = todayISO()
  const hoje = cirurgias.filter(c => c.data_hora_inicio?.slice(0, 10) === todayStr)
  const kpiHoje       = hoje.filter(c => c.status === 'agendada').length
  const kpiSemana     = cirurgias.filter(c => c.status === 'agendada').length
  const kpiAndamento  = cirurgias.filter(c => c.status === 'em_andamento').length
  const kpiConcluidas = hoje.filter(c => c.status === 'concluida').length

  async function iniciarCirurgia(id) {
    await supabase.from('cirurgias').update({ status: 'em_andamento' }).eq('id', id)
    load()
  }

  async function concluir(id, duracaoReal, obsFinais) {
    setSaving(true)
    await supabase.from('cirurgias').update({
      status: 'concluida',
      duracao_prevista: duracaoReal ? parseInt(duracaoReal) : undefined,
      observacoes: obsFinais || undefined,
    }).eq('id', id)
    setSaving(false)
    setConcluirModal(null)
    load()
  }

  async function cancelar(id) {
    setSaving(true)
    await supabase.from('cirurgias').update({ status: 'cancelada' }).eq('id', id)
    setSaving(false)
    setCancelarModal(null)
    load()
  }

  const filteredPacientes = pacienteSearch
    ? pacientes.filter(p => p.nome.toLowerCase().includes(pacienteSearch.toLowerCase()))
    : pacientes

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="HOJE AGENDADAS"  value={kpiHoje}       color={L.blue} />
        <KpiCard label="ESTA SEMANA"     value={kpiSemana}     color={L.teal} />
        <KpiCard label="EM ANDAMENTO"    value={kpiAndamento}  color={L.tealMd} />
        <KpiCard label="CONCLUÍDAS HOJE" value={kpiConcluidas} color={L.green} />
      </div>

      {/* Filters + action */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="DE">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="ATÉ">
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
        <button onClick={() => setShowNova(true)} style={btnPrimary}>+ Nova Cirurgia</button>
      </div>

      {/* Surgery list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : cirurgias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t4, fontSize: 14 }}>
          Nenhuma cirurgia no período selecionado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cirurgias.map(c => (
            <SurgeryCard
              key={c.id}
              c={c}
              onIniciar={() => iniciarCirurgia(c.id)}
              onConcluir={() => setConcluirModal(c)}
              onCancelar={() => setCancelarModal(c)}
            />
          ))}
        </div>
      )}

      {/* Nova Cirurgia modal */}
      {showNova && (
        <NovaCirurgiaModal
          profile={profile}
          pacientes={pacientes}
          medicos={medicos}
          salas={salas}
          onClose={() => setShowNova(false)}
          onSaved={() => { setShowNova(false); load() }}
        />
      )}

      {/* Concluir modal */}
      {concluirModal && (
        <ConcluirModal
          cirurgia={concluirModal}
          saving={saving}
          onClose={() => setConcluirModal(null)}
          onConfirm={(dur, obs) => concluir(concluirModal.id, dur, obs)}
        />
      )}

      {/* Cancelar confirm */}
      {cancelarModal && (
        <Modal title="Cancelar Cirurgia" onClose={() => setCancelarModal(null)}>
          <p style={{ color: L.t2, fontSize: 14, marginBottom: 20 }}>
            Confirma o cancelamento da cirurgia de{' '}
            <strong>{cancelarModal.pacientes?.nome}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setCancelarModal(null)} style={btnGhost}>Voltar</button>
            <button onClick={() => cancelar(cancelarModal.id)} style={{ ...btnPrimary, background: L.red }} disabled={saving}>
              {saving ? <Spinner /> : 'Cancelar Cirurgia'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SurgeryCard({ c, onIniciar, onConcluir, onCancelar }) {
  const age = calcAge(c.pacientes?.data_nascimento)
  return (
    <div style={{
      background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
      padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap',
      boxShadow: L.shadow,
    }}>
      {/* Time badge */}
      <div style={{
        background: L.teal, color: L.white, borderRadius: 10,
        padding: '10px 14px', textAlign: 'center', minWidth: 64, flexShrink: 0,
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{fmtTime(c.data_hora_inicio)}</div>
        <div style={{ fontSize: 10, marginTop: 3, opacity: 0.8 }}>{fmtDate(c.data_hora_inicio)}</div>
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{c.pacientes?.nome || '-'}</span>
          {age !== null && <span style={{ fontSize: 12, color: L.t4 }}>{age} anos</span>}
          <PorteBadge porte={c.porte} />
          <StatusBadge status={c.status} />
        </div>
        <div style={{ fontSize: 13, color: L.t2, marginBottom: 6 }}>
          <strong>{c.tipo_cirurgia || '-'}</strong>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: L.t3 }}>
          <span>🩺 {c.medicos?.nome || '-'}</span>
          {c.anestesista && <span>💉 {c.anestesista}</span>}
          <span>🏥 {c.salas?.nome || '-'}</span>
          <span>⏱ {fmtDuration(c.duracao_prevista)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {c.status === 'agendada' && (
          <button onClick={onIniciar} style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12 }}>
            ▶ Iniciar
          </button>
        )}
        {c.status === 'em_andamento' && (
          <button onClick={onConcluir} style={{ ...btnPrimary, background: L.green, padding: '7px 14px', fontSize: 12 }}>
            ✓ Concluir
          </button>
        )}
        {(c.status === 'agendada' || c.status === 'em_andamento') && (
          <button onClick={onCancelar} style={{ ...btnGhost, padding: '6px 14px', fontSize: 12, color: L.red, borderColor: L.redBd || L.red }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

function ConcluirModal({ cirurgia, saving, onClose, onConfirm }) {
  const [dur, setDur] = useState(cirurgia.duracao_prevista || '')
  const [obs, setObs] = useState(cirurgia.observacoes || '')
  return (
    <Modal title="Concluir Cirurgia" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="DURAÇÃO REAL (minutos)">
          <input type="number" value={dur} onChange={e => setDur(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} min={1} />
        </Field>
        <Field label="OBSERVAÇÕES FINAIS">
          <textarea value={obs} onChange={e => setObs(e.target.value)}
            rows={3} style={{ ...inp, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={() => onConfirm(dur, obs)} style={btnPrimary} disabled={saving}>
            {saving ? <Spinner /> : 'Confirmar Conclusão'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NovaCirurgiaModal({ profile, pacientes, medicos, salas, onClose, onSaved }) {
  const salasValidas = salas.filter(s => s.tipo === 'sala_cirurgia' || s.tipo === 'sala_procedimento')
  const [form, setForm] = useState({
    paciente_id: '', cirurgiao_id: '', sala_id: '',
    data_hora_inicio: '', duracao_prevista: 120,
    tipo_cirurgia: '', porte: 'medio', anestesista: '',
    diagnostico: '', observacoes: '',
  })
  const [pSearch, setPSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtPac = pSearch
    ? pacientes.filter(p => p.nome.toLowerCase().includes(pSearch.toLowerCase()))
    : pacientes

  async function save() {
    if (!form.paciente_id) return setErr('Selecione um paciente.')
    if (!form.cirurgiao_id) return setErr('Selecione um cirurgião.')
    if (!form.data_hora_inicio) return setErr('Informe data e hora.')
    if (!form.tipo_cirurgia.trim()) return setErr('Informe o tipo de cirurgia.')
    setSaving(true)
    const { error } = await supabase.from('cirurgias').insert({
      clinica_id: profile.clinica_id,
      paciente_id: form.paciente_id,
      cirurgiao_id: form.cirurgiao_id,
      sala_id: form.sala_id || null,
      data_hora_inicio: form.data_hora_inicio,
      duracao_prevista: parseInt(form.duracao_prevista) || 120,
      tipo_cirurgia: form.tipo_cirurgia,
      porte: form.porte,
      anestesista: form.anestesista || null,
      diagnostico: form.diagnostico || null,
      observacoes: form.observacoes || null,
      status: 'agendada',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Nova Cirurgia" onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Paciente search */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="PACIENTE">
            <input
              placeholder="Buscar paciente pelo nome..."
              value={pSearch}
              onChange={e => { setPSearch(e.target.value); set('paciente_id', '') }}
              style={inp} onFocus={focus} onBlur={blur}
            />
            {pSearch && !form.paciente_id && (
              <div style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8,
                maxHeight: 180, overflowY: 'auto', marginTop: 4, boxShadow: L.shadowMd,
              }}>
                {filtPac.slice(0, 8).map(p => {
                  const age = calcAge(p.data_nascimento)
                  return (
                    <div key={p.id}
                      onMouseDown={() => { set('paciente_id', p.id); setPSearch(`${p.nome}${age !== null ? ` (${age}a)` : ''}`) }}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: L.t1, borderBottom: `1px solid ${L.line}` }}
                      onMouseEnter={e => e.currentTarget.style.background = L.hover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {p.nome}{age !== null ? ` — ${age} anos` : ''}
                    </div>
                  )
                })}
                {filtPac.length === 0 && (
                  <div style={{ padding: '9px 14px', fontSize: 12, color: L.t4 }}>Nenhum paciente encontrado.</div>
                )}
              </div>
            )}
          </Field>
        </div>

        <Field label="CIRURGIÃO">
          <select value={form.cirurgiao_id} onChange={e => set('cirurgiao_id', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Selecione...</option>
            {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>

        <Field label="SALA">
          <select value={form.sala_id} onChange={e => set('sala_id', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Selecione...</option>
            {salasValidas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </Field>

        <Field label="DATA E HORA DE INÍCIO">
          <input type="datetime-local" value={form.data_hora_inicio}
            onChange={e => set('data_hora_inicio', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="DURAÇÃO PREVISTA (minutos)">
          <input type="number" value={form.duracao_prevista}
            onChange={e => set('duracao_prevista', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} min={1} />
        </Field>

        <Field label="TIPO DE CIRURGIA">
          <input value={form.tipo_cirurgia} onChange={e => set('tipo_cirurgia', e.target.value)}
            placeholder="Ex: Colecistectomia laparoscópica"
            style={inp} onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="PORTE">
          <select value={form.porte} onChange={e => set('porte', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="pequeno">Pequeno</option>
            <option value="medio">Médio</option>
            <option value="grande">Grande</option>
            <option value="especial">Especial</option>
          </select>
        </Field>

        <Field label="ANESTESISTA">
          <input value={form.anestesista} onChange={e => set('anestesista', e.target.value)}
            placeholder="Nome do anestesista"
            style={inp} onFocus={focus} onBlur={blur} />
        </Field>

        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="DIAGNÓSTICO">
            <input value={form.diagnostico} onChange={e => set('diagnostico', e.target.value)}
              placeholder="Diagnóstico / indicação cirúrgica"
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="OBSERVAÇÕES">
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              rows={3} style={{ ...inp, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
      </div>

      {err && <div style={{ color: L.red, fontSize: 12, marginTop: 12 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>
          {saving ? <Spinner /> : 'Agendar Cirurgia'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Tab 2: Materiais e Instrumentais ──────────────────────── */
function TabMateriais({ profile }) {
  const [cirurgias, setCirurgias] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [materiais, setMateriais] = useState([])
  const [estoqueItens, setEstoqueItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editMat, setEditMat] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('cirurgias')
      .select('id, tipo_cirurgia, data_hora_inicio, status, pacientes(nome)')
      .eq('clinica_id', profile.clinica_id)
      .in('status', ['agendada', 'em_andamento'])
      .order('data_hora_inicio')
      .then(({ data }) => setCirurgias(data || []))

    supabase.from('estoque_itens')
      .select('id, nome, quantidade_atual')
      .eq('clinica_id', profile.clinica_id)
      .then(({ data }) => setEstoqueItens(data || []))
  }, [profile.clinica_id])

  const loadMateriais = useCallback(async (cid) => {
    if (!cid) return
    setLoading(true)
    const { data } = await supabase.from('materiais_cirurgia')
      .select('*')
      .eq('cirurgia_id', cid)
      .order('id')
    setMateriais(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadMateriais(selectedId) }, [selectedId, loadMateriais])

  async function toggleStatus(mat) {
    const next = mat.status === 'solicitado' ? 'separado'
               : mat.status === 'separado'   ? 'usado'
               : 'solicitado'
    await supabase.from('materiais_cirurgia').update({ status: next }).eq('id', mat.id)
    loadMateriais(selectedId)
  }

  async function updateQtd(mat, usada) {
    await supabase.from('materiais_cirurgia').update({ quantidade_usada: parseFloat(usada) || 0 }).eq('id', mat.id)
    loadMateriais(selectedId)
  }

  const total     = materiais.length
  const separados = materiais.filter(m => m.status === 'separado' || m.status === 'usado').length
  const usados    = materiais.filter(m => m.status === 'usado').length

  return (
    <div>
      {/* Surgery selector */}
      <div style={{ marginBottom: 20 }}>
        <Field label="CIRURGIA">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Selecione uma cirurgia...</option>
            {cirurgias.map(c => (
              <option key={c.id} value={c.id}>
                {fmtDate(c.data_hora_inicio)} {fmtTime(c.data_hora_inicio)} — {c.pacientes?.nome} — {c.tipo_cirurgia}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!selectedId ? (
        <div style={{ textAlign: 'center', padding: 48, color: L.t4, fontSize: 14 }}>
          Selecione uma cirurgia para ver os materiais.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>Lista de Materiais</div>
            <button onClick={() => setShowAdd(true)} style={btnPrimary}>+ Adicionar Material</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          ) : materiais.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: L.t4, fontSize: 13 }}>
              Nenhum material cadastrado para esta cirurgia.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {materiais.map(m => (
                <MatItem key={m.id} mat={m}
                  onToggle={() => toggleStatus(m)}
                  onEdit={() => setEditMat(m)}
                  onUpdateQtd={v => updateQtd(m, v)}
                />
              ))}
            </div>
          )}

          {/* Summary */}
          <div style={{
            background: L.surface, borderRadius: 10, padding: '14px 18px',
            border: `1px solid ${L.line}`, display: 'flex', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 13, color: L.t2 }}>
              Total: <strong style={{ color: L.t1 }}>{total}</strong>
            </div>
            <div style={{ fontSize: 13, color: L.t2 }}>
              Separados: <strong style={{ color: L.teal }}>{separados}</strong>
            </div>
            <div style={{ fontSize: 13, color: L.t2 }}>
              Usados: <strong style={{ color: L.green }}>{usados}</strong>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <AdicionarMaterialModal
          cirurgiaId={selectedId}
          estoqueItens={estoqueItens}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadMateriais(selectedId) }}
        />
      )}

      {editMat && (
        <EditarMaterialModal
          mat={editMat}
          onClose={() => setEditMat(null)}
          onSaved={() => { setEditMat(null); loadMateriais(selectedId) }}
        />
      )}
    </div>
  )
}

const STATUS_MAT_MAP = {
  solicitado: { label: 'Solicitado', color: L.blue,   bg: L.blueBg },
  separado:   { label: 'Separado',   color: L.yellow, bg: L.yellowBg },
  usado:      { label: 'Usado',      color: L.green,  bg: L.greenBg },
}

function MatItem({ mat, onToggle, onEdit, onUpdateQtd }) {
  const [editingQtd, setEditingQtd] = useState(false)
  const [qtdVal, setQtdVal] = useState(mat.quantidade_usada ?? '')
  const s = STATUS_MAT_MAP[mat.status] || { label: mat.status, color: L.t3, bg: L.surface }

  const checked = mat.status !== 'solicitado'

  return (
    <div style={{
      background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <input type="checkbox" checked={checked} onChange={onToggle}
        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: L.teal, flexShrink: 0 }} />

      <div style={{ flex: 1 }}>
        <button onClick={onEdit} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontWeight: 600, fontSize: 14, color: L.t1, padding: 0, textAlign: 'left',
        }}>{mat.nome_material}</button>
        <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
          Solicitado: {mat.quantidade_solicitada} &nbsp;|&nbsp; Usado:{' '}
          {editingQtd ? (
            <input
              type="number"
              value={qtdVal}
              onChange={e => setQtdVal(e.target.value)}
              onBlur={() => { setEditingQtd(false); onUpdateQtd(qtdVal) }}
              autoFocus
              style={{ width: 60, padding: '1px 4px', fontSize: 12, border: `1px solid ${L.line}`, borderRadius: 4 }}
            />
          ) : (
            <span
              onClick={() => setEditingQtd(true)}
              style={{ cursor: 'pointer', borderBottom: `1px dashed ${L.t4}` }}
            >
              {mat.quantidade_usada ?? '-'}
            </span>
          )}
        </div>
      </div>

      <span style={{
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        color: s.color, background: s.bg,
      }}>{s.label}</span>
    </div>
  )
}

function AdicionarMaterialModal({ cirurgiaId, estoqueItens, onClose, onSaved }) {
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState(1)
  const [saving, setSaving] = useState(false)
  const [warn, setWarn] = useState('')

  const filtItems = search
    ? estoqueItens.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()))
    : estoqueItens

  function pickItem(item) {
    setSelectedItem(item)
    setSearch(item.nome)
    setNome(item.nome)
    if (parseInt(qtd) > item.quantidade_atual) {
      setWarn(`Estoque insuficiente. Disponível: ${item.quantidade_atual}`)
    } else {
      setWarn('')
    }
  }

  function onQtdChange(v) {
    setQtd(v)
    if (selectedItem && parseInt(v) > selectedItem.quantidade_atual) {
      setWarn(`Estoque insuficiente. Disponível: ${selectedItem.quantidade_atual}`)
    } else {
      setWarn('')
    }
  }

  async function save() {
    if (!nome.trim()) return
    setSaving(true)
    await supabase.from('materiais_cirurgia').insert({
      cirurgia_id: cirurgiaId,
      item_id: selectedItem?.id || null,
      nome_material: nome,
      quantidade_solicitada: parseFloat(qtd) || 1,
      quantidade_usada: 0,
      status: 'solicitado',
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Adicionar Material" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="BUSCAR NO ESTOQUE">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedItem(null); setNome(e.target.value); setWarn('') }}
            placeholder="Digite para buscar..."
            style={inp} onFocus={focus} onBlur={blur}
          />
          {search && !selectedItem && filtItems.length > 0 && (
            <div style={{
              background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8,
              maxHeight: 160, overflowY: 'auto', marginTop: 4, boxShadow: L.shadowMd,
            }}>
              {filtItems.slice(0, 8).map(i => (
                <div key={i.id}
                  onMouseDown={() => pickItem(i)}
                  style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: L.t1, borderBottom: `1px solid ${L.line}` }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {i.nome} <span style={{ color: L.t4, fontSize: 11 }}>({i.quantidade_atual} em estoque)</span>
                </div>
              ))}
            </div>
          )}
        </Field>

        <Field label="NOME DO MATERIAL">
          <input value={nome} onChange={e => setNome(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="QUANTIDADE SOLICITADA">
          <input type="number" value={qtd} onChange={e => onQtdChange(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} min={0.01} step="0.01" />
        </Field>

        {warn && (
          <div style={{
            background: L.yellowBg, border: `1px solid ${L.yellowBd || L.yellow}`,
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: L.yellow,
          }}>
            ⚠ {warn}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={save} style={btnPrimary} disabled={saving || !nome.trim()}>
            {saving ? <Spinner /> : 'Adicionar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EditarMaterialModal({ mat, onClose, onSaved }) {
  const [nome, setNome] = useState(mat.nome_material)
  const [qtdSol, setQtdSol] = useState(mat.quantidade_solicitada)
  const [qtdUsa, setQtdUsa] = useState(mat.quantidade_usada ?? 0)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('materiais_cirurgia').update({
      nome_material: nome,
      quantidade_solicitada: parseFloat(qtdSol) || 0,
      quantidade_usada: parseFloat(qtdUsa) || 0,
    }).eq('id', mat.id)
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Editar Material" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="NOME DO MATERIAL">
          <input value={nome} onChange={e => setNome(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} />
        </Field>
        <Field label="QUANTIDADE SOLICITADA">
          <input type="number" value={qtdSol} onChange={e => setQtdSol(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} min={0} step="0.01" />
        </Field>
        <Field label="QUANTIDADE USADA">
          <input type="number" value={qtdUsa} onChange={e => setQtdUsa(e.target.value)}
            style={inp} onFocus={focus} onBlur={blur} min={0} step="0.01" />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={save} style={btnPrimary} disabled={saving}>
            {saving ? <Spinner /> : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Tab 3: Histórico ───────────────────────────────────────── */
function TabHistorico({ profile }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterPorte, setFilterPorte]     = useState('')
  const [filterMedico, setFilterMedico]   = useState('')
  const [filterFrom, setFilterFrom]       = useState('')
  const [filterTo, setFilterTo]           = useState('')
  const [medicos, setMedicos]             = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('cirurgias')
      .select(`
        *,
        pacientes(nome, data_nascimento),
        medicos(id, nome),
        salas(nome)
      `)
      .eq('clinica_id', profile.clinica_id)
      .order('data_hora_inicio', { ascending: false })

    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterPorte)  q = q.eq('porte', filterPorte)
    if (filterMedico) q = q.eq('cirurgiao_id', filterMedico)
    if (filterFrom)   q = q.gte('data_hora_inicio', filterFrom + 'T00:00:00')
    if (filterTo)     q = q.lte('data_hora_inicio', filterTo + 'T23:59:59')

    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }, [profile.clinica_id, filterStatus, filterPorte, filterMedico, filterFrom, filterTo])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('medicos').select('id,nome').eq('clinica_id', profile.clinica_id)
      .then(({ data }) => setMedicos(data || []))
  }, [profile.clinica_id])

  /* Stats */
  const byPorte = ['pequeno', 'medio', 'grande', 'especial'].map(p => ({
    porte: p,
    count: rows.filter(r => r.porte === p).length,
  }))
  const maxPorte = Math.max(...byPorte.map(b => b.count), 1)

  // Average duration by tipo_cirurgia
  const tipoMap = {}
  rows.forEach(r => {
    if (!r.tipo_cirurgia || !r.duracao_prevista) return
    if (!tipoMap[r.tipo_cirurgia]) tipoMap[r.tipo_cirurgia] = { total: 0, count: 0 }
    tipoMap[r.tipo_cirurgia].total += r.duracao_prevista
    tipoMap[r.tipo_cirurgia].count++
  })
  const avgDuracao = Object.entries(tipoMap)
    .map(([tipo, v]) => ({ tipo, avg: Math.round(v.total / v.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8)

  // Surgeon ranking
  const surgMap = {}
  rows.forEach(r => {
    const nm = r.medicos?.nome
    if (!nm) return
    surgMap[nm] = (surgMap[nm] || 0) + 1
  })
  const surgRanking = Object.entries(surgMap)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const maxSurg = Math.max(...surgRanking.map(s => s.count), 1)

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ minWidth: 130 }}>
          <Field label="STATUS">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inp, width: 'auto' }} onFocus={focus} onBlur={blur}>
              <option value="">Todos</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ minWidth: 120 }}>
          <Field label="PORTE">
            <select value={filterPorte} onChange={e => setFilterPorte(e.target.value)}
              style={{ ...inp, width: 'auto' }} onFocus={focus} onBlur={blur}>
              <option value="">Todos</option>
              {Object.entries(PORTE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ minWidth: 160 }}>
          <Field label="CIRURGIÃO">
            <select value={filterMedico} onChange={e => setFilterMedico(e.target.value)}
              style={{ ...inp, width: 'auto' }} onFocus={focus} onBlur={blur}>
              <option value="">Todos</option>
              {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ minWidth: 130 }}>
          <Field label="DE">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              style={{ ...inp, width: 'auto' }} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
        <div style={{ minWidth: 130 }}>
          <Field label="ATÉ">
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              style={{ ...inp, width: 'auto' }} onFocus={focus} onBlur={blur} />
          </Field>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface, borderBottom: `2px solid ${L.line}` }}>
                {['Data', 'Paciente', 'Tipo', 'Porte', 'Cirurgião', 'Sala', 'Duração', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: L.t3, fontWeight: 600, fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: L.t4 }}>
                    Nenhuma cirurgia encontrada.
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${L.line}`, background: i % 2 === 0 ? 'transparent' : L.surface }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: L.t2 }}>
                    {fmtDate(r.data_hora_inicio)}<br />
                    <span style={{ fontSize: 11, color: L.t4 }}>{fmtTime(r.data_hora_inicio)}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 500 }}>
                    {r.pacientes?.nome || '-'}
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t2, maxWidth: 160 }}>
                    {r.tipo_cirurgia || '-'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <PorteBadge porte={r.porte} />
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t2 }}>{r.medicos?.nome || '-'}</td>
                  <td style={{ padding: '10px 14px', color: L.t2 }}>{r.salas?.nome || '-'}</td>
                  <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>
                    {fmtDuration(r.duracao_prevista)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 8 }}>
        {/* Porte bar chart */}
        <div style={{ background: L.surface, borderRadius: 12, padding: 20, border: `1px solid ${L.line}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1, marginBottom: 16 }}>Cirurgias por Porte</div>
          {byPorte.map(({ porte, count }) => {
            const p = PORTE_MAP[porte]
            return (
              <div key={porte} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: L.t2, textTransform: 'capitalize' }}>{p.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{count}</span>
                </div>
                <div style={{ background: L.line, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    background: p.color,
                    width: `${count === 0 ? 0 : Math.max(4, (count / maxPorte) * 100)}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Avg duration by type */}
        <div style={{ background: L.surface, borderRadius: 12, padding: 20, border: `1px solid ${L.line}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1, marginBottom: 16 }}>Duração Média por Tipo</div>
          {avgDuracao.length === 0 ? (
            <div style={{ fontSize: 13, color: L.t4 }}>Sem dados suficientes.</div>
          ) : avgDuracao.map(({ tipo, avg }) => (
            <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${L.line}` }}>
              <span style={{ fontSize: 12, color: L.t2, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: L.teal }}>{fmtDuration(avg)}</span>
            </div>
          ))}
        </div>

        {/* Surgeon ranking */}
        <div style={{ background: L.surface, borderRadius: 12, padding: 20, border: `1px solid ${L.line}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1, marginBottom: 16 }}>Ranking de Cirurgiões</div>
          {surgRanking.length === 0 ? (
            <div style={{ fontSize: 13, color: L.t4 }}>Sem dados.</div>
          ) : surgRanking.map(({ nome, count }, idx) => (
            <div key={nome} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: L.t2 }}>
                  <span style={{ fontWeight: 700, color: idx === 0 ? L.teal : L.t3, marginRight: 6 }}>#{idx + 1}</span>
                  {nome}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: L.t1 }}>{count}</span>
              </div>
              <div style={{ background: L.line, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: L.teal,
                  width: `${(count / maxSurg) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
const TABS = [
  { key: 'programacao', label: 'Programação Cirúrgica' },
  { key: 'materiais',   label: 'Materiais e Instrumentais' },
  { key: 'historico',   label: 'Histórico de Cirurgias' },
]

export default function PageCirurgia({ profile }) {
  const [tab, setTab] = useState('programacao')

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: L.t1 }}>Centro Cirúrgico</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: L.t4 }}>Gestão de cirurgias, materiais e histórico operatório</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${L.line}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? L.teal : L.t3,
              borderBottom: tab === t.key ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'programacao' && <TabProgramacao profile={profile} />}
      {tab === 'materiais'   && <TabMateriais   profile={profile} />}
      {tab === 'historico'   && <TabHistorico   profile={profile} />}
    </div>
  )
}
