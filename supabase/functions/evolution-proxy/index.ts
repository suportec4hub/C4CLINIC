import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return d
  return `55${d}`
}

// Resolve QR code from different Evolution API response formats (v1/v2)
function extractQR(resp: Record<string, unknown>): string | null {
  if (typeof resp.base64 === 'string') return resp.base64
  const qr = resp.qrcode as Record<string, unknown> | undefined
  if (qr && typeof qr.base64 === 'string') return qr.base64
  const code = resp.code as Record<string, unknown> | undefined
  if (code && typeof code.base64 === 'string') return code.base64
  return null
}

function extractState(resp: Record<string, unknown>): string {
  const inst = resp.instance as Record<string, unknown> | undefined
  if (inst?.state) return String(inst.state)
  if (resp.state) return String(resp.state)
  return 'close'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: { user }, error: authErr } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action } = body

  // Credentials: passed in body (configure mode) OR read from DB (send mode)
  let server_url = body.server_url    || ''
  let api_key    = body.api_key       || ''
  let instance   = body.instance_name || ''

  if (action === 'send') {
    const { data: profile } = await admin.from('usuarios').select('clinica_id').eq('id', user.id).single()
    if (!profile?.clinica_id) return json({ error: 'Perfil não encontrado' }, 400)

    const { data: cfg } = await admin
      .from('integracoes_config')
      .select('config, ativo')
      .eq('clinica_id', profile.clinica_id)
      .eq('tipo', 'evolution_api')
      .single()

    if (!cfg?.ativo) return json({ error: 'Evolution API não está ativa' }, 400)
    server_url = cfg.config?.server_url    || ''
    api_key    = cfg.config?.api_key       || ''
    instance   = cfg.config?.instance_name || ''
  }

  if (!server_url || !api_key || !instance)
    return json({ error: 'server_url, api_key e instance_name são obrigatórios' }, 400)

  const base    = server_url.replace(/\/$/, '')
  const headers = { apikey: api_key, 'Content-Type': 'application/json' }

  // ── create_instance ────────────────────────────────────────────────────────
  if (action === 'create_instance') {
    const r = await fetch(`${base}/instance/create`, {
      method: 'POST', headers,
      body: JSON.stringify({ instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    })
    const data = await r.json()
    if (!r.ok && r.status !== 409)
      return json({ error: data?.message ?? 'Falha ao criar instância' }, 400)
    return json({ success: true, created: r.status !== 409 })
  }

  // ── connect — get QR code or open status ──────────────────────────────────
  if (action === 'connect') {
    const r = await fetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, { headers })
    const data = await r.json()
    if (!r.ok) return json({ error: data?.message ?? 'Falha ao conectar' }, 400)
    const qr = extractQR(data)
    if (qr) return json({ qr })
    return json({ state: extractState(data) })
  }

  // ── status ─────────────────────────────────────────────────────────────────
  if (action === 'status') {
    const r = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instance)}`, { headers })
    const data = await r.json()
    if (!r.ok) return json({ state: 'close' })
    return json({ state: extractState(data) })
  }

  // ── send text message ──────────────────────────────────────────────────────
  if (action === 'send') {
    const { phone, message, mensagem_id } = body
    if (!phone || !message) return json({ error: 'phone e message são obrigatórios' }, 400)

    const to = normalizePhone(phone)
    const r = await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`, {
      method: 'POST', headers,
      body: JSON.stringify({ number: to, text: message, delay: 800 }),
    })
    const data = await r.json()

    if (!r.ok) {
      if (mensagem_id)
        await admin.from('mensagens_pacientes').update({ status: 'falhou' }).eq('id', mensagem_id)
      return json({ error: data?.message ?? 'Falha ao enviar mensagem' }, 400)
    }

    const msgId: string = data?.key?.id ?? data?.messageId ?? ''
    if (mensagem_id)
      await admin.from('mensagens_pacientes')
        .update({ status: 'enviado', wamid: msgId, enviado_api: true })
        .eq('id', mensagem_id)

    return json({ success: true, messageId: msgId })
  }

  // ── disconnect ─────────────────────────────────────────────────────────────
  if (action === 'disconnect') {
    await fetch(`${base}/instance/logout/${encodeURIComponent(instance)}`, { method: 'DELETE', headers })
    return json({ success: true })
  }

  return json({ error: 'Ação inválida' }, 400)
})
