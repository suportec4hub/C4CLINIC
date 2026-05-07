import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 760 : 560, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

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

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e) { e.target.style.borderColor = L.line }

function statusPA(sis, dia) {
  if (!sis || !dia) return null
  const s = Number(sis), d = Number(dia)
  if (s >= 180 || d >= 120) return 'crítico'
  if (s >= 140 || d >= 90) return 'atenção'
  return 'normal'
}

function statusO2(sat) {
  if (!sat) return null
  const v = Number(sat)
  if (v < 90) return 'crítico'
  if (v < 95) return 'atenção'
  return 'normal'
}

function overallStatus(t) {
  const statuses = [statusPA(t.pressao_sistolica, t.pressao_diastolica), statusO2(t.saturacao)]
  if (statuses.includes('crítico')) return 'crítico'
  if (statuses.includes('atenção')) return 'atenção'
  if (statuses.some(s => s === 'normal')) return 'normal'
  return null
}

function StatusBadge({ status }) {
  const map = {
    normal: { bg: L.greenBg, color: L.green, bd: L.greenBd, label: 'Normal' },
    'atenção': { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, label: 'Atenção' },
    'crítico': { bg: L.redBg, color: L.red, bd: L.redBd, label: 'Crítico' },
  }
  if (!status || !map[status]) return <span style={{ color: L.t4 }}>—</span>
  const s = map[status]
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`
    }}>{s.label}</span>
  )
}

function DorBadge({ value }) {
  if (value === null || value === undefined) return <span style={{ color: L.t4 }}>—</span>
  const v = Number(value)
  const color = v <= 3 ? L.green : v <= 6 ? L.yellow : L.red
  const bg = v <= 3 ? L.greenBg : v <= 6 ? L.yellowBg : L.redBg
  const bd = v <= 3 ? L.greenBd : v <= 6 ? L.yellowBd : L.redBd
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: bg, color: color, border: `1px solid ${bd}`
    }}>{v}/10</span>
  )
}

function calcIMC(peso, altura) {
  if (!peso || !altura) return null
  const h = Number(altura) / 100
  return (Number(peso) / (h * h)).toFixed(1)
}

export default function PageTriagem({ profile }) {
  const [triagens, setTriagens] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [tab, setTab] = useState('hoje')

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [tr, pacs, ags] = await Promise.all([
      supabase.from('triagem')
        .select('*, pacientes(id, nome)')
        .eq('clinica_id', clinicaId)
        .order('criado_em', { ascending: false })
        .limit(300),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('agendamentos').select('id, data_hora, paciente_id').eq('clinica_id', clinicaId).order('data_hora', { ascending: false }).limit(100),
    ])
    setTriagens(tr.data || [])
    setPacientes(pacs.data || [])
    setAgendamentos(ags.data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId })
    setModal('form')
  }

  async function salvar() {
    if (!form.paciente_id) return
    setSaving(true)
    const { pacientes: _, ...data } = form
    if (data.id) {
      const { id, ...rest } = data
      await supabase.from('triagem').update(rest).eq('id', id)
    } else {
      await supabase.from('triagem').insert(data)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const hoje = new Date().toDateString()

  const filtradas = triagens.filter(t => {
    const matchBusca = !busca || t.pacientes?.nome?.toLowerCase().includes(busca.toLowerCase())
    const matchTab = tab === 'todos' || new Date(t.criado_em).toDateString() === hoje
    return matchBusca && matchTab
  })

  const fmtHora = dt => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtDt = dt => new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const imc = calcIMC(form.peso, form.altura)

  const agsFiltrados = form.paciente_id
    ? agendamentos.filter(a => a.paciente_id === form.paciente_id)
    : agendamentos

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, background: L.surface, borderRadius: 8, padding: 3, border: `1px solid ${L.line}` }}>
          {['hoje', 'todos'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: tab === t ? L.teal : 'none', color: tab === t ? L.white : L.t3,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s'
            }}>{t === 'hoje' ? 'Hoje' : 'Todos'}</button>
          ))}
        </div>
        <input
          placeholder="Buscar por paciente..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, maxWidth: 300, ...inp, width: 'auto' }}
          onFocus={focus} onBlur={blur}
        />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtradas.length} triagens</div>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>+ Nova Triagem</button>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px 80px 80px 80px 80px',
          padding: '10px 16px', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
          borderBottom: `1px solid ${L.line}`, background: L.surface
        }}>
          <span>HR</span><span>PACIENTE</span><span>PA</span><span>FC / TEMP</span>
          <span>SAT O2</span><span>DOR</span><span>STATUS</span><span>DATA</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 24, height: 24, border: `3px solid ${L.line}`,
              borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
              animation: 'spin 0.7s linear infinite', margin: '0 auto'
            }} />
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            Nenhuma triagem encontrada
          </div>
        ) : filtradas.map(t => (
          <div key={t.id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px 80px 80px 80px 80px',
            padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
            transition: 'background 0.12s', cursor: 'pointer', alignItems: 'center'
          }}
            onMouseEnter={e => e.currentTarget.style.background = L.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { setForm({ ...t }); setModal('form') }}
          >
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{fmtHora(t.criado_em)}</div>
            <div style={{ fontWeight: 600, color: L.t1 }}>{t.pacientes?.nome || '—'}</div>
            <div style={{ fontSize: 12, color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>
              {t.pressao_sistolica && t.pressao_diastolica ? `${t.pressao_sistolica}/${t.pressao_diastolica}` : '—'}
            </div>
            <div style={{ fontSize: 12, color: L.t2 }}>
              {t.frequencia_cardiaca ? `${t.frequencia_cardiaca} bpm` : '—'}
              {t.temperatura ? ` · ${t.temperatura}°C` : ''}
            </div>
            <div style={{ fontSize: 12, color: L.t2 }}>{t.saturacao ? `${t.saturacao}%` : '—'}</div>
            <div><DorBadge value={t.dor_escala} /></div>
            <div><StatusBadge status={overallStatus(t)} /></div>
            <div style={{ fontSize: 11, color: L.t4 }}>{fmtDt(t.criado_em)}</div>
          </div>
        ))}
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Triagem' : 'Nova Triagem'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="PACIENTE *">
                <select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''}
                  onChange={e => setForm({ ...form, paciente_id: e.target.value, agendamento_id: '' })}
                >
                  <option value="">Selecione o paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="AGENDAMENTO (OPCIONAL)">
                <select style={{ ...inp, appearance: 'none' }} value={form.agendamento_id || ''}
                  onChange={e => setForm({ ...form, agendamento_id: e.target.value })}
                >
                  <option value="">Sem agendamento</option>
                  {agsFiltrados.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                ANTROPOMETRIA
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="PESO (KG)">
                  <input type="number" style={inp} value={form.peso || ''} placeholder="0.0" step="0.1" min="0"
                    onChange={e => setForm({ ...form, peso: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="ALTURA (CM)">
                  <input type="number" style={inp} value={form.altura || ''} placeholder="0" min="0"
                    onChange={e => setForm({ ...form, altura: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="IMC CALCULADO">
                  <div style={{
                    ...inp, background: L.surface, color: imc ? L.teal : L.t4,
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600
                  }}>
                    {imc ? `${imc} kg/m²` : '—'}
                  </div>
                </Field>
              </div>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                SINAIS VITAIS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="PRESSÃO SISTÓLICA (mmHg)">
                  <input type="number" style={inp} value={form.pressao_sistolica || ''} placeholder="120"
                    onChange={e => setForm({ ...form, pressao_sistolica: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="PRESSÃO DIASTÓLICA (mmHg)">
                  <input type="number" style={inp} value={form.pressao_diastolica || ''} placeholder="80"
                    onChange={e => setForm({ ...form, pressao_diastolica: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="FREQ. CARDÍACA (bpm)">
                  <input type="number" style={inp} value={form.frequencia_cardiaca || ''} placeholder="72"
                    onChange={e => setForm({ ...form, frequencia_cardiaca: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="FREQ. RESPIRATÓRIA (irpm)">
                  <input type="number" style={inp} value={form.frequencia_respiratoria || ''} placeholder="16"
                    onChange={e => setForm({ ...form, frequencia_respiratoria: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="TEMPERATURA (°C)">
                  <input type="number" style={inp} value={form.temperatura || ''} placeholder="36.5" step="0.1"
                    onChange={e => setForm({ ...form, temperatura: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="SATURAÇÃO O2 (%)">
                  <input type="number" style={inp} value={form.saturacao || ''} placeholder="98" min="0" max="100"
                    onChange={e => setForm({ ...form, saturacao: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
                <Field label="GLICEMIA (mg/dL)">
                  <input type="number" style={inp} value={form.glicemia || ''} placeholder="90"
                    onChange={e => setForm({ ...form, glicemia: e.target.value })} onFocus={focus} onBlur={blur} />
                </Field>
              </div>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                ESCALA DE DOR
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 11 }, (_, i) => {
                  const isSelected = form.dor_escala === i || form.dor_escala === String(i)
                  const color = i <= 3 ? L.green : i <= 6 ? L.yellow : L.red
                  const bg = i <= 3 ? L.greenBg : i <= 6 ? L.yellowBg : L.redBg
                  const bd = i <= 3 ? L.greenBd : i <= 6 ? L.yellowBd : L.redBd
                  return (
                    <button key={i} onClick={() => setForm({ ...form, dor_escala: i })} style={{
                      width: 38, height: 38, borderRadius: 8, fontSize: 13, fontWeight: 700,
                      border: `2px solid ${isSelected ? color : L.line}`,
                      background: isSelected ? bg : L.bg,
                      color: isSelected ? color : L.t3,
                      cursor: 'pointer', transition: 'all 0.12s'
                    }}>{i}</button>
                  )
                })}
              </div>
            </div>

            <Field label="OBSERVAÇÕES">
              <textarea style={ta} value={form.observacoes || ''} placeholder="Observações clínicas adicionais..."
                onChange={e => setForm({ ...form, observacoes: e.target.value })} onFocus={focus} onBlur={blur} />
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.paciente_id} style={{
                flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, border: 'none',
                cursor: saving || !form.paciente_id ? 'not-allowed' : 'pointer',
                opacity: saving || !form.paciente_id ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Triagem'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
