import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STATUS_MAP: Record<string, string> = {
  sent:      'enviado',
  delivered: 'entregue',
  read:      'lido',
  failed:    'falhou',
}

Deno.serve(async (req: Request) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // GET — Meta webhook verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode !== 'subscribe' || !challenge)
      return new Response('Bad Request', { status: 400 })

    const { data: configs } = await admin
      .from('integracoes_config')
      .select('config')
      .eq('tipo', 'whatsapp')
      .eq('ativo', true)

    const valid = (configs ?? []).some(
      (c: { config: Record<string, string> }) => c.config?.webhook_verify_token === token,
    )

    if (!valid) return new Response('Forbidden', { status: 403 })
    return new Response(challenge, { status: 200 })
  }

  // POST — Meta sends events (delivery status, incoming messages)
  if (req.method === 'POST') {
    let payload: Record<string, unknown>
    try { payload = await req.json() } catch { return new Response('OK') }

    try {
      for (const entry of (payload.entry as Array<unknown>) ?? []) {
        const e = entry as Record<string, unknown>
        for (const change of (e.changes as Array<unknown>) ?? []) {
          const value = (change as Record<string, unknown>).value as Record<string, unknown>
          if (!value) continue

          // Status updates (delivery receipts)
          for (const status of (value.statuses as Array<Record<string, string>>) ?? []) {
            const mapped = STATUS_MAP[status.status] ?? status.status
            if (status.id) {
              await admin.from('mensagens_pacientes')
                .update({ status: mapped })
                .eq('wamid', status.id)
            }
          }

          // Incoming messages — log for future use
          for (const msg of (value.messages as Array<Record<string, unknown>>) ?? []) {
            console.log('[whatsapp-webhook] incoming:', JSON.stringify(msg))
          }
        }
      }
    } catch (err) {
      console.error('[whatsapp-webhook] error:', err)
    }

    // Meta always expects 200 OK
    return new Response('OK', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})
