import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRAPH = 'https://graph.facebook.com/v21.0'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return d
  return `55${d}`
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

  // ── test: verify credentials with Meta without sending ────────────────────
  if (action === 'test') {
    const { phone_number_id, access_token } = body
    if (!phone_number_id || !access_token)
      return json({ error: 'phone_number_id e access_token são obrigatórios' }, 400)

    const resp = await fetch(
      `${GRAPH}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    )
    const result = await resp.json()

    if (!resp.ok || result.error)
      return json({ error: result.error?.message ?? 'Credenciais inválidas' }, 400)

    return json({
      success: true,
      display_phone: result.display_phone_number,
      verified_name: result.verified_name,
      quality_rating: result.quality_rating ?? 'GREEN',
    })
  }

  // ── send: send a text message ─────────────────────────────────────────────
  if (action === 'send') {
    const { data: profile } = await admin
      .from('usuarios')
      .select('clinica_id')
      .eq('id', user.id)
      .single()

    if (!profile?.clinica_id) return json({ error: 'Perfil não encontrado' }, 400)

    const { data: waConfig } = await admin
      .from('integracoes_config')
      .select('config, ativo')
      .eq('clinica_id', profile.clinica_id)
      .eq('tipo', 'whatsapp')
      .single()

    if (!waConfig?.ativo)
      return json({ error: 'WhatsApp Business API não está ativo' }, 400)

    const { phone_number_id, access_token } = (waConfig.config ?? {}) as Record<string, string>
    if (!phone_number_id || !access_token)
      return json({ error: 'Credenciais WABA não configuradas' }, 400)

    const { phone, message, mensagem_id } = body
    if (!phone || !message)
      return json({ error: 'phone e message são obrigatórios' }, 400)

    const resp = await fetch(`${GRAPH}/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhone(phone),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    })

    const result = await resp.json()

    if (!resp.ok || result.error) {
      if (mensagem_id)
        await admin.from('mensagens_pacientes').update({ status: 'falhou' }).eq('id', mensagem_id)
      return json({ error: result.error?.message ?? 'Falha ao enviar' }, 400)
    }

    const wamid: string = result.messages?.[0]?.id ?? ''
    if (mensagem_id)
      await admin.from('mensagens_pacientes')
        .update({ status: 'enviado', wamid, enviado_api: true })
        .eq('id', mensagem_id)

    return json({ success: true, wamid })
  }

  return json({ error: 'Ação inválida. Use action=test ou action=send' }, 400)
})
