import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Animations ─────────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@keyframes up {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`

/* ─── Shared helpers ──────────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const focus = e => { e.target.style.borderColor = L.teal }
const blur  = e => { e.target.style.borderColor = L.line  }

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

function Row2({ cols = 2, gap = 12, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
    }}>{children}</div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18,
      border: `2.5px solid ${L.teal}30`,
      borderTopColor: L.teal,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

function BtnPrimary({ onClick, disabled, loading, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? L.line : L.teal,
        color: L.white, fontWeight: 600, fontSize: 13, border: 'none',
        borderRadius: 8, padding: '9px 18px', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, ...style,
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function BtnGhost({ onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', color: L.t2, fontWeight: 500, fontSize: 13,
        border: `1px solid ${L.line}`, borderRadius: 8, padding: '8px 14px',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ─── Bottom-sheet modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 640 }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── KPI card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: L.surface, borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${L.line}`, flex: 1, minWidth: 130,
    }}>
      <div style={{
        fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6,
      }}>{icon ? `${icon} ${label}` : label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || L.teal, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

/* ─── Tipo badge ──────────────────────────────────────────────────────────── */
const TIPO_META = {
  simples:           { label: 'Simples',           bg: L.blueBg,   color: L.blue,   bd: L.blueBd   },
  especial:          { label: 'Especial',           bg: L.orangeBg, color: L.orange, bd: L.orangeBd },
  controle_especial: { label: 'Controle Especial',  bg: L.redBg,    color: L.red,    bd: L.redBd    },
}
function TipoBadge({ tipo }) {
  const m = TIPO_META[tipo] || TIPO_META.simples
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: m.bg, color: m.color, border: `1px solid ${m.bd}`,
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  )
}

/* ─── Signed badge ────────────────────────────────────────────────────────── */
function SignedBadge({ assinado }) {
  return assinado ? (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
    }}>✓ Assinada</span>
  ) : (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: L.yellowBg, color: L.yellow, border: `1px solid ${L.yellowBd}`,
    }}>⏳ Pendente</span>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyMed() {
  return { nome: '', concentracao: '', forma: '', posologia: '', quantidade: '', duracao: '' }
}

