import { useState, useEffect, useRef } from 'react'
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
        maxWidth: wide ? 700 : 560, maxHeight: '92vh', overflowY: 'auto',
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

const ta = { ...inp, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }

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

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'receita', label: 'Receitas' },
  { value: 'atestado', label: 'Atestados' },
  { value: 'solicitacao_exame', label: 'Solicitações' },
  { value: 'encaminhamento', label: 'Encaminhamentos' },
  { value: 'declaracao', label: 'Declarações' },
]

const TEMPLATES = {
  receita: [
    {
      label: 'Antibiótico (5 dias)',
      conteudo: 'Amoxicilina 500mg\n1 comprimido a cada 8 horas por 5 dias\n\nTomar com água, de preferência às refeições.',
    },
    {
      label: 'Anti-inflamatório',
      conteudo: 'Ibuprofeno 600mg\n1 comprimido a cada 8 horas por 5 dias\n\nTomar após as refeições. Não utilizar em jejum.',
    },
    {
      label: 'Antihipertensivo',
      conteudo: 'Losartana Potássica 50mg\n1 comprimido ao dia (pela manhã)\n\nUso contínuo. Monitorar pressão arterial regularmente.',
    },
    {
      label: 'Ansiolítico',
      conteudo: 'Clonazepam 0,5mg\n1 comprimido à noite, ao dormir\n\nUso controlado. Não interromper abruptamente. Evitar ingestão de álcool.',
    },
  ],
  atestado: [
    {
      label: '1 dia de repouso',
      conteudo: 'Atestamos para fins de comprovação junto ao empregador que o(a) paciente acima identificado(a) necessitou de repouso médico pelo período de 01 (um) dia, podendo retornar às atividades normais a partir de amanhã.',
    },
    {
      label: '3 dias de repouso',
      conteudo: 'Atestamos para fins de comprovação junto ao empregador que o(a) paciente acima identificado(a) necessitou de repouso médico pelo período de 03 (três) dias, podendo retornar às atividades normais após esse período.',
    },
    {
      label: '7 dias de afastamento',
      conteudo: 'Atestamos para fins de comprovação junto ao empregador que o(a) paciente acima identificado(a) necessitou de afastamento de suas atividades laborais pelo período de 07 (sete) dias, a contar da data acima, por motivo de saúde.',
    },
    {
      label: 'Acompanhante',
      conteudo: 'Atestamos que o(a) paciente acima identificado(a) necessitou de acompanhante para comparecer a esta consulta médica, sendo necessária a presença de familiar ou responsável durante o atendimento.',
    },
  ],
  declaracao: [
    {
      label: 'Comparecimento',
      conteudo: 'Declaramos que o(a) paciente acima identificado(a) compareceu a esta clínica para consulta médica na data indicada neste documento, permanecendo em atendimento pelo tempo necessário para sua avaliação clínica.',
    },
    {
      label: 'Acompanhante de menor',
      conteudo: 'Declaramos que o(a) Sr(a). ________________________, portador(a) do CPF nº _________________, compareceu a esta clínica como acompanhante do(a) menor ________________________, que realizou consulta médica na data indicada neste documento.',
    },
  ],
  solicitacao_exame: [
    {
      label: 'Hemograma completo',
      conteudo: '- Hemograma completo\n- Glicemia em jejum\n- Ureia e creatinina\n- TGO e TGP\n- TSH e T4 livre',
    },
    {
      label: 'Lipidograma + glicemia',
      conteudo: '- Colesterol total e frações (HDL, LDL, VLDL)\n- Triglicerídeos\n- Glicemia em jejum\n- Hemoglobina glicada (HbA1c)',
    },
    {
      label: 'ECG + ecocardiograma',
      conteudo: '- Eletrocardiograma (ECG) em repouso\n- Ecocardiograma transtorácico com Doppler\n\nIndicação: avaliação cardiovascular',
    },
    {
      label: 'RX tórax PA',
      conteudo: '- Radiografia de tórax em PA (posteroanterior) e perfil\n\nIndicação: avaliação pulmonar e cardíaca',
    },
  ],
  encaminhamento: [
    {
      label: 'Encaminhamento cardiologia',
      conteudo: 'Encaminho o(a) paciente acima identificado(a) ao especialista em Cardiologia para avaliação e conduta.\n\nMotivo: ________________________\n\nHipótese diagnóstica: ________________________\n\nExames realizados: ________________________',
    },
    {
      label: 'Encaminhamento ortopedia',
      conteudo: 'Encaminho o(a) paciente acima identificado(a) ao especialista em Ortopedia e Traumatologia para avaliação e conduta.\n\nMotivo: ________________________\n\nHipótese diagnóstica: ________________________\n\nExames realizados: ________________________',
    },
    {
      label: 'Encaminhamento neurologia',
      conteudo: 'Encaminho o(a) paciente acima identificado(a) ao especialista em Neurologia para avaliação e conduta.\n\nMotivo: ________________________\n\nHipótese diagnóstica: ________________________\n\nExames realizados: ________________________',
    },
  ],
}

