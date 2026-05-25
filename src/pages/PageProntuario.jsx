import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

function calcAge(dob) {
  if (!dob) return '—'
  return Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25))
}

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-BR')
}

function calcIMC(peso, altura) {
  if (!peso || !altura) return null
  const h = parseFloat(altura) / 100
  const p = parseFloat(peso)
  if (!h || !p) return null
  return (p / (h * h)).toFixed(1)
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }

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

function Row2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}
function Row3({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>{children}</div>
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
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 800 : 580, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'inline-block', width: 18, height: 18, border: `2.5px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite', verticalAlign: 'middle' }} />
  )
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11,
      fontWeight: 700, background: bg, color: color, letterSpacing: '0.3px',
      fontFamily: "'JetBrains Mono', monospace",
    }}>{label}</span>
  )
}

function statusBadge(s) {
  if (s === 'realizada') return <Badge label="Realizada" color={L.green} bg={L.greenBg} />
  if (s === 'cancelada') return <Badge label="Cancelada" color={L.red} bg={L.redBg} />
  return <Badge label="Pendente" color={L.yellow} bg={L.yellowBg} />
}

function docTypeBadge(t) {
  const map = {
    receita: { label: 'Receita', color: L.blue, bg: L.blueBg },
    atestado: { label: 'Atestado', color: L.green, bg: L.greenBg },
    encaminhamento: { label: 'Encaminhamento', color: L.purple, bg: L.purpleBg },
    solicitacao_exame: { label: 'Solicitação Exame', color: L.teal, bg: L.tealBg },
    declaracao: { label: 'Declaração', color: L.orange, bg: L.orangeBg },
  }
  const d = map[t] || { label: t, color: L.t3, bg: L.surface }
  return <Badge label={d.label} color={d.color} bg={d.bg} />
}

function PrimaryBtn({ onClick, disabled, children, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? L.line : L.teal, color: L.white, fontWeight: 600,
      borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '9px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  )
}

function SecondaryBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', color: L.t2, fontWeight: 600,
      borderRadius: 8, border: `1.5px solid ${L.line}`, cursor: 'pointer',
      padding: '9px 18px', fontSize: 13, ...style,
    }}>{children}</button>
  )
}

function printDocument(doc, paciente, clinicaNome) {
  const w = window.open('', '_blank')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.titulo}</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 700px; margin: 40px auto; color: #111; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
    .line { border: none; border-top: 1px solid #ccc; margin: 24px 0; }
    .content { font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
    .sig { margin-top: 60px; }
    .sig-line { border-top: 1px solid #555; width: 220px; margin-bottom: 6px; }
    .footer { font-size: 12px; color: #888; margin-top: 40px; }
    @media print { body { margin: 20mm; } }
  </style></head><body>
  <div style="text-align:center;margin-bottom:20px">
    <h1>${clinicaNome || 'Clínica'}</h1>
    <div class="meta">${doc.tipo ? doc.tipo.replace(/_/g, ' ').toUpperCase() : ''}: ${doc.titulo}</div>
  </div>
  <hr class="line">
  <div class="meta">
    <strong>Paciente:</strong> ${paciente?.nome || '—'}<br>
    <strong>Médico:</strong> ${doc.medicos?.nome || '—'}<br>
    <strong>Data:</strong> ${fmtDateShort(doc.criado_em)}
  </div>
  <hr class="line">
  <div class="content">${(doc.conteudo || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <div class="sig">
    <div class="sig-line"></div>
    <div style="font-size:13px">${doc.medicos?.nome || 'Médico Responsável'}</div>
  </div>
  <div class="footer">Documento gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

// ─────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────

function TabConsultas({ consultas, medicos, convenios, pacienteId, clinicaId, onReload }) {
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function toggleExpand(id) {
    setExpanded(p => ({ ...p, [id]: !p[id] }))
  }

  function openModal() {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm({ data_hora: local, tipo: 'consulta', status: 'realizada' })
    setModal(true)
  }

  async function save() {
    if (!form.data_hora) return
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      medico_id: form.medico_id || null,
      data_hora: form.data_hora,
      tipo: form.tipo || 'consulta',
      status: form.status || 'realizada',
      anamnese: form.anamnese || null,
      exame_fisico: form.exame_fisico || null,
      conduta: form.conduta || null,
      cid_principal: form.cid_principal || null,
      valor: form.valor ? parseFloat(form.valor) : null,
      convenio_id: form.convenio_id || null,
    }
    const { error } = await supabase.from('consultas').insert(payload)
    setSaving(false)
    if (!error) { setModal(false); onReload() }
  }

  const sorted = [...consultas].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn onClick={openModal}>+ Nova Consulta</PrimaryBtn>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: L.t4, fontSize: 14 }}>Nenhuma consulta registrada</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(c => (
          <div key={c.id} style={{ background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
            <div
              onClick={() => toggleExpand(c.id)}
              style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 3 }}>
                  {fmtDate(c.data_hora)}
                </div>
                <div style={{ fontSize: 12, color: L.t3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {c.medicos?.nome && <span>Dr(a). {c.medicos.nome}</span>}
                  {c.tipo && <span style={{ textTransform: 'capitalize' }}>{c.tipo}</span>}
                  {c.cid_principal && <span>CID: {c.cid_principal}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(c.status)}
                <span style={{ fontSize: 16, color: L.t4 }}>{expanded[c.id] ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded[c.id] && (
              <div style={{ borderTop: `1px solid ${L.line}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {c.anamnese && (
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>ANAMNESE</div>
                    <div style={{ fontSize: 13, color: L.t2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.anamnese}</div>
                  </div>
                )}
                {c.exame_fisico && (
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>EXAME FÍSICO</div>
                    <div style={{ fontSize: 13, color: L.t2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.exame_fisico}</div>
                  </div>
                )}
                {c.conduta && (
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>CONDUTA</div>
                    <div style={{ fontSize: 13, color: L.t2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{c.conduta}</div>
                  </div>
                )}
                {c.convenios?.nome && (
                  <div style={{ fontSize: 12, color: L.t3 }}>Convênio: {c.convenios.nome}</div>
                )}
                {c.valor != null && (
                  <div style={{ fontSize: 12, color: L.t3 }}>Valor: R$ {parseFloat(c.valor).toFixed(2)}</div>
                )}
                {!c.anamnese && !c.exame_fisico && !c.conduta && (
                  <div style={{ fontSize: 13, color: L.t4 }}>Sem detalhes registrados</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Nova Consulta" onClose={() => setModal(false)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Row2>
              <Field label="DATA E HORA *">
                <input style={inp} type="datetime-local" value={form.data_hora || ''} onChange={e => setForm(p => ({ ...p, data_hora: e.target.value }))} />
              </Field>
              <Field label="MÉDICO">
                <select style={inp} value={form.medico_id || ''} onChange={e => setForm(p => ({ ...p, medico_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` — ${m.especialidade}` : ''}</option>)}
                </select>
              </Field>
            </Row2>
            <Row3>
              <Field label="TIPO">
                <select style={inp} value={form.tipo || 'consulta'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="consulta">Consulta</option>
                  <option value="retorno">Retorno</option>
                  <option value="procedimento">Procedimento</option>
                </select>
              </Field>
              <Field label="STATUS">
                <select style={inp} value={form.status || 'realizada'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="realizada">Realizada</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </Field>
              <Field label="CID PRINCIPAL">
                <input style={inp} value={form.cid_principal || ''} onChange={e => setForm(p => ({ ...p, cid_principal: e.target.value }))} placeholder="Ex: J00" />
              </Field>
            </Row3>
            <Field label="ANAMNESE">
              <textarea style={ta} value={form.anamnese || ''} onChange={e => setForm(p => ({ ...p, anamnese: e.target.value }))} placeholder="Queixa principal, histórico..." />
            </Field>
            <Field label="EXAME FÍSICO">
              <textarea style={ta} value={form.exame_fisico || ''} onChange={e => setForm(p => ({ ...p, exame_fisico: e.target.value }))} placeholder="Achados do exame físico..." />
            </Field>
            <Field label="CONDUTA">
              <textarea style={ta} value={form.conduta || ''} onChange={e => setForm(p => ({ ...p, conduta: e.target.value }))} placeholder="Prescrições, orientações, encaminhamentos..." />
            </Field>
            <Row2>
              <Field label="CONVÊNIO">
                <select style={inp} value={form.convenio_id || ''} onChange={e => setForm(p => ({ ...p, convenio_id: e.target.value }))}>
                  <option value="">Particular / Nenhum</option>
                  {convenios.map(cv => <option key={cv.id} value={cv.id}>{cv.nome}</option>)}
                </select>
              </Field>
              <Field label="VALOR (R$)">
                <input style={inp} type="number" step="0.01" value={form.valor || ''} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0.00" />
              </Field>
            </Row2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <SecondaryBtn onClick={() => setModal(false)}>Cancelar</SecondaryBtn>
              <PrimaryBtn onClick={save} disabled={saving}>{saving ? <Spinner /> : null} Salvar</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TabTriagem({ triagem, pacienteId, clinicaId, onReload }) {
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function openModal() {
    setForm({})
    setModal(true)
  }

  async function save() {
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      pressao_arterial: form.pressao_arterial || null,
      frequencia_cardiaca: form.frequencia_cardiaca ? parseInt(form.frequencia_cardiaca) : null,
      temperatura: form.temperatura ? parseFloat(form.temperatura) : null,
      peso: form.peso ? parseFloat(form.peso) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      saturacao: form.saturacao ? parseFloat(form.saturacao) : null,
      observacoes: form.observacoes || null,
    }
    const { error } = await supabase.from('triagem').insert(payload)
    setSaving(false)
    if (!error) { setModal(false); onReload() }
  }

  const sorted = [...triagem].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn onClick={openModal}>+ Nova Triagem</PrimaryBtn>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: L.t4, fontSize: 14 }}>Nenhum registro de triagem</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(t => {
          const imc = calcIMC(t.peso, t.altura)
          return (
            <div key={t.id} style={{ background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: L.t2, marginBottom: 12 }}>
                {fmtDate(t.criado_em)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {t.pressao_arterial && (
                  <VitalBox label="Pressão Arterial" value={t.pressao_arterial} unit="mmHg" />
                )}
                {t.frequencia_cardiaca && (
                  <VitalBox label="Freq. Cardíaca" value={t.frequencia_cardiaca} unit="bpm" />
                )}
                {t.temperatura && (
                  <VitalBox label="Temperatura" value={t.temperatura} unit="°C" />
                )}
                {t.peso && (
                  <VitalBox label="Peso" value={t.peso} unit="kg" />
                )}
                {t.altura && (
                  <VitalBox label="Altura" value={t.altura} unit="cm" />
                )}
                {t.saturacao && (
                  <VitalBox label="Saturação O₂" value={t.saturacao} unit="%" />
                )}
                {imc && (
                  <VitalBox label="IMC" value={imc} unit="" />
                )}
              </div>
              {t.observacoes && (
                <div style={{ marginTop: 10, fontSize: 13, color: L.t3, borderTop: `1px solid ${L.lineSoft}`, paddingTop: 10 }}>
                  {t.observacoes}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title="Nova Triagem" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Row2>
              <Field label="PRESSÃO ARTERIAL">
                <input style={inp} value={form.pressao_arterial || ''} onChange={e => setForm(p => ({ ...p, pressao_arterial: e.target.value }))} placeholder="Ex: 120/80" />
              </Field>
              <Field label="FREQ. CARDÍACA (bpm)">
                <input style={inp} type="number" value={form.frequencia_cardiaca || ''} onChange={e => setForm(p => ({ ...p, frequencia_cardiaca: e.target.value }))} placeholder="Ex: 80" />
              </Field>
            </Row2>
            <Row3>
              <Field label="TEMPERATURA (°C)">
                <input style={inp} type="number" step="0.1" value={form.temperatura || ''} onChange={e => setForm(p => ({ ...p, temperatura: e.target.value }))} placeholder="Ex: 36.5" />
              </Field>
              <Field label="PESO (kg)">
                <input style={inp} type="number" step="0.1" value={form.peso || ''} onChange={e => setForm(p => ({ ...p, peso: e.target.value }))} placeholder="Ex: 70" />
              </Field>
              <Field label="ALTURA (cm)">
                <input style={inp} type="number" value={form.altura || ''} onChange={e => setForm(p => ({ ...p, altura: e.target.value }))} placeholder="Ex: 170" />
              </Field>
            </Row3>
            <Field label="SATURAÇÃO O₂ (%)">
              <input style={inp} type="number" step="0.1" value={form.saturacao || ''} onChange={e => setForm(p => ({ ...p, saturacao: e.target.value }))} placeholder="Ex: 98" />
            </Field>
            <Field label="OBSERVAÇÕES">
              <textarea style={ta} value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais..." />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <SecondaryBtn onClick={() => setModal(false)}>Cancelar</SecondaryBtn>
              <PrimaryBtn onClick={save} disabled={saving}>{saving ? <Spinner /> : null} Salvar</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function VitalBox({ label, value, unit }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8,
      padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: L.t1 }}>{value}<span style={{ fontSize: 11, color: L.t3, marginLeft: 3 }}>{unit}</span></div>
    </div>
  )
}

function TabDocumentos({ documentos, medicos, paciente, pacienteId, clinicaId, onReload }) {
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function toggleExpand(id) {
    setExpanded(p => ({ ...p, [id]: !p[id] }))
  }

  function openModal() {
    setForm({ tipo: 'receita' })
    setModal(true)
  }

  async function save() {
    if (!form.titulo || !form.tipo) return
    setSaving(true)
    const payload = {
      clinica_id: clinicaId,
      paciente_id: pacienteId,
      medico_id: form.medico_id || null,
      tipo: form.tipo,
      titulo: form.titulo,
      conteudo: form.conteudo || '',
    }
    const { error } = await supabase.from('documentos_medicos').insert(payload)
    setSaving(false)
    if (!error) { setModal(false); onReload() }
  }

  const sorted = [...documentos].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <PrimaryBtn onClick={openModal}>+ Novo Documento</PrimaryBtn>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: L.t4, fontSize: 14 }}>Nenhum documento registrado</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(doc => (
          <div key={doc.id} style={{ background: L.surface, borderRadius: 10, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {docTypeBadge(doc.tipo)}
                  <span style={{ fontWeight: 600, fontSize: 14, color: L.t1 }}>{doc.titulo}</span>
                </div>
                <div style={{ fontSize: 12, color: L.t3 }}>
                  {doc.medicos?.nome && <span>Dr(a). {doc.medicos.nome} · </span>}
                  {fmtDateShort(doc.criado_em)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <SecondaryBtn onClick={() => printDocument(doc, paciente, null)} style={{ padding: '6px 14px', fontSize: 12 }}>Imprimir</SecondaryBtn>
                <button onClick={() => toggleExpand(doc.id)} style={{
                  background: 'none', border: `1.5px solid ${L.line}`, borderRadius: 8, cursor: 'pointer',
                  padding: '6px 10px', fontSize: 12, color: L.t3,
                }}>{expanded[doc.id] ? '▲' : '▼'}</button>
              </div>
            </div>

            {expanded[doc.id] && (
              <div style={{ borderTop: `1px solid ${L.line}`, padding: '16px 18px' }}>
                <div style={{ fontSize: 13, color: L.t2, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {doc.conteudo || <span style={{ color: L.t4 }}>Sem conteúdo</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Novo Documento" onClose={() => setModal(false)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Row2>
              <Field label="TIPO *">
                <select style={inp} value={form.tipo || 'receita'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="receita">Receita</option>
                  <option value="atestado">Atestado</option>
                  <option value="encaminhamento">Encaminhamento</option>
                  <option value="solicitacao_exame">Solicitação de Exame</option>
                  <option value="declaracao">Declaração</option>
                </select>
              </Field>
              <Field label="MÉDICO">
                <select style={inp} value={form.medico_id || ''} onChange={e => setForm(p => ({ ...p, medico_id: e.target.value }))}>
                  <option value="">Selecione</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Field>
            </Row2>
            <Field label="TÍTULO *">
              <input style={inp} value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Receita de Amoxicilina" />
            </Field>
            <Field label="CONTEÚDO">
              <textarea style={{ ...ta, minHeight: 160 }} value={form.conteudo || ''} onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))} placeholder="Conteúdo do documento..." />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <SecondaryBtn onClick={() => setModal(false)}>Cancelar</SecondaryBtn>
              <PrimaryBtn onClick={save} disabled={saving || !form.titulo}>{saving ? <Spinner /> : null} Salvar</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TabResumo({ paciente, consultas, triagem, documentos, onPacienteUpdate }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (paciente) setForm({ ...paciente })
  }, [paciente])

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase.from('pacientes').update({
      nome: form.nome,
      cpf: form.cpf,
      data_nascimento: form.data_nascimento || null,
      telefone: form.telefone || null,
      sexo: form.sexo || null,
    }).eq('id', paciente.id)
    setSaving(false)
    if (!error) { setEditMode(false); onPacienteUpdate() }
  }

  const lastTriagem = [...triagem].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0]

  const allEvents = [
    ...consultas.map(c => ({ type: 'consulta', date: c.data_hora, label: `Consulta${c.medicos?.nome ? ` com Dr(a). ${c.medicos.nome}` : ''}`, color: L.teal, bg: L.tealBg })),
    ...triagem.map(t => ({ type: 'triagem', date: t.criado_em, label: 'Triagem registrada', color: L.blue, bg: L.blueBg })),
    ...documentos.map(d => ({ type: 'doc', date: d.criado_em, label: `Documento: ${d.titulo}`, color: L.purple, bg: L.purpleBg })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  return (
    <div>
      {/* Patient info card */}
      <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Dados do Paciente</div>
          {!editMode
            ? <SecondaryBtn onClick={() => setEditMode(true)} style={{ padding: '6px 14px', fontSize: 12 }}>Editar</SecondaryBtn>
            : <div style={{ display: 'flex', gap: 8 }}>
                <SecondaryBtn onClick={() => { setEditMode(false); setForm({ ...paciente }) }} style={{ padding: '6px 14px', fontSize: 12 }}>Cancelar</SecondaryBtn>
                <PrimaryBtn onClick={saveEdit} disabled={saving} style={{ padding: '6px 14px', fontSize: 12 }}>{saving ? <Spinner /> : null} Salvar</PrimaryBtn>
              </div>
          }
        </div>
        {editMode ? (
          <div>
            <Row2>
              <Field label="NOME">
                <input style={inp} value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              </Field>
              <Field label="CPF">
                <input style={inp} value={form.cpf || ''} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} />
              </Field>
            </Row2>
            <Row3>
              <Field label="DATA NASCIMENTO">
                <input style={inp} type="date" value={form.data_nascimento || ''} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              </Field>
              <Field label="TELEFONE">
                <input style={inp} value={form.telefone || ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
              </Field>
              <Field label="SEXO">
                <select style={inp} value={form.sexo || ''} onChange={e => setForm(p => ({ ...p, sexo: e.target.value }))}>
                  <option value="">Não informado</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </Field>
            </Row3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {[
              ['Nome', paciente?.nome],
              ['CPF', paciente?.cpf],
              ['Data de Nasc.', paciente?.data_nascimento ? fmtDateShort(paciente.data_nascimento) : '—'],
              ['Idade', paciente?.data_nascimento ? `${calcAge(paciente.data_nascimento)} anos` : '—'],
              ['Telefone', paciente?.telefone],
              ['Sexo', paciente?.sexo],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: L.t1, fontWeight: 500 }}>{val || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Consultas" value={consultas.length} color={L.teal} bg={L.tealBg} />
        <StatCard label="Registros Triagem" value={triagem.length} color={L.blue} bg={L.blueBg} />
        <StatCard label="Documentos" value={documentos.length} color={L.purple} bg={L.purpleBg} />
        {lastTriagem?.pressao_arterial && <StatCard label="Última PA" value={lastTriagem.pressao_arterial} unit="mmHg" color={L.green} bg={L.greenBg} />}
        {lastTriagem?.peso && <StatCard label="Último Peso" value={lastTriagem.peso} unit="kg" color={L.orange} bg={L.orangeBg} />}
        {lastTriagem?.peso && lastTriagem?.altura && (
          <StatCard label="IMC" value={calcIMC(lastTriagem.peso, lastTriagem.altura)} color={L.yellow} bg={L.yellowBg} />
        )}
      </div>

      {/* Recent activity */}
      <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 14 }}>Atividade Recente</div>
        {allEvents.length === 0 && (
          <div style={{ fontSize: 13, color: L.t4 }}>Nenhuma atividade registrada</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allEvents.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: L.t2, flex: 1 }}>{ev.label}</div>
              <div style={{ fontSize: 12, color: L.t4 }}>{fmtDateShort(ev.date)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}30` }}>
      <div style={{ fontSize: 11, color: color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color }}>
        {value ?? '—'}
        {unit && <span style={{ fontSize: 12, marginLeft: 3 }}>{unit}</span>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────

export default function PageProntuario({ profile }) {
  const clinicaId = profile?.clinica_id

  // List view
  const [pacientes, setPacientes] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [busca, setBusca] = useState('')

  // Selected patient view
  const [selectedPaciente, setSelectedPaciente] = useState(null)
  const [tab, setTab] = useState('consultas')
  const [loadingData, setLoadingData] = useState(false)
  const [consultas, setConsultas] = useState([])
  const [triagem, setTriagem] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [medicos, setMedicos] = useState([])
  const [convenios, setConvenios] = useState([])

  useEffect(() => {
    if (clinicaId) loadPacientes()
  }, [clinicaId])

  async function loadPacientes() {
    setLoadingList(true)
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, cpf, data_nascimento, telefone, sexo')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setPacientes(data || [])
    setLoadingList(false)
  }

  const loadPatientData = useCallback(async (pac) => {
    setLoadingData(true)
    const [c, t, d, m, cv] = await Promise.all([
      supabase.from('consultas')
        .select('id, data_hora, tipo, status, anamnese, exame_fisico, conduta, cid_principal, valor, medicos(nome, especialidade), convenios(nome)')
        .eq('clinica_id', clinicaId)
        .eq('paciente_id', pac.id)
        .order('data_hora', { ascending: false }),
      supabase.from('triagem')
        .select('id, pressao_arterial, frequencia_cardiaca, temperatura, peso, altura, saturacao, observacoes, criado_em')
        .eq('clinica_id', clinicaId)
        .eq('paciente_id', pac.id)
        .order('criado_em', { ascending: false }),
      supabase.from('documentos_medicos')
        .select('id, tipo, titulo, conteudo, criado_em, medicos(nome)')
        .eq('clinica_id', clinicaId)
        .eq('paciente_id', pac.id)
        .order('criado_em', { ascending: false }),
      supabase.from('medicos')
        .select('id, nome, especialidade')
        .eq('clinica_id', clinicaId)
        .order('nome'),
      supabase.from('convenios')
        .select('id, nome')
        .eq('clinica_id', clinicaId)
        .order('nome'),
    ])
    setConsultas(c.data || [])
    setTriagem(t.data || [])
    setDocumentos(d.data || [])
    setMedicos(m.data || [])
    setConvenios(cv.data || [])
    setLoadingData(false)
  }, [clinicaId])

  function selectPaciente(pac) {
    setSelectedPaciente(pac)
    setTab('consultas')
    loadPatientData(pac)
  }

  function voltar() {
    setSelectedPaciente(null)
    setTab('consultas')
  }

  function reloadData() {
    if (selectedPaciente) loadPatientData(selectedPaciente)
  }

  async function reloadPaciente() {
    const { data } = await supabase.from('pacientes').select('id, nome, cpf, data_nascimento, telefone, sexo').eq('id', selectedPaciente.id).single()
    if (data) setSelectedPaciente(data)
    loadPacientes()
  }

  const filtered = pacientes.filter(p => {
    const q = busca.toLowerCase()
    return !q || p.nome?.toLowerCase().includes(q) || p.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  })

  const TABS = [
    { key: 'consultas', label: 'Consultas' },
    { key: 'triagem', label: 'Triagem' },
    { key: 'documentos', label: 'Documentos' },
    { key: 'resumo', label: 'Resumo' },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ── Header ── */}
      {!selectedPaciente ? (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: L.t1, marginBottom: 4 }}>Prontuário Eletrônico</div>
            <div style={{ fontSize: 14, color: L.t3 }}>Selecione um paciente para ver o histórico completo</div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 20 }}>
            <input
              style={{ ...inp, maxWidth: 420, padding: '10px 14px', fontSize: 14 }}
              placeholder="Buscar por nome ou CPF..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          {loadingList ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filtered.map(pac => (
                <PacienteCard key={pac.id} pac={pac} onClick={() => selectPaciente(pac)} />
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: L.t4, fontSize: 14 }}>
                  Nenhum paciente encontrado
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Patient Header */}
          <div style={{
            background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
            padding: '20px 24px', marginBottom: 24,
          }}>
            <button
              onClick={voltar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: L.teal, fontSize: 13, fontWeight: 600, marginBottom: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Voltar
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: L.tealBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: L.teal, fontWeight: 700, flexShrink: 0 }}>
                {selectedPaciente.nome?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: L.t1, marginBottom: 4 }}>{selectedPaciente.nome}</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: L.t3 }}>
                  {selectedPaciente.cpf && <span>CPF: {selectedPaciente.cpf}</span>}
                  {selectedPaciente.data_nascimento && <span>{calcAge(selectedPaciente.data_nascimento)} anos</span>}
                  {selectedPaciente.telefone && <span>{selectedPaciente.telefone}</span>}
                  {selectedPaciente.sexo && <span>{selectedPaciente.sexo}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${L.line}`, paddingBottom: 0 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 18px', fontSize: 14, fontWeight: 600,
                  color: tab === t.key ? L.teal : L.t3,
                  borderBottom: tab === t.key ? `2px solid ${L.teal}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >{t.label}</button>
            ))}
          </div>

          {loadingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : (
            <div>
              {tab === 'consultas' && (
                <TabConsultas
                  consultas={consultas}
                  medicos={medicos}
                  convenios={convenios}
                  pacienteId={selectedPaciente.id}
                  clinicaId={clinicaId}
                  onReload={reloadData}
                />
              )}
              {tab === 'triagem' && (
                <TabTriagem
                  triagem={triagem}
                  pacienteId={selectedPaciente.id}
                  clinicaId={clinicaId}
                  onReload={reloadData}
                />
              )}
              {tab === 'documentos' && (
                <TabDocumentos
                  documentos={documentos}
                  medicos={medicos}
                  paciente={selectedPaciente}
                  pacienteId={selectedPaciente.id}
                  clinicaId={clinicaId}
                  onReload={reloadData}
                />
              )}
              {tab === 'resumo' && (
                <TabResumo
                  paciente={selectedPaciente}
                  consultas={consultas}
                  triagem={triagem}
                  documentos={documentos}
                  onPacienteUpdate={reloadPaciente}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PacienteCard({ pac, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? L.hover : L.surface,
        border: `1px solid ${hover ? L.teal : L.line}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: L.tealBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: L.teal, flexShrink: 0,
        }}>
          {pac.nome?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>{pac.nome}</div>
          {pac.sexo && <div style={{ fontSize: 11, color: L.t4 }}>{pac.sexo}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {pac.cpf && (
          <div style={{ fontSize: 12, color: L.t3 }}>
            <span style={{ color: L.t4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>CPF </span>
            {pac.cpf}
          </div>
        )}
        {pac.data_nascimento && (
          <div style={{ fontSize: 12, color: L.t3 }}>
            <span style={{ color: L.t4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>IDADE </span>
            {calcAge(pac.data_nascimento)} anos
          </div>
        )}
      </div>
    </div>
  )
}
