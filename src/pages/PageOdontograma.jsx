import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── helpers ─────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

function Lbl({ children }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
    }}>{children}</label>
  )
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><Lbl>{label}</Lbl>{children}</div>
}

function Btn({ onClick, children, style = {}, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
        border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'opacity 0.15s',
        ...style,
      }}
    >{children}</button>
  )
}

function BtnSec({ onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', color: L.t2, fontWeight: 500, fontSize: 13,
        border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '8px 16px',
        cursor: 'pointer', ...style,
      }}
    >{children}</button>
  )
}

/* ─── FDI tooth layout ─────────────────────────────────────── */
// Upper right: 18–11 (rendered L→R on screen)
// Upper left:  21–28
// Lower right: 48–41
// Lower left:  31–38
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_LEFT  = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
const LOWER_LEFT  = [31, 32, 33, 34, 35, 36, 37, 38]

const UPPER_ROW = [...UPPER_RIGHT, ...UPPER_LEFT]
const LOWER_ROW = [...LOWER_RIGHT, ...LOWER_LEFT]

/* ─── status config ────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'sadio',              label: 'Sadio',               color: '#ffffff', border: '#10b981', textColor: '#059669' },
  { value: 'carie',             label: 'Cárie',               color: '#fecaca', border: '#dc2626', textColor: '#dc2626' },
  { value: 'restaurado',        label: 'Restaurado',          color: '#bfdbfe', border: '#2563eb', textColor: '#1d4ed8' },
  { value: 'ausente',           label: 'Ausente',             color: '#d1d5db', border: '#6b7280', textColor: '#374151' },
  { value: 'implante',          label: 'Implante',            color: '#ede9fe', border: '#7c3aed', textColor: '#6d28d9' },
  { value: 'coroa',             label: 'Coroa',               color: '#fef9c3', border: '#ca8a04', textColor: '#92400e' },
  { value: 'tratamento_canal',  label: 'Trat. Canal',         color: '#fed7aa', border: '#ea580c', textColor: '#c2410c' },
  { value: 'fratura',           label: 'Fratura',             color: '#fce7f3', border: '#db2777', textColor: '#be185d' },
  { value: 'indicado_extracao', label: 'Ind. Extração',       color: '#fca5a5', border: '#991b1b', textColor: '#991b1b' },
]

function getStatusCfg(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

const PROC_STATUS = [
  { value: 'planejado',    label: 'Planejado',    color: L.blue,   bg: '#eff6ff' },
  { value: 'em_andamento', label: 'Em andamento', color: L.yellow, bg: '#fefce8' },
  { value: 'concluido',    label: 'Concluído',    color: L.green,  bg: '#f0fdf4' },
  { value: 'cancelado',    label: 'Cancelado',    color: L.t3,     bg: L.surface },
]
function getProcStatusCfg(s) { return PROC_STATUS.find(x => x.value === s) || PROC_STATUS[0] }

/* ─── Bottom-sheet modal ───────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 720 : 520,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</span>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Tooth box ────────────────────────────────────────────── */
function ToothBox({ number, record, onClick, isSelected }) {
  const cfg = record ? getStatusCfg(record.status) : getStatusCfg('sadio')
  const isAusente = record?.status === 'ausente'
  const isExtracao = record?.status === 'indicado_extracao'

  return (
    <div
      onClick={() => onClick(number)}
      title={`Dente ${number}${record ? ` — ${cfg.label}` : ''}`}
      style={{
        width: 40, height: 40, borderRadius: 6, cursor: 'pointer',
        border: `1.5px solid ${isSelected ? L.teal : cfg.border || L.line}`,
        background: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', transition: 'transform 0.1s',
        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        boxShadow: isSelected ? `0 0 0 2px ${L.teal}` : 'none',
        flexShrink: 0,
      }}
    >
      {(isAusente || isExtracao) && (
        <span style={{ fontSize: 18, color: cfg.textColor, fontWeight: 700, lineHeight: 1 }}>✕</span>
      )}
    </div>
  )
}

