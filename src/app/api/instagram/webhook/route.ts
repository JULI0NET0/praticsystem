import crypto from 'crypto'
import {
  getSupabaseAdmin,
  getIgConfig,
  logIgEvent,
  replyToComment,
  findMatchingAutomation,
  type IgAutomation
} from '@/lib/instagram'

interface IgCommentValue {
  id?: string
  text?: string
  from?: { id?: string; username?: string }
  media?: { id?: string }
}

interface IgMessagingEvent {
  sender?: { id?: string }
}

interface IgWebhookEntry {
  changes?: Array<{ field: string; value: IgCommentValue }>
  messaging?: IgMessagingEvent[]
}

interface IgWebhookBody {
  object?: string
  entry?: IgWebhookEntry[]
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Verificação inicial exigida pela Meta ao cadastrar o webhook.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && challenge && token === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// Eventos reais de comentário/mensagem enviados pela Meta.
export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    await logIgEvent('error', 'webhook_invalid_signature')
    return new Response('Invalid signature', { status: 403 })
  }

  let body: IgWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    await processEntries(body)
  } catch (err) {
    await logIgEvent('error', 'webhook_processing_error', { error: errorMessage(err) })
  }

  // A Meta exige resposta 200 rápida, independente do resultado do processamento.
  return new Response('EVENT_RECEIVED', { status: 200 })
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.IG_APP_SECRET
  if (!appSecret || !signatureHeader) return false

  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

async function processEntries(body: IgWebhookBody) {
  if (body.object !== 'instagram' || !Array.isArray(body.entry)) return

  const supabase = getSupabaseAdmin()

  for (const entry of body.entry) {
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          await handleComment(supabase, change.value)
        }
      }
    }

    if (Array.isArray(entry.messaging)) {
      for (const messagingEvent of entry.messaging) {
        await handleIncomingMessage(supabase, messagingEvent)
      }
    }
  }
}

async function handleComment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  value: IgCommentValue
) {
  const commentId = value.id
  const commentText = value.text || ''
  const fromId = value.from?.id
  const fromUsername = value.from?.username
  const mediaId = value.media?.id

  if (!commentId || !fromId || !commentText) return

  const { data: automations } = await supabase
    .from('ig_automations')
    .select('*')
    .eq('is_active', true)

  const automation = findMatchingAutomation(
    (automations || []) as IgAutomation[],
    commentText,
    mediaId
  )

  if (!automation) return

  await supabase.from('ig_contacts').upsert(
    {
      igsid: fromId,
      username: fromUsername ?? null,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: 'igsid' }
  )

  const dedupeKey = `${commentId}:${automation.id}`
  const { error: queueError } = await supabase.from('ig_message_queue').insert({
    automation_id: automation.id,
    igsid: fromId,
    comment_id: commentId,
    message_text: automation.dm_message_text,
    button_text: automation.dm_button_text,
    button_url: automation.dm_button_url,
    dedupe_key: dedupeKey
  })

  // 23505 = unique_violation (Meta reenviou o mesmo evento) — ignora silenciosamente
  if (queueError && queueError.code !== '23505') {
    await logIgEvent('error', 'queue_insert_failed', { error: queueError.message, dedupeKey })
  }

  if (automation.comment_reply_text) {
    const config = await getIgConfig(supabase)
    if (config) {
      try {
        await replyToComment(commentId, config.access_token, automation.comment_reply_text)
      } catch (err) {
        await logIgEvent('error', 'comment_reply_failed', {
          error: errorMessage(err),
          commentId
        })
      }
    }
  }

  await logIgEvent('info', 'comment_matched', {
    automationId: automation.id,
    commentId,
    fromId
  })
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  messagingEvent: IgMessagingEvent
) {
  const senderId = messagingEvent.sender?.id
  if (!senderId) return

  await supabase.from('ig_contacts').upsert(
    {
      igsid: senderId,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: 'igsid' }
  )
}