/* ─── Detail sheet ────────────────────────────────────────────────────────── */
function DetailSheet({ prescricao, pacientes, medicos, onClose }) {
  const pac = pacientes.find(p => p.id === prescricao.paciente_id)
  const med = medicos.find(m => m.id === prescricao.medico_id)
  const meds = Array.isArray(prescricao.medicamentos) ? prescricao.medicamentos : []

  return (
    <Modal title="Detalhes da Prescrição" onClose={onClose} maxWidth={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row2 cols={2}>
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>PACIENTE</div>
            <div style={{ fontWeight: 600, color: L.t1 }}>{pac?.nome || '—'}</div>
            {pac?.data_nascimento && (
              <div style={{ fontSize: 12, color: L.t3 }}>{calcAge(pac.data_nascimento)} anos</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>MÉDICO</div>
            <div style={{ fontWeight: 600, color: L.t1 }}>{med?.nome || '—'}</div>
            {med?.crm && <div style={{ fontSize: 12, color: L.t3 }}>CRM {med.crm}</div>}
          </div>
        </Row2>

        <Row2 cols={3}>
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>DATA</div>
            <div style={{ fontSize: 13, color: L.t1 }}>{fmtDate(prescricao.data)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>TIPO</div>
            <TipoBadge tipo={prescricao.tipo} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>STATUS</div>
            <SignedBadge assinado={prescricao.assinado} />
          </div>
        </Row2>

        <div>
          <div style={{
            fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 10, letterSpacing: '0.3px',
          }}>MEDICAMENTOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meds.length === 0 && <div style={{ fontSize: 13, color: L.t3 }}>Nenhum medicamento cadastrado.</div>}
            {meds.map((m, i) => (
              <div key={i} style={{
                background: L.surface, borderRadius: 8, padding: '10px 14px',
                border: `1px solid ${L.line}`, fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: L.t1 }}>{m.nome} {m.concentracao}</div>
                <div style={{ color: L.t2, marginTop: 2 }}>{m.forma} · {m.posologia}</div>
                <div style={{ color: L.t3, fontSize: 12, marginTop: 2 }}>
                  Qtd: {m.quantidade} · Duração: {m.duracao}
                </div>
              </div>
            ))}
          </div>
        </div>

        {prescricao.orientacoes && (
          <div>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 6, letterSpacing: '0.3px',
            }}>ORIENTAÇÕES</div>
            <div style={{
              background: L.surface, borderRadius: 8, padding: '10px 14px',
              border: `1px solid ${L.line}`, fontSize: 13, color: L.t2,
              whiteSpace: 'pre-wrap',
            }}>{prescricao.orientacoes}</div>
          </div>
        )}

        {prescricao.hash_assinatura && (
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
            Hash assinatura: {prescricao.hash_assinatura}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ─── Nova prescrição sheet ───────────────────────────────────────────────── */
function NovaPrescricaoSheet({ clinicaId, pacientes, medicos, onClose, onSaved }) {
  const [form, setForm] = useState({
    paciente_id: '', medico_id: '', tipo: 'simples', data: todayISO(), orientacoes: '',
  })
  const [meds, setMeds] = useState([emptyMed()])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setMed = (i, k, v) => setMeds(ms => ms.map((m, idx) => idx === i ? { ...m, [k]: v } : m))
  const addMed = () => setMeds(ms => [...ms, emptyMed()])
  const rmMed  = i => setMeds(ms => ms.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!form.paciente_id) return setErr('Selecione o paciente.')
    if (!form.medico_id)   return setErr('Selecione o médico.')
    if (!form.data)        return setErr('Informe a data.')
    setErr('')
    setSaving(true)
    const { error } = await supabase.from('prescricoes_digitais').insert({
      clinica_id:  clinicaId,
      paciente_id: form.paciente_id,
      medico_id:   form.medico_id,
      tipo:        form.tipo,
      data:        form.data,
      orientacoes: form.orientacoes || null,
      medicamentos: meds.filter(m => m.nome.trim()),
      assinado:    false,
    })
    setSaving(false)
    if (error) return setErr(error.message)
    onSaved()
    onClose()
  }

  return (
    <Modal title="Nova Prescrição Digital" onClose={onClose} maxWidth={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Row2 cols={2}>
          <Field label="PACIENTE *">
            <select
              value={form.paciente_id}
              onChange={e => setF('paciente_id', e.target.value)}
              style={inp}
              onFocus={focus} onBlur={blur}
            >
              <option value="">Selecione...</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
          <Field label="MÉDICO *">
            <select
              value={form.medico_id}
              onChange={e => setF('medico_id', e.target.value)}
              style={inp}
              onFocus={focus} onBlur={blur}
            >
              <option value="">Selecione...</option>
              {medicos.map(m => <option key={m.id} value={m.id}>{m.nome} – CRM {m.crm}</option>)}
            </select>
          </Field>
        </Row2>

        <Row2 cols={2}>
          <Field label="TIPO DE RECEITUÁRIO">
            <select
              value={form.tipo}
              onChange={e => setF('tipo', e.target.value)}
              style={inp}
              onFocus={focus} onBlur={blur}
            >
              <option value="simples">Simples</option>
              <option value="especial">Especial</option>
              <option value="controle_especial">Controle Especial</option>
            </select>
          </Field>
          <Field label="DATA">
            <input
              type="date"
              value={form.data}
              onChange={e => setF('data', e.target.value)}
              style={inp}
              onFocus={focus} onBlur={blur}
            />
          </Field>
        </Row2>

        {/* Medications */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.3px',
            }}>MEDICAMENTOS</div>
            <BtnGhost onClick={addMed} style={{ fontSize: 12, padding: '5px 10px' }}>
              + Adicionar Medicamento
            </BtnGhost>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {meds.map((m, i) => (
              <div key={i} style={{
                background: L.surface, borderRadius: 10, padding: 14,
                border: `1px solid ${L.line}`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <div style={{
                    fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                  }}>MEDICAMENTO {i + 1}</div>
                  {meds.length > 1 && (
                    <button
                      onClick={() => rmMed(i)}
                      style={{ color: L.red, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Row2 cols={2}>
                    <Field label="NOME DO MEDICAMENTO">
                      <input
                        style={inp} value={m.nome}
                        onChange={e => setMed(i, 'nome', e.target.value)}
                        placeholder="Ex: Amoxicilina"
                        onFocus={focus} onBlur={blur}
                      />
                    </Field>
                    <Field label="CONCENTRAÇÃO">
                      <input
                        style={inp} value={m.concentracao}
                        onChange={e => setMed(i, 'concentracao', e.target.value)}
                        placeholder="Ex: 500mg"
                        onFocus={focus} onBlur={blur}
                      />
                    </Field>
                  </Row2>
                  <Row2 cols={2}>
                    <Field label="FORMA FARMACÊUTICA">
                      <select
                        style={inp} value={m.forma}
                        onChange={e => setMed(i, 'forma', e.target.value)}
                        onFocus={focus} onBlur={blur}
                      >
                        <option value="">Selecione...</option>
                        {['Comprimido','Cápsula','Solução','Suspensão','Injetável','Creme','Pomada','Spray','Sachê','Gota','Outro'].map(f =>
                          <option key={f} value={f}>{f}</option>
                        )}
                      </select>
                    </Field>
                    <Field label="POSOLOGIA">
                      <input
                        style={inp} value={m.posologia}
                        onChange={e => setMed(i, 'posologia', e.target.value)}
                        placeholder="Ex: 1 comprimido de 8/8h"
                        onFocus={focus} onBlur={blur}
                      />
                    </Field>
                  </Row2>
                  <Row2 cols={2}>
                    <Field label="QUANTIDADE">
                      <input
                        style={inp} value={m.quantidade}
                        onChange={e => setMed(i, 'quantidade', e.target.value)}
                        placeholder="Ex: 21 comprimidos"
                        onFocus={focus} onBlur={blur}
                      />
                    </Field>
                    <Field label="DURAÇÃO DO TRATAMENTO">
                      <input
                        style={inp} value={m.duracao}
                        onChange={e => setMed(i, 'duracao', e.target.value)}
                        placeholder="Ex: 7 dias"
                        onFocus={focus} onBlur={blur}
                      />
                    </Field>
                  </Row2>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="ORIENTAÇÕES GERAIS">
          <textarea
            value={form.orientacoes}
            onChange={e => setF('orientacoes', e.target.value)}
            rows={3}
            placeholder="Orientações adicionais para o paciente..."
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
            onFocus={focus} onBlur={blur}
          />
        </Field>

        {err && (
          <div style={{
            background: L.redBg, border: `1px solid ${L.redBd}`,
            borderRadius: 8, padding: '10px 14px', color: L.red, fontSize: 13,
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnPrimary onClick={save} loading={saving}>Salvar Prescrição</BtnPrimary>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Tab 0: Prescrições ──────────────────────────────────────────────────── */
function TabPrescricoes({ clinicaId, profile, prescricoes, pacientes, medicos, loading, onRefresh }) {
  const [search, setSearch]     = useState('')
  const [filterTipo, setFTipo]  = useState('')
  const [filterSign, setFSign]  = useState('todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [showNova, setShowNova] = useState(false)
  const [detail, setDetail]     = useState(null)
  const [signing, setSigning]   = useState(null)

  const today = todayISO()

  const filtered = prescricoes.filter(p => {
    const pac = pacientes.find(x => x.id === p.paciente_id)
    const nome = pac?.nome?.toLowerCase() || ''
    if (search && !nome.includes(search.toLowerCase())) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    if (filterSign === 'assinada' && !p.assinado) return false
    if (filterSign === 'pendente' && p.assinado)  return false
    if (dateFrom && p.data < dateFrom) return false
    if (dateTo   && p.data > dateTo)   return false
    return true
  })

  const kpiHoje     = prescricoes.filter(p => p.data === today).length
  const kpiAssinada = prescricoes.filter(p => p.assinado).length
  const kpiPendente = prescricoes.filter(p => !p.assinado).length
  const kpiCtrl     = prescricoes.filter(p => p.tipo === 'controle_especial').length

  const handleSign = async (id) => {
    setSigning(id)
    await supabase.from('prescricoes_digitais').update({
      assinado: true,
      hash_assinatura: Date.now().toString(36),
    }).eq('id', id)
    setSigning(null)
    onRefresh()
  }

  const handleWhatsApp = (p) => {
    const pac = pacientes.find(x => x.id === p.paciente_id)
    const med = medicos.find(m => m.id === p.medico_id)
    const meds = Array.isArray(p.medicamentos) ? p.medicamentos : []
    const medList = meds.map(m => `• ${m.nome} ${m.concentracao} — ${m.posologia} por ${m.duracao}`).join('\n')
    const txt = encodeURIComponent(
      `*Prescrição Digital*\n` +
      `Paciente: ${pac?.nome || '—'}\n` +
      `Médico: ${med?.nome || '—'} CRM ${med?.crm || '—'}\n` +
      `Data: ${fmtDate(p.data)}\n\n` +
      `*Medicamentos:*\n${medList}\n\n` +
      (p.orientacoes ? `*Orientações:* ${p.orientacoes}` : '')
    )
    window.open(`https://wa.me/?text=${txt}`, '_blank')
  }

  return (
    <div>
      <style>{GLOBAL_STYLES}</style>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="TOTAL HOJE"              value={kpiHoje}     color={L.teal}   icon="📋" />
        <KpiCard label="ASSINADAS"               value={kpiAssinada} color={L.green}  icon="✅" />
        <KpiCard label="PENDENTES ASSINATURA"    value={kpiPendente} color={L.yellow} icon="⏳" />
        <KpiCard label="CONTROLE ESPECIAL"       value={kpiCtrl}     color={L.red}    icon="⚠️" />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 16,
      }}>
        <input
          style={{ ...inp, width: 220, flex: '0 0 auto' }}
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        <select
          style={{ ...inp, width: 180, flex: '0 0 auto' }}
          value={filterTipo}
          onChange={e => setFTipo(e.target.value)}
          onFocus={focus} onBlur={blur}
        >
          <option value="">Todos os tipos</option>
          <option value="simples">Simples</option>
          <option value="especial">Especial</option>
          <option value="controle_especial">Controle Especial</option>
        </select>
        <select
          style={{ ...inp, width: 160, flex: '0 0 auto' }}
          value={filterSign}
          onChange={e => setFSign(e.target.value)}
          onFocus={focus} onBlur={blur}
        >
          <option value="todos">Todos</option>
          <option value="assinada">Assinada</option>
          <option value="pendente">Pendente</option>
        </select>
        <input
          type="date" style={{ ...inp, width: 150, flex: '0 0 auto' }}
          value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        <input
          type="date" style={{ ...inp, width: 150, flex: '0 0 auto' }}
          value={dateTo} onChange={e => setDateTo(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        <div style={{ flex: 1 }} />
        <BtnPrimary onClick={() => setShowNova(true)}>+ Nova Prescrição</BtnPrimary>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: L.t3, fontSize: 14,
        }}>Nenhuma prescrição encontrada.</div>
      ) : (
        <div style={{
          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  {['Paciente', 'Médico', 'Data', 'Tipo', 'Medicamentos', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                      color: L.t3, fontSize: 11, whiteSpace: 'nowrap',
                      fontFamily: "'JetBrains Mono', monospace",
                      borderBottom: `1px solid ${L.line}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const pac = pacientes.find(x => x.id === p.paciente_id)
                  const med = medicos.find(m => m.id === p.medico_id)
                  const meds = Array.isArray(p.medicamentos) ? p.medicamentos : []
                  return (
                    <tr key={p.id} style={{
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                      background: idx % 2 === 0 ? L.bg : L.surface,
                    }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: L.t1 }}>{pac?.nome || '—'}</div>
                        {pac?.data_nascimento && (
                          <div style={{ fontSize: 11, color: L.t3 }}>{calcAge(pac.data_nascimento)} anos</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t2 }}>
                        <div>{med?.nome || '—'}</div>
                        {med?.crm && <div style={{ fontSize: 11, color: L.t3 }}>CRM {med.crm}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t2, whiteSpace: 'nowrap' }}>
                        {fmtDate(p.data)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <TipoBadge tipo={p.tipo} />
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t2 }}>
                        {meds.length} med{meds.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <SignedBadge assinado={p.assinado} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                          <BtnGhost onClick={() => setDetail(p)} style={{ fontSize: 12, padding: '5px 10px' }}>
                            Ver
                          </BtnGhost>
                          {!p.assinado && (
                            <BtnGhost
                              onClick={() => handleSign(p.id)}
                              style={{ fontSize: 12, padding: '5px 10px', color: L.teal, borderColor: L.teal }}
                            >
                              {signing === p.id ? <Spinner /> : 'Assinar'}
                            </BtnGhost>
                          )}
                          <BtnGhost onClick={() => window.print()} style={{ fontSize: 12, padding: '5px 10px' }}>
                            🖨
                          </BtnGhost>
                          <BtnGhost onClick={() => handleWhatsApp(p)} style={{ fontSize: 12, padding: '5px 10px' }}>
                            📲
                          </BtnGhost>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNova && (
        <NovaPrescricaoSheet
          clinicaId={clinicaId}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => setShowNova(false)}
          onSaved={onRefresh}
        />
      )}

      {detail && (
        <DetailSheet
          prescricao={detail}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

/* ─── Print prescription template ────────────────────────────────────────── */
function PrescricaoTemplate({ p, pacientes, medicos, clinicaNome }) {
  const pac  = pacientes.find(x => x.id === p.paciente_id)
  const med  = medicos.find(m => m.id === p.medico_id)
  const meds = Array.isArray(p.medicamentos) ? p.medicamentos : []

  return (
    <div style={{
      background: L.white, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: 32, maxWidth: 680, margin: '0 auto', fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `2px solid ${L.teal}`, paddingBottom: 16, marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: L.teal }}>{clinicaNome || 'Clínica'}</div>
          <div style={{
            fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginTop: 4,
          }}>RECEITUÁRIO {(TIPO_META[p.tipo]?.label || '').toUpperCase()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: L.t2 }}>Data: <strong>{fmtDate(p.data)}</strong></div>
          <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>
            Nº {p.id?.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Patient */}
      <div style={{
        background: L.surface, borderRadius: 8, padding: '12px 16px',
        marginBottom: 20, border: `1px solid ${L.line}`,
      }}>
        <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>DADOS DO PACIENTE</div>
        <div style={{ fontWeight: 600, color: L.t1, fontSize: 15 }}>{pac?.nome || '—'}</div>
        {pac?.data_nascimento && (
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Nascimento: {fmtDate(pac.data_nascimento)} · {calcAge(pac.data_nascimento)} anos
          </div>
        )}
      </div>

      {/* Medications */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 12, letterSpacing: '0.3px',
        }}>PRESCRIÇÃO MÉDICA</div>
        {meds.length === 0 && (
          <div style={{ color: L.t3, fontSize: 13 }}>Nenhum medicamento prescrito.</div>
        )}
        {meds.map((m, i) => (
          <div key={i} style={{
            marginBottom: 16, paddingBottom: 16,
            borderBottom: i < meds.length - 1 ? `1px dashed ${L.line}` : 'none',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
              {i + 1}. {m.nome} {m.concentracao}
            </div>
            <div style={{ fontSize: 13, color: L.t2, marginTop: 4 }}>
              {m.forma && `${m.forma} · `}{m.posologia}
            </div>
            <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
              Quantidade: {m.quantidade} · Duração: {m.duracao}
            </div>
          </div>
        ))}
      </div>

      {/* Orientações */}
      {p.orientacoes && (
        <div style={{
          background: L.tealBg, borderRadius: 8, padding: '12px 16px',
          marginBottom: 24, border: `1px solid ${L.teal}20`,
        }}>
          <div style={{
            fontSize: 11, color: L.teal, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 6, letterSpacing: '0.3px',
          }}>ORIENTAÇÕES</div>
          <div style={{ fontSize: 13, color: L.t2, whiteSpace: 'pre-wrap' }}>{p.orientacoes}</div>
        </div>
      )}

      {/* Signature area */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginTop: 32,
      }}>
        <div style={{ textAlign: 'center' }}>
          {p.assinado ? (
            <div style={{
              background: L.greenBg, border: `1px solid ${L.greenBd}`,
              borderRadius: 8, padding: '8px 20px', color: L.green, fontSize: 12, fontWeight: 600,
              marginBottom: 8,
            }}>✓ ASSINADO DIGITALMENTE</div>
          ) : (
            <div style={{
              borderTop: `1px solid ${L.t3}`, width: 200, paddingTop: 8, marginBottom: 0,
            }} />
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{med?.nome || '—'}</div>
          {med?.crm && <div style={{ fontSize: 11, color: L.t3 }}>CRM {med.crm}</div>}
          {med?.especialidade && <div style={{ fontSize: 11, color: L.t3 }}>{med.especialidade}</div>}
        </div>
      </div>
    </div>
  )
}

/* ─── Tab 1: Receituário ──────────────────────────────────────────────────── */
function TabReceituario({ prescricoes, pacientes, medicos, profile }) {
  const [selectedId, setSelectedId] = useState('')
  const clinicaNome = profile?.clinicas?.nome || profile?.nome || 'Clínica'

  const sel = prescricoes.find(p => p.id === selectedId)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Field label="SELECIONAR PRESCRIÇÃO">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ ...inp, maxWidth: 480 }}
            onFocus={focus} onBlur={blur}
          >
            <option value="">Selecione uma prescrição...</option>
            {prescricoes.map(p => {
              const pac = pacientes.find(x => x.id === p.paciente_id)
              const med = medicos.find(m => m.id === p.medico_id)
              return (
                <option key={p.id} value={p.id}>
                  {fmtDate(p.data)} · {pac?.nome || '—'} · {med?.nome || '—'} ({TIPO_META[p.tipo]?.label || p.tipo})
                </option>
              )
            })}
          </select>
        </Field>
      </div>

      {sel ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <BtnPrimary onClick={() => window.print()}>🖨 Imprimir</BtnPrimary>
          </div>
          <PrescricaoTemplate
            p={sel}
            pacientes={pacientes}
            medicos={medicos}
            clinicaNome={clinicaNome}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '60px 24px', color: L.t3, fontSize: 14,
        }}>
          Selecione uma prescrição para visualizar o receituário.
        </div>
      )}
    </div>
  )
}

/* ─── Tab 2: Histórico por Paciente ──────────────────────────────────────── */
function TabHistorico({ prescricoes, pacientes, medicos }) {
  const [pacId, setPacId] = useState('')

  const hist = prescricoes
    .filter(p => p.paciente_id === pacId)
    .sort((a, b) => b.data.localeCompare(a.data))

  // Group by date
  const byDate = {}
  for (const p of hist) {
    if (!byDate[p.data]) byDate[p.data] = []
    byDate[p.data].push(p)
  }
  const dates = Object.keys(byDate)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Field label="SELECIONAR PACIENTE">
          <select
            value={pacId}
            onChange={e => setPacId(e.target.value)}
            style={{ ...inp, maxWidth: 360 }}
            onFocus={focus} onBlur={blur}
          >
            <option value="">Selecione um paciente...</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </Field>
      </div>

      {pacId && hist.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: L.t3, fontSize: 14 }}>
          Nenhuma prescrição encontrada para este paciente.
        </div>
      )}

      {!pacId && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: L.t3, fontSize: 14 }}>
          Selecione um paciente para ver o histórico de prescrições.
        </div>
      )}

      {dates.map(date => (
        <div key={date} style={{ marginBottom: 28 }}>
          {/* Date label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          }}>
            <div style={{
              background: L.teal, color: L.white, borderRadius: 20,
              padding: '3px 14px', fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{fmtDate(date)}</div>
            <div style={{ flex: 1, height: 1, background: L.line }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 8 }}>
            {byDate[date].map(p => {
              const med  = medicos.find(m => m.id === p.medico_id)
              const meds = Array.isArray(p.medicamentos) ? p.medicamentos : []
              return (
                <div key={p.id} style={{
                  background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                  padding: 16, boxShadow: L.shadow,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                    marginBottom: 12,
                  }}>
                    <TipoBadge tipo={p.tipo} />
                    <SignedBadge assinado={p.assinado} />
                    <span style={{ fontSize: 12, color: L.t3, marginLeft: 'auto' }}>
                      Dr(a). {med?.nome || '—'}
                      {med?.crm ? ` · CRM ${med.crm}` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {meds.length === 0 && (
                      <div style={{ fontSize: 12, color: L.t3 }}>Sem medicamentos cadastrados.</div>
                    )}
                    {meds.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, fontSize: 13, flexWrap: 'wrap',
                        padding: '6px 10px', background: L.surface, borderRadius: 6,
                      }}>
                        <span style={{ fontWeight: 600, color: L.t1 }}>{m.nome} {m.concentracao}</span>
                        {m.forma && <span style={{ color: L.t3 }}>·</span>}
                        {m.forma && <span style={{ color: L.t2 }}>{m.forma}</span>}
                        <span style={{ color: L.t3 }}>·</span>
                        <span style={{ color: L.t2 }}>{m.posologia}</span>
                        {m.duracao && (
                          <>
                            <span style={{ color: L.t3 }}>·</span>
                            <span style={{ color: L.t3, fontSize: 12 }}>{m.duracao}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {p.orientacoes && (
                    <div style={{
                      marginTop: 10, fontSize: 12, color: L.t3,
                      borderTop: `1px solid ${L.lineSoft}`, paddingTop: 8,
                    }}>
                      <span style={{ fontWeight: 600 }}>Orientações: </span>{p.orientacoes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function PagePrescricaoDigital({ profile }) {
  const clinicaId = profile?.clinica_id

  const [tab, setTab]               = useState(0)
  const [prescricoes, setPrescricoes] = useState([])
  const [pacientes, setPacientes]   = useState([])
  const [medicos, setMedicos]       = useState([])
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [rP, rPac, rMed] = await Promise.all([
      supabase
        .from('prescricoes_digitais')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('data', { ascending: false })
        .order('criado_em', { ascending: false }),
      supabase
        .from('pacientes')
        .select('id, nome, data_nascimento')
        .eq('clinica_id', clinicaId)
        .order('nome'),
      supabase
        .from('medicos')
        .select('id, nome, crm, especialidade')
        .eq('clinica_id', clinicaId)
        .order('nome'),
    ])
    if (rP.data)   setPrescricoes(rP.data)
    if (rPac.data) setPacientes(rPac.data)
    if (rMed.data) setMedicos(rMed.data)
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const TABS = ['Prescrições', 'Receituário', 'Histórico por Paciente']

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: L.t1, margin: 0 }}>
          Prescrição Digital
        </h1>
        <p style={{ fontSize: 13, color: L.t3, margin: '4px 0 0' }}>
          Gestão de receituários e histórico de prescrições
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: `2px solid ${L.line}`,
        marginBottom: 24,
      }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === i ? 600 : 500,
              color: tab === i ? L.teal : L.t3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2,
              transition: 'color 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && (
        <TabPrescricoes
          clinicaId={clinicaId}
          profile={profile}
          prescricoes={prescricoes}
          pacientes={pacientes}
          medicos={medicos}
          loading={loading}
          onRefresh={load}
        />
      )}
      {tab === 1 && (
        <TabReceituario
          prescricoes={prescricoes}
          pacientes={pacientes}
          medicos={medicos}
          profile={profile}
        />
      )}
      {tab === 2 && (
        <TabHistorico
          prescricoes={prescricoes}
          pacientes={pacientes}
          medicos={medicos}
        />
      )}
    </div>
  )
}
