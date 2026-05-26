import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPOS = ['regular', 'extra', 'sobreaviso', 'feriado']
const STATUS_OPTS = ['escalado', 'confirmado', 'trocado', 'faltou', 'cancelado']
const SETORES = ['UTI', 'Pronto Socorro', 'Enfermaria', 'Centro Cirúrgico', 'Maternidade', 'Ambulatório']

const TIPO_MAP = {
  regular:    { label: 'Regular',    color: L.blue,   bg: L.blueBg },
  extra:      { label: 'Extra',      color: L.orange, bg: L.orangeBg },
  sobreaviso: { label: 'Sobreaviso', color: L.purple, bg: L.purpleBg },
  feriado:    { label: 'Feriado',    color: L.red,    bg: L.redBg },
}

const STATUS_MAP = {
  escalado:   { label: 'Escalado',   color: L.blue,   bg: L.blueBg },
  confirmado: { label: 'Confirmado', color: L.green,  bg: L.greenBg },
  trocado:    { label: 'Trocado',    color: L.yellow, bg: L.yellowBg },
  faltou:     { label: 'Faltou',     color: L.red,    bg: L.redBg },
  cancelado:  { label: 'Cancelado',  color: L.t3,     bg: L.surface },
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start)
    dd.setDate(start.getDate() + i)
    return dd
  })
}

function toISODate(d) {
  return d.toISOString().split('T')[0]
}

function parseTime(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function calcHours(inicio, fim) {
  let diff = parseTime(fim) - parseTime(inicio)
  if (diff < 0) diff += 24 * 60
  return Math.round((diff / 60) * 10) / 10
}

function fmtHours(h) {
  return `${h.toFixed(1)}h`
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDateFull(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function fmtDateLong(d) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function nowTimeMinutes() {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

function isCurrentShift(plantao) {
  if (toISODate(new Date()) !== plantao.data) return false
  const now = nowTimeMinutes()
  const ini = parseTime(plantao.hora_inicio)
  let fim = parseTime(plantao.hora_fim)
  if (fim < ini) fim += 24 * 60
  return now >= ini && now < fim
}

function minutesUntilEnd(plantao) {
  const ini = parseTime(plantao.hora_inicio)
  let fim = parseTime(plantao.hora_fim)
  if (fim < ini) fim += 24 * 60
  const now = nowTimeMinutes()
  return fim - now
}

function downloadCSV(rows, filename) {
  const header = Object.keys(rows[0]).join(',')
  const body = rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function TipoBadge({ tipo, small }) {
  const t = TIPO_MAP[tipo] || { label: tipo, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 20,
      fontSize: small ? 10 : 11, fontWeight: 700,
      color: t.color, background: t.bg, whiteSpace: 'nowrap'
    }}>{t.label}</span>
  )
}

function StatusBadge({ status, small }) {
  const s = STATUS_MAP[status] || { label: status, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 20,
      fontSize: small ? 10 : 11, fontWeight: 600,
      color: s.color, background: s.bg, whiteSpace: 'nowrap'
    }}>{s.label}</span>
  )
}

function Lbl({ children }) {
  return (
    <div style={{
      fontSize: 11, color: L.t4,
      fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 5, fontWeight: 500
    }}>{children}</div>
  )
}

function Inp({ value, onChange, type = 'text', placeholder, list }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8,
        background: L.bg, color: L.t1, outline: 'none'
      }}
    />
  )
}

function Sel({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '9px 12px', fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8,
        background: L.bg, color: L.t1, outline: 'none'
      }}
    >{children}</select>
  )
}

function BtnPrimary({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: L.teal, color: L.white, fontWeight: 600,
        padding: '10px 20px', borderRadius: 9, fontSize: 13,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, fontFamily: 'inherit'
      }}
    >{children}</button>
  )
}

function BtnGhost({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', color: L.t2, fontWeight: 500,
        padding: '8px 16px', borderRadius: 9, fontSize: 13,
        border: `1px solid ${L.line}`, cursor: 'pointer', fontFamily: 'inherit'
      }}
    >{children}</button>
  )
}

function BottomSheet({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg,
        borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 560,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 120px', background: L.surface, border: `1px solid ${L.line}`,
      borderRadius: 12, padding: '14px 18px'
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || L.t1 }}>{value}</div>
    </div>
  )
}

