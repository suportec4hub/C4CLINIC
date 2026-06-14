import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import UploadArquivo from '../components/UploadArquivo.jsx'

/* ─── Style helpers ───────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }
const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
  border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
}
const btnGhost = {
  background: 'none', color: L.t3, fontWeight: 500, fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

/* ─── Field wrapper ───────────────────────────────────────────── */
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

function Row2({ children, gap = 12 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>{children}</div>
}

/* ─── Exam type config ────────────────────────────────────────── */
const TIPO_CFG = {
  raio_x:        { label: 'Raio-X',          icon: '🩻', color: L.blue,   bg: L.blueBg   },
  tomografia:    { label: 'Tomografia',       icon: '🔬', color: L.purple, bg: L.purpleBg },
  ressonancia:   { label: 'Ressonância',      icon: '🔬', color: L.purple, bg: L.purpleBg },
  ultrassom:     { label: 'Ultrassom',        icon: '📡', color: L.teal,   bg: L.tealBg   },
  mamografia:    { label: 'Mamografia',       icon: '🩺', color: L.orange, bg: L.orangeBg },
  densitometria: { label: 'Densitometria',    icon: '🦴', color: L.copper, bg: L.hover    },
  outro:         { label: 'Outro',            icon: '🔭', color: L.t3,     bg: L.surface  },
}

const STATUS_CFG = {
  solicitado: { label: 'Solicitado',  bg: L.blueBg,   color: L.blue,   bd: L.blueBd   },
  realizado:  { label: 'Realizado',   bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
  laudado:    { label: 'Laudado',     bg: L.greenBg,  color: L.green,  bd: L.greenBd  },
  entregue:   { label: 'Entregue',    bg: L.hover,    color: L.t3,     bd: L.line     },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.solicitado
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.bd}`, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

function TipoBadge({ tipo }) {
  const cfg = TIPO_CFG[tipo] || TIPO_CFG.outro
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}22`, whiteSpace: 'nowrap',
    }}>{cfg.icon} {cfg.label}</span>
  )
}

/* ─── Age helper ──────────────────────────────────────────────── */
function calcAge(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function isImageUrl(url) {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url)
}

