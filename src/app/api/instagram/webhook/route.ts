import crypto from 'crypto'
import {
  getSupabaseAdmin,
  getIgConfig,
  logIgEvent,
  replyToComment,
  sendInstagramMessage,
  checkUserFollowsBusiness,
  findMatchingAutomation,
  pickRandomCommentReply,
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
  postback?: { payload?: string }
  message?: { quick_reply?: { payload?: string } }
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
    cta_type: automation.cta_type,
    dedupe_key: dedupeKey
  })

  // 23505 = unique_violation (Meta reenviou o mesmo evento) — ignora silenciosamente
  if (queueError && queueError.code !== '23505') {
    await logIgEvent('error', 'queue_insert_failed', { error: queueError.message, dedupeKey })
  }

  const replyText = pickRandomCommentReply(automation)
  if (replyText) {
    const config = await getIgConfig(supabase)
    if (config) {
      try {
        await replyToComment(commentId, config.access_token, replyText)
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

  // Botão fixo (postback) e sugestão de resposta (quick_reply) chegam em
  // formatos diferentes, mas carregam o mesmo payload — normaliza os dois
  // pra cair no mesmo tratamento.
  const tapPayload = messagingEvent.postback?.payload || messagingEvent.message?.quick_reply?.payload
  if (tapPayload) {
    await handleButtonTap(supabase, senderId, tapPayload)
  }
}

async function handleButtonTap(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  senderId: string,
  payload: string
) {
  const isGateTap = payload.startsWith('gate:')
  let baseQueueId: string | null = null
  let automationId: string | null = null

  if (isGateTap) {
    // Formato: "gate:<baseQueueId>:<automationId>"
    const parts = payload.split(':')
    baseQueueId = parts[1] || null
    automationId = parts[2] || null
  } else {
    // Formato normal: queueId direto
    baseQueueId = payload
  }

  let automation: IgAutomation | null = null
  let originalItem: { id: string; automation_id: string | null; button_url: string | null } | null = null

  if (baseQueueId) {
    const { data } = await supabase
      .from('ig_message_queue')
      .select('id, automation_id, button_url')
      .eq('id', baseQueueId)
      .maybeSingle()
    originalItem = data
    if (!automationId && originalItem?.automation_id) {
      automationId = originalItem.automation_id
    }
  }

  if (automationId) {
    const { data } = await supabase
      .from('ig_automations')
      .select('*')
      .eq('id', automationId)
      .maybeSingle()
    automation = data as IgAutomation | null
  }

  if (!automation && !originalItem) return

  const config = await getIgConfig(supabase)

  // Verifica se a automação exige follow
  const requireFollow = !!automation?.require_follow

  if (requireFollow && config) {
    // Consulta a Graph API para checar se o lead segue a conta
    const isFollowing = await checkUserFollowsBusiness(senderId, config.access_token)

    if (!isFollowing) {
      // O lead NÃO segue: envia a mensagem do gate com o botão de confirmação
      const gateText =
        automation?.follow_gate_message ||
        'Para liberar o seu material, você precisa seguir o perfil! Siga @' +
          (config.ig_username || '') +
          ' e depois toque no botão abaixo:'
      const gateButtonText = automation?.follow_gate_button_text || 'Pronto, agora te sigo'
      const gateCtaType = automation?.cta_type === 'quick_reply' ? 'quick_reply' : 'button'
      const gatePayload = `gate:${baseQueueId || 'unknown'}:${automation?.id || ''}`

      const dedupeKey = `gate-prompt:${senderId}:${Date.now()}`
      const { error: queueError, data: gateMsg } = await supabase
        .from('ig_message_queue')
        .insert({
          automation_id: automation?.id ?? null,
          igsid: senderId,
          message_text: gateText,
          button_text: gateButtonText,
          cta_type: gateCtaType,
          status: 'sending',
          dedupe_key: dedupeKey
        })
        .select()
        .single()

      if (!queueError && gateMsg) {
        try {
          await sendInstagramMessage({
            igUserId: config.ig_user_id,
            accessToken: config.access_token,
            recipient: { id: senderId },
            text: gateText,
            buttonText: gateButtonText,
            ctaType: gateCtaType,
            payload: gatePayload
          })
          await supabase
            .from('ig_message_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', gateMsg.id)
        } catch (err) {
          await supabase
            .from('ig_message_queue')
            .update({ status: 'failed', error: errorMessage(err).slice(0, 500) })
            .eq('id', gateMsg.id)
          await logIgEvent('error', 'gate_send_failed', { error: errorMessage(err), queueId: gateMsg.id })
        }
      }

      await logIgEvent('info', isGateTap ? 'follow_gate_retry_rejected' : 'follow_gate_prompted', {
        automationId: automation?.id,
        senderId,
        baseQueueId
      })
      return
    }
  }

  // Se chegou aqui: ou não exige follow, ou o lead JÁ segue (ou houve fallback por segurança) -> LIBERA O MATERIAL!
  const deliveryText = automation?.dm_button_url || originalItem?.button_url

  if (originalItem?.id || baseQueueId) {
    const { error: clickError } = await supabase.from('ig_link_clicks').insert({
      queue_id: originalItem?.id ?? baseQueueId,
      automation_id: automation?.id ?? originalItem?.automation_id ?? null,
      igsid: senderId
    })

    if (clickError) {
      await logIgEvent('error', 'click_tracking_failed', {
        error: clickError.message,
        queueId: originalItem?.id ?? baseQueueId
      })
    }
  }

  if (deliveryText) {
    const dedupeKey = `postback-followup:${baseQueueId || senderId}:${isGateTap ? 'gate-unlocked' : 'direct'}`
    const { error: queueError, data: followUp } = await supabase
      .from('ig_message_queue')
      .insert({
        automation_id: automation?.id ?? originalItem?.automation_id ?? null,
        igsid: senderId,
        message_text: deliveryText,
        status: 'sending',
        dedupe_key: dedupeKey
      })
      .select()
      .single()

    if (queueError) {
      // 23505 = unique_violation (toque duplicado do mesmo evento) — ignora silenciosamente
      if (queueError.code !== '23505') {
        await logIgEvent('error', 'queue_insert_failed', { error: queueError.message, baseQueueId })
      }
    } else if (followUp && config) {
      try {
        await sendInstagramMessage({
          igUserId: config.ig_user_id,
          accessToken: config.access_token,
          recipient: { id: senderId },
          text: followUp.message_text
        })
        await supabase
          .from('ig_message_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', followUp.id)
      } catch (err) {
        await supabase
          .from('ig_message_queue')
          .update({ status: 'failed', error: errorMessage(err).slice(0, 500) })
          .eq('id', followUp.id)
        await logIgEvent('error', 'followup_send_failed', {
          error: errorMessage(err),
          queueId: followUp.id
        })
      }
    }
  }

  await logIgEvent('info', isGateTap ? 'follow_gate_unlocked' : 'button_tapped', {
    payload,
    senderId,
    automationId: automation?.id
  })
}
