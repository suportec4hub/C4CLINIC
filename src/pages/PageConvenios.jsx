import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const TIPOS = ['plano_saude', 'particular', 'sus', 'outro']
const TIPOS_LABEL = { plano_saude: 'Plano de Saúde', particular: 'Particular', sus: 'SUS', outro: 'Outro' }

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

export default function PageConvenios({ profile }) {
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('convenios')
      .select('*').eq('clinica_id', clinicaId).order('nome')
    setConvenios(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setForm({ clinica_id: clinicaId, ativo: true, tipo: 'plano_saude' })
    setModal('form')
  }

  function abrirEditar(c) {
    setForm({ ...c })
    setModal('form')
  }

  async function salvar() {
    setSaving(true)
    if (!form.id) {
      await supabase.from('convenios').insert(form)
    } else {
      const { id, ...rest } = form
      await supabase.from('convenios').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  const tipoColor = t => ({
    plano_saude: { bg: L.blueBg, color: L.blue },
    particular:  { bg: L.greenBg, color: L.green },
    sus:         { bg: L.purpleBg, color: L.purple },
    outro:       { bg: L.surface, color: L.t3 },
  }[t] || { bg: L.surface, color: L.t3 })

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={abrirNovo} style={{
          padding: '9px 18px', background: L.teal, color: L.white,
          borderRadius: 8, fontWeight: 600, fontSize: 13
        }}>+ Novo Convênio</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 24, height: 24, border: `3px solid ${L.line}`,
            borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', margin: '0 auto'
          }} />
        </div>
      ) : (
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 80px 60px',
            padding: '10px 16px', fontSize: 11, color: L.t4,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
            borderBottom: `1px solid ${L.line}`, background: L.surface
          }}>
            <span>CONVÊNIO</span><span>TIPO</span><span>CÓDIGO</span>
            <span>PRAZO (dias)</span><span>STATUS</span><span>AÇÕES</span>
          </div>

          {convenios.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
              Nenhum convênio cadastrado
            </div>
          ) : convenios.map(c => {
            const tc = tipoColor(c.tipo)
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 80px 60px',
                padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`,
                transition: 'background 0.12s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = L.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 600, color: L.t1 }}>{c.nome}</div>
                  {c.email && <div style={{ fontSize: 11, color: L.t4 }}>{c.email}</div>}
                </div>
                <span>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: tc.bg, color: tc.color
                  }}>{TIPOS_LABEL[c.tipo] || c.tipo}</span>
                </span>
                <span style={{ color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  {c.codigo || '—'}
                </span>
                <span style={{ color: L.t2 }}>{c.prazo_pagamento ? `${c.prazo_pagamento} dias` : '—'}</span>
                <span>
                  <span style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: c.ativo ? L.greenBg : L.redBg,
                    color: c.ativo ? L.green : L.red
                  }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                </span>
                <button onClick={() => abrirEditar(c)} style={{
                  padding: '5px 8px', borderRadius: 6, background: L.hover, color: L.t2, fontSize: 12
                }}>✎</button>
              </div>
            )
          })}
        </div>
      )}

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Convênio' : 'Novo Convênio'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME DO CONVÊNIO *">
              <input style={inp} value={form.nome || ''} placeholder="Ex: Unimed, Bradesco Saúde..."
                onChange={e => setForm({ ...form, nome: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select style={{ ...inp, appearance: 'none' }} value={form.tipo || 'plano_saude'}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map(t => <option key={t} value={t}>{TIPOS_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="CÓDIGO / ANS">
                <input style={inp} value={form.codigo || ''} placeholder="000000"
                  onChange={e => setForm({ ...form, codigo: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TELEFONE">
                <input style={inp} value={form.telefone || ''} placeholder="(00) 0000-0000"
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
              <Field label="E-MAIL">
                <input style={inp} type="email" value={form.email || ''} placeholder="convenio@email.com"
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
              </Field>
            </div>
            <Field label="PRAZO DE PAGAMENTO (dias)">
              <input type="number" style={inp} value={form.prazo_pagamento || ''} min={0} placeholder="Ex: 30"
                onChange={e => setForm({ ...form, prazo_pagamento: Number(e.target.value) })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
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
              <button onClick={salvar} disabled={saving || !form.nome} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal,
                color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1
              }}>{saving ? 'Salvando...' : 'Salvar Convênio'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
