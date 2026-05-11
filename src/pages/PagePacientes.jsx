import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SEXOS = ['Masculino', 'Feminino', 'Outro']

const TIPO_LABELS = {
  receita: 'Receita',
  atestado: 'Atestado',
  declaracao: 'Declaração',
  solicitacao_exame: 'Solicitação de Exame',
  encaminhamento: 'Encaminhamento',
}

function useFavoritos(tipo) {
  const KEY = `c4_fav_${tipo}`
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
  })
  function toggle(id) {
    setFavs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(KEY, JSON.stringify([...next]))
      return next
    })
  }
  return { favs, toggle }
}

function AlertasSaude({ detalhe }) {
  const texto = [detalhe.observacoes, detalhe.anamnese_resumo].filter(Boolean).join(' ').toLowerCase()
  const alertas = []
  if (/hipertens|pressão alta|hta\b/.test(texto)) alertas.push({ label: 'Hipertensão', color: L.red, bg: L.redBg, icon: '❤️' })
  if (/diabet/.test(texto)) alertas.push({ label: 'Diabetes', color: L.orange, bg: L.orangeBg, icon: '🩸' })
  if (/alergi/.test(texto)) alertas.push({ label: 'Alergias', color: L.purple, bg: L.purpleBg, icon: '⚠️' })
  if (/asma|bronquit/.test(texto)) alertas.push({ label: 'Asma', color: L.blue, bg: L.blueBg, icon: '�ac1' })
  if (/cardí|cardio|coração|arritmia/.test(texto)) alertas.push({ label: 'Cardíaco', color: L.red, bg: L.redBg, icon: '💓' })
  if (/gestante|grávid|gravidez/.test(texto)) alertas.push({ label: 'Gestante', color: L.purple, bg: L.purpleBg, icon: '🤰' })
  if (/anticoagul|warfarina|heparin/.test(texto)) alertas.push({ label: 'Anticoagulante', color: L.orange, bg: L.orangeBg, icon: '💊' })
  if (alertas.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: L.t4, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>ALERTAS DE SAÚDE</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {alertas.map(a => (
          <span key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: a.bg, color: a.color, border: `1px solid ${a.color}30` }}>
            {a.icon} {a.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'in 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-wrap" style={{ background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: wide ? 900 : 560, maxHeight: '90vh', overflowY: 'auto', animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0, background: L.bg, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, padding: '0 4px' }}>×</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>{label}</label>
      {children}
    </div>
  )
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${L.line}`, padding: '0 24px', background: L.bg, position: 'sticky', top: 57, zIndex: 1 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ padding: '12px 16px', fontSize: 13, fontWeight: active === t.id ? 600 : 400, color: active === t.id ? L.teal : L.t3, borderBottom: active === t.id ? `3px solid ${L.teal}` : '3px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function DadosPessoaisTab({ detalhe, onEditar, onInativar }) {
  const calcIdade = dn => {
    if (!dn) return '—'
    const diff = Date.now() - new Date(dn).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' anos'
  }
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AlertasSaude detalhe={detalhe} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', background: L.tealBg, borderRadius: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: L.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.white, fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
          {detalhe.nome[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: L.t1 }}>{detalhe.nome}</div>
          <div style={{ fontSize: 13, color: L.teal }}>{detalhe.convenios?.nome || 'Particular'}</div>
        </div>
      </div>
      {[['CPF', detalhe.cpf], ['Nascimento', detalhe.data_nascimento ? new Date(detalhe.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') + ' (' + calcIdade(detalhe.data_nascimento) + ')' : null], ['Sexo', detalhe.sexo], ['Telefone', detalhe.telefone], ['E-mail', detalhe.email], ['Carteirinha', detalhe.numero_carteirinha], ['Endereço', [detalhe.endereco, detalhe.cidade, detalhe.estado].filter(Boolean).join(', ')]].filter(([, v]) => v).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${L.lineSoft}` }}>
          <div style={{ fontSize: 11, color: L.t4, width: 100, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{k}</div>
          <div style={{ fontSize: 13, color: L.t1 }}>{v}</div>
        </div>
      ))}
      {detalhe.observacoes && (
        <div style={{ padding: '12px', background: L.yellowBg, borderRadius: 8, border: `1px solid ${L.yellowBd}` }}>
          <div style={{ fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>OBSERVAÇÕES</div>
          <div style={{ fontSize: 13, color: L.t2 }}>{detalhe.observacoes}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onEditar} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: L.tealBg, color: L.teal, fontWeight: 600, fontSize: 13 }}>Editar</button>
        <button onClick={onInativar} style={{ padding: '10px 16px', borderRadius: 8, background: L.redBg, color: L.red, fontSize: 13 }}>Inativar</button>
      </div>
    </div>
  )
}

