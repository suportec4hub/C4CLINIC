import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  '#0d6e6e','#2563eb','#7c3aed','#ea580c','#16a34a',
  '#ca8a04','#db2777','#0891b2','#65a30d','#9333ea',
]

const TIPO_SALA_OPTS = [
  { value: 'consultorio',       label: 'Consultório' },
  { value: 'sala_procedimento', label: 'Sala de Procedimento' },
  { value: 'sala_cirurgia',     label: 'Sala Cirúrgica' },
  { value: 'recepcao',          label: 'Recepção' },
  { value: 'sala_espera',       label: 'Sala de Espera' },
  { value: 'banheiro',          label: 'Banheiro' },
  { value: 'outro',             label: 'Outro' },
]

const TIPO_SALA_LABEL = Object.fromEntries(TIPO_SALA_OPTS.map(o => [o.value, o.label]))

const STATUS_EQUIP_OPTS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso',     label: 'Em Uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo',    label: 'Inativo' },
]

const STATUS_RESERVA_OPTS = [
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada',  label: 'Cancelada' },
  { value: 'concluida',  label: 'Concluída' },
]

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7..20

function toDatetimeLocal(d) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = n => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Shared UI Primitives ────────────────────────────────────────────────────

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
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}>{label}</label>
      {children}
    </div>
  )
}

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

function Modal({ title, onClose, children, wide }) {
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
        width: '100%', maxWidth: wide ? 720 : 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
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

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, border: `2px solid ${L.line}`,
      borderTopColor: L.teal, borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', display: 'inline-block',
    }} />
  )
}

function Badge({ label, bg, color, bd }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: bg, color, border: `1px solid ${bd}`,
    }}>{label}</span>
  )
}

// ─── Status Badges ───────────────────────────────────────────────────────────

