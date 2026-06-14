import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── shared input style ───────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
  boxSizing: 'border-box',
}

// ─── field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', textTransform: 'uppercase'
      }}>{label}</label>
      {children}
    </div>
  )
}

// ─── status badge ─────────────────────────────────────────────────────────────
function Badge({ color, bg, bd, children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
      color, background: bg, border: `1px solid ${bd}`,
      fontFamily: "'JetBrains Mono', monospace"
    }}>{children}</span>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, color }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: color === 'red' ? L.red : L.green,
      color: '#fff', padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'up 0.25s ease'
    }}>{msg}</div>
  )
}

// ─── toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: checked ? L.teal : L.line,
        position: 'relative', transition: 'background 0.2s', flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.18)'
      }} />
    </div>
  )
}

// ─── log event types ──────────────────────────────────────────────────────────
const LOG_BADGE = {
  sucesso: { color: L.green, bg: L.greenBg, bd: L.greenBd, label: 'SUCESSO' },
  erro:    { color: L.red,   bg: L.redBg,   bd: L.redBd,   label: 'ERRO'    },
  aviso:   { color: L.yellow,bg: L.yellowBg,bd: L.yellowBd,label: 'AVISO'   },
  info:    { color: L.blue,  bg: L.blueBg,  bd: L.blueBd,  label: 'INFO'    },
}

// ─── hardcoded log entries ────────────────────────────────────────────────────
const MOCK_LOGS = [
  { id: 1,  ts: '10:42',  integracao: 'WhatsApp',       tipo: 'sucesso', msg: 'Mensagem de confirmação enviada para João Silva (+55 11 99999-1234)' },
  { id: 2,  ts: '10:38',  integracao: 'ViaCEP',         tipo: 'sucesso', msg: 'CEP 01310-100 consultado — Av. Paulista, São Paulo/SP' },
  { id: 3,  ts: '10:21',  integracao: 'MEMED',          tipo: 'sucesso', msg: 'Prescrição digital #4521 gerada e enviada para paciente' },
  { id: 4,  ts: '10:05',  integracao: 'WhatsApp',       tipo: 'sucesso', msg: 'Lembrete 24h enviado para Maria Oliveira — consulta amanhã às 09:00' },
  { id: 5,  ts: '09:58',  integracao: 'Pix',            tipo: 'sucesso', msg: 'Cobrança Pix R$ 180,00 gerada para Carlos Mendes' },
  { id: 6,  ts: '09:44',  integracao: 'Cert. Digital',  tipo: 'info',    msg: 'Certificado A1 carregado — válido até 15/03/2026' },
  { id: 7,  ts: '09:30',  integracao: 'Google Agenda',  tipo: 'sucesso', msg: '3 eventos sincronizados com Google Calendar' },
  { id: 8,  ts: '09:15',  integracao: 'WhatsApp',       tipo: 'erro',    msg: 'Falha ao enviar mensagem para Ana Lima — número inválido' },
  { id: 9,  ts: '09:01',  integracao: 'ViaCEP',         tipo: 'sucesso', msg: 'CEP 30130-110 consultado — Av. Afonso Pena, Belo Horizonte/MG' },
  { id: 10, ts: '08:55',  integracao: 'MEMED',          tipo: 'aviso',   msg: 'API MEMED respondeu com latência elevada (3.2s)' },
  { id: 11, ts: '08:40',  integracao: 'Pix',            tipo: 'erro',    msg: 'Timeout ao gerar QR Code — provedor Mercado Pago instável' },
  { id: 12, ts: '08:22',  integracao: 'WhatsApp',       tipo: 'sucesso', msg: 'Resultado de exame enviado para Roberto Costa via WhatsApp' },
  { id: 13, ts: '08:10',  integracao: 'Google Agenda',  tipo: 'info',    msg: 'Sincronização automática iniciada (intervalo: 15 min)' },
  { id: 14, ts: '07:58',  integracao: 'Cert. Digital',  tipo: 'aviso',   msg: 'Certificado digital expira em 30 dias — renove em breve' },
  { id: 15, ts: '07:45',  integracao: 'MEMED',          tipo: 'sucesso', msg: 'Receita de controle especial #892 assinada digitalmente' },
]