function ProntuarioTab({ detalhe }) {
  const [consultas, setConsultas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedConsulta, setExpandedConsulta] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('consultas').select('*, medicos(nome)').eq('paciente_id', detalhe.id).order('data_hora', { ascending: false }).limit(50)
      if (!cancelled) { setConsultas(data || []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [detalhe.id])

  const fmt = iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  const fmtBRL = v => v != null ? 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') : null

  function handlePrint() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prontuário - ${detalhe.nome}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:24px}h3{font-size:12px;margin:12px 0 4px}.row{display:flex;gap:16px;margin-bottom:4px}.label{font-size:10px;color:#666;width:120px;flex-shrink:0}.card{border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:12px}.card-header{font-weight:bold;margin-bottom:8px}@media print{body{margin:0}}</style></head><body><h1>Prontuário Médico</h1><div class="row"><span class="label">Paciente:</span><span>${detalhe.nome}</span></div><div class="row"><span class="label">CPF:</span><span>${detalhe.cpf || '—'}</span></div><div class="row"><span class="label">Convênio:</span><span>${detalhe.convenios?.nome || 'Particular'}</span></div><h2>Consultas</h2>${(consultas || []).slice().reverse().map(c => `<div class="card"><div class="card-header">${fmt(c.data_hora)} — ${c.medicos?.nome || '—'} ${c.cid_principal ? '| CID: ' + c.cid_principal : ''}</div>${c.queixa_principal ? `<div class="row"><span class="label">Queixa:</span><span>${c.queixa_principal}</span></div>` : ''}${c.conduta ? `<div class="row"><span class="label">Conduta:</span><span>${c.conduta}</span></div>` : ''}</div>`).join('')}</body></html>`
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); w.print()
  }

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center' }}><div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /></div>

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={handlePrint} style={{ padding: '8px 16px', borderRadius: 8, background: L.tealBg, color: L.teal, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>🖸 Imprimir Prontuário</button>
      </div>
      {consultas.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: '32px 0' }}>Nenhuma consulta registrada</div>
      ) : consultas.map(c => {
        const isOpen = expandedConsulta === c.id
        return (
          <div key={c.id} style={{ border: `1px solid ${L.line}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setExpandedConsulta(isOpen ? null : c.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isOpen ? L.tealBg : L.surface, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: L.t3 }}>{fmt(c.data_hora)}</span>
                <span style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{c.medicos?.nome || '—'}</span>
                {c.cid_principal && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: L.hover, color: L.t3, fontFamily: "'JetBrains Mono', monospace" }}>CID {c.cid_principal}</span>}
                {fmtBRL(c.valor) && <span style={{ fontSize: 12, color: L.t3 }}>{fmtBRL(c.valor)}</span>}
              </div>
              <span style={{ color: L.t4, fontSize: 16, marginLeft: 12 }}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '16px', borderTop: `1px solid ${L.lineSoft}` }}>
                {[['Queixa Principal', c.queixa_principal], ['Anamnese', c.anamnese], ['Exame Físico', c.exame_fisico], ['Hipótese Diagnóstica', c.hipotese_diagnostica], ['CID Principal', c.cid_principal], ['Conduta', c.conduta], ['Prescrição', c.prescricao]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${L.lineSoft}` }}>
                    <div style={{ fontSize: 11, color: L.t4, width: 140, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{k}</div>
                    <div style={{ fontSize: 13, color: L.t1, whiteSpace: 'pre-wrap' }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TriagensTab({ detalhe }) {
  const [triagens, setTriagens] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comparar, setComparar] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('triagem').select('*, usuarios(nome)').eq('paciente_id', detalhe.id).order('criado_em', { ascending: false }).limit(20)
      if (!cancelled) { setTriagens(data || []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [detalhe.id])

  const fmt = iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  const parsePAS = pa => { if (!pa) return null; const m = String(pa).match(/(\d+)/); return m ? parseInt(m[1]) : null }
  const isCritical = t => { const pas = parsePAS(t.pressao_arterial); return (pas && pas > 160) || (t.saturacao_o2 != null && Number(t.saturacao_o2) < 95) }

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center' }}><div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /></div>

  return (
    <div style={{ padding: '20px 24px' }}>
      {triagens.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: '32px 0' }}>Nenhuma triagem registrada</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setComparar(c => !c)} style={{ padding: '6px 12px', borderRadius: 8, background: comparar ? L.teal : L.hover, color: comparar ? L.white : L.t2, fontSize: 12 }}>
              {comparar ? '◉ Comparando' : '⇔ Comparar'}
            </button>
          </div>
          {comparar ? (
            <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${Math.min(3, triagens.length)}, 1fr)`, gap: 0, border: `1px solid ${L.line}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: L.surface, padding: '10px 12px', fontWeight: 600, fontSize: 12, color: L.t3, borderRight: `1px solid ${L.line}` }}>CAMPO</div>
              {triagens.slice(0, 3).map((t, i) => (
                <div key={t.id} style={{ background: i === 0 ? L.tealBg : L.surface, padding: '10px 12px', fontWeight: 600, fontSize: 11, color: i === 0 ? L.teal : L.t2, borderRight: `1px solid ${L.line}`, textAlign: 'center' }}>
                  {new Date(t.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  {i === 0 && <div style={{ fontSize: 9, color: L.teal }}>MAIS RECENTE</div>}
                </div>
              ))}
              {[['Pressão', t => t.pressao_arterial || (t.pressao_sistolica && t.pressao_diastolica ? `${t.pressao_sistolica}/${t.pressao_diastolica}` : '—'), t => { const p = parsePAS(t.pressao_arterial) || t.pressao_sistolica; return p >= 140 ? L.red : null }], ['FC (bpm)', t => t.frequencia_cardiaca ? `${t.frequencia_cardiaca} bpm` : (t.freq_cardiaca || '—'), null], ['SpO₂', t => t.saturacao_o2 != null ? `${t.saturacao_o2}%` : '—', t => t.saturacao_o2 != null && t.saturacao_o2 < 95 ? L.red : null], ['Temp.', t => t.temperatura ? `${t.temperatura}°C` : '—', t => t.temperatura > 37.5 ? L.orange : null], ['Peso', t => t.peso ? `${t.peso} kg` : '—', null], ['Glicemia', t => t.glicemia ? `${t.glicemia} mg/dL` : '—', t => t.glicemia > 125 ? L.orange : null]].map(([label, fn, alertFn]) => (
                <React.Fragment key={label}>
                  <div style={{ padding: '9px 12px', fontSize: 12, color: L.t3, borderRight: `1px solid ${L.line}`, borderTop: `1px solid ${L.lineSoft}`, background: L.surface }}>{label}</div>
                  {triagens.slice(0, 3).map((t, i) => {
                    const val = fn(t)
                    const alertColor = alertFn ? alertFn(t) : null
                    return (
                      <div key={t.id} style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: alertColor || (i === 0 ? L.t1 : L.t3), borderRight: `1px solid ${L.line}`, borderTop: `1px solid ${L.lineSoft}`, textAlign: 'center', background: alertColor ? alertColor + '12' : 'transparent' }}>{val}</div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: L.surface }}>
                    {['Data', 'Peso', 'Altura', 'PA', 'FC', 'Temp.', 'SpO₂', 'Dor', 'Profissional'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {triagens.map(t => {
                    const crit = isCritical(t)
                    const pas = parsePAS(t.pressao_arterial)
                    const paCrit = pas && pas > 160
                    const o2Crit = t.saturacao_o2 != null && Number(t.saturacao_o2) < 95
                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${L.lineSoft}`, background: crit ? '#fff5f5' : 'transparent' }}>
                        <td style={{ padding: '10px', color: L.t2, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmt(t.criado_em)}</td>
                        <td style={{ padding: '10px', color: L.t1 }}>{t.peso ? t.peso + ' kg' : '—'}</td>
                        <td style={{ padding: '10px', color: L.t1 }}>{t.altura ? t.altura + ' cm' : '—'}</td>
                        <td style={{ padding: '10px', color: paCrit ? L.red : L.t1, fontWeight: paCrit ? 700 : 400 }}>{t.pressao_arterial || '—'}</td>
                        <td style={{ padding: '10px', color: L.t1 }}>{t.frequencia_cardiaca ? t.frequencia_cardiaca + ' bpm' : '—'}</td>
                        <td style={{ padding: '10px', color: L.t1 }}>{t.temperatura ? t.temperatura + '°C' : '—'}</td>
                        <td style={{ padding: '10px', color: o2Crit ? L.red : L.t1, fontWeight: o2Crit ? 700 : 400 }}>{t.saturacao_o2 != null ? t.saturacao_o2 + '%' : '—'}</td>
                        <td style={{ padding: '10px', color: L.t1 }}>{t.escala_dor != null ? t.escala_dor + '/10' : '—'}</td>
                        <td style={{ padding: '10px', color: L.t3, fontSize: 11 }}>{t.usuarios?.nome || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EvolutionTab({ detalhe }) {
  const [triagens, setTriagens] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('triagens').select('criado_em, peso, altura, pressao_sistolica, pressao_diastolica, freq_cardiaca, saturacao_o2, temperatura').eq('paciente_id', detalhe.id).order('criado_em', { ascending: true }).limit(24)
      if (!cancelled) { setTriagens(data || []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [detalhe.id])

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center' }}><div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /></div>
  if (!triagens || triagens.length === 0) return <div style={{ padding: '40px 0', textAlign: 'center', color: L.t4, fontSize: 13 }}>Nenhuma triagem registrada para gerar gráficos.</div>

  function calcIMC(peso, altura) {
    if (!peso || !altura) return null
    const h = Number(altura) / 100
    return (Number(peso) / (h * h)).toFixed(1)
  }

  const chartData = triagens.map(t => ({
    data: new Date(t.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: t.peso ? Number(t.peso) : null,
    imc: t.peso && t.altura ? Number(calcIMC(t.peso, t.altura)) : null,
    pas: t.pressao_sistolica,
    pad: t.pressao_diastolica,
    fc: t.freq_cardiaca,
    spo2: t.saturacao_o2,
  }))

  const latestIMC = chartData.filter(d => d.imc).slice(-1)[0]?.imc
  const imcLabel = latestIMC == null ? '—' : latestIMC < 18.5 ? 'Abaixo do peso' : latestIMC < 25 ? 'Normal' : latestIMC < 30 ? 'Sobrepeso' : 'Obesidade'
  const imcColor = latestIMC == null ? L.t3 : latestIMC < 18.5 ? L.blue : latestIMC < 25 ? L.green : latestIMC < 30 ? L.yellow : L.red

  const ChartBox = ({ title, children }) => (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: L.t1, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ padding: '20px 24px' }}>
      {latestIMC && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '14px 18px', flex: 1 }}>
            <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>IMC ATUAL</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: imcColor }}>{latestIMC}</div>
            <div style={{ fontSize: 12, color: imcColor }}>{imcLabel}</div>
          </div>
          <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '14px 18px', flex: 1 }}>
            <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>PESO ATUAL</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: L.t1 }}>{triagens.slice(-1)[0]?.peso || '—'} <span style={{ fontSize: 14, color: L.t3 }}>kg</span></div>
          </div>
          <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '14px 18px', flex: 1 }}>
            <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>TRIAGENS</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: L.t1 }}>{triagens.length}</div>
            <div style={{ fontSize: 12, color: L.t3 }}>registros</div>
          </div>
        </div>
      )}
      <ChartBox title="Peso (kg) e IMC">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
            <XAxis dataKey="data" tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="peso" stroke={L.teal} strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" connectNulls />
            <Line type="monotone" dataKey="imc" stroke={L.orange} strokeWidth={2} dot={{ r: 3 }} name="IMC" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title="Pressão Arterial (mmHg)">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
            <XAxis dataKey="data" tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} domain={[60, 'auto']} />
            <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="pas" stroke={L.red} strokeWidth={2} dot={{ r: 3 }} name="Sistólica" connectNulls />
            <Line type="monotone" dataKey="pad" stroke={L.blue} strokeWidth={2} dot={{ r: 3 }} name="Diastólica" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title="SpO₂ (%) e FC (bpm)">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={L.line} vertical={false} />
            <XAxis dataKey="data" tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: L.t4 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="spo2" stroke={L.blue} strokeWidth={2} dot={{ r: 3 }} name="SpO₂ (%)" connectNulls />
            <Line type="monotone" dataKey="fc" stroke={L.purple} strokeWidth={2} dot={{ r: 3 }} name="FC (bpm)" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  )
}

function DocumentosTab({ detalhe }) {
  const [documentos, setDocumentos] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('documentos_medicos').select('*, medicos(nome)').eq('paciente_id', detalhe.id).order('criado_em', { ascending: false }).limit(30)
      if (!cancelled) { setDocumentos(data || []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [detalhe.id])

  const tipoCor = { receita: { bg: '#e8f5e9', color: '#2e7d32' }, atestado: { bg: '#e3f2fd', color: '#1565c0' }, declaracao: { bg: '#f3e5f5', color: '#6a1b9a' }, solicitacao_exame: { bg: '#fff3e0', color: '#e65100' }, encaminhamento: { bg: '#fce4ec', color: '#880e4f' } }

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center' }}><div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} /></div>

  return (
    <div style={{ padding: '20px 24px' }}>
      {documentos.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: '32px 0' }}>Nenhum documento registrado</div>
      ) : documentos.map(d => {
        const cor = tipoCor[d.tipo] || { bg: L.hover, color: L.t2 }
        return (
          <div key={d.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid ${L.lineSoft}` }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cor.bg, color: cor.color, flexShrink: 0, marginTop: 2 }}>{TIPO_LABELS[d.tipo] || d.tipo || 'Documento'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{d.criado_em ? new Date(d.criado_em).toLocaleDateString('pt-BR') : '—'}</span>
                {d.medicos?.nome && <span style={{ fontSize: 12, color: L.t3 }}>{d.medicos.nome}</span>}
              </div>
              {d.descricao && <div style={{ fontSize: 13, color: L.t1, whiteSpace: 'pre-wrap' }}>{d.descricao}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetalhePacienteModal({ detalhe, onClose, onEditar, onInativar, profile }) {
  const [tab, setTab] = useState('dados')
  const TABS = [
    { id: 'dados', label: 'Dados Pessoais' },
    { id: 'prontuario', label: 'Prontuário' },
    { id: 'triagens', label: 'Triagens' },
    { id: 'evolucao', label: 'Evolução' },
    { id: 'documentos', label: 'Documentos' },
  ]

  function handlePrintCompleto() {
    Promise.all([
      supabase.from('consultas').select('*, medicos(nome)').eq('paciente_id', detalhe.id).order('data_hora', { ascending: true }).limit(50),
      supabase.from('triagem').select('*, usuarios(nome)').eq('paciente_id', detalhe.id).order('criado_em', { ascending: true }).limit(20),
      supabase.from('documentos_medicos').select('*, medicos(nome)').eq('paciente_id', detalhe.id).order('criado_em', { ascending: true }).limit(30),
    ]).then(([{ data: consultas }, { data: triagens }, { data: docs }]) => {
      const clinicaNome = profile?.clinicas?.nome || 'Clínica'
      const fmtDt = iso => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
      const fmtD = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
      const calcIdade = dn => { if (!dn) return ''; const diff = Date.now() - new Date(dn).getTime(); return ' (' + Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' anos)' }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prontuário - ${detalhe.nome}</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}.clinic{font-size:16px;font-weight:bold;margin-bottom:2px}.subtitle{font-size:11px;color:#555;margin-bottom:16px}h2{font-size:13px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:3px;margin:20px 0 10px;text-transform:uppercase}.row{display:flex;gap:16px;margin-bottom:4px}.label{font-size:10px;color:#555;width:130px;flex-shrink:0}.card{border:1px solid #ddd;border-radius:4px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid}.card-title{font-weight:bold;margin-bottom:6px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}th{padding:5px 8px;text-align:left;background:#f5f5f5;border:1px solid #ddd;font-size:10px}td{padding:5px 8px;border:1px solid #ddd;vertical-align:top}@media print{body{margin:0}}</style></head><body><div class="clinic">${clinicaNome}</div><div class="subtitle">Prontuário Médico — Emitido em ${new Date().toLocaleDateString('pt-BR')}</div><h2>Identificação</h2><div class="row"><span class="label">Nome:</span><span>${detalhe.nome}</span></div><div class="row"><span class="label">CPF:</span><span>${detalhe.cpf || '—'}</span></div><div class="row"><span class="label">Nascimento:</span><span>${detalhe.data_nascimento ? fmtD(detalhe.data_nascimento + 'T00:00:00') + calcIdade(detalhe.data_nascimento) : '—'}</span></div><div class="row"><span class="label">Convênio:</span><span>${detalhe.convenios?.nome || 'Particular'}</span></div>${consultas?.length ? `<h2>Consultas (${consultas.length})</h2>${consultas.map(c => `<div class="card"><div class="card-title">${fmtDt(c.data_hora)} — Dr(a). ${c.medicos?.nome || '—'}</div>${c.queixa_principal ? `<div class="row"><span class="label">Queixa:</span><span>${c.queixa_principal}</span></div>` : ''}${c.conduta ? `<div class="row"><span class="label">Conduta:</span><span>${c.conduta}</span></div>` : ''}</div>`).join('')}` : ''}${triagens?.length ? `<h2>Triagens (${triagens.length})</h2><table><thead><tr><th>Data</th><th>Peso</th><th>PA</th><th>FC</th><th>SpO₂</th><th>Profissional</th></tr></thead><tbody>${triagens.map(t => `<tr><td>${fmtDt(t.criado_em)}</td><td>${t.peso ? t.peso + ' kg' : '—'}</td><td>${t.pressao_arterial || '—'}</td><td>${t.frequencia_cardiaca ? t.frequencia_cardiaca + ' bpm' : '—'}</td><td>${t.saturacao_o2 != null ? t.saturacao_o2 + '%' : '—'}</td><td>${t.usuarios?.nome || '—'}</td></tr>`).join('')}</tbody></table>` : ''}</body></html>`
      const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); w.print()
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${L.line}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>Ficha do Paciente</div>
            <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>{detalhe.nome}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handlePrintCompleto} style={{ padding: '7px 14px', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>🖸 Prontuário Completo</button>
            <button onClick={onClose} style={{ fontSize: 20, color: L.t3, padding: '0 4px' }}>×</button>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}><TabBar tabs={TABS} active={tab} onChange={setTab} /></div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'dados' && <DadosPessoaisTab detalhe={detalhe} onEditar={onEditar} onInativar={onInativar} />}
          {tab === 'prontuario' && <ProntuarioTab detalhe={detalhe} />}
          {tab === 'triagens' && <TriagensTab detalhe={detalhe} />}
          {tab === 'evolucao' && <EvolutionTab detalhe={detalhe} />}
          {tab === 'documentos' && <DocumentosTab detalhe={detalhe} />}
        </div>
      </div>
    </div>
  )
}

export default function PagePacientes({ profile }) {
  const [pacientes, setPacientes] = useState([])
  const [convenios, setConvenios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [detalhe, setDetalhe] = useState(null)
  const [proximasConsultas, setProximasConsultas] = useState({})
  const { favs: favPacs, toggle: toggleFavPac } = useFavoritos('pacientes')

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [pacs, convs] = await Promise.all([
      supabase.from('pacientes').select('*, convenios(nome)').eq('clinica_id', clinicaId).eq('ativo', true).order('nome'),
      supabase.from('convenios').select('id, nome').eq('clinica_id', clinicaId).eq('ativo', true)
    ])
    setPacientes(pacs.data || [])
    setConvenios(convs.data || [])
    setLoading(false)
    loadProximasConsultas(pacs.data)
  }

  async function loadProximasConsultas(pacs) {
    if (!pacs || pacs.length === 0) return
    const agora = new Date().toISOString()
    const { data } = await supabase.from('agendamentos').select('paciente_id, data_hora').eq('clinica_id', clinicaId).gte('data_hora', agora).in('status', ['agendado', 'confirmado']).order('data_hora', { ascending: true })
    const mapa = {}
    ;(data || []).forEach(ag => { if (!mapa[ag.paciente_id]) mapa[ag.paciente_id] = ag.data_hora })
    setProximasConsultas(mapa)
  }

  function abrirNovo() { setForm({ clinica_id: clinicaId, ativo: true }); setModal('novo') }
  function abrirEditar(p) { setForm({ ...p }); setModal('editar') }

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

  const sortedPacientes = [...filtrados].sort((a, b) => {
    const aFav = favPacs.has(a.id) ? -1 : 0
    const bFav = favPacs.has(b.id) ? -1 : 0
    return aFav - bFav
  })

  const calcIdade = dn => {
    if (!dn) return '—'
    const diff = Date.now() - new Date(dn).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' anos'
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Buscar por nome, CPF ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, maxWidth: 360, padding: '9px 14px', fontSize: 13, border: `1.5px solid ${L.line}`, borderRadius: 8, background: L.bg, color: L.t1, outline: 'none' }}
          onFocus={e => e.target.style.borderColor = L.teal}
          onBlur={e => e.target.style.borderColor = L.line}
        />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''}</div>
        <button onClick={abrirNovo} style={{ padding: '9px 18px', background: L.teal, color: L.white, borderRadius: 8, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>+ Novo Paciente</button>
      </div>

      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 120px 120px 1fr 140px 80px', padding: '10px 16px', fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', borderBottom: `1px solid ${L.line}`, background: L.surface }}>
          <span></span><span>PACIENTE</span><span>CPF</span><span>IDADE</span><span>CONTATO</span><span>PRÓX. CONSULTA</span><span>AÇÕES</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : sortedPacientes.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            {busca ? 'Nenhum resultado para a busca' : 'Nenhum paciente cadastrado'}
          </div>
        ) : sortedPacientes.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 120px 120px 1fr 140px 80px', padding: '12px 16px', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = L.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={e => { e.stopPropagation(); toggleFavPac(p.id) }} style={{ fontSize: 14, color: favPacs.has(p.id) ? L.yellow : L.t5, padding: '0 2px', flexShrink: 0 }} title={favPacs.has(p.id) ? 'Remover favorito' : 'Adicionar favorito'}>★</button>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: L.t1 }}>{p.nome}</div>
              <div style={{ fontSize: 11, color: L.t4, marginTop: 1 }}>{p.convenios?.nome || 'Particular'}</div>
            </div>
            <span style={{ color: L.t2, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{p.cpf || '—'}</span>
            <span style={{ color: L.t2 }}>{calcIdade(p.data_nascimento)}</span>
            <div>
              <div style={{ color: L.t2 }}>{p.telefone || '—'}</div>
              <div style={{ fontSize: 11, color: L.t4 }}>{p.email || ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {proximasConsultas[p.id] ? (
                <span style={{ fontSize: 11, color: L.teal, fontFamily: "'JetBrains Mono', monospace" }}>
                  📅 {new Date(proximasConsultas[p.id]).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}{new Date(proximasConsultas[p.id]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: L.t5 }}>—</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setDetalhe(p)} style={{ padding: '5px 8px', borderRadius: 6, background: L.tealBg, color: L.teal, fontSize: 12, fontWeight: 500 }} title="Ver detalhes">👁</button>
              <button onClick={() => abrirEditar(p)} style={{ padding: '5px 8px', borderRadius: 6, background: L.hover, color: L.t2, fontSize: 12 }} title="Editar">✎</button>
            </div>
          </div>
        ))}
      </div>

      {(modal === 'novo' || modal === 'editar') && (
        <Modal title={modal === 'novo' ? 'Novo Paciente' : 'Editar Paciente'} onClose={() => setModal(null)}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="NOME COMPLETO *"><input style={inp} value={form.nome || ''} placeholder="Nome do paciente" onChange={e => setForm({ ...form, nome: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="CPF"><input style={inp} value={form.cpf || ''} placeholder="000.000.000-00" onChange={e => setForm({ ...form, cpf: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
              <Field label="DATA DE NASCIMENTO"><input style={inp} type="date" value={form.data_nascimento || ''} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SEXO"><select style={{ ...inp, appearance: 'none' }} value={form.sexo || ''} onChange={e => setForm({ ...form, sexo: e.target.value })}><option value="">Selecione</option>{SEXOS.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="TELEFONE"><input style={inp} value={form.telefone || ''} placeholder="(00) 00000-0000" onChange={e => setForm({ ...form, telefone: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            </div>
            <Field label="E-MAIL"><input style={inp} type="email" value={form.email || ''} placeholder="paciente@email.com" onChange={e => setForm({ ...form, email: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <Field label="CONVÊNIO"><select style={{ ...inp, appearance: 'none' }} value={form.convenio_id || ''} onChange={e => setForm({ ...form, convenio_id: e.target.value })}><option value="">Particular</option>{convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
            <Field label="Nº CARTEIRINHA"><input style={inp} value={form.numero_carteirinha || ''} placeholder="Número da carteirinha" onChange={e => setForm({ ...form, numero_carteirinha: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <Field label="ENDEREÇO"><input style={inp} value={form.endereco || ''} placeholder="Rua, número, bairro" onChange={e => setForm({ ...form, endereco: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
              <Field label="CIDADE"><input style={inp} value={form.cidade || ''} placeholder="Cidade" onChange={e => setForm({ ...form, cidade: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
              <Field label="UF"><input style={inp} value={form.estado || ''} placeholder="SP" maxLength={2} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            </div>
            <Field label="OBSERVAÇÕES"><textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.observacoes || ''} placeholder="Alergias, observações clínicas..." onChange={e => setForm({ ...form, observacoes: e.target.value })} onFocus={e => e.target.style.borderColor = L.teal} onBlur={e => e.target.style.borderColor = L.line} /></Field>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontWeight: 500, fontSize: 13 }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.nome} style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal, color: L.white, fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar Paciente'}</button>
            </div>
          </div>
        </Modal>
      )}

      {detalhe && (
        <DetalhePacienteModal
          detalhe={detalhe}
          profile={profile}
          onClose={() => setDetalhe(null)}
          onEditar={() => { setDetalhe(null); abrirEditar(detalhe) }}
          onInativar={() => { inativar(detalhe.id); setDetalhe(null) }}
        />
      )}
    </div>
  )
}
