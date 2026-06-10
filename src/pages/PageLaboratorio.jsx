import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Helpers ─────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const ta = { ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

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

function Row({ gap = 12, children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `1fr 1fr`, gap }}>{children}</div>
}

const btnPrimary = {
  background: L.teal, color: L.white, fontWeight: 600, fontSize: 13,
  border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
}
const btnGhost = {
  background: 'none', color: L.t3, fontWeight: 500, fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer',
}

/* ─── Status config ───────────────────────────────────────────── */
const STATUS_CFG = {
  solicitado:  { label: 'Solicitado',   bg: L.blueBg,   color: L.blue,   bd: L.blueBd   },
  coletado:    { label: 'Coletado',     bg: L.yellowBg, color: L.yellow, bd: L.yellowBd },
  em_analise:  { label: 'Em análise',   bg: L.purpleBg, color: L.purple, bd: L.purpleBd },
  disponivel:  { label: 'Disponível',   bg: L.greenBg,  color: L.green,  bd: L.greenBd  },
  entregue:    { label: 'Entregue',     bg: L.hover,    color: L.t3,     bd: L.line     },
}
const STATUS_ORDER = ['solicitado', 'coletado', 'em_analise', 'disponivel', 'entregue']
function nextStatus(s) {
  const i = STATUS_ORDER.indexOf(s)
  return i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null
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

const COMMON_EXAMS = [
  'Hemograma', 'Glicemia', 'Colesterol Total', 'TSH', 'Creatinina',
  'TGO/TGP', 'PSA', 'HbA1c', 'Ureia', 'Ácido Úrico', 'Triglicerídeos', 'PCR',
]

/* ─── Modal Shell ─────────────────────────────────────────────── */
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
        maxWidth: wide ? 720 : 580, maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Exam chips input ────────────────────────────────────────── */
function ExamesInput({ exames, onChange }) {
  const [cur, setCur] = useState('')

  function add(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!exames.includes(trimmed)) onChange([...exames, trimmed])
    setCur('')
  }

  function remove(name) { onChange(exames.filter(e => e !== name)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...inp, flex: 1 }}
          value={cur}
          onChange={e => setCur(e.target.value)}
          onFocus={focus} onBlur={blur}
          placeholder="Nome do exame..."
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add(cur))}
        />
        <button
          type="button"
          onClick={() => add(cur)}
          style={{ ...btnPrimary, whiteSpace: 'nowrap' }}
        >Adicionar</button>
      </div>
      {/* Common exam quick-add */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {COMMON_EXAMS.map(ex => (
          <button
            key={ex}
            type="button"
            onClick={() => add(ex)}
            style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${L.line}`, background: exames.includes(ex) ? L.tealBg : L.surface,
              color: exames.includes(ex) ? L.teal : L.t3, fontWeight: 500,
            }}
          >{ex}</button>
        ))}
      </div>
      {/* Added chips */}
      {exames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {exames.map(ex => (
            <span key={ex} style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 20,
              background: L.tealBg, color: L.teal,
              border: `1px solid ${L.teal}`, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {ex}
              <button
                type="button"
                onClick={() => remove(ex)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: L.teal, fontSize: 14, lineHeight: 1, padding: 0 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Print Pedido ────────────────────────────────────────────── */
function printPedido(pedido, paciente, medico, clinicaNome) {
  const date = pedido.data_coleta
    ? new Date(pedido.data_coleta).toLocaleDateString('pt-BR')
    : new Date(pedido.criado_em).toLocaleDateString('pt-BR')
  const exames = Array.isArray(pedido.exames) ? pedido.exames : []

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Pedido de Exame</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 24px; }
  .section { margin-bottom: 16px; }
  .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
  .value { font-size: 14px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; color: #888; padding: 6px 8px; border-bottom: 2px solid #eee; }
  td { padding: 8px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
  .urgente { background: #fee2e2; color: #dc2626; font-weight: bold; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 16px; }
  .sig { margin-top: 60px; border-top: 1px solid #ccc; width: 280px; text-align: center; padding-top: 6px; font-size: 13px; color: #555; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Pedido de Exame Laboratorial</h1>
<div class="sub">${clinicaNome || 'Clínica'}</div>
${pedido.urgente ? '<div class="urgente">⚠ URGENTE</div>' : ''}
<div class="section">
  <div class="label">Paciente</div>
  <div class="value">${paciente?.nome || '—'}</div>
</div>
<div class="section">
  <div class="label">Médico Solicitante</div>
  <div class="value">Dr(a). ${medico?.nome || '—'}${medico?.especialidade ? ' — ' + medico.especialidade : ''}</div>
</div>
<div class="section">
  <div class="label">Data da Solicitação</div>
  <div class="value">${date}</div>
</div>
${pedido.laboratorio ? `<div class="section"><div class="label">Laboratório</div><div class="value">${pedido.laboratorio}</div></div>` : ''}
<table>
  <thead><tr><th>#</th><th>Exame Solicitado</th></tr></thead>
  <tbody>
    ${exames.map((ex, i) => `<tr><td>${i + 1}</td><td>${ex}</td></tr>`).join('')}
  </tbody>
</table>
${pedido.observacoes ? `<div class="section" style="margin-top:20px"><div class="label">Observações</div><div class="value">${pedido.observacoes}</div></div>` : ''}
<div class="sig">Assinatura e carimbo do médico</div>
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=700')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

/* ─── Modal: Novo Pedido ──────────────────────────────────────── */
function ModalNovoPedido({ clinicaId, pacientes, medicos, onClose, onSaved }) {
  const [form, setForm] = useState({
    paciente_id: '', medico_id: '', urgente: false,
    laboratorio: '', data_coleta: '', observacoes: '', exames: [],
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [pacSearch, setPacSearch] = useState('')

  const filteredPacs = pacientes.filter(p =>
    p.nome.toLowerCase().includes(pacSearch.toLowerCase())
  )

  async function save() {
    if (!form.paciente_id) { setErr('Selecione um paciente.'); return }
    if (!form.medico_id)   { setErr('Selecione um médico.');   return }
    if (form.exames.length === 0) { setErr('Adicione ao menos um exame.'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('pedidos_exame').insert({
      clinica_id:  clinicaId,
      paciente_id: form.paciente_id,
      medico_id:   form.medico_id,
      urgente:     form.urgente,
      laboratorio: form.laboratorio || null,
      data_coleta: form.data_coleta || null,
      observacoes: form.observacoes || null,
      exames:      form.exames,
      status:      'solicitado',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Novo Pedido de Exame" onClose={onClose} wide>
      <Field label="Paciente">
        <input
          style={inp} placeholder="Buscar paciente..."
          value={pacSearch} onChange={e => setPacSearch(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        {pacSearch && filteredPacs.length > 0 && (
          <div style={{
            border: `1px solid ${L.line}`, borderRadius: 8, background: L.bg,
            maxHeight: 180, overflowY: 'auto', marginTop: 4,
          }}>
            {filteredPacs.slice(0, 10).map(p => (
              <div key={p.id}
                onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setPacSearch(p.nome) }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  background: form.paciente_id === p.id ? L.tealBg : 'transparent',
                  color: form.paciente_id === p.id ? L.teal : L.t1,
                }}
              >{p.nome}{p.telefone ? ` — ${p.telefone}` : ''}</div>
            ))}
          </div>
        )}
        {form.paciente_id && !pacSearch.includes('—') && (
          <div style={{ fontSize: 12, color: L.t4, marginTop: 4 }}>
            ID: {form.paciente_id}
          </div>
        )}
      </Field>

      <Row>
        <Field label="Médico Solicitante">
          <select
            style={inp} value={form.medico_id}
            onChange={e => setForm(f => ({ ...f, medico_id: e.target.value }))}
            onFocus={focus} onBlur={blur}
          >
            <option value="">Selecionar...</option>
            {medicos.map(m => (
              <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` (${m.especialidade})` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Data de Coleta (opcional)">
          <input
            type="date" style={inp} value={form.data_coleta}
            onChange={e => setForm(f => ({ ...f, data_coleta: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
      </Row>

      <Row>
        <Field label="Laboratório">
          <input
            style={inp} placeholder="Nome do laboratório..."
            value={form.laboratorio}
            onChange={e => setForm(f => ({ ...f, laboratorio: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
        <Field label="Urgente">
          <div
            onClick={() => setForm(f => ({ ...f, urgente: !f.urgente }))}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '9px 12px', borderRadius: 8,
              border: `1.5px solid ${form.urgente ? L.red : L.line}`,
              background: form.urgente ? L.redBg : L.bg,
              userSelect: 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: `2px solid ${form.urgente ? L.red : L.line}`,
              background: form.urgente ? L.red : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {form.urgente && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: form.urgente ? L.red : L.t3 }}>
              {form.urgente ? 'URGENTE' : 'Marcar como urgente'}
            </span>
          </div>
        </Field>
      </Row>

      <Field label="Exames Solicitados">
        <ExamesInput exames={form.exames} onChange={exames => setForm(f => ({ ...f, exames }))} />
      </Field>

      <Field label="Observações">
        <textarea
          style={ta} value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          onFocus={focus} onBlur={blur}
          placeholder="Observações clínicas, preparo necessário..."
        />
      </Field>

      {err && <div style={{ fontSize: 13, color: L.red }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Criar Pedido'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Modal: Registrar Resultado ──────────────────────────────── */
function ModalNovoResultado({ clinicaId, pedidos, pacientes, onClose, onSaved }) {
  const [form, setForm] = useState({
    pedido_id: '', laboratorio: '', arquivo_nome: '', arquivo_url: '', observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const activePedidos = pedidos.filter(p => p.status !== 'entregue')

  async function save() {
    if (!form.pedido_id)    { setErr('Selecione o pedido.'); return }
    if (!form.arquivo_nome) { setErr('Informe o nome do arquivo.'); return }
    setSaving(true); setErr('')
    const { error: e1 } = await supabase.from('resultados_exame').insert({
      clinica_id:   clinicaId,
      pedido_id:    form.pedido_id,
      laboratorio:  form.laboratorio || null,
      arquivo_nome: form.arquivo_nome,
      arquivo_url:  form.arquivo_url || null,
      observacoes:  form.observacoes || null,
      status:       'disponivel',
    })
    if (e1) { setSaving(false); setErr(e1.message); return }
    await supabase.from('pedidos_exame').update({ status: 'disponivel' }).eq('id', form.pedido_id)
    setSaving(false)
    onSaved()
  }

  function getPacNome(pedido) {
    const pac = pacientes.find(p => p.id === pedido.paciente_id)
    return pac?.nome || 'Paciente'
  }

  return (
    <Modal title="Registrar Resultado de Exame" onClose={onClose}>
      <Field label="Pedido">
        <select
          style={inp} value={form.pedido_id}
          onChange={e => setForm(f => ({ ...f, pedido_id: e.target.value }))}
          onFocus={focus} onBlur={blur}
        >
          <option value="">Selecionar pedido...</option>
          {activePedidos.map(p => (
            <option key={p.id} value={p.id}>
              {getPacNome(p)} — {Array.isArray(p.exames) ? p.exames.slice(0, 2).join(', ') : '—'} ({STATUS_CFG[p.status]?.label || p.status})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Laboratório">
        <input
          style={inp} placeholder="Nome do laboratório..."
          value={form.laboratorio}
          onChange={e => setForm(f => ({ ...f, laboratorio: e.target.value }))}
          onFocus={focus} onBlur={blur}
        />
      </Field>

      <Row>
        <Field label="Nome do Arquivo">
          <input
            style={inp} placeholder="resultado_hemograma.pdf"
            value={form.arquivo_nome}
            onChange={e => setForm(f => ({ ...f, arquivo_nome: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
        <Field label="URL do Arquivo">
          <input
            style={inp} placeholder="https://..."
            value={form.arquivo_url}
            onChange={e => setForm(f => ({ ...f, arquivo_url: e.target.value }))}
            onFocus={focus} onBlur={blur}
          />
        </Field>
      </Row>

      <Field label="Observações">
        <textarea
          style={ta} value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          onFocus={focus} onBlur={blur}
          placeholder="Notas sobre o resultado..."
        />
      </Field>

      {err && <div style={{ fontSize: 13, color: L.red }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Registrar Resultado'}
        </button>
      </div>
    </Modal>
  )
}

/* ─── Pedido Card ─────────────────────────────────────────────── */
function PedidoCard({ pedido, paciente, medico, resultados, onStatusChange, onPrint, onVerResultados }) {
  const exames = Array.isArray(pedido.exames) ? pedido.exames : []
  const next = nextStatus(pedido.status)
  const nResults = resultados.filter(r => r.pedido_id === pedido.id).length
  const criado = new Date(pedido.criado_em).toLocaleDateString('pt-BR')

  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: L.shadow,
      borderLeft: pedido.urgente ? `4px solid ${L.red}` : `4px solid transparent`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: L.tealBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: L.teal, flexShrink: 0,
          }}>
            {(paciente?.nome || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
              {paciente?.nome || 'Paciente'}
            </div>
            <div style={{ fontSize: 12, color: L.t3 }}>
              Dr(a). {medico?.nome || '—'} · {criado}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {pedido.urgente && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`,
            }}>URGENTE</span>
          )}
          <StatusBadge status={pedido.status} />
        </div>
      </div>

      {/* Exams */}
      {exames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {exames.map(ex => (
            <span key={ex} style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 20,
              background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
            }}>{ex}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, color: L.t4 }}>
          {pedido.laboratorio && <span>🏥 {pedido.laboratorio}</span>}
          {pedido.data_coleta && <span style={{ marginLeft: 10 }}>📅 {new Date(pedido.data_coleta).toLocaleDateString('pt-BR')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onVerResultados(pedido)}
            style={{
              ...btnGhost, fontSize: 12, padding: '6px 12px',
              color: nResults > 0 ? L.teal : L.t3,
              borderColor: nResults > 0 ? L.teal : L.line,
            }}
          >
            Resultados {nResults > 0 ? `(${nResults})` : ''}
          </button>
          {next && (
            <button
              onClick={() => onStatusChange(pedido.id, next)}
              style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}
            >
              → {STATUS_CFG[next]?.label}
            </button>
          )}
          <button
            onClick={() => onPrint(pedido, paciente, medico)}
            style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}
          >
            🖨 Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Resultado Card ──────────────────────────────────────────── */