/* ─── KPI Card ────────────────────────────────────────────────── */
function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: L.shadow, flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || L.t1 }}>{value}</div>
      <div style={{ fontSize: 12, color: L.t3, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

/* ─── Bottom-sheet Modal ──────────────────────────────────────── */
function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%',
        maxWidth: wide ? 760 : 580, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Modal: Novo / Editar Exame ─────────────────────────────── */
function ModalExame({ clinicaId, pacientes, medicos, exame, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    paciente_id: exame?.paciente_id || '',
    medico_solicitante_id: exame?.medico_solicitante_id || '',
    tipo: exame?.tipo || 'raio_x',
    regiao_anatomica: exame?.regiao_anatomica || '',
    descricao: exame?.descricao || '',
    data_solicitacao: exame?.data_solicitacao || today,
    data_realizacao: exame?.data_realizacao || '',
    status: exame?.status || 'solicitado',
    arquivo_url: exame?.arquivo_url || '',
    radiologista: exame?.radiologista || '',
    laudo: exame?.laudo || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [pacSearch, setPacSearch] = useState(
    exame ? (pacientes.find(p => p.id === exame.paciente_id)?.nome || '') : ''
  )

  const filteredPacs = pacientes.filter(p =>
    p.nome.toLowerCase().includes(pacSearch.toLowerCase())
  )

  async function save() {
    if (!form.paciente_id) { setErr('Selecione um paciente.'); return }
    if (!form.tipo)        { setErr('Selecione o tipo de exame.'); return }
    setSaving(true); setErr('')
    const payload = {
      clinica_id: clinicaId,
      paciente_id: form.paciente_id,
      medico_solicitante_id: form.medico_solicitante_id || null,
      tipo: form.tipo,
      regiao_anatomica: form.regiao_anatomica || null,
      descricao: form.descricao || null,
      data_solicitacao: form.data_solicitacao || null,
      data_realizacao: form.data_realizacao || null,
      status: form.status,
      arquivo_url: form.arquivo_url || null,
      radiologista: form.radiologista || null,
      laudo: form.laudo || null,
    }
    const { error } = exame
      ? await supabase.from('exames_imagem').update(payload).eq('id', exame.id)
      : await supabase.from('exames_imagem').insert(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={exame ? 'Editar Exame de Imagem' : 'Novo Exame de Imagem'} onClose={onClose} wide>
      <Field label="Paciente">
        <input
          style={inp} placeholder="Buscar paciente..."
          value={pacSearch}
          onChange={e => { setPacSearch(e.target.value); if (!e.target.value) setForm(f => ({ ...f, paciente_id: '' })) }}
          onFocus={focus} onBlur={blur}
        />
        {pacSearch && !form.paciente_id && filteredPacs.length > 0 && (
          <div style={{
            border: `1px solid ${L.line}`, borderRadius: 8, background: L.bg,
            maxHeight: 160, overflowY: 'auto', marginTop: 4,
          }}>
            {filteredPacs.slice(0, 8).map(p => (
              <div key={p.id}
                onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setPacSearch(p.nome) }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: L.t1 }}
              >{p.nome}{p.data_nascimento ? ` (${calcAge(p.data_nascimento)} anos)` : ''}</div>
            ))}
          </div>
        )}
      </Field>

      <Row2>
        <Field label="Médico Solicitante">
          <select style={inp} value={form.medico_solicitante_id}
            onChange={e => setForm(f => ({ ...f, medico_solicitante_id: e.target.value }))}
            onFocus={focus} onBlur={blur}>
            <option value="">Selecionar...</option>
            {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
        <Field label="Radiologista">
          <input style={inp} placeholder="Nome do radiologista..."
            value={form.radiologista}
            onChange={e => setForm(f => ({ ...f, radiologista: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
      </Row2>

      <Row2>
        <Field label="Tipo de Exame">
          <select style={inp} value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            onFocus={focus} onBlur={blur}>
            {Object.entries(TIPO_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Região Anatômica">
          <input style={inp} placeholder="Ex: Tórax, Coluna lombar..."
            value={form.regiao_anatomica}
            onChange={e => setForm(f => ({ ...f, regiao_anatomica: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
      </Row2>

      <Row2>
        <Field label="Data de Solicitação">
          <input type="date" style={inp} value={form.data_solicitacao}
            onChange={e => setForm(f => ({ ...f, data_solicitacao: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
        <Field label="Data de Realização">
          <input type="date" style={inp} value={form.data_realizacao}
            onChange={e => setForm(f => ({ ...f, data_realizacao: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
      </Row2>

      <Row2>
        <Field label="Status">
          <select style={inp} value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            onFocus={focus} onBlur={blur}>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Arquivo de Imagem">
          <UploadArquivo
            bucket="imagens-medicas"
            folder={clinicaId}
            accept="image/*,application/pdf,video/mp4"
            label="Enviar imagem / PDF / vídeo"
            currentUrl={form.arquivo_url}
            onUpload={(url) => setForm(f => ({ ...f, arquivo_url: url }))}
            onError={(msg) => setErr(msg)}
          />
        </Field>
      </Row2>

      <Field label="Descrição Clínica">
        <textarea style={ta} value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          onFocus={focus} onBlur={blur}
          placeholder="Indicação clínica, sintomas relevantes..."
        />
      </Field>

      <Field label="Laudo Radiológico">
        <textarea style={{ ...ta, minHeight: 120 }} value={form.laudo}
          onChange={e => setForm(f => ({ ...f, laudo: e.target.value }))}
          onFocus={focus} onBlur={blur}
          placeholder="Laudo descritivo do exame..."
        />
      </Field>

      {err && <div style={{ fontSize: 13, color: L.red }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : exame ? 'Salvar Alterações' : 'Criar Exame'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Modal: Ver Laudo ────────────────────────────────────────── */
function ModalLaudo({ exame, paciente, onClose }) {
  return (
    <Modal title="Laudo Radiológico" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <TipoBadge tipo={exame.tipo} />
          <StatusBadge status={exame.status} />
          {exame.regiao_anatomica && (
            <span style={{ fontSize: 13, color: L.t3 }}>• {exame.regiao_anatomica}</span>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 4 }}>Paciente</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>{paciente?.nome || '—'}</div>
        </div>
        {exame.radiologista && (
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 4 }}>Radiologista</div>
            <div style={{ fontSize: 13, color: L.t2 }}>{exame.radiologista}</div>
          </div>
        )}
        {exame.data_realizacao && (
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 4 }}>Data de Realização</div>
            <div style={{ fontSize: 13, color: L.t2 }}>{new Date(exame.data_realizacao).toLocaleDateString('pt-BR')}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 8 }}>Laudo</div>
          {exame.laudo ? (
            <div style={{
              fontSize: 13, color: L.t1, lineHeight: 1.7,
              background: L.surface, border: `1px solid ${L.line}`,
              borderRadius: 10, padding: '14px 18px', whiteSpace: 'pre-wrap',
            }}>{exame.laudo}</div>
          ) : (
            <div style={{ fontSize: 13, color: L.t4, fontStyle: 'italic' }}>Laudo ainda não disponível.</div>
          )}
        </div>
        {exame.arquivo_url && (
          <div>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginBottom: 8 }}>Arquivo</div>
            <a href={exame.arquivo_url} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: L.teal, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>📎 Abrir arquivo externo</a>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnGhost} onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}

/* ─── Exam Card ───────────────────────────────────────────────── */
function ExameCard({ exame, paciente, medico, onVerLaudo, onEditar, onEntregar }) {
  const tipoCfg = TIPO_CFG[exame.tipo] || TIPO_CFG.outro
  const age = calcAge(paciente?.data_nascimento)
  const dataSolic = exame.data_solicitacao ? new Date(exame.data_solicitacao).toLocaleDateString('pt-BR') : '—'
  const dataReal  = exame.data_realizacao  ? new Date(exame.data_realizacao).toLocaleDateString('pt-BR')  : null

  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: L.shadow,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: tipoCfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{tipoCfg.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
              {paciente?.nome || '—'}
              {age != null && <span style={{ fontWeight: 400, fontSize: 12, color: L.t4, marginLeft: 6 }}>{age} anos</span>}
            </div>
            <div style={{ fontSize: 12, color: L.t3 }}>
              {medico ? `Dr(a). ${medico.nome}` : 'Sem médico'}
            </div>
          </div>
        </div>
        <StatusBadge status={exame.status} />
      </div>

      {/* Type + region */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <TipoBadge tipo={exame.tipo} />
        {exame.regiao_anatomica && (
          <span style={{ fontSize: 12, color: L.t3 }}>• {exame.regiao_anatomica}</span>
        )}
      </div>

      {/* Dates */}
      <div style={{ fontSize: 12, color: L.t4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>Solicitado: {dataSolic}</span>
        <span>→ {dataReal || <em style={{ color: L.yellow }}>Aguardando</em>}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${L.line}`, paddingTop: 10 }}>
        <button onClick={() => onVerLaudo(exame)}
          style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>
          📋 Ver Laudo
        </button>
        <button onClick={() => onEditar(exame)}
          style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>
          ✏️ Editar
        </button>
        {exame.status !== 'entregue' && (
          <button onClick={() => onEntregar(exame.id)}
            style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px', background: L.green }}>
            ✓ Entregar
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Tab 1: DICOM-lite Viewer ────────────────────────────────── */
function TabVisualizador({ exames, pacientes }) {
  const [selPacId, setSelPacId] = useState('')
  const [selExameId, setSelExameId] = useState('')
  const [contrast, setContrast] = useState(100)
  const [brightness, setBrightness] = useState(100)
  const [zoom, setZoom] = useState(1)
  const [laudoOpen, setLaudoOpen] = useState(true)

  const pacExames = exames.filter(e => e.paciente_id === selPacId)
  const selExame = pacExames.find(e => e.id === selExameId) || null
  const isImg = selExame && isImageUrl(selExame.arquivo_url)

  function handleFullscreen() {
    const el = document.getElementById('imagens-viewer-img')
    if (el && el.requestFullscreen) el.requestFullscreen()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Paciente</label>
          <select style={{ ...inp, maxWidth: 320 }} value={selPacId}
            onChange={e => { setSelPacId(e.target.value); setSelExameId('') }}
            onFocus={focus} onBlur={blur}>
            <option value="">Selecionar paciente...</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        {selPacId && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Exame</label>
            <select style={{ ...inp, maxWidth: 360 }} value={selExameId}
              onChange={e => setSelExameId(e.target.value)}
              onFocus={focus} onBlur={blur}>
              <option value="">Selecionar exame...</option>
              {pacExames.map(e => {
                const tc = TIPO_CFG[e.tipo] || TIPO_CFG.outro
                const dt = e.data_realizacao ? new Date(e.data_realizacao).toLocaleDateString('pt-BR') : 'sem data'
                return <option key={e.id} value={e.id}>{tc.icon} {tc.label} — {e.regiao_anatomica || 'sem região'} ({dt})</option>
              })}
            </select>
          </div>
        )}
      </div>

      {!selExame && (
        <div style={{
          background: '#0a0a0a', borderRadius: 14, minHeight: 340,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, color: '#555',
        }}>
          <span style={{ fontSize: 48 }}>🩻</span>
          <div style={{ fontSize: 14, color: '#666' }}>Selecione um paciente e um exame para visualizar</div>
        </div>
      )}

      {selExame && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Viewer panel */}
          <div style={{ flex: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Image area */}
            <div style={{
              background: '#0a0a0a', borderRadius: 14, minHeight: 380, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {isImg ? (
                <img id="imagens-viewer-img"
                  src={selExame.arquivo_url}
                  alt="Exame de imagem"
                  style={{
                    maxWidth: '100%', maxHeight: 480, objectFit: 'contain',
                    filter: `contrast(${contrast}%) brightness(${brightness}%)`,
                    transform: `scale(${zoom})`, transition: 'transform 0.15s',
                    borderRadius: 8,
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#555', padding: 32 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    {selExame.arquivo_url
                      ? <a href={selExame.arquivo_url} target="_blank" rel="noreferrer" style={{ color: '#0f8585' }}>Abrir arquivo externo</a>
                      : 'Nenhum arquivo de imagem disponível'}
                  </div>
                  {selExame.laudo && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 12, maxWidth: 360, lineHeight: 1.6 }}>
                      {selExame.laudo.slice(0, 200)}{selExame.laudo.length > 200 ? '…' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image controls */}
            {isImg && (
              <div style={{
                background: L.surface, border: `1px solid ${L.line}`,
                borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Contrast */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>
                      Contraste: {contrast}%
                    </label>
                    <input type="range" min={0} max={300} value={contrast}
                      onChange={e => setContrast(Number(e.target.value))}
                      style={{ width: '100%', accentColor: L.teal }}
                    />
                  </div>
                  {/* Brightness */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>
                      Brilho: {brightness}%
                    </label>
                    <input type="range" min={0} max={300} value={brightness}
                      onChange={e => setBrightness(Number(e.target.value))}
                      style={{ width: '100%', accentColor: L.teal }}
                    />
                  </div>
                </div>
                {/* Zoom + fullscreen */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.2).toFixed(1)))}
                    style={{ ...btnGhost, fontSize: 18, padding: '4px 12px', lineHeight: 1 }}>−</button>
                  <span style={{ fontSize: 13, color: L.t3, minWidth: 48, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, +(z + 0.2).toFixed(1)))}
                    style={{ ...btnGhost, fontSize: 18, padding: '4px 12px', lineHeight: 1 }}>+</button>
                  <button onClick={() => { setZoom(1); setContrast(100); setBrightness(100) }}
                    style={{ ...btnGhost, fontSize: 12, padding: '6px 12px', marginLeft: 8 }}>Reset</button>
                  <button onClick={handleFullscreen}
                    style={{ ...btnGhost, fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }}>
                    ⛶ Tela Cheia
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Laudo panel */}
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div
                onClick={() => setLaudoOpen(o => !o)}
                style={{
                  padding: '12px 16px', fontWeight: 600, fontSize: 14, color: L.t1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', borderBottom: laudoOpen ? `1px solid ${L.line}` : 'none',
                }}
              >
                <span>📋 Laudo</span>
                <span style={{ fontSize: 12, color: L.t4 }}>{laudoOpen ? '▲' : '▼'}</span>
              </div>
              {laudoOpen && (
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selExame.radiologista && (
                    <div>
                      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>RADIOLOGISTA</div>
                      <div style={{ fontSize: 13, color: L.t2 }}>{selExame.radiologista}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>EXAME</div>
                    <div style={{ fontSize: 13, color: L.t2 }}>
                      {(TIPO_CFG[selExame.tipo] || TIPO_CFG.outro).label}
                      {selExame.regiao_anatomica && ` — ${selExame.regiao_anatomica}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>LAUDO DESCRITIVO</div>
                    {selExame.laudo
                      ? <div style={{ fontSize: 13, color: L.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selExame.laudo}</div>
                      : <div style={{ fontSize: 13, color: L.t4, fontStyle: 'italic' }}>Laudo não disponível.</div>
                    }
                  </div>
                  <StatusBadge status={selExame.status} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Tab 2: Por Paciente / Timeline ─────────────────────────── */
function TabPorPaciente({ exames, pacientes, medicos, onVerLaudo, onEditar, onEntregar }) {
  const [selPacId, setSelPacId] = useState('')
  const [expandedIds, setExpandedIds] = useState({})

  function toggleExpand(id) {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const pacExames = exames
    .filter(e => e.paciente_id === selPacId)
    .sort((a, b) => (b.data_solicitacao || b.criado_em || '').localeCompare(a.data_solicitacao || a.criado_em || ''))

  // Group by tipo
  const grouped = pacExames.reduce((acc, e) => {
    if (!acc[e.tipo]) acc[e.tipo] = []
    acc[e.tipo].push(e)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Paciente selector */}
      <div style={{ maxWidth: 380 }}>
        <Field label="Paciente">
          <select style={inp} value={selPacId}
            onChange={e => setSelPacId(e.target.value)}
            onFocus={focus} onBlur={blur}>
            <option value="">Selecionar paciente...</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
      </div>

      {selPacId && pacExames.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 24px', color: L.t4,
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🩻</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum exame encontrado</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Este paciente não possui exames de imagem registrados.</div>
        </div>
      )}

      {selPacId && pacExames.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([tipo, items]) => {
            const tc = TIPO_CFG[tipo] || TIPO_CFG.outro
            return (
              <div key={tipo}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  paddingBottom: 8, borderBottom: `2px solid ${L.line}`,
                }}>
                  <span style={{ fontSize: 20 }}>{tc.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>{tc.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: tc.bg, color: tc.color,
                  }}>{items.length}</span>
                </div>

                {/* Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {items.map((exame, idx) => {
                    const medico = medicos.find(m => m.id === exame.medico_solicitante_id)
                    const dt = exame.data_solicitacao
                      ? new Date(exame.data_solicitacao).toLocaleDateString('pt-BR')
                      : '—'
                    const expanded = expandedIds[exame.id]
                    const laudoExcerpt = exame.laudo ? exame.laudo.slice(0, 100) : null

                    return (
                      <div key={exame.id} style={{ display: 'flex', gap: 0 }}>
                        {/* Timeline line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                            background: (STATUS_CFG[exame.status] || STATUS_CFG.solicitado).color,
                            border: `2px solid ${L.bg}`, boxShadow: `0 0 0 2px ${(STATUS_CFG[exame.status] || STATUS_CFG.solicitado).color}33`,
                            marginTop: 16,
                          }} />
                          {idx < items.length - 1 && (
                            <div style={{ flex: 1, width: 2, background: L.line, marginTop: 4 }} />
                          )}
                        </div>

                        {/* Entry card */}
                        <div style={{
                          flex: 1, marginLeft: 12, marginBottom: 12,
                          background: L.bg, border: `1px solid ${L.line}`, borderRadius: 10,
                          padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>
                                {exame.regiao_anatomica || tc.label}
                              </div>
                              <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>
                                {dt}
                                {medico && ` · Dr(a). ${medico.nome}`}
                              </div>
                            </div>
                            <StatusBadge status={exame.status} />
                          </div>

                          {laudoExcerpt && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 12, color: L.t3, lineHeight: 1.6 }}>
                                {expanded ? exame.laudo : laudoExcerpt}
                                {!expanded && exame.laudo && exame.laudo.length > 100 && '…'}
                              </div>
                              {exame.laudo && exame.laudo.length > 100 && (
                                <button
                                  onClick={() => toggleExpand(exame.id)}
                                  style={{ fontSize: 12, color: L.teal, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
                                >
                                  {expanded ? 'Ver menos ▲' : 'Ver completo ▼'}
                                </button>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            <button onClick={() => onVerLaudo(exame)}
                              style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>
                              📋 Laudo
                            </button>
                            <button onClick={() => onEditar(exame)}
                              style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>
                              ✏️ Editar
                            </button>
                            {exame.status !== 'entregue' && (
                              <button onClick={() => onEntregar(exame.id)}
                                style={{ ...btnPrimary, fontSize: 11, padding: '4px 10px', background: L.green }}>
                                ✓ Entregar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!selPacId && (
        <div style={{
          textAlign: 'center', padding: '48px 24px', color: L.t4,
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Selecione um paciente</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>A linha do tempo dos exames será exibida aqui.</div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function PageImagens({ profile }) {
  const clinicaId = profile?.clinica_id

  const [exames, setExames]       = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos]     = useState([])
  const [loading, setLoading]     = useState(true)

  const [tab, setTab]             = useState(0)
  const [search, setSearch]       = useState('')
  const [tipoFilter, setTipoFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const [showNovoExame, setShowNovoExame] = useState(false)
  const [editExame, setEditExame]         = useState(null)
  const [laudoExame, setLaudoExame]       = useState(null)

  /* ─── Fetch ── */
  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [rExames, rPacientes, rMedicos] = await Promise.all([
      supabase.from('exames_imagem').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id,nome,data_nascimento').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('medicos').select('id,nome,especialidade').eq('clinica_id', clinicaId).order('nome'),
    ])
    setExames(rExames.data || [])
    setPacientes(rPacientes.data || [])
    setMedicos(rMedicos.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* ─── Helpers ── */
  function getPaciente(id) { return pacientes.find(p => p.id === id) }
  function getMedico(id)   { return medicos.find(m => m.id === id) }

  /* ─── KPIs ── */
  const today = new Date().toISOString().slice(0, 10)
  const kpiTotal      = exames.length
  const kpiAguardando = exames.filter(e => e.status === 'realizado').length
  const kpiHoje       = exames.filter(e => e.data_realizacao === today).length
  const kpiEntregues  = exames.filter(e => e.status === 'entregue').length

  /* ─── Filters ── */
  const filteredExames = exames.filter(e => {
    const pac = getPaciente(e.paciente_id)
    if (search && !pac?.nome?.toLowerCase().includes(search.toLowerCase())) return false
    if (tipoFilter && e.tipo !== tipoFilter) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (dateFrom && e.data_solicitacao && e.data_solicitacao < dateFrom) return false
    if (dateTo   && e.data_solicitacao && e.data_solicitacao > dateTo)   return false
    return true
  })

  /* ─── Actions ── */
  async function handleEntregar(exameId) {
    await supabase.from('exames_imagem').update({ status: 'entregue' }).eq('id', exameId)
    setExames(prev => prev.map(e => e.id === exameId ? { ...e, status: 'entregue' } : e))
  }

  /* ─── Tab styles ── */
  const TABS = ['Exames de Imagem', 'Visualizador', 'Por Paciente']
  function tabStyle(i) {
    return {
      padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      border: 'none', borderRadius: 8,
      background: tab === i ? L.teal : 'transparent',
      color: tab === i ? L.white : L.t3,
      transition: 'background 0.15s',
    }
  }

  return (
    <>
      <style>{`
        @keyframes up   { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        *:focus { outline: none; }
      `}</style>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: L.t1, margin: 0 }}>Imagens & PACS</h1>
            <p style={{ fontSize: 13, color: L.t3, margin: '4px 0 0' }}>Gestão de exames de imagem — RX, TC, RM, US e outros</p>
          </div>
          {tab === 0 && (
            <button style={btnPrimary} onClick={() => setShowNovoExame(true)}>+ Novo Exame</button>
          )}
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard label="Total de Exames" value={kpiTotal} color={L.t1} />
          <KpiCard label="Aguardando Laudo" value={kpiAguardando} color={L.yellow} />
          <KpiCard label="Realizados Hoje" value={kpiHoje} color={L.teal} />
          <KpiCard label="Entregues" value={kpiEntregues} color={L.t3} />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, background: L.surface, borderRadius: 10, padding: 4, alignSelf: 'flex-start' }}>
          {TABS.map((t, i) => (
            <button key={i} style={tabStyle(i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 32, height: 32, border: `3px solid ${L.line}`,
              borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : (
          <>
            {/* ─────────── Tab 0: Exames de Imagem ─────────── */}
            {tab === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    style={{ ...inp, maxWidth: 240 }}
                    placeholder="Buscar paciente..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={focus} onBlur={blur}
                  />
                  <select style={{ ...inp, maxWidth: 160, fontSize: 13 }} value={tipoFilter}
                    onChange={e => setTipoFilter(e.target.value)} onFocus={focus} onBlur={blur}>
                    <option value="">Todos os tipos</option>
                    {Object.entries(TIPO_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <select style={{ ...inp, maxWidth: 160, fontSize: 13 }} value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)} onFocus={focus} onBlur={blur}>
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="date" style={{ ...inp, width: 140, fontSize: 12 }} value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)} onFocus={focus} onBlur={blur}
                      placeholder="De" />
                    <span style={{ fontSize: 12, color: L.t4 }}>até</span>
                    <input type="date" style={{ ...inp, width: 140, fontSize: 12 }} value={dateTo}
                      onChange={e => setDateTo(e.target.value)} onFocus={focus} onBlur={blur}
                      placeholder="Até" />
                  </div>
                  {(search || tipoFilter || statusFilter || dateFrom || dateTo) && (
                    <button onClick={() => { setSearch(''); setTipoFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }}
                      style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>
                      Limpar filtros
                    </button>
                  )}
                </div>

                {/* Cards grid */}
                {filteredExames.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '48px 24px', color: L.t4,
                    background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🩻</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum exame encontrado</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Ajuste os filtros ou registre um novo exame.</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 14,
                  }}>
                    {filteredExames.map(e => (
                      <ExameCard
                        key={e.id}
                        exame={e}
                        paciente={getPaciente(e.paciente_id)}
                        medico={getMedico(e.medico_solicitante_id)}
                        onVerLaudo={setLaudoExame}
                        onEditar={setEditExame}
                        onEntregar={handleEntregar}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─────────── Tab 1: Visualizador ─────────── */}
            {tab === 1 && (
              <TabVisualizador exames={exames} pacientes={pacientes} />
            )}

            {/* ─────────── Tab 2: Por Paciente ─────────── */}
            {tab === 2 && (
              <TabPorPaciente
                exames={exames}
                pacientes={pacientes}
                medicos={medicos}
                onVerLaudo={setLaudoExame}
                onEditar={setEditExame}
                onEntregar={handleEntregar}
              />
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {(showNovoExame || editExame) && (
        <ModalExame
          clinicaId={clinicaId}
          pacientes={pacientes}
          medicos={medicos}
          exame={editExame || null}
          onClose={() => { setShowNovoExame(false); setEditExame(null) }}
          onSaved={() => { setShowNovoExame(false); setEditExame(null); load() }}
        />
      )}

      {laudoExame && (
        <ModalLaudo
          exame={laudoExame}
          paciente={getPaciente(laudoExame.paciente_id)}
          onClose={() => setLaudoExame(null)}
        />
      )}
    </>
  )
}
