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
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3 }}>×</button>
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

export default function PageConsultas({ profile }) {
  const [consultas, setConsultas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroMed, setFiltroMed] = useState('')

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [cs, pacs, meds, convs] = await Promise.all([
      supabase.from('consultas')
        .select('*, pacientes(id,nome,data_nascimento), medicos(id,nome), convenios(nome)')
        .eq('clinica_id', clinicaId)
        .order('data_hora', { ascending: false })
        .limit(200),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('medicos').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true),
    ])
    setConsultas(cs.data || [])
    setPacientes(pacs.data || [])
    setMedicos(meds.data || [])
    setConvenios(convs.data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({
      clinica_id: clinicaId,
      data_hora: new Date().toISOString().slice(0, 16),
      tipo: 'consulta',
      status: 'realizada'
    })
    setModal('form')
  }

  function abrirEditar(c) {
    setForm({ ...c, data_hora: c.data_hora?.slice(0, 16) })
    setModal('form')
  }

  async function salvar() {
    setSaving(true)
    const { pacientes: _, medicos: __, convenios: ___, ...data } = form
    if (!data.id) {
      await supabase.from('consultas').insert(data)
    } else {
      const { id, ...rest } = data
      await supabase.from('consultas').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const filtradas = consultas.filter(c => {
    const matchBusca = !busca ||
      c.pacientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cid_principal?.toLowerCase().includes(busca.toLowerCase())
    const matchMed = !filtroMed || c.medico_id === filtroMed
    return matchBusca && matchMed
  })

  const fmtDt = dt => new Date(dt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const fmtHora = dt => new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmt = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Buscar por paciente ou CID..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, maxWidth: 320, padding: '9px 14px', fontSize: 13,
            border: `1.5px solid ${L.line}`, borderRadius: 8,
            background: L.bg, color: L.t1, outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = L.teal}
          onBlur={e => e.target.style.borderColor = L.line}
        />
        <select value={filtroMed} onChange={e => setFiltroMed(e.target.value)}
          style={{
            padding: '9px 12px', fontSize: 13, border: `1.5px solid ${L.line}`,
            borderRadius: 8, background: L.bg, color: filtroMed ? L.t1 : L.t4,
            outline: 'none', appearance: 'none'
          }}
        >
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtradas.length} consultas</div>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13
        }}>+ Nova Consulta</button>
      </div>

      {/* Tabela */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '90px 1fr 1fr 140px 100px 80px',
          padding: '10px 16px', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
          borderBottom: `1px solid ${L.line}`, background: L.surface
        }}>
          <span>DATA</span><span>PACIENTE</span><span>MÉDICO</span>
          <span>DIAGNÓSTICO (CID)</span><span>VALOR</span><span>AÇÕES</span>
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
            Nenhuma consulta encontrada
          </div>
        ) : (
          filtradas.map(c => (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 1fr 140px 100px 80px',
              padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
              transition: 'background 0.12s', cursor: 'pointer'
            }}
              onMouseEnter={e => e.currentTarget.style.background = L.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => abrirEditar(c)}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: L.t1 }}>{fmtDt(c.data_hora)}</div>
                <div style={{ fontSize: 10, color: L.t4 }}>{fmtHora(c.data_hora)}</div>
              </div>
              <div style={{ fontWeight: 500, color: L.t1 }}>{c.pacientes?.nome || '—'}</div>
              <div style={{ color: L.t2 }}>Dr(a). {c.medicos?.nome || '—'}</div>
              <div>
                {c.cid_principal ? (
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, background: L.tealBg,
                    color: L.teal, fontSize: 11, fontFamily: "'JetBrains Mono', monospace"
                  }}>{c.cid_principal}</span>
                ) : <span style={{ color: L.t4 }}>—</span>}
              </div>
              <div style={{ color: L.t2 }}>{c.valor ? fmt(c.valor) : '—'}</div>
              <button onClick={e => { e.stopPropagation(); abrirEditar(c) }} style={{
                padding: '5px 8px', borderRadius: 6, background: L.hover, color: L.t2, fontSize: 12
              }}>✎</button>
            </div>
          ))
        )}
      </div>

      {/* Modal prontuário */}
      {modal === 'form' && (
        <Modal
          title={form.id ? 'Editar Consulta / Prontuário' : 'Nova Consulta / Prontuário'}
          onClose={() => setModal(null)} wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cabeçalho */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 12 }}>
              <Field label="PACIENTE *">
                <select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''}
                  onChange={e => setForm({ ...form, paciente_id: e.target.value })}
                >
                  <option value="">Selecione o paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="MÉDICO *">
                <select style={{ ...inp, appearance: 'none' }} value={form.medico_id || ''}
                  onChange={e => setForm({ ...form, medico_id: e.target.value })}
                >
                  <option value="">Selecione o médico</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Field>
              <Field label="DATA / HORA">
                <input type="datetime-local" style={inp} value={form.data_hora || ''}
                  onChange={e => setForm({ ...form, data_hora: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                📋 ANAMNESE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="QUEIXA PRINCIPAL">
                  <textarea style={ta} value={form.queixa_principal || ''}
                    placeholder="Descreva a queixa principal do paciente..."
                    onChange={e => setForm({ ...form, queixa_principal: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <Field label="HISTÓRIA DA DOENÇA ATUAL / ANAMNESE">
                  <textarea style={{ ...ta, minHeight: 100 }} value={form.anamnese || ''}
                    placeholder="Historia clínica detalhada..."
                    onChange={e => setForm({ ...form, anamnese: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <Field label="EXAME FÍSICO">
                  <textarea style={ta} value={form.exame_fisico || ''}
                    placeholder="PA, FC, peso, altura, achados ao exame..."
                    onChange={e => setForm({ ...form, exame_fisico: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
              </div>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                🔬 DIAGNÓSTICO & CONDUTA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="HIPÓTESE DIAGNÓSTICA">
                  <textarea style={ta} value={form.hipotese_diagnostica || ''}
                    placeholder="Hipótese diagnóstica principal e diferenciais..."
                    onChange={e => setForm({ ...form, hipotese_diagnostica: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="CID-10 PRINCIPAL">
                    <input style={inp} value={form.cid_principal || ''} placeholder="Ex: J45.0"
                      onChange={e => setForm({ ...form, cid_principal: e.target.value.toUpperCase() })}
                      onFocus={e => e.target.style.borderColor = L.teal}
                      onBlur={e => e.target.style.borderColor = L.line}
                    />
                  </Field>
                  <Field label="CID-10 SECUNDÁRIO">
                    <input style={inp} value={form.cid_secundario || ''} placeholder="Ex: Z87.1"
                      onChange={e => setForm({ ...form, cid_secundario: e.target.value.toUpperCase() })}
                      onFocus={e => e.target.style.borderColor = L.teal}
                      onBlur={e => e.target.style.borderColor = L.line}
                    />
                  </Field>
                </div>
                <Field label="CONDUTA / PLANO TERAPÊUTICO">
                  <textarea style={ta} value={form.conduta || ''}
                    placeholder="Tratamento, exames solicitados, orientações..."
                    onChange={e => setForm({ ...form, conduta: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <Field label="PRESCRIÇÃO MÉDICA">
                  <textarea style={{ ...ta, minHeight: 100 }} value={form.prescricao || ''}
                    placeholder="Medicamentos, doses, posologia..."
                    onChange={e => setForm({ ...form, prescricao: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <Field label="ENCAMINHAMENTO">
                  <textarea style={ta} value={form.encaminhamento || ''}
                    placeholder="Especialidade, motivo do encaminhamento..."
                    onChange={e => setForm({ ...form, encaminhamento: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
              </div>
            </div>

            <div style={{ borderTop: `1px dashed ${L.line}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: L.teal, fontWeight: 600, marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace" }}>
                💰 FINANCEIRO
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="CONVÊNIO">
                  <select style={{ ...inp, appearance: 'none' }} value={form.convenio_id || ''}
                    onChange={e => setForm({ ...form, convenio_id: e.target.value })}
                  >
                    <option value="">Particular</option>
                    {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </Field>
                <Field label="VALOR (R$)">
                  <input type="number" style={inp} value={form.valor || ''} step="0.01" min="0"
                    placeholder="0,00"
                    onChange={e => setForm({ ...form, valor: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
                <Field label="RETORNO EM">
                  <input type="date" style={inp} value={form.retorno_em || ''}
                    onChange={e => setForm({ ...form, retorno_em: e.target.value })}
                    onFocus={e => e.target.style.borderColor = L.teal}
                    onBlur={e => e.target.style.borderColor = L.line}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.paciente_id} style={{
                flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Prontuário'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
