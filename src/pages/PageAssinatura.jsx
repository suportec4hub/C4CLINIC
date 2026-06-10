import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── Global animations ──────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@keyframes up {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`

/* ─── Shared style helpers ───────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const focusIn  = e => { e.target.style.borderColor = L.teal }
const blurOut  = e => { e.target.style.borderColor = L.line  }

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
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {children}
    </div>
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

/* ─── Bottom-sheet modal wrapper ─────────────────────────────────────────── */
function BottomSheet({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: L.bg,
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: wide ? 780 : 580,
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        {/* sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ fontSize: 22, lineHeight: 1, color: L.t3, cursor: 'pointer', border: 'none', background: 'none' }}
          >×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
const STATUS_MAP = {
  rascunho:             { label: 'Rascunho',             bg: L.hover,     color: L.t3,    bd: L.line },
  aguardando_medico:    { label: 'Ag. Médico',           bg: L.orangeBg,  color: L.orange, bd: L.orangeBd },
  aguardando_paciente:  { label: 'Ag. Paciente',         bg: L.yellowBg,  color: L.yellow, bd: L.yellowBd },
  assinado:             { label: 'Assinado',             bg: L.greenBg,   color: L.green,  bd: L.greenBd },
  recusado:             { label: 'Recusado',             bg: L.redBg,     color: L.red,    bd: L.redBd },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: L.hover, color: L.t3, bd: L.line }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

/* ─── Tipo badge ─────────────────────────────────────────────────────────── */
const TIPO_COLORS = {
  prontuario:   { bg: L.blueBg,   color: L.blue,   label: 'Prontuário' },
  receita:      { bg: L.tealBg,   color: L.teal,   label: 'Receita' },
  consentimento:{ bg: L.purpleBg, color: L.purple, label: 'Consentimento' },
  laudo:        { bg: L.orangeBg, color: L.orange, label: 'Laudo' },
  contrato:     { bg: L.yellowBg, color: L.yellow, label: 'Contrato' },
  termo:        { bg: L.greenBg,  color: L.green,  label: 'Termo' },
  atestado:     { bg: L.redBg,    color: L.red,    label: 'Atestado' },
}

function TipoBadge({ tipo }) {
  const t = TIPO_COLORS[tipo] || { bg: L.hover, color: L.t3, label: tipo }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.color,
      whiteSpace: 'nowrap',
    }}>{t.label}</span>
  )
}

/* ─── Signature canvas ───────────────────────────────────────────────────── */
function SignaturePad({ canvasRef }) {
  const isDrawing = useRef(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = e => {
    e.preventDefault()
    isDrawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e, canvasRef.current)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = e => {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e, canvasRef.current)
    ctx.lineTo(x, y)
    ctx.strokeStyle = L.t1
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDraw = e => {
    e.preventDefault()
    isDrawing.current = false
  }

  const clearPad = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div>
      <div style={{
        border: `1.5px dashed ${L.line}`, borderRadius: 10,
        background: L.surface, overflow: 'hidden', position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          width={530}
          height={160}
          style={{ display: 'block', width: '100%', height: 160, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          textAlign: 'center', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", pointerEvents: 'none',
        }}>Desenhe sua assinatura aqui</div>
      </div>
      <button
        onClick={clearPad}
        style={{
          marginTop: 8, fontSize: 12, color: L.t3, background: 'none',
          border: 'none', cursor: 'pointer', padding: '4px 0',
        }}
      >Limpar assinatura</button>
    </div>
  )
}

/* ─── Document templates ─────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    titulo: 'Termo de Consentimento Livre e Esclarecido',
    tipo: 'consentimento',
    conteudo: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, paciente abaixo identificado, declaro ter sido devidamente informado(a) pelo(a) médico(a) responsável sobre o procedimento proposto, seus objetivos, riscos e benefícios, bem como sobre as alternativas terapêuticas disponíveis.

PROCEDIMENTO PROPOSTO: _______________________________________________

RISCOS E COMPLICAÇÕES POSSÍVEIS:
• Reações adversas a medicamentos ou anestésicos
• Infecções pós-procedimento
• Complicações próprias de cada intervenção

BENEFÍCIOS ESPERADOS:
• Melhora do quadro clínico
• Controle dos sintomas referidos

Declaro ter tido oportunidade de fazer perguntas, as quais foram respondidas de forma satisfatória. Estou ciente de que posso revogar este consentimento a qualquer momento antes da realização do procedimento.

Assinam o presente termo:

Paciente: ___________________________ Data: ___/___/______
Médico Responsável: _________________ CRM: _______________`,
  },
  {
    titulo: 'Receita Médica',
    tipo: 'receita',
    conteudo: `RECEITA MÉDICA

Paciente: _______________________________
Data de Nascimento: ___/___/______

PRESCRIÇÃO:

1. ____________________________________________
   Posologia: ___________________________________
   Via: ________________________________________
   Duração: ____________________________________

2. ____________________________________________
   Posologia: ___________________________________
   Via: ________________________________________
   Duração: ____________________________________

OBSERVAÇÕES:
• Retornar em caso de piora dos sintomas
• Manter repouso relativo conforme orientação
• Hidratação adequada

Validade: 30 dias a partir da data de emissão.

Médico Responsável: _________________________
CRM: _______________`,
  },
  {
    titulo: 'Atestado Médico',
    tipo: 'atestado',
    conteudo: `ATESTADO MÉDICO

Atesto para os devidos fins que o(a) paciente _______________________________,
portador(a) do CPF nº ___.___.___-__, encontra-se sob meus cuidados médicos,
necessitando de afastamento de suas atividades laborais pelo período de

_______ ( _________________ ) dias,

a contar de ___/___/______, conforme CID-10: ___________

O presente atestado é expedido a pedido do interessado para fins de apresentação
no local que se fizer necessário.

Local: _________________________, ___/___/______

Médico: _________________________________
CRM: ____________________`,
  },
  {
    titulo: 'Laudo Médico',
    tipo: 'laudo',
    conteudo: `LAUDO MÉDICO

IDENTIFICAÇÃO DO PACIENTE:
Nome: _______________________________________________
Data de Nascimento: ___/___/______   Sexo: ( ) M  ( ) F

HISTÓRICO CLÍNICO:
O paciente relata ____________________________________________
com início em ___/___/______. Refere _________________________.

EXAME FÍSICO:
Estado geral: ____________________________________________
PA: _____mmHg   FC: _____bpm   Temperatura: _____°C
Ausculta cardíaca: _______________________________________
Ausculta pulmonar: ______________________________________
Abdome: ________________________________________________

HIPÓTESE DIAGNÓSTICA:
CID-10: ___________
Diagnóstico: _____________________________________________

CONDUTA PROPOSTA:
_________________________________________________________
_________________________________________________________

CONCLUSÃO:
_________________________________________________________

Local: _________________________, ___/___/______

Médico: _________________________________
CRM: ____________________`,
  },
  {
    titulo: 'Contrato de Prestação de Serviços',
    tipo: 'contrato',
    conteudo: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS

Pelo presente instrumento, as partes abaixo qualificadas celebram o presente
Contrato de Prestação de Serviços Médicos, que se regerá pelas cláusulas seguintes:

CONTRATANTE (PACIENTE):
Nome: _______________________________________________
CPF: ___.___.___-__   RG: ____________________
Endereço: ___________________________________________

CONTRATADA (CLÍNICA):
Razão Social: C4Clinic
CNPJ: ___.___.___/____-__

CLÁUSULA 1 – DO OBJETO
A CONTRATADA obriga-se a prestar os serviços médicos descritos a seguir:
_____________________________________________________________

CLÁUSULA 2 – DO VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ ___________, a ser pago conforme:
( ) À vista  ( ) Parcelado em _____ x de R$ _________

CLÁUSULA 3 – DAS OBRIGAÇÕES
3.1 A CONTRATADA obriga-se a prestar os serviços com qualidade e ética.
3.2 O CONTRATANTE compromete-se a seguir as orientações médicas.

CLÁUSULA 4 – DO PRAZO
O presente contrato vigora por ___________________________________.

E por estarem de acordo, firmam o presente em 2 (duas) vias de igual teor.

Local: _________________________, ___/___/______

CONTRATANTE: _________________________  CONTRATADA: _________________________`,
  },
  {
    titulo: 'Autorização de Procedimento',
    tipo: 'termo',
    conteudo: `AUTORIZAÇÃO DE PROCEDIMENTO MÉDICO

Eu, _____________________________________________, portador(a) do CPF
nº ___.___.___-__, AUTORIZO o(a) Dr(a). ___________________________,
CRM nº ____________, a realizar o seguinte procedimento:

PROCEDIMENTO: ___________________________________________________
CÓDIGO TUSS/TISS: _______________________________________________
LOCAL DE REALIZAÇÃO: ____________________________________________
DATA PREVISTA: ___/___/______

INFORMAÇÕES RELEVANTES:
• Alergias conhecidas: _________________________________________
• Medicações em uso: __________________________________________
• Doenças preexistentes: _______________________________________

DECLARAÇÃO:
Declaro que fui devidamente informado(a) sobre o procedimento proposto,
seus riscos, benefícios e alternativas, concordando livremente com sua
realização.

Declaro, ainda, que as informações prestadas são verdadeiras e que
autorizo o uso de anestesia local/geral conforme necessidade clínica.

Local: _________________________, ___/___/______

Paciente ou Responsável Legal: __________________________________
Médico Responsável: _____________________________ CRM: __________`,
  },
]

/* ─── New document form ──────────────────────────────────────────────────── */
function NovoDocumentoSheet({ onClose, onSaved, pacientes, medicos, prefill }) {
  const [form, setForm] = useState({
    titulo: prefill?.titulo || '',
    tipo: prefill?.tipo || 'consentimento',
    paciente_id: '',
    medico_id: '',
    conteudo: prefill?.conteudo || '',
    status: 'rascunho',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTipoChange = v => {
    set('tipo', v)
    // auto-fill conteudo from template if empty
    if (!form.conteudo || form.conteudo === '') {
      const tpl = TEMPLATES.find(t => t.tipo === v)
      if (tpl) set('conteudo', tpl.conteudo)
    }
  }

  const save = async () => {
    if (!form.titulo.trim()) return alert('Informe o título do documento.')
    setSaving(true)
    const uuid = crypto.randomUUID()
    const link_assinatura = `https://assinar.c4clinic.app/${uuid}`
    const { error } = await supabase.from('docs_assinatura').insert({
      ...form,
      link_assinatura,
      data_envio: new Date().toISOString(),
    })
    setSaving(false)
    if (error) return alert('Erro ao salvar: ' + error.message)
    onSaved()
  }

  return (
    <BottomSheet title="Novo Documento" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="TÍTULO DO DOCUMENTO">
          <input
            style={inp} value={form.titulo}
            onChange={e => set('titulo', e.target.value)}
            onFocus={focusIn} onBlur={blurOut}
            placeholder="Ex: Consentimento para Cirurgia"
          />
        </Field>

        <Row2>
          <Field label="TIPO">
            <select
              style={{ ...inp }}
              value={form.tipo}
              onChange={e => handleTipoChange(e.target.value)}
              onFocus={focusIn} onBlur={blurOut}
            >
              <option value="prontuario">Prontuário</option>
              <option value="receita">Receita</option>
              <option value="consentimento">Consentimento</option>
              <option value="laudo">Laudo</option>
              <option value="contrato">Contrato</option>
              <option value="termo">Termo</option>
              <option value="atestado">Atestado</option>
            </select>
          </Field>
          <Field label="STATUS INICIAL">
            <select
              style={{ ...inp }}
              value={form.status}
              onChange={e => set('status', e.target.value)}
              onFocus={focusIn} onBlur={blurOut}
            >
              <option value="rascunho">Rascunho</option>
              <option value="aguardando_medico">Aguardando Médico</option>
              <option value="aguardando_paciente">Aguardando Paciente</option>
            </select>
          </Field>
        </Row2>

        <Row2>
          <Field label="PACIENTE">
            <select
              style={{ ...inp }}
              value={form.paciente_id}
              onChange={e => set('paciente_id', e.target.value)}
              onFocus={focusIn} onBlur={blurOut}
            >
              <option value="">Selecione um paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="MÉDICO RESPONSÁVEL">
            <select
              style={{ ...inp }}
              value={form.medico_id}
              onChange={e => set('medico_id', e.target.value)}
              onFocus={focusIn} onBlur={blurOut}
            >
              <option value="">Selecione um médico</option>
              {medicos.map(m => (
                <option key={m.id} value={m.id}>{m.nome} — CRM {m.crm}</option>
              ))}
            </select>
          </Field>
        </Row2>

        <Field label="CONTEÚDO DO DOCUMENTO">
          <textarea
            style={{ ...inp, minHeight: 240, resize: 'vertical', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
            value={form.conteudo}
            onChange={e => set('conteudo', e.target.value)}
            onFocus={focusIn} onBlur={blurOut}
            placeholder="Digite ou cole o conteúdo do documento aqui..."
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: `1px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer',
          }}>Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Spinner />}
            Salvar Documento
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ─── Signing sheet ──────────────────────────────────────────────────────── */
function AssinarSheet({ doc, profile, onClose, onSigned }) {
  const canvasRef = useRef(null)
  const [signing, setSigning] = useState(false)

  const confirmar = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // check if canvas has any drawing
    const ctx = canvas.getContext('2d')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const hasDrawing = data.some(v => v !== 0)
    if (!hasDrawing) return alert('Por favor, desenhe sua assinatura antes de confirmar.')

    setSigning(true)
    const hash = btoa(doc.titulo + Date.now())
    const { error } = await supabase
      .from('docs_assinatura')
      .update({
        status: 'aguardando_paciente',
        assinatura_medico_nome: profile.nome || profile.email,
        data_assinatura_medico: new Date().toISOString(),
        hash_doc: hash,
      })
      .eq('id', doc.id)
    setSigning(false)
    if (error) return alert('Erro ao assinar: ' + error.message)
    onSigned()
  }

  return (
    <BottomSheet title="Assinar Documento" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* document preview */}
        <div>
          <div style={{
            fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8, letterSpacing: '0.3px',
          }}>PRÉVIA DO DOCUMENTO</div>
          <div style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
            padding: '18px 20px', maxHeight: 300, overflowY: 'auto',
            fontSize: 13, color: L.t1, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }}>
              {doc.titulo}
            </div>
            {doc.conteudo}
          </div>
        </div>

        {/* signature pad */}
        <div>
          <div style={{
            fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8, letterSpacing: '0.3px',
          }}>ÁREA DE ASSINATURA</div>
          <SignaturePad canvasRef={canvasRef} />
        </div>

        <div style={{
          background: L.tealBg, border: `1px solid ${L.teal}30`,
          borderRadius: 8, padding: '10px 14px', fontSize: 12, color: L.teal,
        }}>
          Ao confirmar, você assina digitalmente este documento como médico responsável.
          O status será atualizado para <strong>Aguardando Paciente</strong>.
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: `1px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer',
          }}>Cancelar</button>
          <button
            onClick={confirmar}
            disabled={signing}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: signing ? 0.7 : 1,
            }}
          >
            {signing && <Spinner />}
            ✓ Confirmar Assinatura
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ─── View document sheet ────────────────────────────────────────────────── */
function VerDocumentoSheet({ doc, pacientes, medicos, onClose }) {
  const paciente = pacientes.find(p => p.id === doc.paciente_id)
  const medico   = medicos.find(m => m.id === doc.medico_id)

  const fmt = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '—'

  return (
    <BottomSheet title="Visualizar Documento" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* meta info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'TÍTULO', value: doc.titulo },
            { label: 'TIPO', value: <TipoBadge tipo={doc.tipo} /> },
            { label: 'STATUS', value: <StatusBadge status={doc.status} /> },
            { label: 'PACIENTE', value: paciente?.nome || '—' },
            { label: 'MÉDICO', value: medico ? `${medico.nome} — CRM ${medico.crm}` : '—' },
            { label: 'ENVIADO EM', value: fmt(doc.data_envio) },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: L.t1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* content */}
        <div style={{
          background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
          padding: '18px 20px', maxHeight: 280, overflowY: 'auto',
          fontSize: 12, color: L.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {doc.conteudo || '(sem conteúdo)'}
        </div>

        {/* signature status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* medico */}
          <div style={{
            background: doc.assinatura_medico_nome ? L.greenBg : L.surface,
            border: `1px solid ${doc.assinatura_medico_nome ? L.greenBd : L.line}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>ASSINATURA DO MÉDICO</div>
            {doc.assinatura_medico_nome ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: L.green }}>✓ Assinado</div>
                <div style={{ fontSize: 12, color: L.t2, marginTop: 4 }}>{doc.assinatura_medico_nome}</div>
                <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>{fmt(doc.data_assinatura_medico)}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: L.t3 }}>Aguardando assinatura</div>
            )}
          </div>
          {/* paciente */}
          <div style={{
            background: doc.assinatura_paciente_nome ? L.greenBg : L.surface,
            border: `1px solid ${doc.assinatura_paciente_nome ? L.greenBd : L.line}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>ASSINATURA DO PACIENTE</div>
            {doc.assinatura_paciente_nome ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: L.green }}>✓ Assinado</div>
                <div style={{ fontSize: 12, color: L.t2, marginTop: 4 }}>{doc.assinatura_paciente_nome}</div>
                <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>{fmt(doc.data_assinatura_paciente)}</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: L.t3 }}>Aguardando assinatura</div>
            )}
          </div>
        </div>

        {doc.hash_doc && (
          <div style={{
            fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
            padding: '8px 12px', background: L.surface, borderRadius: 6,
            wordBreak: 'break-all',
          }}>
            HASH: {doc.hash_doc}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

/* ─── KPI card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: L.shadow,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: color || L.t1, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: L.t4, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      </div>
    </div>
  )
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: L.t1, color: L.white, padding: '10px 22px', borderRadius: 24,
      fontSize: 13, fontWeight: 500, zIndex: 999, animation: 'up 0.2s ease',
      boxShadow: L.shadowMd, whiteSpace: 'nowrap',
    }}>{message}</div>
  )
}

/* ─── Tab 0 — Documentos ─────────────────────────────────────────────────── */
function TabDocumentos({ docs, pacientes, medicos, profile, onRefresh }) {
  const [sheet, setSheet] = useState(null) // 'novo' | 'assinar' | 'ver'
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)

  const today = new Date().toDateString()

  const kpis = {
    total: docs.length,
    aguardando: docs.filter(d => d.status === 'aguardando_medico' || d.status === 'aguardando_paciente').length,
    assinadosHoje: docs.filter(d => d.status === 'assinado' && d.data_assinatura_paciente && new Date(d.data_assinatura_paciente).toDateString() === today).length,
    recusados: docs.filter(d => d.status === 'recusado').length,
  }

  const openAssinar = doc => { setSelected(doc); setSheet('assinar') }
  const openVer     = doc => { setSelected(doc); setSheet('ver') }

  const enviarLink = async doc => {
    if (doc.link_assinatura) {
      await navigator.clipboard.writeText(doc.link_assinatura).catch(() => {})
      setToast('Link copiado para a área de transferência!')
    } else {
      setToast('Nenhum link disponível para este documento.')
    }
  }

  const recusar = async doc => {
    if (!confirm('Confirmar recusa deste documento?')) return
    const { error } = await supabase
      .from('docs_assinatura')
      .update({ status: 'recusado' })
      .eq('id', doc.id)
    if (error) return alert('Erro: ' + error.message)
    onRefresh()
  }

  const fmt = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="TOTAL DE DOCUMENTOS"    value={kpis.total}          color={L.teal}   icon="📄" />
        <KpiCard label="AGUARDANDO ASSINATURA"  value={kpis.aguardando}     color={L.orange}  icon="✍️" />
        <KpiCard label="ASSINADOS HOJE"         value={kpis.assinadosHoje}  color={L.green}   icon="✅" />
        <KpiCard label="RECUSADOS"              value={kpis.recusados}      color={L.red}     icon="🚫" />
      </div>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Documentos</div>
        <button
          onClick={() => setSheet('novo')}
          style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
          }}
        >+ Novo Documento</button>
      </div>

      {/* table */}
      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        overflow: 'hidden', boxShadow: L.shadow,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: L.surface }}>
              {['Título', 'Tipo', 'Paciente', 'Médico', 'Status', 'Data', 'Ações'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                  borderBottom: `1px solid ${L.line}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                  Nenhum documento encontrado. Clique em "+ Novo Documento" para começar.
                </td>
              </tr>
            ) : docs.map((doc, i) => {
              const pac = pacientes.find(p => p.id === doc.paciente_id)
              const med = medicos.find(m => m.id === doc.medico_id)
              return (
                <tr key={doc.id} style={{
                  borderBottom: i < docs.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px', fontSize: 13, color: L.t1, fontWeight: 500, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titulo}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><TipoBadge tipo={doc.tipo} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t2 }}>{pac?.nome || '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t2 }}>{med?.nome || '—'}</td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={doc.status} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t3 }}>{fmt(doc.criado_em)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {doc.status === 'aguardando_medico' && (
                        <button onClick={() => openAssinar(doc)} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                        }}>Assinar</button>
                      )}
                      {doc.status === 'aguardando_paciente' && (
                        <button onClick={() => enviarLink(doc)} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: L.yellowBg, color: L.yellow, border: `1px solid ${L.yellowBd}`, cursor: 'pointer',
                        }}>Enviar Link</button>
                      )}
                      <button onClick={() => openVer(doc)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`, cursor: 'pointer',
                      }}>Ver</button>
                      {doc.status !== 'recusado' && doc.status !== 'assinado' && (
                        <button onClick={() => recusar(doc)} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, cursor: 'pointer',
                        }}>Recusar</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* sheets */}
      {sheet === 'novo' && (
        <NovoDocumentoSheet
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); onRefresh() }}
          pacientes={pacientes}
          medicos={medicos}
        />
      )}
      {sheet === 'assinar' && selected && (
        <AssinarSheet
          doc={selected}
          profile={profile}
          onClose={() => setSheet(null)}
          onSigned={() => { setSheet(null); onRefresh() }}
        />
      )}
      {sheet === 'ver' && selected && (
        <VerDocumentoSheet
          doc={selected}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => setSheet(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

/* ─── Tab 1 — Editor de Modelos ──────────────────────────────────────────── */
function TabModelos({ pacientes, medicos, profile }) {
  const [sheet, setSheet] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [toast, setToast] = useState(null)

  const usarModelo = tpl => {
    setPrefill({ titulo: tpl.titulo, tipo: tpl.tipo, conteudo: tpl.conteudo })
    setSheet(true)
  }

  const ICON_MAP = {
    consentimento: '📋',
    receita: '💊',
    atestado: '🏥',
    laudo: '🔬',
    contrato: '📑',
    termo: '✅',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Modelos de Documentos</div>
      <div style={{ fontSize: 13, color: L.t3 }}>
        Selecione um modelo para pré-preencher um novo documento. Todos os campos podem ser editados antes de salvar.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {TEMPLATES.map((tpl, i) => (
          <div key={i} style={{
            background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '20px', boxShadow: L.shadow,
            display: 'flex', flexDirection: 'column', gap: 12,
            transition: 'box-shadow 0.15s, border-color 0.15s',
            cursor: 'default',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = L.shadowMd
              e.currentTarget.style.borderColor = L.teal + '60'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = L.shadow
              e.currentTarget.style.borderColor = L.line
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: (TIPO_COLORS[tpl.tipo]?.bg || L.surface),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>{ICON_MAP[tpl.tipo] || '📄'}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: L.t1, lineHeight: 1.3 }}>{tpl.titulo}</div>
                <div style={{ marginTop: 4 }}><TipoBadge tipo={tpl.tipo} /></div>
              </div>
            </div>

            <div style={{
              fontSize: 11, color: L.t3, lineHeight: 1.6,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {tpl.conteudo.slice(0, 120)}...
            </div>

            <button
              onClick={() => usarModelo(tpl)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                marginTop: 'auto',
              }}
            >Usar Modelo →</button>
          </div>
        ))}
      </div>

      {sheet && prefill && (
        <NovoDocumentoSheet
          onClose={() => { setSheet(false); setPrefill(null) }}
          onSaved={() => { setSheet(false); setPrefill(null); setToast('Documento criado com sucesso!') }}
          pacientes={pacientes}
          medicos={medicos}
          prefill={prefill}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

/* ─── Signed document print view ─────────────────────────────────────────── */
function VerAssinadoSheet({ doc, pacientes, medicos, onClose }) {
  const paciente = pacientes.find(p => p.id === doc.paciente_id)
  const medico   = medicos.find(m => m.id === doc.medico_id)
  const fmt      = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '—'

  return (
    <BottomSheet title="Documento Assinado" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* formal header */}
        <div style={{
          background: L.tealBg, border: `1px solid ${L.teal}30`,
          borderRadius: 10, padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: L.teal }}>{doc.titulo}</div>
            <div style={{ fontSize: 12, color: L.t3, marginTop: 4 }}>
              <TipoBadge tipo={doc.tipo} />
            </div>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {/* parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: L.surface, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>PACIENTE</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{paciente?.nome || '—'}</div>
            {paciente?.email && <div style={{ fontSize: 12, color: L.t3 }}>{paciente.email}</div>}
          </div>
          <div style={{ background: L.surface, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>MÉDICO RESPONSÁVEL</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{medico?.nome || '—'}</div>
            {medico?.crm && <div style={{ fontSize: 12, color: L.t3 }}>CRM {medico.crm}</div>}
          </div>
        </div>

        {/* content */}
        <div style={{
          background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
          padding: '18px 20px', maxHeight: 260, overflowY: 'auto',
          fontSize: 12, color: L.t1, lineHeight: 1.7, whiteSpace: 'pre-wrap',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {doc.conteudo}
        </div>

        {/* formal signature block */}
        <div style={{ border: `1px solid ${L.greenBd}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            background: L.greenBg, padding: '10px 16px',
            fontSize: 11, fontWeight: 600, color: L.green,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.4px',
          }}>REGISTRO DE ASSINATURAS ELETRÔNICAS</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* medico */}
            <div style={{ padding: '14px 16px', borderRight: `1px solid ${L.line}` }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>MÉDICO</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>
                {doc.assinatura_medico_nome || medico?.nome || '—'}
              </div>
              {medico?.crm && (
                <div style={{ fontSize: 11, color: L.t3, marginTop: 2 }}>CRM {medico.crm}</div>
              )}
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: `1px solid ${L.line}`,
                fontSize: 11, color: L.t3, fontFamily: "'JetBrains Mono', monospace",
              }}>
                Assinado em: {fmt(doc.data_assinatura_medico)}
              </div>
            </div>

            {/* paciente */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>PACIENTE</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>
                {doc.assinatura_paciente_nome || paciente?.nome || '—'}
              </div>
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: `1px solid ${L.line}`,
                fontSize: 11, color: L.t3, fontFamily: "'JetBrains Mono', monospace",
              }}>
                Assinado em: {fmt(doc.data_assinatura_paciente)}
              </div>
            </div>
          </div>

          {doc.hash_doc && (
            <div style={{
              padding: '8px 16px', borderTop: `1px solid ${L.line}`,
              fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              background: L.surface, wordBreak: 'break-all',
            }}>
              Integridade: {doc.hash_doc}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
            }}
          >🖨 Imprimir / Baixar PDF</button>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: `1px solid ${L.line}`, background: 'none', color: L.t2, cursor: 'pointer',
          }}>Fechar</button>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ─── Tab 2 — Assinados ──────────────────────────────────────────────────── */
function TabAssinados({ docs, pacientes, medicos }) {
  const [selected, setSelected] = useState(null)
  const [sheet, setSheet] = useState(null) // 'ver'

  const assinados = docs.filter(d => d.status === 'assinado')
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
  const fmtFull = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '—'

  const baixar = doc => {
    const pac = pacientes.find(p => p.id === doc.paciente_id)
    const med = medicos.find(m => m.id === doc.medico_id)
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${doc.titulo}</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 780px; margin: 40px auto; color: #111; line-height: 1.7; }
        h1 { font-size: 20px; border-bottom: 2px solid #0d6e6e; padding-bottom: 10px; color: #0d6e6e; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
        .field { background: #f9fafb; padding: 10px 14px; border-radius: 8px; }
        .label { font-size: 10px; color: #9ca3af; font-family: monospace; }
        .value { font-size: 13px; margin-top: 2px; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; margin: 20px 0; }
        .sigs { border: 2px solid #16a34a; border-radius: 10px; overflow: hidden; margin-top: 20px; }
        .sig-header { background: #f0fdf4; padding: 10px 16px; color: #16a34a; font-family: monospace; font-size: 11px; font-weight: bold; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr; }
        .sig-cell { padding: 14px 16px; }
        .sig-name { font-size: 14px; font-weight: bold; }
        .sig-date { font-size: 11px; color: #6b7280; font-family: monospace; margin-top: 6px; }
        .hash { background: #f9fafb; padding: 8px 16px; font-family: monospace; font-size: 10px; color: #9ca3af; word-break: break-all; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>${doc.titulo}</h1>
      <div class="meta">
        <div class="field"><div class="label">PACIENTE</div><div class="value">${pac?.nome || '—'}</div></div>
        <div class="field"><div class="label">MÉDICO</div><div class="value">${med?.nome || '—'}${med?.crm ? ' — CRM ' + med.crm : ''}</div></div>
      </div>
      <div class="content">${doc.conteudo || ''}</div>
      <div class="sigs">
        <div class="sig-header">REGISTRO DE ASSINATURAS ELETRÔNICAS</div>
        <div class="sig-row">
          <div class="sig-cell" style="border-right: 1px solid #e5e7eb">
            <div class="label">MÉDICO</div>
            <div class="sig-name">${doc.assinatura_medico_nome || med?.nome || '—'}</div>
            <div class="sig-date">Assinado em: ${fmtFull(doc.data_assinatura_medico)}</div>
          </div>
          <div class="sig-cell">
            <div class="label">PACIENTE</div>
            <div class="sig-name">${doc.assinatura_paciente_nome || pac?.nome || '—'}</div>
            <div class="sig-date">Assinado em: ${fmtFull(doc.data_assinatura_paciente)}</div>
          </div>
        </div>
        ${doc.hash_doc ? `<div class="hash">Integridade: ${doc.hash_doc}</div>` : ''}
      </div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Documentos Assinados</div>
        <div style={{
          background: L.greenBg, color: L.green, border: `1px solid ${L.greenBd}`,
          borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
        }}>{assinados.length} documento{assinados.length !== 1 ? 's' : ''}</div>
      </div>

      <div style={{
        background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
        overflow: 'hidden', boxShadow: L.shadow,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: L.surface }}>
              {['Título', 'Tipo', 'Paciente', 'Médico', 'Data de Assinatura', 'Ações'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                  color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                  borderBottom: `1px solid ${L.line}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assinados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: L.t4, fontSize: 13 }}>
                  Nenhum documento assinado encontrado.
                </td>
              </tr>
            ) : assinados.map((doc, i) => {
              const pac = pacientes.find(p => p.id === doc.paciente_id)
              const med = medicos.find(m => m.id === doc.medico_id)
              return (
                <tr key={doc.id} style={{
                  borderBottom: i < assinados.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = L.hover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 14px', fontSize: 13, color: L.t1, fontWeight: 500, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.titulo}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><TipoBadge tipo={doc.tipo} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t2 }}>{pac?.nome || '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t2 }}>{med?.nome || '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: L.t3 }}>
                    {fmt(doc.data_assinatura_paciente || doc.data_assinatura_medico)}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => baixar(doc)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: L.tealBg, color: L.teal, border: `1px solid ${L.teal}30`, cursor: 'pointer',
                      }}>Baixar</button>
                      <button onClick={() => { setSelected(doc); setSheet('ver') }} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        background: L.blueBg, color: L.blue, border: `1px solid ${L.blueBd}`, cursor: 'pointer',
                      }}>Ver</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sheet === 'ver' && selected && (
        <VerAssinadoSheet
          doc={selected}
          pacientes={pacientes}
          medicos={medicos}
          onClose={() => { setSheet(null); setSelected(null) }}
        />
      )}
    </div>
  )
}

/* ─── Page root ──────────────────────────────────────────────────────────── */
export default function PageAssinatura({ profile }) {
  const [tab, setTab]           = useState(0)
  const [docs, setDocs]         = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos]   = useState([])
  const [loading, setLoading]   = useState(true)

  const clinicaId = profile?.clinica_id

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [docsRes, pacRes, medRes] = await Promise.all([
      supabase
        .from('docs_assinatura')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('criado_em', { ascending: false }),
      supabase
        .from('pacientes')
        .select('id, nome, email')
        .eq('clinica_id', clinicaId)
        .order('nome'),
      supabase
        .from('medicos')
        .select('id, nome, crm')
        .eq('clinica_id', clinicaId)
        .order('nome'),
    ])
    setDocs(docsRes.data || [])
    setPacientes(pacRes.data || [])
    setMedicos(medRes.data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { loadAll() }, [loadAll])

  const TABS = ['Documentos', 'Editor de Modelos', 'Assinados']

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ padding: '24px 28px', minHeight: '100%', background: L.bg }}>
        {/* page header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: L.t1 }}>Assinatura Eletrônica</div>
          <div style={{ fontSize: 13, color: L.t3, marginTop: 4 }}>
            Gerencie documentos médicos com assinatura digital segura
          </div>
        </div>

        {/* tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: L.surface, border: `1px solid ${L.line}`,
          borderRadius: 10, padding: 4, width: 'fit-content',
        }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '7px 18px', borderRadius: 7, fontSize: 13,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: tab === i ? L.bg : 'transparent',
                color: tab === i ? L.teal : L.t3,
                fontWeight: tab === i ? 600 : 500,
                boxShadow: tab === i ? L.shadow : 'none',
              }}
            >{t}</button>
          ))}
        </div>

        {/* content */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: L.t3, fontSize: 13 }}>
            <Spinner /> Carregando documentos...
          </div>
        ) : (
          <>
            {tab === 0 && (
              <TabDocumentos
                docs={docs}
                pacientes={pacientes}
                medicos={medicos}
                profile={profile}
                onRefresh={loadAll}
              />
            )}
            {tab === 1 && (
              <TabModelos
                pacientes={pacientes}
                medicos={medicos}
                profile={profile}
              />
            )}
            {tab === 2 && (
              <TabAssinados
                docs={docs}
                pacientes={pacientes}
                medicos={medicos}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}
