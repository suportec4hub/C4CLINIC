import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALTY_ICONS = {
  'Cardiologia': '❤️',
  'Dermatologia': '✨',
  'Ortopedia': '🦴',
  'Pediatria': '👶',
  'Neurologia': '🧠',
  'Ginecologia': '🌸',
  'Oftalmologia': '👁️',
  'Psiquiatria': '🧘',
  'Endocrinologia': '⚗️',
  'Gastroenterologia': '🫀',
  'Urologia': '💊',
  'Pneumologia': '🫁',
  'Reumatologia': '💉',
  'Oncologia': '🎗️',
  'Clínica Geral': '🩺',
  'Medicina Interna': '🩺',
}

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]
const MESES_GENITIVO = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro'
]
const DIAS_SEMANA_LONGO = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCPF(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function formatDatetime(dt) {
  const d = new Date(dt)
  const weekday = DIAS_SEMANA_LONGO[d.getDay()]
  const day = d.getDate()
  const month = MESES_GENITIVO[d.getMonth()]
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2,'0')
  const m = String(d.getMinutes()).padStart(2,'0')
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${cap}, ${day} de ${month} de ${year} às ${h}:${m}`
}

function buildGoogleCalendarUrl({ doctorName, specialty, dateISO, clinicNome, clinicEndereco }) {
  const d = new Date(dateISO)
  const pad = n => String(n).padStart(2,'0')
  const fmt = (dt) =>
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
  const start = fmt(new Date(d.getTime()))
  const end   = fmt(new Date(d.getTime() + 30*60*1000))
  const title = encodeURIComponent(`Consulta — Dr(a). ${doctorName}`)
  const details = encodeURIComponent(`Especialidade: ${specialty}\nClínica: ${clinicNome}`)
  const location = encodeURIComponent(clinicEndereco || '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
}

function getInitials(nome) {
  return (nome || '').split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('')
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: 'Especialidade' },
    { n: 2, label: 'Médico' },
    { n: 3, label: 'Data/Hora' },
    { n: 4, label: 'Seus Dados' },
    { n: 5, label: 'Confirmação' },
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '0 16px', overflowX: 'auto',
      msOverflowStyle: 'none', scrollbarWidth: 'none',
    }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, minWidth: 56,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              background: step === s.n ? L.teal : step > s.n ? L.teal : '#e5e7eb',
              color: step >= s.n ? '#fff' : '#9ca3af',
              transition: 'all 0.2s',
              boxShadow: step === s.n ? `0 0 0 4px ${L.teal}22` : 'none',
            }}>{step > s.n ? '✓' : s.n}</div>
            <span style={{
              fontSize: 10, fontWeight: step === s.n ? 700 : 500,
              color: step === s.n ? L.teal : step > s.n ? L.t2 : L.t4,
              whiteSpace: 'nowrap',
            }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 24, height: 2, marginBottom: 16,
              background: step > s.n ? L.teal : '#e5e7eb',
              transition: 'background 0.2s',
              flexShrink: 0,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      color: L.t2, fontSize: 14, fontWeight: 500, padding: '8px 0',
      marginBottom: 8,
    }}>
      ← Voltar
    </button>
  )
}

function PrimaryBtn({ onClick, children, loading, disabled, fullWidth }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: fullWidth ? '100%' : undefined,
        background: disabled || loading ? '#9ca3af' : L.teal,
        color: '#fff', border: 'none', borderRadius: 12,
        padding: '14px 28px', fontSize: 15, fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, transform 0.1s',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(13,110,110,0.25)',
      }}
    >{loading ? 'Aguarde...' : children}</button>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: L.t3 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${L.line}`, borderTopColor: L.teal,
        animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
      }} />
      <p style={{ fontSize: 14 }}>Carregando...</p>
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1Especialidade({ clinicaId, onSelect }) {
  const [especialidades, setEspecialidades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicaId) return
    setLoading(true)
    supabase
      .from('medicos')
      .select('especialidade')
      .eq('clinica_id', clinicaId)
      .then(({ data }) => {
        const counts = {}
        ;(data || []).forEach(m => {
          counts[m.especialidade] = (counts[m.especialidade] || 0) + 1
        })
        setEspecialidades(Object.entries(counts).map(([name, count]) => ({ name, count })))
        setLoading(false)
      })
  }, [clinicaId])

  if (loading) return <Spinner />

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 6 }}>
        Escolha a Especialidade
      </h2>
      <p style={{ color: L.t3, fontSize: 15, marginBottom: 24 }}>
        Selecione a área de saúde que você precisa
      </p>
      {especialidades.length === 0 ? (
        <p style={{ color: L.t3, textAlign: 'center', padding: '32px 0' }}>
          Nenhuma especialidade disponível no momento.
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {especialidades.map(e => (
            <button
              key={e.name}
              onClick={() => onSelect(e.name)}
              style={{
                background: '#fff',
                border: `2px solid ${L.line}`,
                borderRadius: 16,
                padding: '20px 16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.18s',
                boxShadow: L.shadow,
              }}
              onMouseEnter={ev => {
                ev.currentTarget.style.borderColor = L.teal
                ev.currentTarget.style.boxShadow = `0 4px 16px rgba(13,110,110,0.15)`
                ev.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={ev => {
                ev.currentTarget.style.borderColor = L.line
                ev.currentTarget.style.boxShadow = L.shadow
                ev.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>
                {SPECIALTY_ICONS[e.name] || '🩺'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 4 }}>
                {e.name}
              </div>
              <div style={{ fontSize: 12, color: L.t3 }}>
                {e.count} médico{e.count !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2Medico({ clinicaId, especialidade, onSelect, onBack }) {
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicaId) return
    setLoading(true)
    supabase
      .from('medicos')
      .select('id, nome, especialidade, foto_url')
      .eq('clinica_id', clinicaId)
      .eq('especialidade', especialidade)
      .then(({ data }) => { setMedicos(data || []); setLoading(false) })
  }, [clinicaId, especialidade])

  if (loading) return <Spinner />

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 6 }}>
        Escolha o Médico
      </h2>
      <p style={{ color: L.t3, fontSize: 15, marginBottom: 24 }}>
        {SPECIALTY_ICONS[especialidade] || '🩺'} {especialidade}
      </p>
      {medicos.length === 0 ? (
        <p style={{ color: L.t3, textAlign: 'center', padding: '32px 0' }}>
          Nenhum médico disponível nessa especialidade.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {medicos.map(m => (
            <div key={m.id} style={{
              background: '#fff', border: `1px solid ${L.line}`,
              borderRadius: 16, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: L.shadow,
            }}>
              {m.foto_url ? (
                <img src={m.foto_url} alt={m.nome} style={{
                  width: 60, height: 60, borderRadius: '50%',
                  objectFit: 'cover', flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                  background: L.teal, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700,
                }}>{getInitials(m.nome)}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: L.t1 }}>{m.nome}</div>
                <div style={{ fontSize: 13, color: L.t3, marginTop: 2 }}>{m.especialidade}</div>
                <div style={{ fontSize: 12, color: L.t4, marginTop: 4 }}>
                  Atendimento presencial e telemedicina
                </div>
              </div>
              <PrimaryBtn onClick={() => onSelect(m)}>Selecionar</PrimaryBtn>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3DataHora({ clinicaId, medico, onSelect, onBack, convenios }) {
  const today = new Date()
  today.setHours(0,0,0,0)

  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay]   = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedConvenio, setSelectedConvenio] = useState('')
  const [horarios, setHorarios]   = useState([])
  const [agendados, setAgendados] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Load clinic working hours
  useEffect(() => {
    if (!clinicaId) return
    supabase
      .from('horarios_funcionamento')
      .select('dia_semana, hora_inicio, hora_fim, ativo')
      .eq('clinica_id', clinicaId)
      .then(({ data }) => setHorarios(data || []))
  }, [clinicaId])

  // Load booked slots when day selected
  useEffect(() => {
    if (!selectedDay || !medico) return
    setLoadingSlots(true)
    const dayStart = new Date(selectedDay); dayStart.setHours(0,0,0,0)
    const dayEnd   = new Date(selectedDay); dayEnd.setHours(23,59,59,999)
    supabase
      .from('agendamentos')
      .select('data_hora')
      .eq('medico_id', medico.id)
      .neq('status', 'cancelado')
      .gte('data_hora', dayStart.toISOString())
      .lte('data_hora', dayEnd.toISOString())
      .then(({ data }) => {
        setAgendados((data || []).map(a => a.data_hora))
        setLoadingSlots(false)
      })
  }, [selectedDay, medico])

  const isClosedDay = useCallback((date) => {
    if (horarios.length === 0) return false
    const dow = date.getDay()
    const h = horarios.find(h => h.dia_semana === dow)
    return !h || !h.ativo
  }, [horarios])

  const isDayDisabled = (date) => {
    const d = new Date(date); d.setHours(0,0,0,0)
    if (d < today) return true
    if (isClosedDay(d)) return true
    return false
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay  = new Date(viewYear, viewMonth + 1, 0)
  const startDow = firstDay.getDay()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d))

  // Time slots 07:00-18:00 in 30min
  const slots = []
  for (let h = 7; h < 18; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
    slots.push(`${String(h).padStart(2,'0')}:30`)
  }

  const isSlotBooked = (slot) => {
    if (!selectedDay) return false
    const [sh, sm] = slot.split(':').map(Number)
    const dt = new Date(selectedDay)
    dt.setHours(sh, sm, 0, 0)
    return agendados.some(a => {
      const ad = new Date(a)
      return ad.getHours() === sh && ad.getMinutes() === sm
    })
  }

  const handleDayClick = (date) => {
    if (!date || isDayDisabled(date)) return
    const d = new Date(date); d.setHours(0,0,0,0)
    setSelectedDay(d)
    setSelectedSlot(null)
  }

  const handleSlotClick = (slot) => {
    if (isSlotBooked(slot)) return
    setSelectedSlot(slot)
  }

  const handleContinue = () => {
    if (!selectedDay || !selectedSlot) return
    const [sh, sm] = selectedSlot.split(':').map(Number)
    const dt = new Date(selectedDay)
    dt.setHours(sh, sm, 0, 0)
    onSelect({ dateISO: dt.toISOString(), convenio_id: selectedConvenio || null })
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) }
    else setViewMonth(m => m-1)
    setSelectedDay(null); setSelectedSlot(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) }
    else setViewMonth(m => m+1)
    setSelectedDay(null); setSelectedSlot(null)
  }

  const isSameDay = (a, b) => a && b &&
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 6 }}>
        Escolha Data e Hora
      </h2>
      <p style={{ color: L.t3, fontSize: 15, marginBottom: 24 }}>
        Dr(a). {medico.nome} — {medico.especialidade}
      </p>

      {/* Calendar */}
      <div style={{
        background: '#fff', border: `1px solid ${L.line}`,
        borderRadius: 16, padding: '20px', boxShadow: L.shadow,
        marginBottom: 20,
      }}>
        {/* Month navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <button onClick={prevMonth} style={{
            background: L.hover, border: 'none', borderRadius: 8,
            width: 36, height: 36, cursor: 'pointer', fontSize: 16, color: L.t2,
          }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>
            {MESES_PT[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} style={{
            background: L.hover, border: 'none', borderRadius: 8,
            width: 36, height: 36, cursor: 'pointer', fontSize: 16, color: L.t2,
          }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {DIAS_PT.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 11, fontWeight: 700,
              color: d === 'Dom' ? L.red : L.t3, padding: '4px 0',
            }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} />
            const disabled = isDayDisabled(date)
            const selected = isSameDay(date, selectedDay)
            const isToday  = isSameDay(date, today)
            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                disabled={disabled}
                style={{
                  height: 40, borderRadius: 10, border: 'none',
                  fontSize: 14, fontWeight: isToday ? 700 : 400,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  background: selected ? L.teal
                    : isToday && !selected ? L.tealBg
                    : 'transparent',
                  color: selected ? '#fff'
                    : disabled ? '#d1d5db'
                    : isToday ? L.teal
                    : L.t1,
                  textDecoration: disabled && !selected ? 'line-through' : 'none',
                }}
              >{date.getDate()}</button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDay && (
        <div style={{
          background: '#fff', border: `1px solid ${L.line}`,
          borderRadius: 16, padding: '20px', boxShadow: L.shadow,
          marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: L.t1, marginBottom: 14 }}>
            Horários disponíveis — {selectedDay.getDate()} de {MESES_GENITIVO[selectedDay.getMonth()]}
          </h3>
          {loadingSlots ? <Spinner /> : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
              gap: 8,
            }}>
              {slots.map(slot => {
                const booked = isSlotBooked(slot)
                const active = selectedSlot === slot
                return (
                  <button
                    key={slot}
                    onClick={() => handleSlotClick(slot)}
                    disabled={booked}
                    style={{
                      padding: '10px 0', borderRadius: 10, border: 'none',
                      fontSize: 13, fontWeight: 600,
                      cursor: booked ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      background: active ? L.teal : booked ? '#f3f4f6' : L.tealBg,
                      color: active ? '#fff' : booked ? '#d1d5db' : L.teal,
                      textDecoration: booked ? 'line-through' : 'none',
                    }}
                  >{slot}</button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Convenio */}
      {selectedSlot && (
        <div style={{
          background: '#fff', border: `1px solid ${L.line}`,
          borderRadius: 16, padding: '20px', boxShadow: L.shadow,
          marginBottom: 24,
        }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: L.t2, display: 'block', marginBottom: 8 }}>
            Convênio (opcional)
          </label>
          <select
            value={selectedConvenio}
            onChange={e => setSelectedConvenio(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${L.line}`, fontSize: 14,
              color: L.t1, background: '#fff', outline: 'none',
            }}
          >
            <option value="">Particular (sem convênio)</option>
            {convenios.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      <PrimaryBtn
        onClick={handleContinue}
        disabled={!selectedDay || !selectedSlot}
        fullWidth
      >
        Continuar →
      </PrimaryBtn>
    </div>
  )
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────
function Step4DadosPaciente({ clinicaId, onSubmit, onBack }) {
  const [form, setForm] = useState({
    nome: '', cpf: '', data_nascimento: '', telefone: '', email: '',
  })
  const [isPacienteCadastrado, setIsPacienteCadastrado] = useState(false)
  const [cpfLookup, setCpfLookup] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLookup = async () => {
    if (!cpfLookup) return
    setLookupLoading(true)
    setLookupError('')
    const raw = cpfLookup.replace(/\D/g,'')
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .ilike('cpf', `%${raw}%`)
      .limit(1)
      .single()
    if (data) {
      setForm({
        nome: data.nome || '',
        cpf: formatCPF(data.cpf || ''),
        data_nascimento: data.data_nascimento || '',
        telefone: formatPhone(data.telefone || ''),
        email: data.email || '',
      })
      setLookupError('')
    } else {
      setLookupError('Paciente não encontrado. Preencha os dados manualmente.')
    }
    setLookupLoading(false)
  }

  const validate = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.cpf.trim()) e.cpf = 'CPF obrigatório'
    if (!form.data_nascimento) e.data_nascimento = 'Data de nascimento obrigatória'
    if (!form.telefone.trim()) e.telefone = 'Telefone obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({ ...form, cpf: form.cpf.replace(/\D/g,'') })
  }

  const inputStyle = (err) => ({
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${err ? L.red : L.line}`,
    fontSize: 15, color: L.t1, background: '#fff',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })
  const labelStyle = { fontSize: 13, fontWeight: 600, color: L.t2, display: 'block', marginBottom: 6 }
  const errStyle   = { fontSize: 12, color: L.red, marginTop: 4 }

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 6 }}>
        Seus Dados
      </h2>
      <p style={{ color: L.t3, fontSize: 15, marginBottom: 24 }}>
        Preencha as informações para confirmar o agendamento
      </p>

      {/* Returning patient toggle */}
      <div style={{
        background: L.tealBg, border: `1px solid #b2dfdb`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: L.teal }}>
          Já sou paciente cadastrado
        </span>
        <div
          onClick={() => { setIsPacienteCadastrado(v => !v); setLookupError('') }}
          style={{
            width: 46, height: 26, borderRadius: 13,
            background: isPacienteCadastrado ? L.teal : '#d1d5db',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3,
            left: isPacienteCadastrado ? 23 : 3,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>

      {isPacienteCadastrado && (
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Buscar pelo CPF</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={cpfLookup}
              onChange={e => setCpfLookup(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              style={{ ...inputStyle(false), flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              style={{
                background: L.teal, color: '#fff', border: 'none',
                borderRadius: 10, padding: '0 18px', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, flexShrink: 0,
              }}
            >{lookupLoading ? '...' : 'Buscar'}</button>
          </div>
          {lookupError && <p style={{ ...errStyle, marginTop: 8 }}>{lookupError}</p>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>Nome completo *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Seu nome completo" style={inputStyle(errors.nome)} />
          {errors.nome && <p style={errStyle}>{errors.nome}</p>}
        </div>
        <div>
          <label style={labelStyle}>CPF *</label>
          <input
            value={form.cpf}
            onChange={e => set('cpf', formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            style={inputStyle(errors.cpf)}
          />
          {errors.cpf && <p style={errStyle}>{errors.cpf}</p>}
        </div>
        <div>
          <label style={labelStyle}>Data de nascimento *</label>
          <input type="date" value={form.data_nascimento}
            onChange={e => set('data_nascimento', e.target.value)}
            style={inputStyle(errors.data_nascimento)} />
          {errors.data_nascimento && <p style={errStyle}>{errors.data_nascimento}</p>}
        </div>
        <div>
          <label style={labelStyle}>Telefone *</label>
          <input
            value={form.telefone}
            onChange={e => set('telefone', formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            style={inputStyle(errors.telefone)}
          />
          {errors.telefone && <p style={errStyle}>{errors.telefone}</p>}
        </div>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="seu@email.com"
            style={inputStyle(false)} />
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <PrimaryBtn onClick={handleSubmit} fullWidth>
          Revisar agendamento →
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────
function Step5Confirmacao({
  clinicaId, medico, dateISO, convenio_id, pacienteData,
  convenios, clinica,
  onConfirm, onBack, loading,
}) {
  const convenioNome = convenios.find(c => c.id === convenio_id)?.nome || 'Particular'

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize: 22, fontWeight: 800, color: L.t1, marginBottom: 6 }}>
        Confirme o Agendamento
      </h2>
      <p style={{ color: L.t3, fontSize: 15, marginBottom: 24 }}>
        Revise os dados antes de confirmar
      </p>

      {/* Summary card */}
      <div style={{
        background: '#fff', border: `1px solid ${L.line}`,
        borderRadius: 16, overflow: 'hidden', boxShadow: L.shadowMd,
        marginBottom: 28,
      }}>
        {/* Header */}
        <div style={{
          background: L.tealGrad, padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {medico.foto_url ? (
            <img src={medico.foto_url} alt={medico.nome} style={{
              width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.4)',
            }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>{getInitials(medico.nome)}</div>
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{medico.nome}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{medico.especialidade}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px' }}>
          {[
            { icon: '📅', label: 'Data e hora', value: formatDatetime(dateISO) },
            { icon: '👤', label: 'Paciente', value: pacienteData.nome },
            { icon: '🪪', label: 'CPF', value: formatCPF(pacienteData.cpf) },
            { icon: '📞', label: 'Telefone', value: pacienteData.telefone },
            { icon: '🏥', label: 'Convênio', value: convenioNome },
            { icon: '🏨', label: 'Clínica', value: clinica?.nome || 'Clínica' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              borderBottom: `1px solid ${L.lineSoft}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: L.t4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 14, color: L.t1, fontWeight: 500, marginTop: 2 }}>
                  {row.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PrimaryBtn onClick={onConfirm} loading={loading} fullWidth>
        ✓ Confirmar Agendamento
      </PrimaryBtn>
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ medico, dateISO, pacienteData, clinica, onReset }) {
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 100)
    return () => clearTimeout(t)
  }, [])

  const gcalUrl = buildGoogleCalendarUrl({
    doctorName: medico.nome,
    specialty: medico.especialidade,
    dateISO,
    clinicNome: clinica?.nome || '',
    clinicEndereco: clinica?.endereco || '',
  })

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      {/* Animated checkmark */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: L.greenBg, border: `3px solid ${L.greenBd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        transform: showCheck ? 'scale(1)' : 'scale(0.5)',
        opacity: showCheck ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>✓</span>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, color: L.t1, marginBottom: 8 }}>
        Agendamento Confirmado!
      </h2>
      <p style={{ fontSize: 15, color: L.t3, marginBottom: 28 }}>
        Sua consulta foi marcada com sucesso
      </p>

      {/* Summary */}
      <div style={{
        background: '#fff', border: `1px solid ${L.line}`,
        borderRadius: 16, padding: '20px 24px', textAlign: 'left',
        boxShadow: L.shadowMd, marginBottom: 24,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: L.t1, marginBottom: 12 }}>
          Resumo da consulta
        </div>
        {[
          { icon: '👨‍⚕️', label: 'Médico', value: `${medico.nome} — ${medico.especialidade}` },
          { icon: '📅', label: 'Data e hora', value: formatDatetime(dateISO) },
          { icon: '👤', label: 'Paciente', value: pacienteData.nome },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', gap: 12, padding: '8px 0',
            borderBottom: `1px solid ${L.lineSoft}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {row.label}
              </div>
              <div style={{ fontSize: 14, color: L.t1, fontWeight: 500, marginTop: 1 }}>
                {row.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', background: '#4285f4', color: '#fff',
            borderRadius: 12, padding: '13px 20px', fontSize: 14, fontWeight: 700,
            textDecoration: 'none', textAlign: 'center',
          }}
        >
          📅 Adicionar ao Google Agenda
        </a>
        <button
          onClick={() => window.print()}
          style={{
            background: L.surface, color: L.t1,
            border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '13px 20px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🖨️ Baixar comprovante
        </button>
        <button
          onClick={onReset}
          style={{
            background: 'none', color: L.teal, border: 'none',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            padding: '10px 0',
          }}
        >
          + Agendar outra consulta
        </button>
      </div>
    </div>
  )
}

// ─── Centered Modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 20,
        width: '100%', maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${L.line}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: L.t1 }}>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            color: L.t3, cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PageAgendamentoPublico({ profile, clinicaId: clinicaIdProp }) {
  const clinicaId = profile?.clinica_id || clinicaIdProp

  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Wizard state
  const [especialidade, setEspecialidade]   = useState(null)
  const [medico, setMedico]                 = useState(null)
  const [dateISO, setDateISO]               = useState(null)
  const [convenio_id, setConvenioId]        = useState(null)
  const [pacienteData, setPacienteData]     = useState(null)

  // Global data
  const [clinica, setClinica]     = useState(null)
  const [convenios, setConvenios] = useState([])
  const [confirming, setConfirming] = useState(false)

  // Load clinic info + convenios
  useEffect(() => {
    if (!clinicaId) return
    supabase.from('clinicas').select('*').eq('id', clinicaId).single()
      .then(({ data }) => setClinica(data))
    supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId)
      .then(({ data }) => setConvenios(data || []))
  }, [clinicaId])

  const resetWizard = () => {
    setStep(1); setDone(false); setError('')
    setEspecialidade(null); setMedico(null)
    setDateISO(null); setConvenioId(null); setPacienteData(null)
  }

  const handleConfirm = async () => {
    setConfirming(true)
    setError('')
    try {
      // Upsert paciente
      const cpfRaw = pacienteData.cpf.replace(/\D/g,'')
      let pacienteId = null

      const { data: existing } = await supabase
        .from('pacientes')
        .select('id')
        .eq('clinica_id', clinicaId)
        .eq('cpf', cpfRaw)
        .limit(1)
        .single()

      if (existing) {
        pacienteId = existing.id
      } else {
        const { data: novo, error: errPac } = await supabase
          .from('pacientes')
          .insert({
            clinica_id: clinicaId,
            nome: pacienteData.nome,
            cpf: cpfRaw,
            email: pacienteData.email || null,
            telefone: pacienteData.telefone.replace(/\D/g,''),
            data_nascimento: pacienteData.data_nascimento || null,
          })
          .select('id')
          .single()
        if (errPac) throw errPac
        pacienteId = novo.id
      }

      // Insert agendamento
      const { error: errAg } = await supabase
        .from('agendamentos')
        .insert({
          clinica_id: clinicaId,
          paciente_id: pacienteId,
          medico_id: medico.id,
          data_hora: dateISO,
          tipo: 'consulta',
          status: 'confirmado',
          convenio_id: convenio_id || null,
        })
      if (errAg) throw errAg

      setDone(true)
    } catch (e) {
      console.error(e)
      setError('Ocorreu um erro ao confirmar o agendamento. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  if (!clinicaId) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: L.t3 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
        <p style={{ fontSize: 16 }}>Clínica não identificada.</p>
      </div>
    )
  }

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @media print {
          body * { visibility: hidden; }
          #agendamento-comprovante, #agendamento-comprovante * { visibility: visible; }
          #agendamento-comprovante { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fafa 0%, #ffffff 60%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Hero header */}
        <div style={{
          background: L.tealGrad,
          padding: '28px 24px 24px',
          textAlign: 'center',
        }}>
          {clinica?.logo_url && (
            <img src={clinica.logo_url} alt={clinica.nome} style={{
              height: 44, marginBottom: 10, objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
            }} />
          )}
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            {clinica?.nome || 'Agendamento Online'}
          </h1>
          {clinica?.endereco && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
              📍 {clinica.endereco}
            </p>
          )}
        </div>

        {/* Step indicator */}
        {!done && (
          <div style={{
            background: '#fff', borderBottom: `1px solid ${L.line}`,
            padding: '16px 16px 12px',
          }}>
            <StepIndicator step={step} />
          </div>
        )}

        {/* Main content */}
        <div style={{
          maxWidth: 560, margin: '0 auto', padding: '28px 20px 60px',
          animation: 'fadeIn 0.25s ease',
        }}>
          {/* Error banner */}
          {error && (
            <div style={{
              background: L.redBg, border: `1px solid ${L.redBd}`,
              borderRadius: 12, padding: '12px 16px',
              color: L.red, fontSize: 14, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          {done ? (
            <div id="agendamento-comprovante">
              <SuccessScreen
                medico={medico}
                dateISO={dateISO}
                pacienteData={pacienteData}
                clinica={clinica}
                onReset={resetWizard}
              />
            </div>
          ) : step === 1 ? (
            <Step1Especialidade
              clinicaId={clinicaId}
              onSelect={esp => { setEspecialidade(esp); setStep(2) }}
            />
          ) : step === 2 ? (
            <Step2Medico
              clinicaId={clinicaId}
              especialidade={especialidade}
              onSelect={med => { setMedico(med); setStep(3) }}
              onBack={() => setStep(1)}
            />
          ) : step === 3 ? (
            <Step3DataHora
              clinicaId={clinicaId}
              medico={medico}
              convenios={convenios}
              onSelect={({ dateISO: d, convenio_id: c }) => {
                setDateISO(d); setConvenioId(c); setStep(4)
              }}
              onBack={() => setStep(2)}
            />
          ) : step === 4 ? (
            <Step4DadosPaciente
              clinicaId={clinicaId}
              onSubmit={dados => { setPacienteData(dados); setStep(5) }}
              onBack={() => setStep(3)}
            />
          ) : step === 5 ? (
            <Step5Confirmacao
              clinicaId={clinicaId}
              medico={medico}
              dateISO={dateISO}
              convenio_id={convenio_id}
              pacienteData={pacienteData}
              convenios={convenios}
              clinica={clinica}
              onConfirm={handleConfirm}
              onBack={() => setStep(4)}
              loading={confirming}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '20px', borderTop: `1px solid ${L.line}`,
          fontSize: 12, color: L.t4,
        }}>
          Agendamento seguro • {clinica?.nome || 'Clínica'}
          {clinica?.telefone && ` • ${clinica.telefone}`}
        </div>
      </div>
    </>
  )
}
