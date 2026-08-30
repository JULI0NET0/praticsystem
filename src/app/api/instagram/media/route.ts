import { NextResponse } from 'next/server'
import {
  IG_GRAPH_BASE,
  getIgConfig,
  getSupabaseAdmin,
  requireIgSession
} from '@/lib/instagram'

export interface InstagramMediaItem {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_product_type?: 'REELS' | 'FEED' | 'STORY'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  views?: number | null
}

export interface InstagramProfile {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
}

export async function GET(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const config = await getIgConfig(supabase)

  if (!config || !config.access_token) {
    return NextResponse.json(
      { error: 'Instagram não conectado ou token ausente.' },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limitParam = parseInt(searchParams.get('limit') || '12', 10)
  const limit = Math.min(Math.max(limitParam, 1), 30) // Seguro entre 1 e 30

  try {
    // 1. Busca dados do perfil
    const meUrl = new URL(`${IG_GRAPH_BASE}/me`)
    meUrl.searchParams.set('fields', 'id,username,name,profile_picture_url')
    meUrl.searchParams.set('access_token', config.access_token)

    const mePromise = fetch(meUrl.toString())
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)

    // 2. Busca lista de mídias/posts
    const mediaUrl = new URL(`${IG_GRAPH_BASE}/me/media`)
    mediaUrl.searchParams.set(
      'fields',
      'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
    )
    mediaUrl.searchParams.set('limit', limit.toString())
    mediaUrl.searchParams.set('access_token', config.access_token)

    const mediaRes = await fetch(mediaUrl.toString())
    const mediaData = await mediaRes.json().catch(() => ({}))

    if (!mediaRes.ok || !mediaData?.data) {
      throw new Error(
        mediaData?.error?.message || 'Falha ao carregar publicações do Instagram'
      )
    }

    const rawMediaList: InstagramMediaItem[] = mediaData.data || []
    let hasInsightsPermission = true

    // 3. Busca métricas de insights (views) para cada mídia em paralelo
    const mediaWithInsights: InstagramMediaItem[] = await Promise.all(
      rawMediaList.map(async (item) => {
        try {
          const insightUrl = new URL(`${IG_GRAPH_BASE}/${item.id}/insights`)
          insightUrl.searchParams.set('metric', 'views')
          insightUrl.searchParams.set('access_token', config.access_token)

          const res = await fetch(insightUrl.toString())
          const insightJson = await res.json().catch(() => ({}))

          if (!res.ok || insightJson?.error) {
            if (insightJson?.error?.code === 10) {
              hasInsightsPermission = false
            }
            return {
              ...item,
              views: null
            }
          }

          // Extrai o valor de visualizações da resposta da Meta Graph API
          let viewsCount: number | null = null
          const viewsMetric = insightJson?.data?.find(
            (m: { name?: string }) => m.name === 'views'
          )

          if (viewsMetric) {
            if (typeof viewsMetric.total_value?.value === 'number') {
              viewsCount = viewsMetric.total_value.value
            } else if (Array.isArray(viewsMetric.values) && viewsMetric.values.length > 0) {
              viewsCount = viewsMetric.values[0]?.value ?? null
            } else if (typeof viewsMetric.value === 'number') {
              viewsCount = viewsMetric.value
            }
          }

          return {
            ...item,
            views: viewsCount
          }
        } catch {
          return {
            ...item,
            views: null
          }
        }
      })
    )

    const profileData = await mePromise

    return NextResponse.json({
      profile: profileData || {
        id: config.ig_user_id,
        username: config.ig_username || 'juli0net0',
        name: config.ig_username ? `@${config.ig_username}` : 'Instagram'
      },
      media: mediaWithInsights,
      hasInsightsPermission
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Erro ao buscar dados do Instagram',
        profile: {
          id: config.ig_user_id,
          username: config.ig_username || 'juli0net0'
        },
        media: []
      },
      { status: 500 }
    )
  }
}