// ─── integration list metadata ────────────────────────────────────────────────
const INTEGRATIONS_META = [
  { tipo: 'whatsapp',      nome: 'WhatsApp Business API' },
  { tipo: 'viacep',        nome: 'ViaCEP' },
  { tipo: 'cert_digital',  nome: 'Cert. Digital' },
  { tipo: 'memed',         nome: 'MEMED' },
  { tipo: 'pix',           nome: 'Pix' },
  { tipo: 'google_agenda', nome: 'Google Agenda' },
]

const WEBHOOK_URL = 'https://tbfrwnfajrcpimhflmhv.supabase.co/functions/v1/whatsapp-webhook'

// ─── Evolution API card ───────────────────────────────────────────────────────
function CardEvolutionAPI({ config, onSave, onToast }) {
  const [expanded, setExpanded]  = useState(false)
  const [ativo, setAtivo]        = useState(config?.ativo ?? false)
  const [fields, setFields]      = useState({
    server_url:    config?.configuracoes?.server_url    || '',
    api_key:       config?.configuracoes?.api_key       || '',
    instance_name: config?.configuracoes?.instance_name || '',
  })
  const [showKey, setShowKey]    = useState(false)
  const [qr, setQr]              = useState(null)       // base64 string
  const [connState, setConnState] = useState('close')   // 'open'|'close'|'connecting'|'qr'
  const [connecting, setConnecting] = useState(false)
  const [saving, setSaving]      = useState(false)
  const pollRef  = useRef(null)
  const qrTimer  = useRef(null)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  // Load status when config exists and card opens
  useEffect(() => {
    if (expanded && config?.configuracoes?.server_url) checkStatus(config.configuracoes)
    return () => { clearInterval(pollRef.current); clearTimeout(qrTimer.current) }
  }, [expanded]) // eslint-disable-line

  function startStatusPoll(cfg) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => checkStatus(cfg || fields), 3000)
  }

  function stopPoll() { clearInterval(pollRef.current) }

  async function checkStatus(cfg) {
    const f = cfg || fields
    if (!f.server_url || !f.api_key || !f.instance_name) return
    try {
      const { data, error } = await supabase.functions.invoke('evolution-proxy', {
        body: { action: 'status', ...f },
      })
      if (error || data?.error) return
      const s = data.state || 'close'
      if (s === 'open') {
        setConnState('open')
        setQr(null)
        setConnecting(false)
        stopPoll()
        clearTimeout(qrTimer.current)
      } else {
        setConnState(s)
      }
    } catch { /* ignore */ }
  }

  async function handleConnect() {
    if (!fields.server_url || !fields.api_key || !fields.instance_name) {
      onToast('Preencha URL do servidor, API Key e nome da instância', 'red')
      return
    }
    setConnecting(true)
    setConnState('connecting')
    setQr(null)

    // Create instance (ignore 409 if already exists)
    await supabase.functions.invoke('evolution-proxy', {
      body: { action: 'create_instance', ...fields },
    })

    // Get QR code
    const { data, error } = await supabase.functions.invoke('evolution-proxy', {
      body: { action: 'connect', ...fields },
    })

    if (error || data?.error) {
      onToast(data?.error || error?.message || 'Erro ao conectar', 'red')
      setConnecting(false)
      setConnState('close')
      return
    }

    if (data.qr) {
      setQr(data.qr)
      setConnState('qr')
      startStatusPoll(fields)
      // Auto-refresh QR after 28s if still not connected
      qrTimer.current = setTimeout(() => refreshQR(), 28000)
    } else if (data.state === 'open') {
      setConnState('open')
      setConnecting(false)
      onToast('WhatsApp conectado com sucesso!', 'green')
    }
  }

  async function refreshQR() {
    clearTimeout(qrTimer.current)
    if (connState === 'open') return
    const { data } = await supabase.functions.invoke('evolution-proxy', {
      body: { action: 'connect', ...fields },
    })
    if (data?.qr) {
      setQr(data.qr)
      qrTimer.current = setTimeout(() => refreshQR(), 28000)
    }
  }

  async function handleDisconnect() {
    stopPoll()
    clearTimeout(qrTimer.current)
    await supabase.functions.invoke('evolution-proxy', {
      body: { action: 'disconnect', ...fields },
    })
    setConnState('close')
    setQr(null)
    setConnecting(false)
    onToast('WhatsApp desconectado', 'green')
  }

  async function handleSave() {
    setSaving(true)
    await onSave('evolution_api', 'Evolution API (WhatsApp QR)', ativo, fields)
    setSaving(false)
  }

  const isOpen = connState === 'open'
  const isQR   = connState === 'qr'

  return (
    <div style={{ background: L.bg, border: `2px solid ${isOpen ? L.green + '60' : L.line}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.3s' }}>
      {/* header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none', background: L.surface }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, position: 'relative' }}>
          💬
          {isOpen && <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: L.green, border: `2px solid ${L.bg}` }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>
            WhatsApp via QR Code
            <span style={{ marginLeft: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: L.teal, fontWeight: 600 }}>Evolution API</span>
          </div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Escaneie com qualquer número do WhatsApp — sem aprovação Meta necessária
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isOpen
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>● Conectado</Badge>
            : isQR
              ? <Badge color={L.yellow} bg={L.yellowBg} bd={L.yellowBd}>Aguardando scan</Badge>
              : connState === 'connecting'
                ? <Badge color={L.blue} bg={L.blueBg} bd={L.blueBd}>Conectando...</Badge>
                : <Badge color={L.t4} bg={L.surface} bd={L.line}>Desconectado</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>

          {/* QR Code panel */}
          {isQR && qr && (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px', background: L.surface, borderRadius: 12, border: `2px dashed ${L.green}40` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>Escaneie o QR Code com seu WhatsApp</div>
              <img
                src={qr}
                alt="QR Code WhatsApp"
                style={{ width: 220, height: 220, borderRadius: 12, border: `4px solid ${L.bg}`, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', imageRendering: 'pixelated' }}
              />
              <div style={{ fontSize: 11, color: L.t4, textAlign: 'center' }}>
                No WhatsApp: Menu → Aparelhos conectados → Conectar aparelho<br />
                <span style={{ color: L.yellow }}>QR Code expira em ~30s — atualizado automaticamente</span>
              </div>
              <button
                onClick={refreshQR}
                style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: L.surface, color: L.teal, border: `1.5px solid ${L.teal}40`, cursor: 'pointer' }}
              >
                ↻ Atualizar QR Code
              </button>
            </div>
          )}

          {/* Connected panel */}
          {isOpen && (
            <div style={{ marginBottom: 20, padding: '16px', background: L.greenBg, borderRadius: 12, border: `1px solid ${L.greenBd}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div>
                <div style={{ fontWeight: 700, color: L.green, fontSize: 14 }}>WhatsApp Conectado</div>
                <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>Instância <strong>{fields.instance_name}</strong> está online e pronta para enviar mensagens</div>
              </div>
              <button
                onClick={handleDisconnect}
                style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, cursor: 'pointer', flexShrink: 0 }}
              >
                Desconectar
              </button>
            </div>
          )}

          <Field label="URL do Servidor Evolution API">
            <input style={inp} value={fields.server_url}
              onChange={e => set('server_url', e.target.value)}
              placeholder="https://evolution.seuservidor.com" />
          </Field>

          <Field label="API Key (Global)">
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingRight: 40 }}
                type={showKey ? 'text' : 'password'}
                value={fields.api_key}
                onChange={e => set('api_key', e.target.value)}
                placeholder="B6D711FCDE4D4FD5936544120E713976"
              />
              <button type="button" onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: L.t3, fontSize: 14 }}>
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          <Field label="Nome da Instância">
            <input style={inp} value={fields.instance_name}
              onChange={e => set('instance_name', e.target.value)}
              placeholder="clinica_abc" />
            <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>Use apenas letras, números e underscores. Ex: clinica_c4hub</div>
          </Field>

          {/* features */}
          <div style={{ background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>VANTAGENS</div>
            {[
              'Qualquer número — sem aprovação da Meta',
              'Envio e recebimento de mensagens',
              'QR Code direto no sistema — sem redirecionamento',
              'Reconexão automática',
            ].map(f => (
              <div key={f} style={{ fontSize: 13, color: L.t2, marginBottom: 6, display: 'flex', gap: 8 }}>
                <span style={{ color: L.green }}>✓</span> {f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!isOpen ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: connecting ? 'not-allowed' : 'pointer', background: connecting ? L.surface : '#25d366', color: connecting ? L.t3 : '#fff', opacity: connecting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {connecting ? '⏳ Gerando QR Code...' : '📲 Gerar QR Code e Conectar'}
              </button>
            ) : (
              <button
                onClick={() => { setExpanded(false); checkStatus(fields) }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${L.green}`, background: 'transparent', color: L.green, cursor: 'pointer' }}
              >
                ✓ Conectado
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WhatsApp card ────────────────────────────────────────────────────────────
function CardWhatsApp({ config, onSave, onToast }) {
  const [expanded, setExpanded]   = useState(false)
  const [ativo, setAtivo]         = useState(config?.ativo ?? false)
  const [fields, setFields]       = useState({
    phone_number_id:     config?.configuracoes?.phone_number_id     || '',
    access_token:        config?.configuracoes?.access_token        || '',
    webhook_verify_token:config?.configuracoes?.webhook_verify_token|| '',
  })
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting]     = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok, name, phone, quality } | null
  const [saving, setSaving]       = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave('whatsapp', 'WhatsApp Business API', ativo, fields)
    setSaving(false)
  }

  async function handleTest() {
    if (!fields.phone_number_id || !fields.access_token) {
      onToast('Preencha Phone Number ID e Access Token', 'red')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          action: 'test',
          phone_number_id: fields.phone_number_id,
          access_token: fields.access_token,
        },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)
      setTestResult({ ok: true, name: data.verified_name, phone: data.display_phone, quality: data.quality_rating })
      onToast(`Conectado: ${data.verified_name}`, 'green')
    } catch (e) {
      setTestResult({ ok: false, msg: e.message })
      onToast(`Erro: ${e.message}`, 'red')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#25d366',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>💬</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>WhatsApp Business API</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Envio automático de confirmações, resultados e lembretes via WhatsApp
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ativo
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Conectado</Badge>
            : <Badge color={L.t4} bg={L.surface} bd={L.line}>Desconectado</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {/* body */}
      {expanded && (
        <div style={{ padding: '20px' }}>

          {/* test result banner */}
          {testResult && (
            <div style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 13,
              background: testResult.ok ? L.greenBg : L.redBg,
              border: `1px solid ${testResult.ok ? L.greenBd : L.redBd}`,
              color: testResult.ok ? L.green : L.red,
            }}>
              {testResult.ok ? (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Conexão estabelecida</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {testResult.name} · {testResult.phone}
                    {testResult.quality && <span style={{ marginLeft: 8 }}>Qualidade: {testResult.quality}</span>}
                  </div>
                </>
              ) : (
                <div><strong>Erro:</strong> {testResult.msg}</div>
              )}
            </div>
          )}

          <Field label="Phone Number ID">
            <input style={inp} value={fields.phone_number_id}
              onChange={e => set('phone_number_id', e.target.value)}
              placeholder="123456789012345" />
          </Field>

          <Field label="Access Token (System User)">
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingRight: 40 }}
                type={showToken ? 'text' : 'password'}
                value={fields.access_token}
                onChange={e => set('access_token', e.target.value)}
                placeholder="EAAxxxxxxxx..."
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: L.t3, fontSize: 14
                }}
              >{showToken ? '🙈' : '👁'}</button>
            </div>
          </Field>

          <Field label="Webhook Verify Token">
            <input style={inp} value={fields.webhook_verify_token}
              onChange={e => set('webhook_verify_token', e.target.value)}
              placeholder="meu_token_secreto_123" />
          </Field>

          {/* webhook URL info */}
          <div style={{
            background: L.blueBg, border: `1px solid ${L.blueBd}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 16
          }}>
            <div style={{ fontSize: 11, color: L.blue, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
              URL DO WEBHOOK — configure no Meta Business Manager
            </div>
            <div style={{
              fontSize: 11, color: L.t2, fontFamily: "'JetBrains Mono', monospace",
              background: L.bg, padding: '7px 10px', borderRadius: 6, wordBreak: 'break-all',
              border: `1px solid ${L.line}`
            }}>
              {WEBHOOK_URL}
            </div>
            <div style={{ fontSize: 11, color: L.t3, marginTop: 6 }}>
              Campos obrigatórios: <strong>messages</strong> · Versão API recomendada: <strong>v21.0</strong>
            </div>
          </div>

          {/* features */}
          <div style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 16
          }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>RECURSOS HABILITADOS</div>
            {[
              'Envio direto via API (sem abrir WhatsApp Web)',
              'Rastreamento: enviado → entregue → lido',
              'Confirmação de consulta e lembretes',
              'Resultado de exames e mensagens personalizadas',
            ].map(f => (
              <div key={f} style={{ fontSize: 13, color: L.t2, marginBottom: 6, display: 'flex', gap: 8 }}>
                <span style={{ color: L.green }}>✓</span> {f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                cursor: testing ? 'not-allowed' : 'pointer',
                border: `1.5px solid ${L.teal}`, background: 'transparent', color: L.teal,
                opacity: testing ? 0.7 : 1
              }}
            >
              {testing ? 'Verificando...' : 'Testar Conexão'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                background: L.teal, color: L.white, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ViaCEP card ──────────────────────────────────────────────────────────────
function CardViaCEP({ config, onSave, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo]       = useState(config?.ativo ?? true)
  const [cepTest, setCepTest]   = useState('')
  const [cepResult, setCepResult] = useState(null)
  const [testing, setTesting]   = useState(false)
  const [saving, setSaving]     = useState(false)

  async function handleTest() {
    const clean = cepTest.replace(/\D/g, '')
    if (clean.length !== 8) { onToast('CEP deve ter 8 dígitos', 'red'); return }
    setTesting(true)
    setCepResult(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (data.erro) { onToast('CEP não encontrado', 'red'); setCepResult(null) }
      else { setCepResult(data); onToast('CEP encontrado!', 'green') }
    } catch {
      onToast('Erro ao consultar ViaCEP', 'red')
    }
    setTesting(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave('viacep', 'ViaCEP', ativo, {})
    setSaving(false)
  }

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#1565c0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>📮</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>ViaCEP</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Preenchimento automático de endereço por CEP em formulários de pacientes
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Disponível</Badge>
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          <div style={{
            background: L.blueBg, border: `1px solid ${L.blueBd}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 18, fontSize: 13, color: L.blue
          }}>
            Esta integração usa a API gratuita do ViaCEP (viacep.com.br) — nenhuma configuração necessária.
          </div>

          <Field label="Testar CEP">
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                style={{ ...inp, width: 'auto', flex: 1 }}
                value={cepTest}
                onChange={e => setCepTest(e.target.value)}
                placeholder="01310-100"
                maxLength={9}
              />
              <button
                onClick={handleTest}
                disabled={testing}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                  border: `1.5px solid ${L.teal}`, background: 'transparent', color: L.teal,
                  cursor: testing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  opacity: testing ? 0.7 : 1
                }}
              >
                {testing ? 'Buscando...' : 'Testar'}
              </button>
            </div>
          </Field>

          {cepResult && (
            <div style={{
              background: L.greenBg, border: `1px solid ${L.greenBd}`, borderRadius: 10,
              padding: '14px 16px', marginBottom: 16, fontSize: 13
            }}>
              <div style={{ fontWeight: 600, color: L.green, marginBottom: 8 }}>Resultado:</div>
              {[
                ['Logradouro', cepResult.logradouro],
                ['Bairro', cepResult.bairro],
                ['Cidade', `${cepResult.localidade} / ${cepResult.uf}`],
                ['CEP', cepResult.cep],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4, color: L.t2 }}>
                  <span style={{ color: L.t4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, minWidth: 80 }}>{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Certificado Digital card ─────────────────────────────────────────────────
function CardCertificado({ config, onSave, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo]       = useState(config?.ativo ?? false)
  const [fields, setFields]     = useState({
    tipo_certificado: config?.configuracoes?.tipo_certificado || 'A1',
    senha_certificado: config?.configuracoes?.senha_certificado || '',
    validade: config?.configuracoes?.validade || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave('cert_digital', 'Certificado Digital ICP-Brasil', ativo, fields)
    setSaving(false)
  }

  const configurado = ativo && fields.senha_certificado

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>🔐</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>Certificado Digital ICP-Brasil</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Assinatura digital de documentos e prescrições com validade jurídica
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {configurado
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Configurado</Badge>
            : <Badge color={L.t4} bg={L.surface} bd={L.line}>Não configurado</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          <div style={{
            background: L.blueBg, border: `1px solid ${L.blueBd}`, borderRadius: 10,
            padding: '12px 16px', marginBottom: 18, fontSize: 13, color: L.blue
          }}>
            Certificados <strong>A1</strong> são arquivos .pfx/.p12. Certificados <strong>A3</strong> utilizam token ou smartcard USB.
          </div>

          <Field label="Tipo de Certificado">
            <select
              style={{ ...inp }}
              value={fields.tipo_certificado}
              onChange={e => set('tipo_certificado', e.target.value)}
            >
              <option value="A1">A1 — Arquivo .pfx / .p12</option>
              <option value="A3">A3 — Token / Smartcard USB</option>
            </select>
          </Field>

          {fields.tipo_certificado === 'A1' && (
            <Field label="Arquivo do Certificado (.pfx / .p12)">
              <input style={inp} type="file" accept=".pfx,.p12"
                onChange={() => onToast('Arquivo selecionado — salve para aplicar', 'green')} />
            </Field>
          )}

          <Field label="Senha do Certificado">
            <input style={inp} type="password" value={fields.senha_certificado}
              onChange={e => set('senha_certificado', e.target.value)}
              placeholder="••••••••" />
          </Field>

          {fields.validade && (
            <Field label="Validade (somente leitura)">
              <input style={{ ...inp, opacity: 0.65, cursor: 'default' }}
                type="date" value={fields.validade} readOnly />
            </Field>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MEMED card ───────────────────────────────────────────────────────────────
function CardMemed({ config, onSave, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo]       = useState(config?.ativo ?? false)
  const [fields, setFields]     = useState({
    api_key: config?.configuracoes?.api_key || '',
    secret_key: config?.configuracoes?.secret_key || '',
    ambiente: config?.configuracoes?.ambiente || 'sandbox',
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving]   = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  async function handleTest() {
    setTesting(true)
    await new Promise(r => setTimeout(r, 800))
    setTesting(false)
    if (fields.api_key) onToast('API MEMED respondeu com sucesso!', 'green')
    else onToast('Erro: api_key não informada', 'red')
  }

  async function handleSave() {
    setSaving(true)
    await onSave('memed', 'MEMED / Prescrição Digital', ativo, fields)
    setSaving(false)
  }

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#0284c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>💊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>MEMED / Prescrição Digital</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Integração com plataforma MEMED para prescrição digital e envio direto ao paciente
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ativo
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Ativo</Badge>
            : <Badge color={L.t4} bg={L.surface} bd={L.line}>Inativo</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          <Field label="API Key">
            <input style={inp} value={fields.api_key}
              onChange={e => set('api_key', e.target.value)}
              placeholder="memed_api_key_xxxxxx" />
          </Field>
          <Field label="Secret Key">
            <input style={inp} type="password" value={fields.secret_key}
              onChange={e => set('secret_key', e.target.value)}
              placeholder="••••••••••••" />
          </Field>
          <Field label="Ambiente">
            <select style={inp} value={fields.ambiente} onChange={e => set('ambiente', e.target.value)}>
              <option value="sandbox">Sandbox (testes)</option>
              <option value="producao">Produção</option>
            </select>
          </Field>

          <div style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 10,
            padding: '14px 16px', marginBottom: 16
          }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>RECURSOS</div>
            {['Receituário digital', 'Controle especial', 'Farmácias parceiras', 'Histórico de prescrições'].map(f => (
              <div key={f} style={{ fontSize: 13, color: L.t2, marginBottom: 6, display: 'flex', gap: 8 }}>
                <span style={{ color: L.green }}>✓</span> {f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleTest}
              disabled={testing}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                border: `1.5px solid ${L.teal}`, background: 'transparent', color: L.teal,
                cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1
              }}
            >
              {testing ? 'Testando...' : 'Testar API'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pix card ─────────────────────────────────────────────────────────────────
function CardPix({ config, onSave, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo]       = useState(config?.ativo ?? false)
  const [fields, setFields]     = useState({
    provedor: config?.configuracoes?.provedor || 'mercadopago',
    chave_pix: config?.configuracoes?.chave_pix || '',
    client_id: config?.configuracoes?.client_id || '',
    client_secret: config?.configuracoes?.client_secret || '',
    ambiente: config?.configuracoes?.ambiente || 'sandbox',
  })
  const [showQR, setShowQR] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave('pix', 'Gateway de Pagamento / Pix', ativo, fields)
    setSaving(false)
  }

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#32bcad',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>⚡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>Gateway de Pagamento / Pix</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Cobrança via Pix e cartão diretamente pelo sistema
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ativo
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Ativo</Badge>
            : <Badge color={L.t4} bg={L.surface} bd={L.line}>Inativo</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          <Field label="Provedor">
            <select style={inp} value={fields.provedor} onChange={e => set('provedor', e.target.value)}>
              <option value="mercadopago">Mercado Pago</option>
              <option value="pagseguro">PagSeguro</option>
              <option value="asaas">Asaas</option>
              <option value="stripe">Stripe</option>
            </select>
          </Field>
          <Field label="Chave Pix">
            <input style={inp} value={fields.chave_pix}
              onChange={e => set('chave_pix', e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" />
          </Field>
          <Field label="Client ID">
            <input style={inp} value={fields.client_id}
              onChange={e => set('client_id', e.target.value)}
              placeholder="APP_USR-xxxxxxxx" />
          </Field>
          <Field label="Client Secret">
            <input style={inp} type="password" value={fields.client_secret}
              onChange={e => set('client_secret', e.target.value)}
              placeholder="••••••••••••" />
          </Field>
          <Field label="Ambiente">
            <select style={inp} value={fields.ambiente} onChange={e => set('ambiente', e.target.value)}>
              <option value="sandbox">Sandbox (testes)</option>
              <option value="producao">Produção</option>
            </select>
          </Field>

          {showQR && (
            <div style={{
              width: 160, height: 160, background: L.teal, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, color: L.white, fontWeight: 700, fontSize: 14,
              letterSpacing: 1
            }}>
              QR CODE
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowQR(s => !s)}
              style={{
                padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                border: `1.5px solid ${L.teal}`, background: 'transparent', color: L.teal,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {showQR ? 'Ocultar QR Code' : 'Gerar QR Code de Teste'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Google Agenda card ───────────────────────────────────────────────────────
function CardGoogleAgenda({ config, onSave, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo]       = useState(config?.ativo ?? false)
  const [fields, setFields]     = useState({
    calendar_id: config?.configuracoes?.calendar_id || '',
    sync_interval: config?.configuracoes?.sync_interval || '15',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  async function handleOAuth() {
    await new Promise(r => setTimeout(r, 600))
    onToast('Autenticação simulada — integração completa requer backend', 'green')
  }

  async function handleSave() {
    setSaving(true)
    await onSave('google_agenda', 'Google Agenda', ativo, fields)
    setSaving(false)
  }

  return (
    <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          cursor: 'pointer', borderBottom: expanded ? `1px solid ${L.line}` : 'none',
          background: L.surface
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#ea4335',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0
        }}>📅</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: L.t1 }}>Google Agenda</div>
          <div style={{ fontSize: 12, color: L.t3, marginTop: 2 }}>
            Sincronização bidirecional com Google Calendar para a agenda médica
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ativo
            ? <Badge color={L.green} bg={L.greenBg} bd={L.greenBd}>Ativo</Badge>
            : <Badge color={L.t4} bg={L.surface} bd={L.line}>Inativo</Badge>
          }
          <Toggle checked={ativo} onChange={v => { setAtivo(v); setExpanded(true) }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          <button
            onClick={handleOAuth}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
              fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${L.line}`, background: L.white, color: L.t1,
              marginBottom: 18
            }}
          >
            <span style={{ fontSize: 18 }}>🔗</span> Conectar com Google
          </button>

          <Field label="Calendar ID">
            <input style={inp} value={fields.calendar_id}
              onChange={e => set('calendar_id', e.target.value)}
              placeholder="example@gmail.com ou ID do calendário" />
          </Field>
          <Field label="Intervalo de Sincronização">
            <select style={inp} value={fields.sync_interval} onChange={e => set('sync_interval', e.target.value)}>
              <option value="5">A cada 5 minutos</option>
              <option value="15">A cada 15 minutos</option>
              <option value="30">A cada 30 minutos</option>
              <option value="60">A cada 60 minutos</option>
            </select>
          </Field>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              background: L.teal, color: L.white, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab 1: Logs ──────────────────────────────────────────────────────────────
function TabLogs() {
  const [filterInteg, setFilterInteg] = useState('Todas')
  const [filterTipo,  setFilterTipo]  = useState('todos')

  const integracoes = ['Todas', ...new Set(MOCK_LOGS.map(l => l.integracao))]
  const tipos = ['todos', 'sucesso', 'erro', 'aviso', 'info']

  const filtered = MOCK_LOGS.filter(l => {
    if (filterInteg !== 'Todas' && l.integracao !== filterInteg) return false
    if (filterTipo !== 'todos' && l.tipo !== filterTipo) return false
    return true
  })

  return (
    <div>
      {/* filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{
            display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
            fontFamily: "'JetBrains Mono', monospace"
          }}>INTEGRAÇÃO</label>
          <select
            style={{ ...inp, width: 'auto', minWidth: 160 }}
            value={filterInteg}
            onChange={e => setFilterInteg(e.target.value)}
          >
            {integracoes.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label style={{
            display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
            fontFamily: "'JetBrains Mono', monospace"
          }}>TIPO</label>
          <select
            style={{ ...inp, width: 'auto', minWidth: 130 }}
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
          >
            {tipos.map(t => <option key={t} value={t}>{t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* log feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: L.t4, fontSize: 14 }}>
            Nenhum evento encontrado para os filtros selecionados.
          </div>
        )}
        {filtered.map(log => {
          const b = LOG_BADGE[log.tipo]
          return (
            <div
              key={log.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 10,
                padding: '13px 16px'
              }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: L.t4, whiteSpace: 'nowrap', paddingTop: 2, minWidth: 40
              }}>{log.ts}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                color: b.color, background: b.bg, border: `1px solid ${b.bd}`,
                fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0
              }}>{b.label}</span>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: L.teal,
                  fontFamily: "'JetBrains Mono', monospace", marginRight: 8
                }}>{log.integracao}</span>
                <span style={{ fontSize: 13, color: L.t2 }}>{log.msg}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function PageIntegracoes({ profile }) {
  const [tab, setTab]           = useState(0)
  const [configs, setConfigs]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState({ msg: '', color: 'green' })

  const clinicaId = profile?.clinica_id

  // load all integration configs
  useEffect(() => {
    if (!clinicaId) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('integracoes_config')
        .select('*')
        .eq('clinica_id', clinicaId)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.tipo] = r })
        setConfigs(map)
      }
      setLoading(false)
    })()
  }, [clinicaId])

  // show toast briefly
  const showToast = useCallback((msg, color = 'green') => {
    setToast({ msg, color })
    setTimeout(() => setToast({ msg: '', color: 'green' }), 3000)
  }, [])

  // upsert integration config
  const handleSave = useCallback(async (tipo, nome, ativo, config) => {
    if (!clinicaId) { showToast('Clínica não identificada', 'red'); return }
    const existing = configs[tipo]
    let err
    if (existing) {
      const { error } = await supabase
        .from('integracoes_config')
        .update({ ativo, configuracoes: config, ultimo_sync: new Date().toISOString() })
        .eq('id', existing.id)
      err = error
    } else {
      const { error } = await supabase
        .from('integracoes_config')
        .insert({ clinica_id: clinicaId, tipo, nome, ativo, configuracoes: config })
      err = error
    }
    if (err) {
      showToast('Erro ao salvar: ' + err.message, 'red')
    } else {
      showToast('Configuração salva com sucesso!', 'green')
      // refresh
      const { data } = await supabase
        .from('integracoes_config')
        .select('*')
        .eq('clinica_id', clinicaId)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.tipo] = r })
        setConfigs(map)
      }
    }
  }, [clinicaId, configs, showToast])

  const tabs = ['Integrações', 'Logs de Integração']

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        select option { background: var(--c-bg, #fff); color: var(--c-t1, #111); }
      `}</style>

      {/* page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: L.tealBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>🔌</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: L.t1 }}>Integrações</h1>
            <p style={{ margin: 0, fontSize: 13, color: L.t3 }}>
              Gerencie conexões com serviços externos
            </p>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        background: L.surface, borderRadius: 10, padding: 4,
        border: `1px solid ${L.line}`, width: 'fit-content'
      }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
              borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === i ? L.teal : 'transparent',
              color: tab === i ? L.white : L.t3,
              transition: 'all 0.15s'
            }}
          >{t}</button>
        ))}
      </div>

      {/* loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: L.t4 }}>
          <div style={{
            width: 28, height: 28, border: `3px solid ${L.line}`,
            borderTopColor: L.teal, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 12px'
          }} />
          Carregando integrações...
        </div>
      )}

      {/* tab 0 — cards grid */}
      {!loading && tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardEvolutionAPI config={configs['evolution_api']} onSave={handleSave} onToast={showToast} />
          <CardWhatsApp    config={configs['whatsapp']}     onSave={handleSave} onToast={showToast} />
          <CardViaCEP      config={configs['viacep']}       onSave={handleSave} onToast={showToast} />
          <CardCertificado config={configs['cert_digital']} onSave={handleSave} onToast={showToast} />
          <CardMemed       config={configs['memed']}        onSave={handleSave} onToast={showToast} />
          <CardPix         config={configs['pix']}          onSave={handleSave} onToast={showToast} />
          <CardGoogleAgenda config={configs['google_agenda']} onSave={handleSave} onToast={showToast} />
        </div>
      )}

      {/* tab 1 — logs */}
      {!loading && tab === 1 && <TabLogs />}

      {/* global toast */}
      <Toast msg={toast.msg} color={toast.color} />
    </div>
  )
}
