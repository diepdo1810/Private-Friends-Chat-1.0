// Supabase Edge Function: Database Webhook on public.messages INSERT.
// Deploy with verify_jwt=false; authorize calls with custom x-push-webhook-secret.
// Never expose FCM private key / SUPABASE_SERVICE_ROLE_KEY in Vue or GitHub.
import { createClient } from 'npm:@supabase/supabase-js@2'

interface MessageRecord { id: string; room_id: string; user_id: string }
interface Webhook { type: string; table: string; schema: string; record: MessageRecord }

const encoder = new TextEncoder()

function constantTimeEqual(a: string, b: string): boolean {
  const aa = encoder.encode(a), bb = encoder.encode(b)
  let delta = aa.length ^ bb.length
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) delta |= (aa[i] ?? 0) ^ (bb[i] ?? 0)
  return delta === 0
}

function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function googleAccessToken(email: string, privateKeyPem: string): Promise<string> {
  const pem = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const binary = atob(pem)
  const der = Uint8Array.from(binary, c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))
  const body = header + '.' + claims
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(body))
  const assertion = body + '.' + base64url(new Uint8Array(signature))
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!response.ok) throw new Error('Google OAuth access token failed: ' + response.status)
  const tokenResponse = await response.json()
  if (!tokenResponse.access_token) throw new Error('Google OAuth token missing')
  return tokenResponse.access_token as string
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  if (!secret || !constantTimeEqual(request.headers.get('x-push-webhook-secret') || '', secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let webhook: Webhook
  try { webhook = await request.json() } catch { return new Response('Bad JSON', { status: 400 }) }
  if (webhook.type !== 'INSERT' || webhook.table !== 'messages' || webhook.schema !== 'public' ||
    !webhook.record?.id || !webhook.record?.room_id || !webhook.record?.user_id) {
    return new Response('Invalid event', { status: 400 })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const rawServiceAccount = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  if (!url || !serviceKey || !rawServiceAccount) return new Response('Server not configured', { status: 503 })
  const account = JSON.parse(rawServiceAccount)
  if (!account.private_key || !account.client_email || account.project_id !== 'private-friends-chat-3e967') {
    return new Response('FCM configuration mismatch', { status: 503 })
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: stored, error: messageError } = await admin.from('messages')
    .select('id,room_id,user_id').eq('id', webhook.record.id).single()
  if (messageError || !stored || stored.room_id !== webhook.record.room_id || stored.user_id !== webhook.record.user_id) {
    return new Response('Message not found', { status: 404 })
  }
  const { data: recipients, error: memberError } = await admin.from('room_members')
    .select('user_id').eq('room_id', stored.room_id).neq('user_id', stored.user_id)
  if (memberError) return new Response('Recipient lookup failed', { status: 500 })
  const recipientsIds = (recipients ?? []).map(row => row.user_id)
  if (!recipientsIds.length) return Response.json({ sent: 0 })
  const { data: devices, error: devicesError } = await admin.from('push_devices')
    .select('id,user_id,fcm_token').in('user_id', recipientsIds).eq('enabled', true)
  if (devicesError) return new Response('Devices lookup failed', { status: 500 })
  if (!devices?.length) return Response.json({ sent: 0 })
  const accessToken = await googleAccessToken(account.client_email, account.private_key)
  let sent = 0, failed = 0
  for (const device of devices) {
    const { error: claimError } = await admin.from('push_delivery_log')
      .insert({ message_id: stored.id, device_id: device.id })
    if (claimError?.code === '23505') continue // idempotent retry
    if (claimError) { failed++; continue }

    let delivered = false
    try {
      const response = await fetch('https://fcm.googleapis.com/v1/projects/' +
        encodeURIComponent(account.project_id) + '/messages:send', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          token: device.fcm_token,
          notification: { title: 'Private Friends', body: 'Có tin nhắn mới' },
          data: { room_id: stored.room_id, message_id: stored.id },
          android: { priority: 'HIGH', notification: { channel_id: 'friends_messages' } },
        } }),
      })
      delivered = response.ok
      if (delivered) sent++
      else {
        failed++
        // Remove permanently invalid tokens without exposing their value.
        if (response.status === 404) await admin.from('push_devices').delete().eq('id', device.id)
      }
    } catch {
      failed++
    } finally {
      // Failed delivery may be retried. Successful delivery remains idempotently recorded.
      if (!delivered) await admin.from('push_delivery_log')
        .delete().eq('message_id', stored.id).eq('device_id', device.id)
    }
  }
  return Response.json({ sent, failed }, { status: failed ? 503 : 200 })
})