const TIPO_LABELS = {
  receita: { label: 'Receita', color: L.blue, bg: L.blueBg },
  atestado: { label: 'Atestado', color: L.green, bg: L.greenBg },
  solicitacao_exame: { label: 'Solicitação', color: L.purple, bg: L.purpleBg },
  encaminhamento: { label: 'Encaminhamento', color: L.orange, bg: L.orangeBg },
  declaracao: { label: 'Declaração', color: L.teal, bg: L.tealBg },
}

function TipoBadge({ tipo }) {
  const t = TIPO_LABELS[tipo] || { label: tipo, color: L.t3, bg: L.surface }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.color
    }}>{t.label}</span>
  )
}

function tipoTitulo(tipo) {
  return TIPO_LABELS[tipo]?.label || tipo
}

function PrintView({ doc, clinica, onClose }) {
  const ref = useRef()

  function imprimir() {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body > *:not(#print-area) { display: none !important; }
        #print-area { display: block !important; position: static !important; }
      }
    `
    document.head.appendChild(style)
    ref.current.id = 'print-area'
    window.print()
    document.head.removeChild(style)
  }

  const fmtData = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: 14, width: '100%', maxWidth: 680,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${L.line}`
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Pré-visualização para Impressão</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={imprimir} style={{
              padding: '8px 18px', background: L.teal, color: L.white,
              borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
            }}>Imprimir</button>
            <button onClick={onClose} style={{
              fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer'
            }}>×</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: 24 }}>
          <div ref={ref} style={{
            background: L.white, border: `1px solid ${L.line}`, borderRadius: 10,
            padding: '40px 48px', fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13, color: '#111', lineHeight: 1.6, minHeight: 600
          }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #111', paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                {clinica?.nome || 'Clínica'}
              </div>
              {clinica?.endereco && <div style={{ fontSize: 12, marginTop: 4 }}>{clinica.endereco}</div>}
              {clinica?.telefone && <div style={{ fontSize: 12 }}>Tel: {clinica.telefone}</div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Médico responsável</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {doc.medicos?.nome || '—'}
                {doc.medicos?.crm ? ` — CRM ${doc.medicos.crm}` : ''}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paciente</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{doc.pacientes?.nome || '—'}</div>
            </div>

            <div style={{
              textAlign: 'center', fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
              marginBottom: 24, textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              {tipoTitulo(doc.tipo)}
              {doc.tipo === 'atestado' && doc.dias_afastamento
                ? ` — ${doc.dias_afastamento} dia${doc.dias_afastamento > 1 ? 's' : ''} de afastamento`
                : ''}
            </div>

            <div style={{
              whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 13,
              borderTop: '1px solid #ddd', paddingTop: 20, marginBottom: 40
            }}>
              {doc.conteudo || ''}
            </div>

            <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {doc.codigo_verificacao && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Cód. autenticação: ${doc.codigo_verificacao}`)}`}
                    alt="QR Code"
                    style={{ width: 80, height: 80, display: 'block', marginBottom: 4 }}
                  />
                  <div style={{ fontSize: 9, color: '#888', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    Auth: {doc.codigo_verificacao}
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  {doc.data_documento ? fmtData(doc.data_documento) : ''}
                </div>
                <div style={{ borderTop: '1px solid #111', display: 'inline-block', minWidth: 260, textAlign: 'center', paddingTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>{doc.medicos?.nome || 'Médico responsável'}</div>
                  {doc.medicos?.crm && <div style={{ fontSize: 12, color: '#555' }}>CRM {doc.medicos.crm}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PageDocumentos({ profile }) {
  const [docs, setDocs] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [consultas, setConsultas] = useState([])
  const [clinica, setClinica] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [tab, setTab] = useState('')
  const [printDoc, setPrintDoc] = useState(null)

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [ds, pacs, meds, consults, clin] = await Promise.all([
      supabase.from('documentos_medicos')
        .select('*, pacientes(id, nome), medicos(id, nome, crm)')
        .eq('clinica_id', clinicaId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('medicos').select('id, nome, crm').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('consultas').select('id, data_hora, paciente_id').eq('clinica_id', clinicaId).order('data_hora', { ascending: false }).limit(100),
      supabase.from('clinicas').select('nome, endereco, telefone').eq('id', clinicaId).single(),
    ])
    setDocs(ds.data || [])
    setPacientes(pacs.data || [])
    setMedicos(meds.data || [])
    setConsultas(consults.data || [])
    setClinica(clin.data || null)
    setLoading(false)
  }

  function abrirNovo() {
    setForm({
      clinica_id: clinicaId,
      tipo: 'receita',
      data_documento: new Date().toISOString().slice(0, 10),
    })
    setModal('form')
  }

  async function salvar() {
    if (!form.paciente_id || !form.tipo) return
    setSaving(true)
    const { pacientes: _, medicos: __, ...data } = form
    if (data.id) {
      const { id, ...rest } = data
      await supabase.from('documentos_medicos').update(rest).eq('id', id)
    } else {
      await supabase.from('documentos_medicos').insert(data)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const consultasFiltradas = form.paciente_id
    ? consultas.filter(c => c.paciente_id === form.paciente_id)
    : consultas

  const filtrados = docs.filter(d => {
    const matchBusca = !busca ||
      d.pacientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      d.medicos?.nome?.toLowerCase().includes(busca.toLowerCase())
    const matchTab = !tab || d.tipo === tab
    return matchBusca && matchTab
  })

  const fmtDt = dt => {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes up { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, background: L.surface, borderRadius: 8, padding: 3, border: `1px solid ${L.line}`, flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: tab === t.value ? L.teal : 'none',
              color: tab === t.value ? L.white : L.t3,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s'
            }}>{t.label}</button>
          ))}
        </div>
        <input
          placeholder="Buscar por paciente ou médico..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, maxWidth: 280, ...inp, width: 'auto' }}
          onFocus={focus} onBlur={blur}
        />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtrados.length} documentos</div>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>+ Novo Documento</button>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 120px',
          padding: '10px 16px', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
          borderBottom: `1px solid ${L.line}`, background: L.surface
        }}>
          <span>PACIENTE</span><span>MÉDICO</span><span>TIPO</span><span>DATA</span><span>AÇÕES</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 24, height: 24, border: `3px solid ${L.line}`,
              borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
              animation: 'spin 0.7s linear infinite', margin: '0 auto'
            }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            Nenhum documento encontrado
          </div>
        ) : filtrados.map(doc => (
          <div key={doc.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 100px 120px',
            padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
            transition: 'background 0.12s', alignItems: 'center'
          }}
            onMouseEnter={e => e.currentTarget.style.background = L.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontWeight: 600, color: L.t1 }}>{doc.pacientes?.nome || '—'}</div>
            <div style={{ color: L.t2 }}>
              {doc.medicos?.nome ? `Dr(a). ${doc.medicos.nome}` : '—'}
            </div>
            <div><TipoBadge tipo={doc.tipo} /></div>
            <div style={{ fontSize: 12, color: L.t3 }}>{fmtDt(doc.data_documento || doc.created_at)}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPrintDoc(doc)} style={{
                padding: '5px 10px', borderRadius: 6, background: L.tealBg, color: L.teal,
                fontSize: 11, fontWeight: 600, border: `1px solid ${L.teal}20`, cursor: 'pointer'
              }}>Imprimir</button>
              <button onClick={() => { setForm({ ...doc }); setModal('form') }} style={{
                padding: '5px 8px', borderRadius: 6, background: L.hover, color: L.t2,
                fontSize: 12, border: 'none', cursor: 'pointer'
              }}>✎</button>
            </div>
          </div>
        ))}
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Documento' : 'Novo Documento'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO *">
                <select style={{ ...inp, appearance: 'none' }} value={form.tipo || 'receita'}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.slice(1).map(t => <option key={t.value} value={t.value}>{t.label.slice(0, -1)}</option>)}
                  <option value="declaracao">Declaração</option>
                </select>
              </Field>
              <Field label="DATA DO DOCUMENTO">
                <input type="date" style={inp} value={form.data_documento || ''}
                  onChange={e => setForm({ ...form, data_documento: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="PACIENTE *">
                <select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''}
                  onChange={e => setForm({ ...form, paciente_id: e.target.value, consulta_id: '' })}>
                  <option value="">Selecione o paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="MÉDICO *">
                <select style={{ ...inp, appearance: 'none' }} value={form.medico_id || ''}
                  onChange={e => setForm({ ...form, medico_id: e.target.value })}>
                  <option value="">Selecione o médico</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}{m.crm ? ` — CRM ${m.crm}` : ''}</option>)}
                </select>
              </Field>
            </div>

            <Field label="CONSULTA (OPCIONAL)">
              <select style={{ ...inp, appearance: 'none' }} value={form.consulta_id || ''}
                onChange={e => setForm({ ...form, consulta_id: e.target.value })}>
                <option value="">Sem consulta vinculada</option>
                {consultasFiltradas.map(c => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            </Field>

            {form.tipo === 'atestado' && (
              <Field label="DIAS DE AFASTAMENTO">
                <input type="number" style={inp} value={form.dias_afastamento || ''} min="1"
                  placeholder="Número de dias"
                  onChange={e => setForm({ ...form, dias_afastamento: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            )}

            {TEMPLATES[form.tipo] && TEMPLATES[form.tipo].length > 0 && (
              <div>
                <label style={{
                  display: 'block', fontSize: 11, color: L.t4, marginBottom: 6,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px'
                }}>TEMPLATES RÁPIDOS</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {TEMPLATES[form.tipo].map(tpl => (
                    <button
                      key={tpl.label}
                      onClick={() => setForm({ ...form, conteudo: tpl.conteudo })}
                      style={{
                        padding: '4px 10px', borderRadius: 20, background: L.tealBg,
                        color: L.teal, fontSize: 11, fontWeight: 500,
                        border: 'none', cursor: 'pointer', transition: 'opacity 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >{tpl.label}</button>
                  ))}
                </div>
              </div>
            )}

            <Field label="CONTEÚDO DO DOCUMENTO">
              <textarea style={{ ...ta, minHeight: 180 }} value={form.conteudo || ''}
                placeholder="Digite o conteúdo do documento..."
                onChange={e => setForm({ ...form, conteudo: e.target.value })} onFocus={focus} onBlur={blur} />
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.paciente_id || !form.medico_id} style={{
                flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, border: 'none',
                cursor: saving || !form.paciente_id || !form.medico_id ? 'not-allowed' : 'pointer',
                opacity: saving || !form.paciente_id || !form.medico_id ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Documento'}</button>
            </div>
          </div>
        </Modal>
      )}

      {printDoc && (
        <PrintView
          doc={printDoc}
          clinica={clinica}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  )
}