// ─── Tab 0: Grade de Plantões ────────────────────────────────────────────────

function TabGrade({ clinicaId, medicos }) {
  const [weekBase, setWeekBase] = useState(new Date())
  const [plantoes, setPlantoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    profissional_id: '', profissional_nome: '', cargo: '',
    data: '', hora_inicio: '', hora_fim: '',
    tipo: 'regular', setor: '', observacoes: ''
  })
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekBase)
  const weekStart = toISODate(weekDates[0])
  const weekEnd = toISODate(weekDates[6])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('plantoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .gte('data', weekStart)
      .lte('data', weekEnd)
      .order('hora_inicio')
    setPlantoes(data || [])
    setLoading(false)
  }, [clinicaId, weekStart, weekEnd])

  useEffect(() => { load() }, [load])

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.data || !form.hora_inicio || !form.hora_fim) return
    setSaving(true)
    const nome = form.profissional_id
      ? medicos.find(m => m.id === form.profissional_id)?.nome || form.profissional_nome
      : form.profissional_nome
    await supabase.from('plantoes').insert({
      clinica_id: clinicaId,
      profissional_id: form.profissional_id || null,
      profissional_nome: nome,
      cargo: form.cargo,
      data: form.data,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      tipo: form.tipo,
      setor: form.setor,
      status: 'escalado',
      observacoes: form.observacoes
    })
    setSaving(false)
    setShowForm(false)
    setForm({ profissional_id: '', profissional_nome: '', cargo: '', data: '', hora_inicio: '', hora_fim: '', tipo: 'regular', setor: '', observacoes: '' })
    load()
  }

  // KPIs
  const totalSemana = plantoes.length
  const horasExtras = plantoes.filter(p => p.tipo === 'extra').length
  const sobreavisoCount = plantoes.filter(p => p.tipo === 'sobreaviso').length
  const ausencias = plantoes.filter(p => p.status === 'faltou').length

  return (
    <div>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="Plantões esta semana" value={totalSemana} color={L.teal} />
        <KpiCard label="Horas extras" value={horasExtras} color={L.orange} />
        <KpiCard label="Em sobreaviso" value={sobreavisoCount} color={L.purple} />
        <KpiCard label="Ausências" value={ausencias} color={L.red} />
      </div>

      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BtnGhost onClick={prevWeek}>← Anterior</BtnGhost>
          <span style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>
            {fmtDate(weekStart)} – {fmtDate(weekEnd)}
          </span>
          <BtnGhost onClick={nextWeek}>Próxima →</BtnGhost>
        </div>
        <BtnPrimary onClick={() => setShowForm(true)}>+ Novo Plantão</BtnPrimary>
      </div>

      {/* 7-column grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, overflowX: 'auto', minWidth: 700 }}>
          {weekDates.map((day, i) => {
            const iso = toISODate(day)
            const dayPlantoes = plantoes.filter(p => p.data === iso)
            const isToday = iso === toISODate(new Date())
            return (
              <div key={iso} style={{
                background: L.surface, border: `1.5px solid ${isToday ? L.teal : L.line}`,
                borderRadius: 10, minHeight: 120
              }}>
                <div style={{
                  padding: '8px 10px', borderBottom: `1px solid ${L.line}`,
                  background: isToday ? L.tealBg : 'transparent', borderRadius: '8px 8px 0 0'
                }}>
                  <div style={{ fontSize: 11, color: isToday ? L.teal : L.t3, fontWeight: 700 }}>{DIAS_SEMANA[i]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? L.teal : L.t1 }}>{day.getDate()}</div>
                </div>
                <div style={{ padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayPlantoes.map(p => (
                    <div key={p.id} style={{
                      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 6,
                      padding: '5px 7px', fontSize: 11
                    }}>
                      <div style={{ fontWeight: 600, color: L.t1, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.profissional_nome}
                      </div>
                      <div style={{ color: L.t3, marginBottom: 3 }}>
                        {p.hora_inicio?.slice(0, 5)}–{p.hora_fim?.slice(0, 5)}
                      </div>
                      {p.setor && <div style={{ color: L.t4, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.setor}</div>}
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <TipoBadge tipo={p.tipo} small />
                        <StatusBadge status={p.status} small />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New plantão bottom-sheet */}
      {showForm && (
        <BottomSheet title="Novo Plantão" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Lbl>Profissional (médico cadastrado)</Lbl>
              <Sel value={form.profissional_id} onChange={v => setF('profissional_id', v)}>
                <option value="">— Selecionar ou digitar abaixo —</option>
                {medicos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>
                ))}
              </Sel>
            </div>
            <div>
              <Lbl>Nome do profissional (outros funcionários)</Lbl>
              <Inp value={form.profissional_nome} onChange={v => setF('profissional_nome', v)} placeholder="Nome completo" />
            </div>
            <div>
              <Lbl>Cargo</Lbl>
              <Inp value={form.cargo} onChange={v => setF('cargo', v)} placeholder="Ex: Médico, Enfermeiro, Técnico..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <Lbl>Data</Lbl>
                <Inp type="date" value={form.data} onChange={v => setF('data', v)} />
              </div>
              <div>
                <Lbl>Tipo</Lbl>
                <Sel value={form.tipo} onChange={v => setF('tipo', v)}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_MAP[t]?.label || t}</option>)}
                </Sel>
              </div>
              <div>
                <Lbl>Hora início</Lbl>
                <Inp type="time" value={form.hora_inicio} onChange={v => setF('hora_inicio', v)} />
              </div>
              <div>
                <Lbl>Hora fim</Lbl>
                <Inp type="time" value={form.hora_fim} onChange={v => setF('hora_fim', v)} />
              </div>
            </div>
            <div>
              <Lbl>Setor</Lbl>
              <Inp value={form.setor} onChange={v => setF('setor', v)} placeholder="Digite ou selecione..." list="setores-list" />
              <datalist id="setores-list">
                {SETORES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <Lbl>Observações</Lbl>
              <textarea
                value={form.observacoes}
                onChange={e => setF('observacoes', e.target.value)}
                rows={3}
                placeholder="Observações adicionais..."
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13,
                  border: `1.5px solid ${L.line}`, borderRadius: 8,
                  background: L.bg, color: L.t1, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <BtnGhost onClick={() => setShowForm(false)}>Cancelar</BtnGhost>
              <BtnPrimary onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Plantão'}
              </BtnPrimary>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 1: Controle de Horas Extras ─────────────────────────────────────────

function TabHorasExtras({ clinicaId }) {
  const [plantoes, setPlantoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [year, month] = mes.split('-')
    const start = `${year}-${month}-01`
    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('plantoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .gte('data', start)
      .lte('data', end)
      .order('data')
    setPlantoes(data || [])
    setLoading(false)
  }, [clinicaId, mes])

  useEffect(() => { load() }, [load])

  const extras = plantoes.filter(p => {
    if (p.tipo === 'extra') return true
    const h = calcHours(p.hora_inicio, p.hora_fim)
    return h > 12
  })

  const totalHorasExtras = extras.reduce((sum, p) => {
    const h = calcHours(p.hora_inicio, p.hora_fim)
    return sum + Math.max(0, h - 12)
  }, 0)
  const totalValor = totalHorasExtras * 50

  function handleExport() {
    if (!extras.length) return
    const rows = extras.map(p => {
      const h = calcHours(p.hora_inicio, p.hora_fim)
      const extra = Math.max(0, h - 12)
      return {
        profissional: p.profissional_nome,
        cargo: p.cargo,
        data: p.data,
        horas_trabalhadas: fmtHours(h),
        horas_extras: fmtHours(extra),
        valor_hora_extra: `R$ ${(extra * 50).toFixed(2)}`,
        status: p.status
      }
    })
    downloadCSV(rows, `horas-extras-${mes}.csv`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>Mês:</div>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            style={{
              padding: '8px 12px', fontSize: 13,
              border: `1.5px solid ${L.line}`, borderRadius: 8,
              background: L.bg, color: L.t1, outline: 'none'
            }}
          />
        </div>
        <BtnGhost onClick={handleExport}>⬇ Exportar Relatório</BtnGhost>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>Carregando...</div>
      ) : extras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>
          Nenhuma hora extra registrada neste período.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${L.line}` }}>
                  {['Profissional', 'Cargo', 'Data', 'Horas Trab.', 'Horas Extras', 'Valor Extra', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {extras.map(p => {
                  const h = calcHours(p.hora_inicio, p.hora_fim)
                  const extra = Math.max(0, h - 12)
                  const valor = extra * 50
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: L.t1 }}>{p.profissional_nome}</td>
                      <td style={{ padding: '10px 12px', color: L.t2 }}>{p.cargo}</td>
                      <td style={{ padding: '10px 12px', color: L.t2, whiteSpace: 'nowrap' }}>{fmtDateFull(p.data)}</td>
                      <td style={{ padding: '10px 12px', color: L.t2 }}>{fmtHours(h)}</td>
                      <td style={{ padding: '10px 12px', color: L.orange, fontWeight: 600 }}>{fmtHours(extra)}</td>
                      <td style={{ padding: '10px 12px', color: L.green, fontWeight: 600 }}>R$ {valor.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={p.status} small /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals row */}
          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20,
            padding: '16px 20px', background: L.surface, borderRadius: 10,
            border: `1px solid ${L.line}`
          }}>
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Total horas extras</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: L.orange }}>{fmtHours(totalHorasExtras)}</div>
            </div>
            <div style={{ width: 1, background: L.line, margin: '0 4px' }} />
            <div>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>Total a pagar</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: L.green }}>R$ {totalValor.toFixed(2)}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                {extras.length} plantão(ões) com hora extra
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab 2: Substituições ─────────────────────────────────────────────────────

function TabSubstituicoes({ clinicaId, medicos }) {
  const [trocados, setTrocados] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [todoPlantoes, setTodoPlantoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plantao_id: '', substituto_id: '', obs: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const today = toISODate(new Date())
    const { data: all } = await supabase
      .from('plantoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .gte('data', today)
      .order('data')
    const arr = all || []
    setTrocados(arr.filter(p => p.status === 'trocado'))
    setPendentes(arr.filter(p => p.status === 'escalado'))
    setTodoPlantoes(arr)
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.plantao_id || !form.substituto_id) return
    setSaving(true)
    const sub = medicos.find(m => m.id === form.substituto_id)
    await supabase.from('plantoes')
      .update({
        status: 'trocado',
        substituto_id: form.substituto_id,
        observacoes: form.obs || null
      })
      .eq('id', form.plantao_id)
    setSaving(false)
    setShowForm(false)
    setForm({ plantao_id: '', substituto_id: '', obs: '' })
    load()
  }

  async function handleConfirmar(id) {
    await supabase.from('plantoes').update({ status: 'confirmado' }).eq('id', id)
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: L.t3 }}>Carregando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Pending escalados */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
            Aguardando Confirmação ({pendentes.length})
          </div>
          <BtnPrimary onClick={() => setShowForm(true)}>+ Registrar Substituição</BtnPrimary>
        </div>
        {pendentes.length === 0 ? (
          <div style={{ color: L.t3, fontSize: 13, padding: '12px 0' }}>Nenhum plantão pendente.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendentes.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '12px 16px', background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`
              }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{p.profissional_nome}</div>
                  <div style={{ fontSize: 11, color: L.t3 }}>{p.cargo} · {p.setor}</div>
                </div>
                <div style={{ fontSize: 12, color: L.t2 }}>
                  {fmtDateFull(p.data)} · {p.hora_inicio?.slice(0, 5)}–{p.hora_fim?.slice(0, 5)}
                </div>
                <TipoBadge tipo={p.tipo} small />
                <StatusBadge status={p.status} small />
                <button
                  onClick={() => handleConfirmar(p.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
                    cursor: 'pointer'
                  }}
                >✓ Confirmar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trocados */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: L.t1, marginBottom: 12 }}>
          Substituições Registradas ({trocados.length})
        </div>
        {trocados.length === 0 ? (
          <div style={{ color: L.t3, fontSize: 13, padding: '12px 0' }}>Nenhuma substituição registrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trocados.map(p => {
              const sub = medicos.find(m => m.id === p.substituto_id)
              return (
                <div key={p.id} style={{
                  padding: '12px 16px', background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{p.profissional_nome}</div>
                    <div style={{ fontSize: 11, color: L.t3 }}>→</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: L.teal }}>
                      {sub ? sub.nome : 'Substituto ID: ' + p.substituto_id}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <TipoBadge tipo={p.tipo} small />
                      <StatusBadge status={p.status} small />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: L.t3 }}>
                    {fmtDateFull(p.data)} · {p.hora_inicio?.slice(0, 5)}–{p.hora_fim?.slice(0, 5)} · {p.setor}
                  </div>
                  {p.observacoes && (
                    <div style={{ marginTop: 6, fontSize: 11, color: L.t4, fontStyle: 'italic' }}>{p.observacoes}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form bottom-sheet */}
      {showForm && (
        <BottomSheet title="Registrar Substituição" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Lbl>Plantão original</Lbl>
              <Sel value={form.plantao_id} onChange={v => setF('plantao_id', v)}>
                <option value="">— Selecionar plantão —</option>
                {todoPlantoes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.profissional_nome} · {fmtDate(p.data)} {p.hora_inicio?.slice(0, 5)} · {p.setor}
                  </option>
                ))}
              </Sel>
            </div>
            <div>
              <Lbl>Substituto</Lbl>
              <Sel value={form.substituto_id} onChange={v => setF('substituto_id', v)}>
                <option value="">— Selecionar profissional —</option>
                {medicos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>
                ))}
              </Sel>
            </div>
            <div>
              <Lbl>Observações</Lbl>
              <textarea
                value={form.obs}
                onChange={e => setF('obs', e.target.value)}
                rows={3}
                placeholder="Motivo da troca, detalhes..."
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13,
                  border: `1.5px solid ${L.line}`, borderRadius: 8,
                  background: L.bg, color: L.t1, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <BtnGhost onClick={() => setShowForm(false)}>Cancelar</BtnGhost>
              <BtnPrimary onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar Substituição'}
              </BtnPrimary>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

// ─── Tab 3: Exibição TV ───────────────────────────────────────────────────────

function TabTV({ clinicaId, profile }) {
  const [plantoes, setPlantoes] = useState([])
  const [now, setNow] = useState(new Date())
  const containerRef = useRef(null)

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load data every 60 seconds
  const load = useCallback(async () => {
    const today = toISODate(new Date())
    const tomorrow = toISODate(new Date(Date.now() + 86400000))
    const { data } = await supabase
      .from('plantoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .gte('data', today)
      .lte('data', tomorrow)
      .in('status', ['escalado', 'confirmado'])
      .order('data')
      .order('hora_inicio')
    setPlantoes(data || [])
  }, [clinicaId])

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [load])

  const current = plantoes.filter(isCurrentShift)
  const upcoming = plantoes.filter(p => {
    if (isCurrentShift(p)) return false
    const pDate = p.data
    const today = toISODate(new Date())
    if (pDate < today) return false
    if (pDate === today) {
      const ini = parseTime(p.hora_inicio)
      return ini > nowTimeMinutes()
    }
    return true
  }).slice(0, 4)

  const weekDates = getWeekDates(new Date())
  const weekRange = `${fmtDate(toISODate(weekDates[0]))} – ${fmtDate(toISODate(weekDates[6]))}`

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  function handleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }

  const TVTipoBadge = ({ tipo }) => {
    const t = TIPO_MAP[tipo] || { label: tipo, color: '#fff', bg: '#333' }
    return (
      <span style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
        color: t.color, background: t.bg, letterSpacing: 0.5
      }}>{t.label}</span>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: '#0a0f1e', minHeight: 'calc(100vh - 120px)',
        borderRadius: 16, padding: 24, color: '#e8eaf6',
        fontFamily: "'Outfit', system-ui, sans-serif",
        position: 'relative'
      }}
    >
      <style>{`
        @keyframes tvPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes tvSlide {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: 28, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00e5e5', letterSpacing: -0.5 }}>
            {profile?.clinica_nome || 'Clínica'}
          </div>
          <div style={{ fontSize: 14, color: '#8892b0', marginTop: 2 }}>{dateStr}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#ccd6f6', letterSpacing: 2, lineHeight: 1 }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 11, color: '#8892b0', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            Semana: {weekRange}
          </div>
        </div>
      </div>

      {/* PLANTÃO ATUAL */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#00e5e5',
            animation: 'tvPulse 2s ease infinite'
          }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00e5e5', letterSpacing: 3, textTransform: 'uppercase' }}>
            Plantão Atual
          </div>
        </div>

        {current.length === 0 ? (
          <div style={{
            padding: '28px 32px', background: 'rgba(255,255,255,0.04)',
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
            color: '#8892b0', fontSize: 15, textAlign: 'center'
          }}>
            Nenhum plantão em andamento no momento.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {current.map(p => {
              const mins = minutesUntilEnd(p)
              const h = Math.floor(mins / 60)
              const m = mins % 60
              const encerra = h > 0 ? `${h}h ${m}min` : `${m}min`
              return (
                <div key={p.id} style={{
                  flex: '1 1 280px', background: 'rgba(0,229,229,0.08)',
                  border: '1.5px solid rgba(0,229,229,0.3)', borderRadius: 16,
                  padding: '24px 28px', animation: 'tvSlide 0.4s ease'
                }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ccd6f6', marginBottom: 8, lineHeight: 1.2 }}>
                    {p.profissional_nome}
                  </div>
                  <div style={{ fontSize: 16, color: '#8892b0', marginBottom: 4 }}>{p.cargo}</div>
                  <div style={{ fontSize: 16, color: '#8892b0', marginBottom: 12 }}>📍 {p.setor}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <TVTipoBadge tipo={p.tipo} />
                    <span style={{ fontSize: 13, color: '#8892b0' }}>
                      {p.hora_inicio?.slice(0, 5)} – {p.hora_fim?.slice(0, 5)}
                    </span>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 14px',
                    fontSize: 13, color: '#00e5e5', fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    ⏱ Encerra em {encerra}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* PRÓXIMOS PLANTÕES */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
          Próximos Plantões
        </div>

        {upcoming.length === 0 ? (
          <div style={{
            padding: '20px 24px', background: 'rgba(255,255,255,0.03)',
            borderRadius: 12, color: '#64748b', fontSize: 14, textAlign: 'center'
          }}>
            Nenhum próximo plantão programado.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {upcoming.map(p => (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                padding: '16px 20px'
              }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#ccd6f6', marginBottom: 4 }}>
                  {p.profissional_nome}
                </div>
                <div style={{ fontSize: 12, color: '#8892b0', marginBottom: 6 }}>{p.cargo}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {fmtDate(p.data)} · {p.hora_inicio?.slice(0, 5)}–{p.hora_fim?.slice(0, 5)}
                </div>
                <div style={{ fontSize: 12, color: '#8892b0', marginBottom: 8 }}>📍 {p.setor}</div>
                <TVTipoBadge tipo={p.tipo} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 24, left: 24, right: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: 11, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
          Atualização automática a cada 60s · Semana {weekRange}
        </div>
        <button
          onClick={handleFullscreen}
          style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(0,229,229,0.15)', color: '#00e5e5',
            border: '1px solid rgba(0,229,229,0.3)', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >⛶ Tela Cheia</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Grade de Plantões', 'Horas Extras', 'Substituições', '📺 Exibição TV']

export default function PagePlantoes({ profile }) {
  const [tab, setTab] = useState(0)
  const [medicos, setMedicos] = useState([])

  useEffect(() => {
    if (!profile?.clinica_id) return
    supabase
      .from('medicos')
      .select('id, nome, especialidade')
      .eq('clinica_id', profile.clinica_id)
      .order('nome')
      .then(({ data }) => setMedicos(data || []))
  }, [profile?.clinica_id])

  if (!profile?.clinica_id) {
    return (
      <div style={{ padding: 40, color: L.t3, textAlign: 'center' }}>
        Sem acesso à clínica.
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: L.t1, letterSpacing: -0.5 }}>
          Gestão de Plantões
        </div>
        <div style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
          Escalonamento, controle de horas e exibição em painel
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        background: L.surface, borderRadius: 12, padding: 4,
        width: 'fit-content', border: `1px solid ${L.line}`
      }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: tab === i ? 700 : 500,
              background: tab === i ? L.bg : 'transparent',
              color: tab === i ? L.teal : L.t3,
              border: tab === i ? `1px solid ${L.line}` : '1px solid transparent',
              boxShadow: tab === i ? L.shadow : 'none',
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
              whiteSpace: 'nowrap'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 0 && <TabGrade clinicaId={profile.clinica_id} medicos={medicos} />}
        {tab === 1 && <TabHorasExtras clinicaId={profile.clinica_id} />}
        {tab === 2 && <TabSubstituicoes clinicaId={profile.clinica_id} medicos={medicos} />}
        {tab === 3 && <TabTV clinicaId={profile.clinica_id} profile={profile} />}
      </div>
    </div>
  )
}