function ResultadoCard({ pedido, paciente, medico, resultados, clinicaNome, onDelivered }) {
  const exames = Array.isArray(pedido.exames) ? pedido.exames : []
  const criado = new Date(pedido.criado_em).toLocaleDateString('pt-BR')
  const myResults = resultados.filter(r => r.pedido_id === pedido.id)

  function notifyWhatsApp(result) {
    const nome = paciente?.nome || 'Paciente'
    const msg = `Olá ${nome}! Seus resultados de exame já estão disponíveis. Entre em contato com ${clinicaNome || 'nossa clínica'} para mais informações.`
    navigator.clipboard.writeText(msg).catch(() => {})
    const phone = paciente?.telefone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: L.shadow,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: L.greenBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: L.green, flexShrink: 0,
          }}>
            {(paciente?.nome || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>{paciente?.nome || 'Paciente'}</div>
            <div style={{ fontSize: 12, color: L.t3 }}>
              Dr(a). {medico?.nome || '—'} · {criado}
              {pedido.laboratorio && ` · ${pedido.laboratorio}`}
            </div>
          </div>
        </div>
        <StatusBadge status={pedido.status} />
      </div>

      {/* Exam list */}
      {exames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {exames.map(ex => (
            <span key={ex} style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 20,
              background: L.surface, color: L.t2, border: `1px solid ${L.line}`,
            }}>{ex}</span>
          ))}
        </div>
      )}

      {/* Results list */}
      {myResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>
            Arquivos de Resultado
          </div>
          {myResults.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: L.surface, borderRadius: 8,
              border: `1px solid ${L.line}`, flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>
                    {r.arquivo_url
                      ? <a href={r.arquivo_url} target="_blank" rel="noreferrer" style={{ color: L.teal, textDecoration: 'none' }}>{r.arquivo_nome}</a>
                      : r.arquivo_nome
                    }
                  </div>
                  <div style={{ fontSize: 11, color: L.t4 }}>
                    {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                    {r.laboratorio && ` · ${r.laboratorio}`}
                    {r.observacoes && ` · ${r.observacoes}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {r.status !== 'entregue_paciente' && (
                  <button
                    onClick={() => onDelivered(r.id, pedido.id)}
                    style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px', background: L.green }}
                  >
                    ✓ Marcar entregue
                  </button>
                )}
                {r.status === 'entregue_paciente' && (
                  <span style={{ fontSize: 12, color: L.green, fontWeight: 600 }}>Entregue</span>
                )}
                <button
                  onClick={() => notifyWhatsApp(r)}
                  style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}
                >
                  📱 Notificar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myResults.length === 0 && (
        <div style={{ fontSize: 13, color: L.t4, textAlign: 'center', padding: '8px 0' }}>
          Nenhum resultado registrado ainda.
        </div>
      )}
    </div>
  )
}

/* ─── Results modal (inline view) ────────────────────────────── */
function ModalVerResultados({ pedido, paciente, medico, resultados, clinicaNome, onClose, onDelivered }) {
  return (
    <Modal title={`Resultados — ${paciente?.nome || 'Paciente'}`} onClose={onClose} wide>
      <ResultadoCard
        pedido={pedido}
        paciente={paciente}
        medico={medico}
        resultados={resultados}
        clinicaNome={clinicaNome}
        onDelivered={onDelivered}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnGhost} onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}

/* ─── KPI Card ────────────────────────────────────────────────── */
function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: L.shadow, flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || L.t1 }}>{value}</div>
      <div style={{ fontSize: 12, color: L.t3, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function PageLaboratorio({ profile }) {
  const clinicaId = profile?.clinica_id

  const [pedidos, setPedidos]     = useState([])
  const [resultados, setResultados] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [clinicaNome, setClinicaNome] = useState('')

  const [tab, setTab]             = useState('pedidos')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [urgenteFilter, setUrgenteFilter] = useState(false)
  const [medicoFilter, setMedicoFilter]   = useState('')

  const [showNovoPedido,    setShowNovoPedido]    = useState(false)
  const [showNovoResultado, setShowNovoResultado] = useState(false)
  const [verResultadosPedido, setVerResultadosPedido] = useState(null)

  /* fetch */
  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [rPedidos, rResultados, rPacientes, rMedicos, rClinica] = await Promise.all([
      supabase.from('pedidos_exame').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('resultados_exame').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('pacientes').select('id,nome,telefone').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('medicos').select('id,nome,especialidade').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('clinicas').select('nome').eq('id', clinicaId).single(),
    ])
    setPedidos(rPedidos.data || [])
    setResultados(rResultados.data || [])
    setPacientes(rPacientes.data || [])
    setMedicos(rMedicos.data || [])
    if (rClinica.data) setClinicaNome(rClinica.data.nome)
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  /* helpers */
  function getPaciente(id) { return pacientes.find(p => p.id === id) }
  function getMedico(id)   { return medicos.find(m => m.id === id) }

  /* KPIs */
  const kpis = {
    solicitado:  pedidos.filter(p => p.status === 'solicitado').length,
    aguardando:  pedidos.filter(p => ['coletado', 'em_analise'].includes(p.status)).length,
    disponivel:  pedidos.filter(p => p.status === 'disponivel').length,
    entregue:    pedidos.filter(p => p.status === 'entregue').length,
  }

  /* filters */
  const filteredPedidos = pedidos.filter(p => {
    const pac = getPaciente(p.paciente_id)
    if (search && !pac?.nome.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && p.status !== statusFilter) return false
    if (urgenteFilter && !p.urgente) return false
    if (medicoFilter && p.medico_id !== medicoFilter) return false
    return true
  })

  const resultadosPedidos = pedidos.filter(p => {
    if (!['disponivel', 'entregue'].includes(p.status)) return false
    const pac = getPaciente(p.paciente_id)
    if (search && !pac?.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  /* status change */
  async function handleStatusChange(pedidoId, newStatus) {
    await supabase.from('pedidos_exame').update({ status: newStatus }).eq('id', pedidoId)
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p))
  }

  /* deliver result */
  async function handleDelivered(resultadoId, pedidoId) {
    await supabase.from('resultados_exame').update({ status: 'entregue_paciente' }).eq('id', resultadoId)
    // check if all results for this pedido are delivered
    const myResults = resultados.filter(r => r.pedido_id === pedidoId)
    const allDelivered = myResults.every(r => r.id === resultadoId || r.status === 'entregue_paciente')
    if (allDelivered) {
      await supabase.from('pedidos_exame').update({ status: 'entregue' }).eq('id', pedidoId)
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: 'entregue' } : p))
    }
    setResultados(prev => prev.map(r => r.id === resultadoId ? { ...r, status: 'entregue_paciente' } : r))
  }

  const tabStyle = (t) => ({
    padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: 8, background: tab === t ? L.teal : 'transparent',
    color: tab === t ? L.white : L.t3,
  })

  return (
    <>
      <style>{`
        @keyframes up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        *:focus { outline: none; }
      `}</style>

      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: L.t1, margin: 0 }}>Laboratório</h1>
            <p style={{ fontSize: 13, color: L.t3, margin: '4px 0 0' }}>Pedidos de exame e resultados</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {tab === 'pedidos' && (
              <button style={btnPrimary} onClick={() => setShowNovoPedido(true)}>+ Novo Pedido</button>
            )}
            {tab === 'resultados' && (
              <button style={btnPrimary} onClick={() => setShowNovoResultado(true)}>+ Registrar Resultado</button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard label="Solicitados" value={kpis.solicitado} color={L.blue} />
          <KpiCard label="Aguardando resultado" value={kpis.aguardando} color={L.yellow} />
          <KpiCard label="Disponíveis p/ entrega" value={kpis.disponivel} color={L.green} />
          <KpiCard label="Entregues" value={kpis.entregue} color={L.t3} />
        </div>

        {/* Search + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            style={{ ...inp, maxWidth: 300 }}
            placeholder="Buscar por paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={focus} onBlur={blur}
          />
          <div style={{ display: 'flex', gap: 4, background: L.surface, borderRadius: 10, padding: 4 }}>
            <button style={tabStyle('pedidos')} onClick={() => setTab('pedidos')}>Pedidos</button>
            <button style={tabStyle('resultados')} onClick={() => setTab('resultados')}>Resultados</button>
          </div>
        </div>

        {/* Filter bar — Pedidos tab only */}
        {tab === 'pedidos' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Status filters */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ value: '', label: 'Todos' }, ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_CFG[s].label }))].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: 'none',
                    background: statusFilter === opt.value ? L.teal : L.surface,
                    color: statusFilter === opt.value ? L.white : L.t3,
                    fontWeight: statusFilter === opt.value ? 700 : 400,
                  }}
                >{opt.label}</button>
              ))}
            </div>
            {/* Urgente toggle */}
            <button
              onClick={() => setUrgenteFilter(u => !u)}
              style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${urgenteFilter ? L.red : L.line}`,
                background: urgenteFilter ? L.redBg : 'transparent',
                color: urgenteFilter ? L.red : L.t3, fontWeight: urgenteFilter ? 700 : 400,
              }}
            >⚡ Urgente</button>
            {/* Medico filter */}
            <select
              style={{ ...inp, maxWidth: 200, fontSize: 12 }}
              value={medicoFilter}
              onChange={e => setMedicoFilter(e.target.value)}
              onFocus={focus} onBlur={blur}
            >
              <option value="">Todos os médicos</option>
              {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 32, height: 32, border: `3px solid ${L.line}`,
              borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : (
          <>
            {tab === 'pedidos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredPedidos.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '48px 24px', color: L.t4,
                    background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔬</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum pedido encontrado</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Crie um novo pedido de exame para começar.</div>
                  </div>
                ) : (
                  filteredPedidos.map(p => (
                    <PedidoCard
                      key={p.id}
                      pedido={p}
                      paciente={getPaciente(p.paciente_id)}
                      medico={getMedico(p.medico_id)}
                      resultados={resultados}
                      onStatusChange={handleStatusChange}
                      onPrint={(ped, pac, med) => printPedido(ped, pac, med, clinicaNome)}
                      onVerResultados={setVerResultadosPedido}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'resultados' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {resultadosPedidos.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '48px 24px', color: L.t4,
                    background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum resultado disponível</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Registre um resultado para um pedido existente.</div>
                  </div>
                ) : (
                  resultadosPedidos.map(p => (
                    <ResultadoCard
                      key={p.id}
                      pedido={p}
                      paciente={getPaciente(p.paciente_id)}
                      medico={getMedico(p.medico_id)}
                      resultados={resultados}
                      clinicaNome={clinicaNome}
                      onDelivered={handleDelivered}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showNovoPedido && (
        <ModalNovoPedido
          clinicaId={clinicaId}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => setShowNovoPedido(false)}
          onSaved={() => { setShowNovoPedido(false); load() }}
        />
      )}

      {showNovoResultado && (
        <ModalNovoResultado
          clinicaId={clinicaId}
          pedidos={pedidos}
          pacientes={pacientes}
          onClose={() => setShowNovoResultado(false)}
          onSaved={() => { setShowNovoResultado(false); load() }}
        />
      )}

      {verResultadosPedido && (
        <ModalVerResultados
          pedido={verResultadosPedido}
          paciente={getPaciente(verResultadosPedido.paciente_id)}
          medico={getMedico(verResultadosPedido.medico_id)}
          resultados={resultados}
          clinicaNome={clinicaNome}
          onClose={() => setVerResultadosPedido(null)}
          onDelivered={async (rId, pId) => { await handleDelivered(rId, pId); setVerResultadosPedido(prev => ({ ...prev })) }}
        />
      )}
    </>
  )
}