function SalaBadge({ tipo }) {
  const label = TIPO_SALA_LABEL[tipo] || tipo
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 99, fontSize: 11, fontWeight: 500,
      background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}22`,
    }}>{label}</span>
  )
}

function OcupacaoBadge({ ocupada }) {
  if (ocupada) return <Badge label="Ocupada" bg={L.redBg} color={L.red} bd={L.redBd} />
  return <Badge label="Disponível" bg={L.greenBg} color={L.green} bd={L.greenBd} />
}

function EquipStatusBadge({ status }) {
  const map = {
    disponivel: { bg: L.greenBg,  color: L.green,  bd: L.greenBd,  label: 'Disponível' },
    em_uso:     { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, label: 'Em Uso' },
    manutencao: { bg: L.redBg,    color: L.red,    bd: L.redBd,    label: 'Manutenção' },
    inativo:    { bg: L.surface,  color: L.t3,     bd: L.line,     label: 'Inativo' },
  }
  const s = map[status] || map.inativo
  return <Badge label={s.label} bg={s.bg} color={s.color} bd={s.bd} />
}

function ReservaBadge({ status }) {
  const map = {
    confirmada: { bg: L.greenBg,  color: L.green,  bd: L.greenBd,  label: 'Confirmada' },
    cancelada:  { bg: L.redBg,    color: L.red,    bd: L.redBd,    label: 'Cancelada' },
    concluida:  { bg: L.surface,  color: L.t3,     bd: L.line,     label: 'Concluída' },
  }
  const s = map[status] || map.confirmada
  return <Badge label={s.label} bg={s.bg} color={s.color} bd={s.bd} />
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PageSalas({ profile }) {
  const clinica_id = profile?.clinica_id

  const [tab, setTab] = useState('salas')
  const [salas, setSalas] = useState([])
  const [equipamentos, setEquipamentos] = useState([])
  const [reservas, setReservas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  // Agenda state
  const [agendaDate, setAgendaDate] = useState(todayStr())
  const [agendaSalaFiltro, setAgendaSalaFiltro] = useState('')

  // Modals
  const [modalSala, setModalSala] = useState(null)       // null | 'create' | sala object
  const [modalReserva, setModalReserva] = useState(null) // null | 'create' | reserva object | { prefill }
  const [modalEquip, setModalEquip] = useState(null)     // null | 'create' | equip object

  const loadAll = useCallback(async () => {
    if (!clinica_id) return
    setLoading(true)
    const [s, e, r, u] = await Promise.all([
      supabase.from('salas').select('*').eq('clinica_id', clinica_id).order('nome'),
      supabase.from('equipamentos').select('*').eq('clinica_id', clinica_id).order('nome'),
      supabase.from('reservas_sala').select('*').eq('clinica_id', clinica_id).order('data_hora_inicio'),
      supabase.from('usuarios').select('id, nome').eq('clinica_id', clinica_id),
    ])
    if (!s.error) setSalas(s.data || [])
    if (!e.error) setEquipamentos(e.data || [])
    if (!r.error) setReservas(r.data || [])
    if (!u.error) setUsuarios(u.data || [])
    setLoading(false)
  }, [clinica_id])

  useEffect(() => { loadAll() }, [loadAll])

  // ── derived helpers ──────────────────────────────────────────────────────

  function isSalaOcupada(sala) {
    const now = new Date()
    return reservas.some(r =>
      r.sala_id === sala.id &&
      r.status === 'confirmada' &&
      new Date(r.data_hora_inicio) <= now &&
      new Date(r.data_hora_fim) >= now
    )
  }

  function equipCount(salaId) {
    return equipamentos.filter(e => e.sala_id === salaId && e.status !== 'inativo').length
  }

  function salaNome(id) {
    return salas.find(s => s.id === id)?.nome || '—'
  }

  function usuarioNome(id) {
    return usuarios.find(u => u.id === id)?.nome || '—'
  }

  function equipNome(id) {
    if (!id) return null
    return equipamentos.find(e => e.id === id)?.nome || '—'
  }

  function salaColor(id) {
    const idx = salas.findIndex(s => s.id === id)
    return PIE_COLORS[idx % PIE_COLORS.length] || L.teal
  }

  // ── Tab UI ───────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'salas',       label: 'Salas' },
    { key: 'agenda',      label: 'Agenda de Salas' },
    { key: 'equipamentos',label: 'Equipamentos' },
  ]

  function openAgendaForSala(salaId) {
    setAgendaSalaFiltro(salaId)
    setTab('agenda')
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes up   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .sala-card:hover { border-color: ${L.teal}55 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .row-hover:hover { background: ${L.hover} !important; }
        .grid-slot:hover { background: ${L.tealBg} !important; cursor: pointer; }
        .btn-sm:hover { opacity: 0.8; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>Salas &amp; Equipamentos</h1>
          <p style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>Gestão de ambientes, equipamentos e reservas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'salas' && (
            <button className="btn-primary" onClick={() => setModalSala('create')}
              style={{ background: L.teal, color: L.white, fontWeight: 600, padding: '9px 16px', borderRadius: 9, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              + Nova Sala
            </button>
          )}
          {tab === 'agenda' && (
            <button className="btn-primary" onClick={() => setModalReserva('create')}
              style={{ background: L.teal, color: L.white, fontWeight: 600, padding: '9px 16px', borderRadius: 9, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              + Nova Reserva
            </button>
          )}
          {tab === 'equipamentos' && (
            <button className="btn-primary" onClick={() => setModalEquip('create')}
              style={{ background: L.teal, color: L.white, fontWeight: 600, padding: '9px 16px', borderRadius: 9, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              + Novo Equipamento
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${L.line}`, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
            color: tab === t.key ? L.teal : L.t3,
            background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${L.teal}` : '2px solid transparent',
            cursor: 'pointer', transition: 'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <>
          {tab === 'salas' && (
            <TabSalas
              salas={salas}
              isSalaOcupada={isSalaOcupada}
              equipCount={equipCount}
              onVerAgenda={openAgendaForSala}
              onEdit={s => setModalSala(s)}
              onDelete={async id => {
                if (!confirm('Excluir esta sala?')) return
                await supabase.from('salas').delete().eq('id', id)
                loadAll()
              }}
            />
          )}
          {tab === 'agenda' && (
            <TabAgenda
              salas={salas}
              reservas={reservas}
              usuarios={usuarios}
              equipamentos={equipamentos}
              agendaDate={agendaDate}
              setAgendaDate={setAgendaDate}
              agendaSalaFiltro={agendaSalaFiltro}
              setAgendaSalaFiltro={setAgendaSalaFiltro}
              salaColor={salaColor}
              salaNome={salaNome}
              usuarioNome={usuarioNome}
              equipNome={equipNome}
              onSlotClick={(salaId, hour) => {
                const d = agendaDate || todayStr()
                const pad = n => String(n).padStart(2, '0')
                setModalReserva({
                  prefill: {
                    sala_id: salaId,
                    data_hora_inicio: `${d}T${pad(hour)}:00`,
                    data_hora_fim:    `${d}T${pad(hour + 1)}:00`,
                  }
                })
              }}
              onEditReserva={r => setModalReserva(r)}
              onDeleteReserva={async id => {
                if (!confirm('Excluir esta reserva?')) return
                await supabase.from('reservas_sala').delete().eq('id', id)
                loadAll()
              }}
            />
          )}
          {tab === 'equipamentos' && (
            <TabEquipamentos
              equipamentos={equipamentos}
              salas={salas}
              salaNome={salaNome}
              onEdit={e => setModalEquip(e)}
              onCycleStatus={async equip => {
                const cycle = { disponivel: 'em_uso', em_uso: 'manutencao', manutencao: 'disponivel' }
                const next = cycle[equip.status] || 'disponivel'
                await supabase.from('equipamentos').update({ status: next }).eq('id', equip.id)
                loadAll()
              }}
              onDelete={async id => {
                if (!confirm('Excluir este equipamento?')) return
                await supabase.from('equipamentos').delete().eq('id', id)
                loadAll()
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      {modalSala && (
        <ModalSala
          sala={modalSala === 'create' ? null : modalSala}
          clinica_id={clinica_id}
          onClose={() => setModalSala(null)}
          onSaved={() => { setModalSala(null); loadAll() }}
        />
      )}
      {modalReserva && (
        <ModalReserva
          reserva={modalReserva === 'create' ? null : (modalReserva?.prefill ? null : modalReserva)}
          prefill={modalReserva?.prefill || null}
          clinica_id={clinica_id}
          salas={salas}
          equipamentos={equipamentos}
          profile={profile}
          onClose={() => setModalReserva(null)}
          onSaved={() => { setModalReserva(null); loadAll() }}
        />
      )}
      {modalEquip && (
        <ModalEquipamento
          equip={modalEquip === 'create' ? null : modalEquip}
          clinica_id={clinica_id}
          salas={salas}
          onClose={() => setModalEquip(null)}
          onSaved={() => { setModalEquip(null); loadAll() }}
        />
      )}
    </div>
  )
}

// ─── Tab 1: Salas ─────────────────────────────────────────────────────────────

function TabSalas({ salas, isSalaOcupada, equipCount, onVerAgenda, onEdit, onDelete }) {
  if (salas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: L.t3 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t2 }}>Nenhuma sala cadastrada</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Clique em "+ Nova Sala" para começar</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {salas.map(sala => (
        <div key={sala.id} className="sala-card" style={{
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
          padding: '20px', transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: sala.ativo === false ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 6 }}>{sala.nome}</div>
              <SalaBadge tipo={sala.tipo} />
            </div>
            <OcupacaoBadge ocupada={isSalaOcupada(sala)} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <InfoItem icon="👥" label="Capacidade" value={sala.capacidade ? `${sala.capacidade} pessoa${sala.capacidade > 1 ? 's' : ''}` : '—'} />
            <InfoItem icon="🔧" label="Equipamentos" value={`${equipCount(sala.id)} ativo${equipCount(sala.id) !== 1 ? 's' : ''}`} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => onVerAgenda(sala.id)} style={{
              flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600,
              background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}33`,
              borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Ver Agenda</button>
            <button onClick={() => onEdit(sala)} style={{
              padding: '8px 12px', fontSize: 12, fontWeight: 500,
              background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
              borderRadius: 8, cursor: 'pointer',
            }}>Editar</button>
            <button onClick={() => onDelete(sala.id)} style={{
              padding: '8px 10px', fontSize: 12,
              background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
              borderRadius: 8, cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{icon} {label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{value}</span>
    </div>
  )
}

// ─── Tab 2: Agenda ────────────────────────────────────────────────────────────

function TabAgenda({
  salas, reservas, usuarios, equipamentos,
  agendaDate, setAgendaDate,
  agendaSalaFiltro, setAgendaSalaFiltro,
  salaColor, salaNome, usuarioNome, equipNome,
  onSlotClick, onEditReserva, onDeleteReserva,
}) {
  const filteredSalas = agendaSalaFiltro
    ? salas.filter(s => s.id === agendaSalaFiltro)
    : salas

  // reservas on the selected date (confirmada only for grid)
  const dayReservas = reservas.filter(r => {
    const rDate = r.data_hora_inicio?.slice(0, 10)
    return rDate === agendaDate && r.status === 'confirmada'
  })

  // all reservas for the day (all statuses) for the list below
  const allDayReservas = reservas.filter(r => {
    const rDate = r.data_hora_inicio?.slice(0, 10)
    if (rDate !== agendaDate) return false
    if (agendaSalaFiltro && r.sala_id !== agendaSalaFiltro) return false
    return true
  })

  function slotHasReserva(salaId, hour) {
    return dayReservas.find(r => {
      if (r.sala_id !== salaId) return false
      const start = new Date(r.data_hora_inicio).getHours()
      const end   = new Date(r.data_hora_fim).getHours()
      return hour >= start && hour < end
    })
  }

  const CELL_W = Math.max(100, Math.floor(800 / (filteredSalas.length || 1)))
  const CELL_H = 48
  const ROW_LABEL_W = 52

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>DATA</label>
          <input type="date" value={agendaDate} onChange={e => setAgendaDate(e.target.value)}
            style={{ ...inp, width: 160 }} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>SALA</label>
          <select value={agendaSalaFiltro} onChange={e => setAgendaSalaFiltro(e.target.value)}
            style={{ ...inp, width: 200 }} onFocus={focus} onBlur={blur}>
            <option value="">Todas as salas</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: L.t3 }}>
          {allDayReservas.length} reserva{allDayReservas.length !== 1 ? 's' : ''} neste dia
        </div>
      </div>

      {/* Time Grid */}
      {filteredSalas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3, fontSize: 13 }}>
          Nenhuma sala encontrada.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <div style={{ minWidth: ROW_LABEL_W + CELL_W * filteredSalas.length }}>
            {/* Header row */}
            <div style={{ display: 'flex', borderBottom: `2px solid ${L.line}` }}>
              <div style={{ width: ROW_LABEL_W, flexShrink: 0 }} />
              {filteredSalas.map(sala => (
                <div key={sala.id} style={{
                  width: CELL_W, flexShrink: 0, textAlign: 'center',
                  padding: '8px 4px', fontSize: 12, fontWeight: 700, color: L.t1,
                  borderLeft: `1px solid ${L.line}`,
                  borderBottom: `3px solid ${salaColor(sala.id)}`,
                }}>
                  {sala.nome}
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div key={hour} style={{ display: 'flex', borderBottom: `1px solid ${L.lineSoft}` }}>
                <div style={{
                  width: ROW_LABEL_W, flexShrink: 0, fontSize: 11,
                  color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: CELL_H, borderRight: `1px solid ${L.line}`,
                }}>
                  {String(hour).padStart(2,'0')}:00
                </div>
                {filteredSalas.map(sala => {
                  const reserva = slotHasReserva(sala.id, hour)
                  return (
                    <div
                      key={sala.id}
                      className={!reserva ? 'grid-slot' : ''}
                      onClick={() => !reserva && onSlotClick(sala.id, hour)}
                      style={{
                        width: CELL_W, flexShrink: 0, height: CELL_H,
                        borderLeft: `1px solid ${L.lineSoft}`,
                        background: reserva
                          ? salaColor(sala.id) + '22'
                          : 'transparent',
                        position: 'relative',
                        transition: 'background 0.15s',
                        cursor: reserva ? 'default' : 'pointer',
                      }}
                      title={reserva ? `${reserva.motivo || ''} (${fmtTime(reserva.data_hora_inicio)}–${fmtTime(reserva.data_hora_fim)})` : `Reservar ${sala.nome} às ${hour}:00`}
                    >
                      {reserva && new Date(reserva.data_hora_inicio).getHours() === hour && (
                        <div style={{
                          position: 'absolute', inset: '2px 3px',
                          background: salaColor(sala.id),
                          borderRadius: 6, padding: '2px 6px',
                          fontSize: 10, color: '#fff', fontWeight: 600,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          {reserva.motivo || 'Reservado'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservations list */}
      <div style={{ borderTop: `1px solid ${L.line}`, paddingTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 14 }}>
          Reservas do dia — {agendaDate ? fmtDate(agendaDate + 'T12:00') : '—'}
        </div>
        {allDayReservas.length === 0 ? (
          <div style={{ color: L.t3, fontSize: 13, padding: '16px 0' }}>Nenhuma reserva para este dia.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allDayReservas.map(r => (
              <div key={r.id} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 4, height: 40, borderRadius: 2,
                  background: salaColor(r.sala_id), flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{salaNome(r.sala_id)}</div>
                  <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                    {fmtTime(r.data_hora_inicio)} – {fmtTime(r.data_hora_fim)}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 13, color: L.t2 }}>{r.motivo || '—'}</div>
                  {r.equipamento_id && (
                    <div style={{ fontSize: 11, color: L.t4, marginTop: 2 }}>
                      🔧 {equipNome(r.equipamento_id)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: L.t3 }}>{usuarioNome(r.usuario_id)}</div>
                <ReservaBadge status={r.status} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEditReserva(r)} style={{
                    padding: '5px 10px', fontSize: 11, fontWeight: 500,
                    background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}>Editar</button>
                  <button onClick={() => onDeleteReserva(r.id)} style={{
                    padding: '5px 8px', fontSize: 11,
                    background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 3: Equipamentos ──────────────────────────────────────────────────────

function TabEquipamentos({ equipamentos, salas, salaNome, onEdit, onCycleStatus, onDelete }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = equipamentos.filter(e => {
    const q = search.toLowerCase()
    if (q && !e.nome.toLowerCase().includes(q) && !(e.tipo || '').toLowerCase().includes(q)) return false
    if (filterStatus && e.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar equipamento..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, width: 220 }} onFocus={focus} onBlur={blur}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp, width: 160 }} onFocus={focus} onBlur={blur}>
          <option value="">Todos os status</option>
          {STATUS_EQUIP_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: L.t3 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔧</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: L.t2 }}>Nenhum equipamento encontrado</div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${L.line}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.2fr auto',
            gap: 0, background: L.surface,
            borderBottom: `1px solid ${L.line}`,
          }}>
            {['Nome', 'Tipo', 'Sala', 'Nº Série', 'Status', ''].map((h, i) => (
              <div key={i} style={{
                padding: '10px 14px', fontSize: 11, fontWeight: 700,
                color: L.t3, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.3px', textTransform: 'uppercase',
                borderRight: i < 5 ? `1px solid ${L.line}` : 'none',
              }}>{h}</div>
            ))}
          </div>

          {filtered.map((equip, idx) => (
            <div key={equip.id} className="row-hover" style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.2fr auto',
              borderBottom: idx < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
              background: L.bg, transition: 'background 0.12s',
            }}>
              <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: L.t1, borderRight: `1px solid ${L.lineSoft}` }}>
                {equip.nome}
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: L.t2, borderRight: `1px solid ${L.lineSoft}` }}>
                {equip.tipo || '—'}
              </div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: L.t2, borderRight: `1px solid ${L.lineSoft}` }}>
                {equip.sala_id ? salaNome(equip.sala_id) : '—'}
              </div>
              <div style={{ padding: '12px 14px', fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace", borderRight: `1px solid ${L.lineSoft}` }}>
                {equip.numero_serie || '—'}
              </div>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${L.lineSoft}` }}>
                <EquipStatusBadge status={equip.status} />
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => onCycleStatus(equip)} style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 500,
                  background: L.yellowBg, color: L.yellow, border: `1px solid ${L.yellowBd}`,
                  borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                }} title="Trocar status">⟳ Status</button>
                <button onClick={() => onEdit(equip)} style={{
                  padding: '5px 10px', fontSize: 11, fontWeight: 500,
                  background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
                  borderRadius: 6, cursor: 'pointer',
                }}>Editar</button>
                <button onClick={() => onDelete(equip.id)} style={{
                  padding: '5px 8px', fontSize: 11,
                  background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
                  borderRadius: 6, cursor: 'pointer',
                }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal: Nova/Editar Sala ──────────────────────────────────────────────────

function ModalSala({ sala, clinica_id, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome:       sala?.nome       || '',
    tipo:       sala?.tipo       || 'consultorio',
    capacidade: sala?.capacidade || '',
    ativo:      sala?.ativo !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    const payload = {
      clinica_id,
      nome:       form.nome.trim(),
      tipo:       form.tipo,
      capacidade: form.capacidade ? Number(form.capacidade) : null,
      ativo:      form.ativo,
    }
    const { error: err } = sala?.id
      ? await supabase.from('salas').update(payload).eq('id', sala.id)
      : await supabase.from('salas').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <Modal title={sala ? 'Editar Sala' : 'Nova Sala'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}

        <Field label="Nome *">
          <input value={form.nome} onChange={e => set('nome', e.target.value)}
            style={inp} placeholder="Ex.: Consultório 01" onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Tipo">
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            {TIPO_SALA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Capacidade (pessoas)">
          <input type="number" min={1} value={form.capacidade} onChange={e => set('capacidade', e.target.value)}
            style={inp} placeholder="Ex.: 10" onFocus={focus} onBlur={blur} />
        </Field>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
          <span style={{ fontSize: 13, color: L.t2 }}>Sala ativa</span>
        </label>

        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
            background: L.surface, color: L.t2, border: `1px solid ${L.line}`, borderRadius: 9, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{
            flex: 2, padding: '10px', fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', borderRadius: 9, cursor: 'pointer',
            opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <><Spinner /> Salvando…</> : 'Salvar Sala'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal: Nova/Editar Reserva ───────────────────────────────────────────────

function ModalReserva({ reserva, prefill, clinica_id, salas, equipamentos, profile, onClose, onSaved }) {
  const base = reserva || {}
  const [form, setForm] = useState({
    sala_id:          base.sala_id          || prefill?.sala_id          || (salas[0]?.id || ''),
    equipamento_id:   base.equipamento_id   || '',
    data_hora_inicio: base.data_hora_inicio ? toDatetimeLocal(base.data_hora_inicio) : (prefill?.data_hora_inicio || ''),
    data_hora_fim:    base.data_hora_fim    ? toDatetimeLocal(base.data_hora_fim)    : (prefill?.data_hora_fim    || ''),
    motivo:           base.motivo           || '',
    status:           base.status           || 'confirmada',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [conflict, setConflict] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salaEquipamentos = equipamentos.filter(e => e.sala_id === form.sala_id)

  // check conflicts when time or sala changes
  useEffect(() => {
    async function check() {
      setConflict(null)
      if (!form.sala_id || !form.data_hora_inicio || !form.data_hora_fim) return
      const { data } = await supabase.from('reservas_sala')
        .select('id, motivo, data_hora_inicio, data_hora_fim')
        .eq('clinica_id', clinica_id)
        .eq('sala_id', form.sala_id)
        .eq('status', 'confirmada')
        .lt('data_hora_inicio', form.data_hora_fim)
        .gt('data_hora_fim', form.data_hora_inicio)
      if (!data) return
      const conflicts = data.filter(r => r.id !== reserva?.id)
      if (conflicts.length > 0) setConflict(conflicts[0])
    }
    check()
  }, [form.sala_id, form.data_hora_inicio, form.data_hora_fim, clinica_id, reserva?.id])

  async function save() {
    if (!form.sala_id)          { setError('Selecione uma sala.'); return }
    if (!form.data_hora_inicio) { setError('Informe o início.'); return }
    if (!form.data_hora_fim)    { setError('Informe o fim.'); return }
    if (form.data_hora_fim <= form.data_hora_inicio) { setError('Fim deve ser após o início.'); return }
    if (conflict) { setError('Conflito de horário detectado.'); return }
    setSaving(true)
    const payload = {
      clinica_id,
      sala_id:          form.sala_id,
      equipamento_id:   form.equipamento_id || null,
      usuario_id:       reserva?.usuario_id || profile?.id || null,
      data_hora_inicio: form.data_hora_inicio,
      data_hora_fim:    form.data_hora_fim,
      motivo:           form.motivo.trim() || null,
      status:           form.status,
    }
    const { error: err } = reserva?.id
      ? await supabase.from('reservas_sala').update(payload).eq('id', reserva.id)
      : await supabase.from('reservas_sala').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <Modal title={reserva?.id ? 'Editar Reserva' : 'Nova Reserva'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}

        {conflict && (
          <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span>⚠️</span>
            <span>
              <strong>Sala já reservada neste horário para:</strong> {conflict.motivo || '(sem motivo)'}<br/>
              <span style={{ fontSize: 11 }}>{fmtTime(conflict.data_hora_inicio)} – {fmtTime(conflict.data_hora_fim)}</span>
            </span>
          </div>
        )}

        <Field label="Sala *">
          <select value={form.sala_id} onChange={e => set('sala_id', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Selecionar sala…</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </Field>

        <Field label="Equipamento (opcional)">
          <select value={form.equipamento_id} onChange={e => set('equipamento_id', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Nenhum</option>
            {salaEquipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Início *">
            <input type="datetime-local" value={form.data_hora_inicio} onChange={e => set('data_hora_inicio', e.target.value)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Fim *">
            <input type="datetime-local" value={form.data_hora_fim} onChange={e => set('data_hora_fim', e.target.value)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
        </div>

        <Field label="Motivo">
          <input value={form.motivo} onChange={e => set('motivo', e.target.value)}
            style={inp} placeholder="Ex.: Consulta, Cirurgia…" onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            {STATUS_RESERVA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
            background: L.surface, color: L.t2, border: `1px solid ${L.line}`, borderRadius: 9, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={save} disabled={saving || !!conflict} style={{
            flex: 2, padding: '10px', fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', borderRadius: 9,
            cursor: saving || conflict ? 'not-allowed' : 'pointer',
            opacity: saving || conflict ? 0.55 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <><Spinner /> Salvando…</> : 'Salvar Reserva'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal: Novo/Editar Equipamento ──────────────────────────────────────────

function ModalEquipamento({ equip, clinica_id, salas, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome:          equip?.nome          || '',
    tipo:          equip?.tipo          || '',
    numero_serie:  equip?.numero_serie  || '',
    sala_id:       equip?.sala_id       || '',
    status:        equip?.status        || 'disponivel',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    const payload = {
      clinica_id,
      nome:         form.nome.trim(),
      tipo:         form.tipo.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      sala_id:      form.sala_id || null,
      status:       form.status,
    }
    const { error: err } = equip?.id
      ? await supabase.from('equipamentos').update(payload).eq('id', equip.id)
      : await supabase.from('equipamentos').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <Modal title={equip ? 'Editar Equipamento' : 'Novo Equipamento'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div style={{ background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>{error}</div>}

        <Field label="Nome *">
          <input value={form.nome} onChange={e => set('nome', e.target.value)}
            style={inp} placeholder="Ex.: Oftalmoscópio" onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Tipo">
          <input value={form.tipo} onChange={e => set('tipo', e.target.value)}
            style={inp} placeholder="Ex.: Diagnóstico, Terapêutico…" onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Número de Série">
          <input value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)}
            style={inp} placeholder="Ex.: SN-2024-001" onFocus={focus} onBlur={blur} />
        </Field>

        <Field label="Sala">
          <select value={form.sala_id} onChange={e => set('sala_id', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            <option value="">Sem sala vinculada</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}
            style={inp} onFocus={focus} onBlur={blur}>
            {STATUS_EQUIP_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
            background: L.surface, color: L.t2, border: `1px solid ${L.line}`, borderRadius: 9, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{
            flex: 2, padding: '10px', fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', borderRadius: 9,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {saving ? <><Spinner /> Salvando…</> : 'Salvar Equipamento'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
