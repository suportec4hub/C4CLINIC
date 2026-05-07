import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const ESPECIALIDADES = [
  'Clínica Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Ginecologia', 'Neurologia', 'Oftalmologia',
  'Ortopedia', 'Otorrinolaringologia', 'Pediatria', 'Psiquiatria',
  'Urologia', 'Reumatologia', 'Pneumologia', 'Oncologia',
  'Geriatria', 'Cirurgia Geral', 'Medicina Esportiva', 'Nutrologia'
]

function Modal({ title, onClose, children }) {
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
        background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.12)'
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

function MedicoCard({ medico, onEdit }) {
  const ini = medico.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div style={{
      background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'box-shadow 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: L.teal,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: L.white, fontWeight: 700, fontSize: 18, flexShrink: 0
        }}>{ini}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Dr(a). {medico.nome}</div>
          <div style={{ fontSize: 12, color: L.teal, marginTop: 2 }}>{medico.especialidade || 'Sem especialidade'}</div>
          {medico.crm && (
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginTop: 3
            }}>CRM: {medico.crm}</div>
          )}
        </div>
        <button onClick={() => onEdit(medico)} style={{
          padding: '6px 10px', borderRadius: 7, background: L.hover, color: L.t2, fontSize: 13
        }}>✎</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {medico.telefone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: L.t2 }}>
            <span style={{ color: L.t4 }}>📞</span> {medico.telefone}
          </div>
        )}
        {medico.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: L.t2 }}>
            <span style={{ color: L.t4 }}>✉</span> {medico.email}
          </div>
        )}
      </div>

      <div style={{
        display: 'inline-flex', alignSelf: 'flex-start',
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: medico.ativo ? L.greenBg : L.redBg,
        color: medico.ativo ? L.green : L.red
      }}>
        {medico.ativo ? 'Ativo' : 'Inativo'}
      </div>
    </div>
  )
}

export default function PageMedicos({ profile }) {
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('medicos')
      .select('*').eq('clinica_id', clinicaId).order('nome')
    setMedicos(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, ativo: true })
    setModal('form')
  }

  function abrirEditar(m) {
    setForm({ ...m })
    setModal('form')
  }

  async function salvar() {
    setSaving(true)
    if (!form.id) {
      await supabase.from('medicos').insert(form)
    } else {
      const { id, ...rest } = form
      await supabase.from('medicos').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const filtrados = medicos.filter(m =>
    m.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    m.especialidade?.toLowerCase().includes(busca.toLowerCase()) ||
    m.crm?.includes(busca)
  )

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Buscar por nome, especialidade ou CRM..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, maxWidth: 360, padding: '9px 14px', fontSize: 13,
            border: `1.5px solid ${L.line}`, borderRadius: 8,
            background: L.bg, color: L.t1, outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = L.teal}
          onBlur={e => e.target.style.borderColor = L.line}
        />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>
          {filtrados.length} médico{filtrados.length !== 1 ? 's' : ''}
        </div>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13
        }}>+ Novo Médico</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 24, height: 24, border: `3px solid ${L.line}`,
            borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', margin: '0 auto'
          }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: L.t4, fontSize: 14 }}>
          Nenhum médico cadastrado
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16
        }}>
          {filtrados.map(m => (
            <MedicoCard key={m.id} medico={m} onEdit={abrirEditar} />
          ))}
        </div>
      )}

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Médico' : 'Novo Médico'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME COMPLETO *">
              <input style={inp} value={form.nome || ''} placeholder="Dr(a). Nome Completo"
                onChange={e => setForm({ ...form, nome: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CRM *">
                <input style={inp} value={form.crm || ''} placeholder="CRM/UF 000000"
                  onChange={e => setForm({ ...form, crm: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="ESPECIALIDADE">
                <select style={{ ...inp, appearance: 'none' }} value={form.especialidade || ''}
                  onChange={e => setForm({ ...form, especialidade: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {ESPECIALIDADES.map(e => <option key={e}>{e}</option>)}
                </select>
              </Field>
            </div>
            <Field label="REPASSE (%)">
              <input style={inp} type="number" min={0} max={100} step={0.5}
                value={form.repasse_percentual ?? ''} placeholder="Ex: 40"
                onChange={e => setForm({ ...form, repasse_percentual: e.target.value === '' ? null : Number(e.target.value) })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
              <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>
                Percentual da consulta repassado ao médico
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TELEFONE">
                <input style={inp} value={form.telefone || ''} placeholder="(00) 00000-0000"
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="E-MAIL">
                <input style={inp} type="email" value={form.email || ''} placeholder="medico@email.com"
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <Field label="STATUS">
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setForm({ ...form, ativo: v })}
                    style={{
                      padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: form.ativo === v ? (v ? L.greenBg : L.redBg) : L.hover,
                      color: form.ativo === v ? (v ? L.green : L.red) : L.t3,
                      border: `1.5px solid ${form.ativo === v ? (v ? L.green : L.red) : 'transparent'}`
                    }}
                  >{v ? 'Ativo' : 'Inativo'}</button>
                ))}
              </div>
            </Field>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13
              }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.nome || !form.crm} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Médico'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
