import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function calcIdade(dn) {
  if (!dn) return null
  const diff = Date.now() - new Date(dn + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function stripPhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

function buildWaLink(phone, text) {
  const digits = stripPhone(phone)
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`
}

function fillTemplate(conteudo, vars) {
  return (conteudo || '')
    .replace(/\{\{PACIENTE_NOME\}\}/g, vars.pacienteNome || '')
    .replace(/\{\{DATA_HORA\}\}/g, vars.dataHora || '')
    .replace(/\{\{CLINICA_NOME\}\}/g, vars.clinicaNome || '')
    .replace(/\{\{TELEFONE\}\}/g, vars.telefone || '')
}

// ─── shared components ───────────────────────────────────────────────────────

const inp = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  border: `1.5px solid ${L.line}`,
  borderRadius: 8,
  background: L.bg,
  color: L.t1,
  outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ width: 20, height: 20, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  )
}

function Badge({ color, bg, bd, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: color, border: `1px solid ${bd || color + '30'}` }}>
      {children}
    </span>
  )
}

const TIPO_META = {
  lembrete_consulta: { label: 'Lembrete',   color: L.blue,   bg: L.blueBg   },
  aniversario:       { label: 'Aniversário', color: L.purple, bg: L.purpleBg },
  aviso:             { label: 'Aviso',       color: L.teal,   bg: L.tealBg   },
  cobranca:          { label: 'Cobrança',    color: L.orange, bg: L.orangeBg },
  resultado:         { label: 'Resultado',   color: L.green,  bg: L.greenBg  },
}

const CANAL_META = {
  whatsapp: { label: 'WhatsApp', color: L.green,  bg: L.greenBg,  bd: L.greenBd  },
  sms:      { label: 'SMS',      color: L.blue,   bg: L.blueBg,   bd: L.blueBd   },
}

function TipoBadge({ tipo }) {
  const m = TIPO_META[tipo] || { label: tipo, color: L.t3, bg: L.hover }
  return <Badge color={m.color} bg={m.bg}>{m.label}</Badge>
}

function CanalBadge({ canal }) {
  const m = CANAL_META[canal] || { label: canal, color: L.t3, bg: L.hover }
  return <Badge color={m.color} bg={m.bg} bd={m.bd}>{m.label}</Badge>
}

// ─── bottom-sheet modal ───────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'in 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0, background: L.bg, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

// ─── Tab 1: Enviar Mensagens ──────────────────────────────────────────────────

function TabEnviar({ profile }) {
  const clinicaId = profile?.clinica_id
  const clinicaNome = profile?.clinicas?.nome || 'Clínica'

  // WABA status
  const [wabaAtivo, setWabaAtivo] = useState(false)

  // lembretes section
  const [lembretesDia, setLembretesDia] = useState(null)
  const [loadingLembretes, setLoadingLembretes] = useState(false)
  const [lembreteMode, setLembreteMode] = useState(null) // 'hoje' | 'amanha'
  const [sendingId, setSendingId] = useState(null)
  const [resultMap, setResultMap] = useState({}) // id → { ok, via }

  // individual section
  const [busca, setBusca] = useState('')
  const [buscaResultados, setBuscaResultados] = useState([])
  const [buscaLoading, setBuscaLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [pacienteSel, setPacienteSel] = useState(null)
  const [proximaConsulta, setProximaConsulta] = useState(null)
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [indResult, setIndResult] = useState(null) // { ok, via, msg? }
  const [savingInd, setSavingInd] = useState(false)
  const buscaRef = useRef(null)
  const dropdownRef = useRef(null)

  // Load WABA status
  useEffect(() => {
    if (!clinicaId) return
    supabase.from('integracoes_config')
      .select('ativo')
      .eq('clinica_id', clinicaId)
      .eq('tipo', 'whatsapp')
      .single()
      .then(({ data }) => setWabaAtivo(data?.ativo === true))
  }, [clinicaId])

  // Helper: insert pending record then send via API
  async function sendViaApi(phone, message, pacienteId, tplId, canal) {
    const { data: msg, error: insErr } = await supabase.from('mensagens_pacientes').insert({
      clinica_id:  clinicaId,
      paciente_id: pacienteId,
      template_id: tplId || null,
      canal:       canal || 'whatsapp',
      conteudo:    message,
      status:      'pendente',
      usuario_id:  profile?.id || null,
      enviado_api: true,
    }).select().single()
    if (insErr) throw insErr

    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: { action: 'send', phone, message, mensagem_id: msg.id },
    })
    if (error || data?.error) throw new Error(data?.error || error.message)
    return data // { success, wamid }
  }

  useEffect(() => {
    if (!clinicaId) return
    supabase.from('templates_mensagem').select('id, nome, tipo, canal, conteudo').eq('clinica_id', clinicaId).eq('ativo', true).order('nome')
      .then(({ data }) => setTemplates(data || []))
  }, [clinicaId])

  // search patients
  useEffect(() => {
    if (!busca.trim() || busca.length < 2) { setBuscaResultados([]); setShowDropdown(false); return }
    let cancelled = false
    setBuscaLoading(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('pacientes').select('id, nome, telefone, data_nascimento').eq('clinica_id', clinicaId).ilike('nome', `%${busca}%`).limit(8)
      if (!cancelled) { setBuscaResultados(data || []); setShowDropdown(true); setBuscaLoading(false) }
    }, 280)
    return () => { cancelled = true; clearTimeout(t) }
  }, [busca, clinicaId])

  // close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && buscaRef.current && !buscaRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function selectPaciente(p) {
    setPacienteSel(p)
    setBusca(p.nome)
    setShowDropdown(false)
    // load próxima consulta
    const now = new Date().toISOString()
    const { data } = await supabase.from('agendamentos').select('data_hora, tipo').eq('clinica_id', clinicaId).eq('paciente_id', p.id).neq('status', 'cancelado').gte('data_hora', now).order('data_hora', { ascending: true }).limit(1)
    setProximaConsulta(data?.[0] || null)
  }

  async function loadLembretes(mode) {
    setLembreteMode(mode)
    setLoadingLembretes(true)
    const now = new Date()
    const target = new Date(now)
    if (mode === 'amanha') target.setDate(target.getDate() + 1)
    const start = new Date(target); start.setHours(0, 0, 0, 0)
    const end = new Date(target); end.setHours(23, 59, 59, 999)
    const { data } = await supabase
      .from('agendamentos')
      .select('id, data_hora, tipo, paciente_id, pacientes(id, nome, telefone, data_nascimento)')
      .eq('clinica_id', clinicaId)
      .neq('status', 'cancelado')
      .gte('data_hora', start.toISOString())
      .lte('data_hora', end.toISOString())
      .order('data_hora', { ascending: true })
    setLembretesDia(data || [])
    setLoadingLembretes(false)
  }

  async function copiarLembrete(ag) {
    const paciente = ag.pacientes
    if (!paciente || sendingId === ag.id) return
    const texto = fillTemplate(
      'Olá, {{PACIENTE_NOME}}! Lembramos que você tem consulta agendada para {{DATA_HORA}}. Por favor, confirme sua presença respondendo esta mensagem. Em caso de impossibilidade, entre em contato com antecedência. — {{CLINICA_NOME}}',
      { pacienteNome: paciente.nome, dataHora: fmtDt(ag.data_hora), clinicaNome, telefone: paciente.telefone || '' }
    )

    setSendingId(ag.id)
    setResultMap(m => ({ ...m, [ag.id]: null }))

    if (wabaAtivo && paciente.telefone) {
      // Send via WhatsApp Business API
      try {
        await sendViaApi(paciente.telefone, texto, paciente.id, null, 'whatsapp')
        setResultMap(m => ({ ...m, [ag.id]: { ok: true, via: 'api' } }))
      } catch (e) {
        setResultMap(m => ({ ...m, [ag.id]: { ok: false, via: 'api', msg: e.message } }))
      }
    } else {
      // Fallback: clipboard + wa.me link
      try { await navigator.clipboard.writeText(texto) } catch { /* silent */ }
      if (paciente.telefone) window.open(buildWaLink(paciente.telefone, texto), '_blank', 'noopener')
      await supabase.from('mensagens_pacientes').insert({
        clinica_id: clinicaId, paciente_id: paciente.id,
        template_id: null, canal: 'whatsapp', conteudo: texto,
        status: 'enviado', usuario_id: profile?.id || null,
      })
      setResultMap(m => ({ ...m, [ag.id]: { ok: true, via: 'web' } }))
    }

    setSendingId(null)
    setTimeout(() => setResultMap(m => { const n = { ...m }; delete n[ag.id]; return n }), 3000)
  }

  // individual send
  const selectedTemplate = templates.find(t => t.id === templateId) || null
  const previewText = selectedTemplate && pacienteSel
    ? fillTemplate(selectedTemplate.conteudo, {
        pacienteNome: pacienteSel.nome,
        dataHora: proximaConsulta ? fmtDt(proximaConsulta.data_hora) : 'a definir',
        clinicaNome,
        telefone: pacienteSel.telefone || '',
      })
    : ''

  async function enviarIndividual() {
    if (!previewText || savingInd) return
    setSavingInd(true)
    setIndResult(null)
    const canal = selectedTemplate?.canal || 'whatsapp'

    if (wabaAtivo && canal === 'whatsapp' && pacienteSel?.telefone) {
      try {
        await sendViaApi(pacienteSel.telefone, previewText, pacienteSel.id, templateId || null, canal)
        setIndResult({ ok: true, via: 'api' })
      } catch (e) {
        setIndResult({ ok: false, via: 'api', msg: e.message })
      }
    } else {
      try { await navigator.clipboard.writeText(previewText) } catch { /* silent */ }
      if (pacienteSel?.telefone) window.open(buildWaLink(pacienteSel.telefone, previewText), '_blank', 'noopener')
      await supabase.from('mensagens_pacientes').insert({
        clinica_id: clinicaId, paciente_id: pacienteSel.id,
        template_id: templateId || null, canal,
        conteudo: previewText, status: 'enviado', usuario_id: profile?.id || null,
      })
      setIndResult({ ok: true, via: 'web' })
    }
    setSavingInd(false)
    setTimeout(() => setIndResult(null), 4000)
  }

  async function copiarTexto() {
    try { await navigator.clipboard.writeText(previewText) } catch { /* silent */ }
  }

  const idade = pacienteSel?.data_nascimento ? calcIdade(pacienteSel.data_nascimento) : null

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Lembretes */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14 }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${L.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Lembretes de Consulta</div>
            {wabaAtivo
              ? <span style={{ fontSize: 11, fontWeight: 600, color: L.green, background: L.greenBg, padding: '3px 9px', borderRadius: 20, border: `1px solid ${L.greenBd}` }}>● API Ativa</span>
              : <span style={{ fontSize: 11, color: L.t4, background: L.surface, padding: '3px 9px', borderRadius: 20, border: `1px solid ${L.line}` }}>Web Link</span>
            }
          </div>
          <div style={{ fontSize: 12, color: L.t4 }}>
            {wabaAtivo
              ? 'Mensagens enviadas diretamente via WhatsApp Business API'
              : 'Envie lembretes abrindo o WhatsApp Web · Configure a API em Integrações para envio automático'}
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => loadLembretes('hoje')}
              style={{ padding: '9px 18px', borderRadius: 8, background: lembreteMode === 'hoje' ? L.teal : L.tealBg, color: lembreteMode === 'hoje' ? L.white : L.teal, fontWeight: 600, fontSize: 13, border: `1.5px solid ${lembreteMode === 'hoje' ? L.teal : L.teal + '40'}`, cursor: 'pointer' }}
            >
              📅 Consultas de Hoje
            </button>
            <button
              onClick={() => loadLembretes('amanha')}
              style={{ padding: '9px 18px', borderRadius: 8, background: lembreteMode === 'amanha' ? L.teal : L.tealBg, color: lembreteMode === 'amanha' ? L.white : L.teal, fontWeight: 600, fontSize: 13, border: `1.5px solid ${lembreteMode === 'amanha' ? L.teal : L.teal + '40'}`, cursor: 'pointer' }}
            >
              📅 Consultas de Amanhã
            </button>
          </div>

          {loadingLembretes && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Spinner /></div>
          )}

          {!loadingLembretes && lembretesDia !== null && lembretesDia.length === 0 && (
            <div style={{ textAlign: 'center', color: L.t4, fontSize: 13, padding: '20px 0' }}>
              Nenhuma consulta encontrada para {lembreteMode === 'hoje' ? 'hoje' : 'amanhã'}
            </div>
          )}

          {!loadingLembretes && lembretesDia && lembretesDia.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lembretesDia.map(ag => {
                const pac = ag.pacientes
                return (
                  <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: L.surface, borderRadius: 10, border: `1px solid ${L.line}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: L.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.white, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {(pac?.nome || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{pac?.nome || '—'}</div>
                      <div style={{ fontSize: 11, color: L.t4, marginTop: 2 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtDt(ag.data_hora)}</span>
                        {ag.tipo && <span style={{ marginLeft: 8 }}>{ag.tipo}</span>}
                        {pac?.telefone && <span style={{ marginLeft: 8 }}>{pac.telefone}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => copiarLembrete(ag)}
                        disabled={sendingId === ag.id}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12,
                          cursor: sendingId === ag.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s', border: 'none', whiteSpace: 'nowrap',
                          background: resultMap[ag.id]?.ok ? L.greenBg : sendingId === ag.id ? L.hover : L.teal,
                          color: resultMap[ag.id]?.ok ? L.green : sendingId === ag.id ? L.t3 : L.white,
                          opacity: sendingId === ag.id ? 0.7 : 1,
                        }}
                      >
                        {sendingId === ag.id
                          ? '⏳ Enviando...'
                          : resultMap[ag.id]?.ok
                            ? `✓ ${resultMap[ag.id].via === 'api' ? 'Enviado via API' : 'Copiado!'}`
                            : wabaAtivo
                              ? '📤 Enviar via API'
                              : '📋 Copiar Mensagem'}
                      </button>
                      {resultMap[ag.id] && !resultMap[ag.id].ok && (
                        <div style={{ fontSize: 10, color: L.red, maxWidth: 180, textAlign: 'right' }}>
                          {resultMap[ag.id].msg || 'Erro ao enviar'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Envio Individual */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14 }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${L.line}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 4 }}>Envio Individual</div>
          <div style={{ fontSize: 12, color: L.t4 }}>Busque um paciente e escolha um template para enviar</div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* patient search */}
            <Field label="BUSCAR PACIENTE">
              <div style={{ position: 'relative' }}>
                <input
                  ref={buscaRef}
                  style={{ ...inp, paddingRight: buscaLoading ? 36 : 12 }}
                  placeholder="Digite o nome do paciente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); if (pacienteSel && e.target.value !== pacienteSel.nome) { setPacienteSel(null); setProximaConsulta(null) } }}
                  onFocus={e => { e.target.style.borderColor = L.teal; if (buscaResultados.length > 0) setShowDropdown(true) }}
                  onBlur={e => e.target.style.borderColor = L.line}
                />
                {buscaLoading && (
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}><Spinner /></div>
                )}
                {showDropdown && buscaResultados.length > 0 && (
                  <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: L.bg, border: `1px solid ${L.line}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                    {buscaResultados.map(p => (
                      <button
                        key={p.id}
                        onMouseDown={e => { e.preventDefault(); selectPaciente(p) }}
                        style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${L.lineSoft}` }}
                        onMouseEnter={e => e.currentTarget.style.background = L.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{p.nome}</span>
                        <span style={{ fontSize: 11, color: L.t4 }}>{p.telefone || 'Sem telefone'}{p.data_nascimento ? ' · ' + calcIdade(p.data_nascimento) + ' anos' : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* patient info card */}
            {pacienteSel && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px', background: L.tealBg, borderRadius: 10, border: `1px solid ${L.teal}30` }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: L.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.white, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {pacienteSel.nome[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: L.t1, fontSize: 14 }}>{pacienteSel.nome}</div>
                  <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
                    {pacienteSel.telefone || 'Sem telefone'}
                    {idade != null && <span style={{ marginLeft: 10 }}>{idade} anos</span>}
                    {proximaConsulta && <span style={{ marginLeft: 10, color: L.teal }}>Próxima: {fmtDt(proximaConsulta.data_hora)}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* template selector */}
            <Field label="TEMPLATE DE MENSAGEM">
              <select
                style={{ ...inp, appearance: 'none' }}
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              >
                <option value="">Selecione um template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({TIPO_META[t.tipo]?.label || t.tipo})</option>
                ))}
              </select>
            </Field>

            {/* live preview */}
            {previewText && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>PRÉVIA DA MENSAGEM</label>
                <div style={{ padding: '12px 14px', background: L.surface, borderRadius: 8, border: `1px solid ${L.line}`, fontSize: 13, color: L.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {previewText}
                </div>
              </div>
            )}

            {/* action buttons */}
            {previewText && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={enviarIndividual}
                    disabled={savingInd}
                    style={{
                      flex: 2, padding: '9px 18px', borderRadius: 8, border: 'none',
                      fontWeight: 600, fontSize: 13, cursor: savingInd ? 'not-allowed' : 'pointer',
                      opacity: savingInd ? 0.7 : 1,
                      background: indResult?.ok ? L.greenBg : L.teal,
                      color: indResult?.ok ? L.green : L.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    {savingInd
                      ? '⏳ Enviando...'
                      : indResult?.ok
                        ? `✓ ${indResult.via === 'api' ? 'Enviado via API!' : 'Copiado!'}`
                        : wabaAtivo
                          ? '📤 Enviar via WhatsApp API'
                          : '📋 Copiar e Abrir WhatsApp'}
                  </button>
                  <button
                    onClick={copiarTexto}
                    style={{
                      flex: 1, padding: '9px 18px', background: L.surface, color: L.t2,
                      fontWeight: 500, borderRadius: 8, border: `1.5px solid ${L.line}`,
                      cursor: 'pointer', fontSize: 13,
                    }}
                  >
                    Copiar Texto
                  </button>
                </div>
                {indResult && !indResult.ok && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: L.redBg, color: L.red, fontSize: 12 }}>
                    <strong>Erro:</strong> {indResult.msg || 'Falha ao enviar via API'}
                  </div>
                )}
                {wabaAtivo && (
                  <div style={{ fontSize: 11, color: L.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>●</span> WhatsApp Business API ativa — envio direto sem abrir WhatsApp Web
                  </div>
                )}
              </div>
            )}

            {!pacienteSel && !previewText && (
              <div style={{ textAlign: 'center', color: L.t4, fontSize: 12, padding: '8px 0' }}>
                Selecione um paciente e um template para visualizar a mensagem
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Templates ─────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: 'lembrete_consulta', label: 'Lembrete de Consulta' },
  { value: 'aniversario',       label: 'Aniversário' },
  { value: 'aviso',             label: 'Aviso' },
  { value: 'cobranca',          label: 'Cobrança' },
  { value: 'resultado',         label: 'Resultado de Exame' },
]

const CANAL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms',      label: 'SMS' },
]

const DEFAULT_TEMPLATES = [
  {
    nome: 'Lembrete de Consulta',
    tipo: 'lembrete_consulta',
    canal: 'whatsapp',
    conteudo: 'Olá, {{PACIENTE_NOME}}! Lembramos que você tem consulta agendada para {{DATA_HORA}}. Por favor, confirme sua presença respondendo esta mensagem. Em caso de impossibilidade, entre em contato com antecedência. — {{CLINICA_NOME}}',
    ativo: true,
  },
  {
    nome: 'Parabéns de Aniversário',
    tipo: 'aniversario',
    canal: 'whatsapp',
    conteudo: 'Feliz Aniversário, {{PACIENTE_NOME}}! 🎂 Toda a equipe da {{CLINICA_NOME}} deseja muita saúde e felicidade para você neste dia especial!',
    ativo: true,
  },
  {
    nome: 'Resultado de Exame',
    tipo: 'resultado',
    canal: 'whatsapp',
    conteudo: 'Olá, {{PACIENTE_NOME}}! Informamos que o resultado do seu exame já está disponível. Entre em contato com a {{CLINICA_NOME}} para mais informações.',
    ativo: true,
  },
]

function TabTemplates({ profile }) {
  const clinicaId = profile?.clinica_id
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'novo' | 'editar'
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('templates_mensagem').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: true })
    const list = data || []
    if (list.length === 0) {
      // insert defaults
      const inserts = DEFAULT_TEMPLATES.map(t => ({ ...t, clinica_id: clinicaId }))
      const { data: inserted } = await supabase.from('templates_mensagem').insert(inserts).select()
      setTemplates(inserted || [])
    } else {
      setTemplates(list)
    }
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { if (clinicaId) loadTemplates() }, [clinicaId, loadTemplates])

  function abrirNovo() {
    setForm({ nome: '', tipo: 'lembrete_consulta', canal: 'whatsapp', conteudo: '', ativo: true })
    setModal('novo')
  }

  function abrirEditar(t) {
    setForm({ ...t })
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome?.trim() || !form.conteudo?.trim()) return
    setSaving(true)
    if (modal === 'novo') {
      await supabase.from('templates_mensagem').insert({ ...form, clinica_id: clinicaId })
    } else {
      const { id, criado_em, ...rest } = form
      await supabase.from('templates_mensagem').update(rest).eq('id', id)
    }
    setSaving(false)
    setModal(null)
    loadTemplates()
  }

  async function excluir(id) {
    if (!confirm('Excluir este template?')) return
    await supabase.from('templates_mensagem').delete().eq('id', id)
    loadTemplates()
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Templates de Mensagem</div>
          <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>{templates.length} template{templates.length !== 1 ? 's' : ''} cadastrado{templates.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={abrirNovo}
          style={{ padding: '9px 18px', background: L.teal, color: L.white, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          + Novo Template
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner /></div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: '48px 0' }}>Nenhum template cadastrado</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => {
            const tipoMeta = TIPO_META[t.tipo] || { label: t.tipo, color: L.t3, bg: L.hover }
            const canalMeta = CANAL_META[t.canal] || { label: t.canal, color: L.t3, bg: L.hover }
            return (
              <div key={t.id} style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: L.t1, fontSize: 14 }}>{t.nome}</span>
                      <Badge color={tipoMeta.color} bg={tipoMeta.bg}>{tipoMeta.label}</Badge>
                      <Badge color={canalMeta.color} bg={canalMeta.bg} bd={canalMeta.bd}>{canalMeta.label}</Badge>
                      {!t.ativo && <Badge color={L.t4} bg={L.hover}>Inativo</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: L.t3, lineHeight: 1.5 }}>
                      {t.conteudo?.slice(0, 80)}{t.conteudo?.length > 80 ? '…' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => abrirEditar(t)}
                      style={{ padding: '6px 12px', borderRadius: 7, background: L.tealBg, color: L.teal, fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(t.id)}
                      style={{ padding: '6px 12px', borderRadius: 7, background: L.redBg, color: L.red, fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(modal === 'novo' || modal === 'editar') && (
        <Modal title={modal === 'novo' ? 'Novo Template' : 'Editar Template'} onClose={() => setModal(null)}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="NOME DO TEMPLATE *">
              <input
                style={inp}
                placeholder="Ex: Lembrete de Consulta"
                value={form.nome || ''}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="TIPO">
                <select
                  style={{ ...inp, appearance: 'none' }}
                  value={form.tipo || 'lembrete_consulta'}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                >
                  {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="CANAL">
                <select
                  style={{ ...inp, appearance: 'none' }}
                  value={form.canal || 'whatsapp'}
                  onChange={e => setForm({ ...form, canal: e.target.value })}
                  onFocus={e => e.target.style.borderColor = L.teal}
                  onBlur={e => e.target.style.borderColor = L.line}
                >
                  {CANAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="CONTEÚDO DA MENSAGEM *">
              <textarea
                style={{ ...inp, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
                placeholder="Digite o texto da mensagem..."
                value={form.conteudo || ''}
                onChange={e => setForm({ ...form, conteudo: e.target.value })}
                onFocus={e => e.target.style.borderColor = L.teal}
                onBlur={e => e.target.style.borderColor = L.line}
              />
              <div style={{ marginTop: 8, padding: '10px 12px', background: L.yellowBg, borderRadius: 8, border: `1px solid ${L.yellowBd}` }}>
                <div style={{ fontSize: 11, color: L.yellow, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>VARIÁVEIS DISPONÍVEIS</div>
                <div style={{ fontSize: 11, color: L.t3, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
                  {['{{PACIENTE_NOME}}', '{{DATA_HORA}}', '{{CLINICA_NOME}}', '{{TELEFONE}}'].join('  ·  ')}
                </div>
              </div>
            </Field>
            <Field label="STATUS">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: L.t2 }}>
                <input
                  type="checkbox"
                  checked={form.ativo !== false}
                  onChange={e => setForm({ ...form, ativo: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: L.teal }}
                />
                Template ativo
              </label>
            </Field>
            {form.conteudo && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>PRÉVIA</label>
                <div style={{ padding: '10px 12px', background: L.surface, borderRadius: 8, border: `1px solid ${L.line}`, fontSize: 12, color: L.t3, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {form.conteudo}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                onClick={() => setModal(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: L.hover, color: L.t2, fontWeight: 500, fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving || !form.nome?.trim() || !form.conteudo?.trim()}
                style={{ flex: 2, padding: '10px 0', borderRadius: 8, background: L.teal, color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (saving || !form.nome?.trim() || !form.conteudo?.trim()) ? 0.6 : 1 }}
              >
                {saving ? 'Salvando...' : 'Salvar Template'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Tab 3: Histórico ─────────────────────────────────────────────────────────

function TabHistorico({ profile }) {
  const clinicaId = profile?.clinica_id
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCanal, setFiltroCanal] = useState('all')
  const [kpis, setKpis] = useState({ hoje: 0, semana: 0 })

  const loadHistorico = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('mensagens_pacientes')
      .select('*, pacientes(nome), templates_mensagem(nome, tipo)')
      .eq('clinica_id', clinicaId)
      .order('criado_em', { ascending: false })
      .limit(50)
    const list = data || []
    setMensagens(list)

    // KPIs
    const now = new Date()
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0)
    const hoje = list.filter(m => m.criado_em && new Date(m.criado_em) >= startOfDay).length
    const semana = list.filter(m => m.criado_em && new Date(m.criado_em) >= startOfWeek).length
    setKpis({ hoje, semana })
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { if (clinicaId) loadHistorico() }, [clinicaId, loadHistorico])

  const filtradas = filtroCanal === 'all' ? mensagens : mensagens.filter(m => m.canal === filtroCanal)

  const STATUS_META = {
    enviado:  { label: 'Enviado',   color: L.green,  bg: L.greenBg,  bd: L.greenBd  },
    entregue: { label: 'Entregue',  color: L.teal,   bg: L.tealBg,   bd: L.teal+'40'},
    lido:     { label: 'Lido ✓✓',  color: L.blue,   bg: L.blueBg,   bd: L.blueBd   },
    pendente: { label: 'Pendente',  color: L.yellow, bg: L.yellowBg, bd: L.yellowBd },
    falhou:   { label: 'Falhou',    color: L.red,    bg: L.redBg,    bd: L.redBd    },
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Mensagens Hoje', value: kpis.hoje, color: L.teal, bg: L.tealBg },
          { label: 'Mensagens Esta Semana', value: kpis.semana, color: L.purple, bg: L.purpleBg },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: k.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 6 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>CANAL:</span>
        {[['all', 'Todos'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltroCanal(v)}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: filtroCanal === v ? 600 : 400, background: filtroCanal === v ? L.teal : L.surface, color: filtroCanal === v ? L.white : L.t3, border: `1px solid ${filtroCanal === v ? L.teal : L.line}`, cursor: 'pointer' }}
          >
            {l}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: L.t4 }}>{filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner /></div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', color: L.t4, fontSize: 14, padding: '48px 0' }}>Nenhum registro encontrado</div>
      ) : (
        <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 130px 90px 80px 1fr', padding: '10px 16px', fontSize: 10, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', borderBottom: `1px solid ${L.line}`, background: L.surface }}>
            <span>DATA/HORA</span>
            <span>PACIENTE</span>
            <span>TEMPLATE</span>
            <span>CANAL</span>
            <span>STATUS</span>
            <span>MENSAGEM</span>
          </div>
          {filtradas.map((m, idx) => {
            const statusMeta = STATUS_META[m.status] || { label: m.status || '—', color: L.t4, bg: L.hover }
            const canalMeta = CANAL_META[m.canal] || { label: m.canal, color: L.t3, bg: L.hover }
            const tipoMeta = m.templates_mensagem?.tipo ? (TIPO_META[m.templates_mensagem.tipo] || { label: m.templates_mensagem.tipo, color: L.t3, bg: L.hover }) : null
            return (
              <div
                key={m.id}
                style={{ display: 'grid', gridTemplateColumns: '140px 1fr 130px 90px 80px 1fr', padding: '11px 16px', fontSize: 12, borderBottom: idx < filtradas.length - 1 ? `1px solid ${L.lineSoft}` : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = L.hover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: L.t3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmtDt(m.criado_em)}</span>
                <span style={{ color: L.t1, fontWeight: 500 }}>{m.pacientes?.nome || '—'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ color: L.t2, fontSize: 11 }}>{m.templates_mensagem?.nome || '—'}</span>
                  {tipoMeta && <Badge color={tipoMeta.color} bg={tipoMeta.bg}>{tipoMeta.label}</Badge>}
                </div>
                <div><Badge color={canalMeta.color} bg={canalMeta.bg} bd={canalMeta.bd}>{canalMeta.label}</Badge></div>
                <div><Badge color={statusMeta.color} bg={statusMeta.bg} bd={statusMeta.bd}>{statusMeta.label}</Badge></div>
                <span style={{ color: L.t3, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.conteudo}>
                  {m.conteudo?.slice(0, 60)}{m.conteudo?.length > 60 ? '…' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'enviar',    label: 'Enviar Mensagens' },
  { id: 'templates', label: 'Templates' },
  { id: 'historico', label: 'Histórico' },
]

export default function PageComunicacao({ profile }) {
  const [tab, setTab] = useState('enviar')

  return (
    <div style={{ minHeight: '100%', background: L.bg }}>
      <style>{`
        @keyframes up   { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes in   { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* page header */}
      <div style={{ padding: '22px 28px 0', borderBottom: `1px solid ${L.line}`, background: L.bg }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: L.t1 }}>Comunicação</div>
          <div style={{ fontSize: 13, color: L.t4, marginTop: 2 }}>Gerencie mensagens e templates para seus pacientes</div>
        </div>
        {/* tab bar */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? L.teal : L.t3,
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? `3px solid ${L.teal}` : '3px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* tab content */}
      {tab === 'enviar'    && <TabEnviar    profile={profile} />}
      {tab === 'templates' && <TabTemplates profile={profile} />}
      {tab === 'historico' && <TabHistorico profile={profile} />}
    </div>
  )
}