/* ─── Dental chart ─────────────────────────────────────────── */
function DentalChart({ records, selectedTooth, onToothClick }) {
  const getRecord = num => records.find(r => r.numero_dente === num)

  function ToothCol({ number, upper }) {
    const rec = getRecord(number)
    const cfg = rec ? getStatusCfg(rec.status) : null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {upper && (
          <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{number}</span>
        )}
        <ToothBox number={number} record={rec} onClick={onToothClick} isSelected={selectedTooth === number} />
        {!upper && (
          <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{number}</span>
        )}
        {cfg && (
          <span style={{
            fontSize: 8, color: cfg.textColor, fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'center', maxWidth: 40, overflow: 'hidden', whiteSpace: 'nowrap',
          }}>{cfg.label.substring(0, 5)}</span>
        )}
      </div>
    )
  }

  const rowStyle = {
    display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'nowrap',
  }
  const upperRowStyle = { ...rowStyle, alignItems: 'flex-start' }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      {/* Midline label */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 4, paddingLeft: 4 }}>
        <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>D. Superior</span>
      </div>

      {/* Upper arch */}
      <div style={upperRowStyle}>
        {UPPER_ROW.map(n => <ToothCol key={n} number={n} upper />)}
      </div>

      {/* Midline */}
      <div style={{
        height: 1, background: L.line, margin: '10px 0',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', left: '50%', top: -8, transform: 'translateX(-50%)',
          fontSize: 9, color: L.t4, background: L.bg, padding: '0 4px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>─── LINHA MÉDIA ───</span>
      </div>

      {/* Lower arch */}
      <div style={rowStyle}>
        {LOWER_ROW.map(n => <ToothCol key={n} number={n} upper={false} />)}
      </div>
      <div style={{ marginTop: 4, paddingLeft: 4 }}>
        <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>D. Inferior</span>
      </div>

      {/* Quadrant labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 8, paddingTop: 6, borderTop: `1px dashed ${L.line}`,
      }}>
        <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>Q2 ← Q1</span>
        <span style={{ fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>Q3 → Q4</span>
      </div>
    </div>
  )
}

/* ─── Legend ───────────────────────────────────────────────── */
function Legend() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16,
      padding: '12px 16px', background: L.surface, borderRadius: 10,
      border: `1px solid ${L.line}`,
    }}>
      {STATUS_OPTIONS.map(s => (
        <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3, background: s.color,
            border: `1.5px solid ${s.border}`, flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Tooth popover/sheet ──────────────────────────────────── */
function ToothSheet({ tooth, existing, pacienteId, clinicaId, profissionalId, onClose, onSaved }) {
  const [status, setStatus] = useState(existing?.status || 'sadio')
  const [obs, setObs] = useState(existing?.observacao || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      numero_dente: tooth,
      status,
      observacao: obs,
      profissional_id: profissionalId || null,
      data_registro: new Date().toISOString().split('T')[0],
    }
    let res
    if (existing?.id) {
      res = await supabase.from('odontograma').update(payload).eq('id', existing.id)
    } else {
      res = await supabase.from('odontograma').upsert(payload, {
        onConflict: 'clinica_id,paciente_id,numero_dente',
      })
    }
    setSaving(false)
    if (!res.error) { onSaved(); onClose() }
  }

  return (
    <Modal title={`Dente ${tooth}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="STATUS">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12,
                  border: `1.5px solid ${s.border}`,
                  background: status === s.value ? s.color : 'transparent',
                  color: s.textColor, fontWeight: status === s.value ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{s.label}</button>
            ))}
          </div>
        </Field>
        <Field label="OBSERVAÇÃO">
          <textarea value={obs} onChange={e => setObs(e.target.value)} style={ta} placeholder="Notas clínicas..." />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Tab 0 — Odontograma ──────────────────────────────────── */
function TabOdontograma({ clinicaId, pacientes, selectedPaciente, setSelectedPaciente, profile }) {
  const [records, setRecords] = useState([])
  const [loadingRec, setLoadingRec] = useState(false)
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [toothSheet, setToothSheet] = useState(null)

  const loadRecords = useCallback(async (pid) => {
    if (!pid) return
    setLoadingRec(true)
    const { data } = await supabase
      .from('odontograma')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', pid)
    setRecords(data || [])
    setLoadingRec(false)
  }, [clinicaId])

  useEffect(() => {
    if (selectedPaciente) loadRecords(selectedPaciente)
    else setRecords([])
  }, [selectedPaciente, loadRecords])

  function handleToothClick(num) {
    setSelectedTooth(num)
    const existing = records.find(r => r.numero_dente === num)
    setToothSheet({ tooth: num, existing })
  }

  const totalDentes = records.length
  const caries = records.filter(r => r.status === 'carie').length
  const ausentes = records.filter(r => r.status === 'ausente').length
  const restaurados = records.filter(r => r.status === 'restaurado').length

  return (
    <div>
      {/* Patient selector */}
      <div style={{
        background: L.surface, borderRadius: 12, padding: 16,
        border: `1px solid ${L.line}`, marginBottom: 20,
      }}>
        <Field label="PACIENTE">
          <select
            value={selectedPaciente || ''}
            onChange={e => setSelectedPaciente(e.target.value || null)}
            style={inp}
          >
            <option value="">— Selecionar paciente —</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
      </div>

      {!selectedPaciente && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🦷</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.t3 }}>Selecione um paciente</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>para visualizar o odontograma</div>
        </div>
      )}

      {selectedPaciente && (
        <>
          {/* KPI strip */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Dentes registrados', value: totalDentes, color: L.teal },
              { label: 'Com cárie', value: caries, color: L.red },
              { label: 'Ausentes', value: ausentes, color: L.t3 },
              { label: 'Restaurados', value: restaurados, color: L.blue },
            ].map(k => (
              <div key={k.label} style={{
                flex: '1 1 100px', background: L.surface, borderRadius: 10, padding: '12px 16px',
                border: `1px solid ${L.line}`, minWidth: 110,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: L.t4, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div style={{
            background: L.bg, borderRadius: 14, padding: '20px 16px',
            border: `1px solid ${L.line}`, boxShadow: L.shadow,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Diagrama FDI</span>
              {loadingRec && <span style={{ fontSize: 12, color: L.t4 }}>Carregando...</span>}
            </div>

            <DentalChart
              records={records}
              selectedTooth={selectedTooth}
              onToothClick={handleToothClick}
            />

            <Legend />

            <div style={{ marginTop: 12, fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
              Clique em qualquer dente para registrar o status clínico
            </div>
          </div>

          {/* Tooth list */}
          {records.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 10 }}>Registros</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {records.sort((a, b) => a.numero_dente - b.numero_dente).map(r => {
                  const cfg = getStatusCfg(r.status)
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: L.surface, border: `1px solid ${L.line}`,
                      cursor: 'pointer',
                    }} onClick={() => handleToothClick(r.numero_dente)}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                        background: cfg.color, border: `1.5px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, color: cfg.textColor,
                      }}>{r.numero_dente}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: L.t1 }}>{cfg.label}</div>
                        {r.observacao && <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>{r.observacao}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: L.t4 }}>{r.data_registro}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {toothSheet && (
        <ToothSheet
          tooth={toothSheet.tooth}
          existing={toothSheet.existing}
          pacienteId={selectedPaciente}
          clinicaId={clinicaId}
          profissionalId={profile?.id}
          onClose={() => { setToothSheet(null); setSelectedTooth(null) }}
          onSaved={() => loadRecords(selectedPaciente)}
        />
      )}
    </div>
  )
}

