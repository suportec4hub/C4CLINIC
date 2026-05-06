import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const SEXOS = ['Masculino', 'Feminino', 'Outro']

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center',
      animation: 'in 0.2s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-wrap" style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 560, maxHeight: '90vh',
        overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.12)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0,
          background: L.bg, zIndex: 1
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

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

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

export default function PagePacientes({ profile }) {
  const [pacientes, setPacientes] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null) // null | 'novo' | 'editar'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [detalhe, setDetalhe] = useState(null)

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [pacs, convs] = await Promise.all([
      supabase.from('pacientes').select('*, convenios(nome)')
        .eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true)
    ])
    setPacientes(pacs.data || [])
    setConvenios(convs.data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, ativo: true })
    setModal('novo')
  }

  function abrirEditar(p) {
    setForm({ ...p })
    setModal('editar')
  }

  async function salvar() {
    setSaving(true)
    if (modal === 'novo') {
      await supabase.from('pacientes').insert(form)
    } else {
      const { id, convenios: _, ...rest } = form
      await supabase.from('pacientes').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function inativar(id) {
    if (!confirm('Inativar este paciente?')) return
    await supabase.from('pacientes').update({ ativo: false }).eq('id', id)
    load()
  }

  const filtrados = pacientes.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf?.includes(busca) ||
    p.email?.toLowerCase().includes(busca.toLowerCase())
  )

  const calcIdade = dn => {
    if (!dn) return '—'
    const diff = Date.now() - new Date(dn).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' anos'
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20
      }}>
        <input
          placeholder="Buscar por nome, CPF ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, maxWidth: 360, padding: '9px 14px', fontSize: 13,
            border: `1.5px solid ${L.line}`, borderRadius: 8,
            background: L.bg, color: L.t1, outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = L.teal}
          onBlur={e => e.target.style.borderColor = L.line}
        />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>
          {filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={abrirNovo}
          style={{
            padding: '9px 18px', background: L.teal, color: L.white,
            borderRadius: 8, fontWeight: 600, fontSize: 13, display: 'flex',
            alignItems: 'center', gap: 6
          }}
        >+ Novo Paciente</button>
      </div>

      {/* Tabela */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr 80px',
          padding: '10px 16px', fontSize: 11, color: L.t4,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
          borderBottom: `1px solid ${L.line}`, background: L.surface
        }}>
          <span>PACIENTE</span><span>CPF</span><span>IDADE</span><span>CONTATO</span><span>AÇÕES</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{
              width: 24, height: 24, border: `3px solid ${L.line}`,
              borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
              animation: 'spin 0.7s linear infinite', margin: '0 auto'
            }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            {busca ? 'Nenhum resultado para a busca' : 'Nenhum paciente cadastrado'}
          </div>
        ) : (
          filtrados.map(p => (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 1fr 80px',
              padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
              transition: 'background 0.12s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = L.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 600, color: L.t1 }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: L.t4, marginTop: 1 }}>
                  {p.convenios?.nome || 'Particular'}
                </div>
              </div>
              <span style={{ color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {p.cpf || '—'}
              </span>
              <span style={{ color: L.t2 }}>{calcIdade(p.data_nascimento)}</span>
              <div>
                <div style={{ color: L.t2 }}>{p.telefone || '—'}</div>
                <div style={{ fontSize: 11, color: L.t4 }}>{p.email || ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setDetalhe(p)}
                  style={{
                    padding: '5px 8px', borderRadius: 6, background: L.tealBg,
                    color: L.teal, fontSize: 12, fontWeight: 500
                  }}
                  title="Ver detalhes"
                >👁</button>
                <button
                  onClick={() => abrirEditar(p)}
                  style={{
                    padding: '5px 8px', borderRadius: 6, background: L.hover,
                    color: L.t2, fontSize: 12
                  }}
                  title="Editar"
                >✎</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {(modal === 'novo' || modal === 'editar') && (
        <Modal
          title={modal === 'novo' ? 'Novo Paciente' : 'Editar Paciente'}
          onClose={() => setModal(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME COMPLETO *">
              <input style={inp} value={form.nome || ''} placeholder="Nome do paciente"
                onChange={e => setForm({ ...form, nome: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CPF">
                <input style={inp} value={form.cpf || ''} placeholder="000.000.000-00"
                  onChange={e => setForm({ ...form, cpf: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="DATA DE NASCIMENTO">
                <input style={inp} type="date" value={form.data_nascimento || ''}
                  onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SEXO">
                <select style={{ ...inp, appearance: 'none' }} value={form.sexo || ''}
                  onChange={e => setForm({ ...form, sexo: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {SEXOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="TELEFONE">
                <input style={inp} value={form.telefone || ''} placeholder="(00) 00000-0000"
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <Field label="E-MAIL">
              <input style={inp} type="email" value={form.email || ''} placeholder="paciente@email.com"
                onChange={e => setForm({ ...form, email: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="CONVÊNIO">
              <select style={{ ...inp, appearance: 'none' }} value={form.convenio_id || ''}
                onChange={e => setForm({ ...form, convenio_id: e.target.value })}
              >
                <option value="">Particular</option>
                {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Nº CARTEIRINHA">
              <input style={inp} value={form.numero_carteirinha || ''} placeholder="Número da carteirinha"
                onChange={e => setForm({ ...form, numero_carteirinha: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <Field label="ENDEREÇO">
              <input style={inp} value={form.endereco || ''} placeholder="Rua, número, bairro"
                onChange={e => setForm({ ...form, endereco: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
              <Field label="CIDADE">
                <input style={inp} value={form.cidade || ''} placeholder="Cidade"
                  onChange={e => setForm({ ...form, cidade: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="UF">
                <input style={inp} value={form.estado || ''} placeholder="SP" maxLength={2}
                  onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <Field label="OBSERVAÇÕES">
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                value={form.observacoes || ''} placeholder="Alergias, observações clínicas..."
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover,
                color: L.t2, fontWeight: 500, fontSize: 13
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.nome} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Paciente'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detalhe */}
      {detalhe && (
        <Modal title="Ficha do Paciente" onClose={() => setDetalhe(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', gap: 16, alignItems: 'center',
              padding: '16px', background: L.tealBg, borderRadius: 12
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: L.teal,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: L.white, fontSize: 22, fontWeight: 700
              }}>
                {detalhe.nome[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: L.t1 }}>{detalhe.nome}</div>
                <div style={{ fontSize: 13, color: L.teal }}>{detalhe.convenios?.nome || 'Particular'}</div>
              </div>
            </div>

            {[
              ['CPF', detalhe.cpf],
              ['Nascimento', detalhe.data_nascimento ? new Date(detalhe.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : null],
              ['Sexo', detalhe.sexo],
              ['Telefone', detalhe.telefone],
              ['E-mail', detalhe.email],
              ['Carteirinha', detalhe.numero_carteirinha],
              ['Endereço', [detalhe.endereco, detalhe.cidade, detalhe.estado].filter(Boolean).join(', ')],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', gap: 12, padding: '8px 0',
                borderBottom: `1px solid ${L.lineSoft}`
              }}>
                <div style={{ fontSize: 11, color: L.t4, width: 100, flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace" }}>{k}</div>
                <div style={{ fontSize: 13, color: L.t1 }}>{v}</div>
              </div>
            ))}

            {detalhe.observacoes && (
              <div style={{ padding: '12px', background: L.yellowBg, borderRadius: 8,
                border: `1px solid ${L.yellowBd}` }}>
                <div style={{ fontSize: 11, color: L.t4, marginBottom: 4,
                  fontFamily: "'JetBrains Mono', monospace" }}>OBSERVAÇÕES</div>
                <div style={{ fontSize: 13, color: L.t2 }}>{detalhe.observacoes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setDetalhe(null); abrirEditar(detalhe) }} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.tealBg,
                color: L.teal, fontWeight: 600, fontSize: 13
              }}>Editar</button>
              <button onClick={() => { inativar(detalhe.id); setDetalhe(null) }} style={{
                padding: '10px 16px', borderRadius: 8, background: L.redBg,
                color: L.red, fontSize: 13
              }}>Inativar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
