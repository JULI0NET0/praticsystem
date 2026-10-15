import type { SupabaseClient } from '@supabase/supabase-js'
import { logIgEvent, sendInstagramMessage, type IgConfig } from '@/lib/instagram'
import { firstNameOf, renderMessageVars } from '@/lib/instagramVars'
import { recordIgMessage } from '@/lib/instagramInbox'

export interface IgSettings {
  welcome_enabled: boolean
  welcome_text: string | null
  welcome_button_text: string | null
  welcome_button_url: string | null
}

export async function getIgSettings(supabase: SupabaseClient): Promise<IgSettings | null> {
  const { data, error } = await supabase.from('ig_settings').select('*').eq('id', 1).maybeSingle()
  if (error) return null
  return data
}

// Boas-vindas vão só para quem aparece pela primeira vez mandando DM.
// Comentário que acionou automação já recebeu a DM dela; contatos antigos não recebem.
export function shouldWelcome(settings: IgSettings | null, contact: { isNew: boolean }): boolean {
  return !!settings?.welcome_enabled && !!settings.welcome_text?.trim() && contact.isNew
}

export async function sendWelcome(
  supabase: SupabaseClient,
  config: IgConfig,
  settings: IgSettings,
  igsid: string
): Promise<void> {
  // "Reserva" o envio antes de mandar: duas DMs seguidas não geram duas boas-vindas.
  const { data: claimed } = await supabase
    .from('ig_contacts')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('igsid', igsid)
    .is('welcomed_at', null)
    .select('username, name')
    .maybeSingle()
  if (!claimed) return

  const text = renderMessageVars(settings.welcome_text || '', {
    first_name: firstNameOf(claimed.name),
    username: claimed.username
  })
  const buttonText = settings.welcome_button_text?.trim() || null
  const buttonUrl = settings.welcome_button_url?.trim() || null

  try {
    const sent = await sendInstagramMessage({
      igUserId: config.ig_user_id,
      accessToken: config.access_token,
      recipient: { id: igsid },
      text,
      buttonText: buttonText && buttonUrl ? buttonText : null,
      ctaType: 'link',
      buttonUrl
    })
    await recordIgMessage(
      supabase,
      { mid: sent?.message_id ?? null, igsid, direction: 'out', text, source: 'automation' },
      { overwrite: true }
    )
    await logIgEvent('info', 'welcome_sent', { igsid })
  } catch (err) {
    // Libera para tentar de novo na próxima mensagem.
    await supabase.from('ig_contacts').update({ welcomed_at: null }).eq('igsid', igsid)
    await logIgEvent('error', 'welcome_send_failed', { igsid, error: err instanceof Error ? err.message : String(err) })
  }
}
