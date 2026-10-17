import { IG_GRAPH_BASE, publishInstagramReel } from '@/lib/instagram'
import type { IgPostMedia, IgScheduledPost } from '@/lib/instagramPosts'

async function igJson(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `Instagram API respondeu ${res.status}`)
  }
  return data
}

interface Auth {
  igUserId: string
  accessToken: string
}

async function createContainer(auth: Auth, fields: Record<string, string>): Promise<string> {
  const data = await igJson(
    await fetch(`${IG_GRAPH_BASE}/${auth.igUserId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: new URLSearchParams(fields)
    })
  )
  return data.id as string
}

// Espera o Instagram terminar de processar o container (status_code FINISHED).
async function waitContainer(auth: Auth, containerId: string, maxAttempts: number) {
  const headers = { Authorization: `Bearer ${auth.accessToken}` }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await igJson(
      await fetch(`${IG_GRAPH_BASE}/${containerId}?fields=status_code,status`, { headers })
    )
    if (status.status_code === 'FINISHED') return
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(`Instagram não processou a mídia (${status.status_code}): ${status.status ?? ''}`)
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('Tempo esgotado esperando o Instagram processar a mídia.')
}

async function publishContainer(auth: Auth, containerId: string): Promise<string> {
  const data = await igJson(
    await fetch(`${IG_GRAPH_BASE}/${auth.igUserId}/media_publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: new URLSearchParams({ creation_id: containerId })
    })
  )
  return data.id as string
}

function mediaFields(m: IgPostMedia): Record<string, string> {
  return m.kind === 'video' ? { media_type: 'VIDEO', video_url: m.url } : { image_url: m.url }
}

async function fetchPermalink(auth: Auth, mediaId: string): Promise<string | null> {
  try {
    const data = await igJson(
      await fetch(`${IG_GRAPH_BASE}/${mediaId}?fields=permalink`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` }
      })
    )
    return typeof data.permalink === 'string' ? data.permalink : null
  } catch {
    return null
  }
}

// Publica uma publicação agendada (qualquer tipo) e devolve o id e o link.
export async function publishScheduledPost(
  post: Pick<IgScheduledPost, 'post_type' | 'media' | 'caption' | 'cover_url' | 'share_to_feed'>,
  auth: Auth
): Promise<{ mediaId: string; permalink: string | null }> {
  const caption = post.caption || undefined
  const videoWait = 60
  const imageWait = 20
  let mediaId: string

  if (post.post_type === 'reel') {
    const result = await publishInstagramReel({
      igUserId: auth.igUserId,
      accessToken: auth.accessToken,
      videoUrl: post.media[0].url,
      caption,
      coverUrl: post.cover_url,
      shareToFeed: post.share_to_feed
    })
    mediaId = result.mediaId
  } else if (post.post_type === 'image') {
    const id = await createContainer(auth, { ...mediaFields(post.media[0]), ...(caption && { caption }) })
    await waitContainer(auth, id, imageWait)
    mediaId = await publishContainer(auth, id)
  } else if (post.post_type === 'story') {
    const m = post.media[0]
    const fields: Record<string, string> =
      m.kind === 'video' ? { media_type: 'STORIES', video_url: m.url } : { media_type: 'STORIES', image_url: m.url }
    const id = await createContainer(auth, fields)
    await waitContainer(auth, id, m.kind === 'video' ? videoWait : imageWait)
    mediaId = await publishContainer(auth, id)
  } else {
    // Carrossel: um container por item, depois o container pai.
    const children: string[] = []
    for (const m of post.media) {
      const childId = await createContainer(auth, { ...mediaFields(m), is_carousel_item: 'true' })
      await waitContainer(auth, childId, m.kind === 'video' ? videoWait : imageWait)
      children.push(childId)
    }
    const parentId = await createContainer(auth, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      ...(caption && { caption })
    })
    await waitContainer(auth, parentId, imageWait)
    mediaId = await publishContainer(auth, parentId)
  }

  return { mediaId, permalink: await fetchPermalink(auth, mediaId) }
}