/* ─── Procedure form ───────────────────────────────────────── */
function ProcModal({ clinicaId, pacienteId, profissionalId, pacientes, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    clinica_id: clinicaId,
    paciente_id: pacienteId || initial?.paciente_id || '',
    numero_dente: initial?.numero_dente || '',
    descricao: initial?.descricao || '',
    status: initial?.status || 'planejado',
    valor: initial?.valor || '',
    data_proc: initial?.data_proc || new Date().toISOString().split('T')[0],
    profissional_id: profissionalId || initial?.profissional_id || null,
  })
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    let res
    if (initial?.id) {
      res = await supabase.from('procedimentos_odonto').update(form).eq('id', initial.id)
    } else {
      res = await supabase.from('procedimentos_odonto').insert(form)
    }
    setSaving(false)
    if (!res.error) { onSaved(); onClose() }
  }

  return (
    <Modal title={initial?.id ? 'Editar Procedimento' : 'Novo Procedimento'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {!pacienteId && (
          <Field label="PACIENTE">
            <select value={form.paciente_id} onChange={set('paciente_id')} style={inp}>
              <option value="">— Selecionar —</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Nº DO DENTE">
            <input type="number" value={form.numero_dente} onChange={set('numero_dente')} style={inp} placeholder="11" />
          </Field>
          <Field label="STATUS">
            <select value={form.status} onChange={set('status')} style={inp}>
              {PROC_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="DESCRIÇÃO DO PROCEDIMENTO">
          <textarea value={form.descricao} onChange={set('descricao')} style={ta} placeholder="Ex: Restauração classe II, canal radicular..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="VALOR (R$)">
            <input type="number" step="0.01" value={form.valor} onChange={set('valor')} style={inp} placeholder="0,00" />
          </Field>
          <Field label="DATA">
            <input type="date" value={form.data_proc} onChange={set('data_proc')} style={inp} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <BtnSec onClick={onClose}>Cancelar</BtnSec>
          <Btn onClick={save} disabled={saving || !form.descricao}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Tab 1 — Plano de Tratamento ─────────────────────────── */
function TabPlanoTratamento({ clinicaId, pacientes, selectedPaciente, profile }) {
  const [procs, setProcs] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    if (!selectedPaciente) return
    setLoading(true)
    const { data } = await supabase
      .from('procedimentos_odonto')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', selectedPaciente)
      .order('data_proc', { ascending: false })
    setProcs(data || [])
    setLoading(false)
  }, [clinicaId, selectedPaciente])

  useEffect(() => { load() }, [load])

  async function toggleStatus(proc) {
    const order = ['planejado', 'em_andamento', 'concluido']
    const idx = order.indexOf(proc.status)
    const nextStatus = order[(idx + 1) % order.length]
    await supabase.from('procedimentos_odonto').update({ status: nextStatus }).eq('id', proc.id)
    load()
  }

  const total = procs.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const concluido = procs.filter(p => p.status === 'concluido').reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const pendente = procs.filter(p => p.status !== 'concluido' && p.status !== 'cancelado').reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div>
      {!selectedPaciente && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 13, color: L.t3 }}>Selecione um paciente na aba Odontograma</div>
        </div>
      )}

      {selectedPaciente && (
        <>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total plano', value: fmt(total), color: L.teal },
              { label: 'Concluído', value: fmt(concluido), color: L.green },
              { label: 'Pendente', value: fmt(pendente), color: L.yellow },
            ].map(k => (
              <div key={k.label} style={{
                flex: '1 1 120px', background: L.surface, borderRadius: 10, padding: '12px 16px',
                border: `1px solid ${L.line}`,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: L.t4, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <Btn onClick={() => setModal('new')}>+ Adicionar Procedimento</Btn>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: L.t4 }}>Carregando...</div>
          ) : procs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 40, color: L.t4,
              border: `2px dashed ${L.line}`, borderRadius: 12,
            }}>
              Nenhum procedimento registrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {['Dente', 'Descrição', 'Status', 'Valor', 'Data', 'Ações'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left', fontSize: 11,
                        color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                        borderBottom: `1px solid ${L.line}`, fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {procs.map(p => {
                    const cfg = getProcStatusCfg(p.status)
                    return (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: L.teal }}>{p.numero_dente || '—'}</td>
                        <td style={{ padding: '10px 12px', color: L.t1, maxWidth: 260 }}>{p.descricao}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color,
                          }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: L.t2 }}>{p.valor ? fmt(p.valor) : '—'}</td>
                        <td style={{ padding: '10px 12px', color: L.t3, whiteSpace: 'nowrap' }}>{p.data_proc || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => toggleStatus(p)}
                              title="Avançar status"
                              style={{
                                fontSize: 11, padding: '4px 8px', borderRadius: 6,
                                border: `1px solid ${L.line}`, background: 'transparent',
                                color: L.t2, cursor: 'pointer',
                              }}>↻</button>
                            <button
                              onClick={() => setModal({ ...p })}
                              style={{
                                fontSize: 11, padding: '4px 8px', borderRadius: 6,
                                border: `1px solid ${L.line}`, background: 'transparent',
                                color: L.t2, cursor: 'pointer',
                              }}>✎</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {modal && (
            <ProcModal
              clinicaId={clinicaId}
              pacienteId={selectedPaciente}
              profissionalId={profile?.id}
              pacientes={pacientes}
              initial={modal === 'new' ? null : modal}
              onClose={() => setModal(null)}
              onSaved={load}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── Tab 2 — Histórico ────────────────────────────────────── */
function TabHistorico({ clinicaId, pacientes }) {
  const [procs, setProcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPac, setFiltroPac] = useState('')
  const [filtroDataIni, setFiltroDataIni] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('procedimentos_odonto')
        .select('*, pacientes(id, nome)')
        .eq('clinica_id', clinicaId)
        .order('data_proc', { ascending: false })
        .limit(500)
      setProcs(data || [])
      setLoading(false)
    }
    load()
  }, [clinicaId])

  const filtered = procs.filter(p => {
    if (filtroPac && p.paciente_id !== filtroPac) return false
    if (filtroDataIni && p.data_proc < filtroDataIni) return false
    if (filtroDataFim && p.data_proc > filtroDataFim) return false
    if (filtroStatus && p.status !== filtroStatus) return false
    return true
  })

  const fmt = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalFiltrado = filtered.reduce((s, p) => s + (Number(p.valor) || 0), 0)

  return (
    <div>
      {/* Filters */}
      <div style={{
        background: L.surface, borderRadius: 12, padding: 16, marginBottom: 20,
        border: `1px solid ${L.line}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          <Field label="PACIENTE">
            <select value={filtroPac} onChange={e => setFiltroPac(e.target.value)} style={inp}>
              <option value="">Todos</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
          <Field label="DATA INÍCIO">
            <input type="date" value={filtroDataIni} onChange={e => setFiltroDataIni(e.target.value)} style={inp} />
          </Field>
          <Field label="DATA FIM">
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={inp} />
          </Field>
          <Field label="STATUS">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={inp}>
              <option value="">Todos</option>
              {PROC_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, color: L.t3 }}>{filtered.length} procedimento(s)</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: L.teal }}>{fmt(totalFiltrado)}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>Carregando histórico...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 40, color: L.t4,
          border: `2px dashed ${L.line}`, borderRadius: 12,
        }}>Nenhum procedimento encontrado</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Paciente', 'Dente', 'Procedimento', 'Status', 'Valor', 'Data'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 11,
                    color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                    borderBottom: `1px solid ${L.line}`, fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cfg = getProcStatusCfg(p.status)
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: L.t1 }}>
                      {p.pacientes?.nome || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: L.teal }}>
                      {p.numero_dente || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2, maxWidth: 240 }}>{p.descricao}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color,
                      }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t2 }}>
                      {p.valor ? fmt(p.valor) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: L.t3, whiteSpace: 'nowrap' }}>
                      {p.data_proc || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────── */
export default function PageOdontograma({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)
  const [pacientes, setPacientes] = useState([])
  const [loadingPac, setLoadingPac] = useState(true)
  const [selectedPaciente, setSelectedPaciente] = useState(null)

  useEffect(() => {
    if (!clinicaId) return
    async function loadPacientes() {
      setLoadingPac(true)
      const { data } = await supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .eq('clinica_id', clinicaId)
        .order('nome')
      setPacientes(data || [])
      setLoadingPac(false)
    }
    loadPacientes()
  }, [clinicaId])

  const TABS = [
    { label: 'Odontograma', icon: '🦷' },
    { label: 'Plano de Tratamento', icon: '📋' },
    { label: 'Histórico', icon: '🗂️' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: L.t1, margin: 0 }}>Odontograma</h1>
        <p style={{ fontSize: 13, color: L.t4, margin: '4px 0 0' }}>
          Diagrama clínico dental — FDI / Plano de tratamento
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: L.surface, borderRadius: 10, padding: 4,
        border: `1px solid ${L.line}`, width: 'fit-content',
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: tab === i ? 700 : 500, fontSize: 13,
              background: tab === i ? L.teal : 'transparent',
              color: tab === i ? L.white : L.t2,
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabOdontograma
          clinicaId={clinicaId}
          pacientes={pacientes}
          selectedPaciente={selectedPaciente}
          setSelectedPaciente={setSelectedPaciente}
          profile={profile}
        />
      )}
      {tab === 1 && (
        <TabPlanoTratamento
          clinicaId={clinicaId}
          pacientes={pacientes}
          selectedPaciente={selectedPaciente}
          profile={profile}
        />
      )}
      {tab === 2 && (
        <TabHistorico
          clinicaId={clinicaId}
          pacientes={pacientes}
        />
      )}
    </div>
  )
}
