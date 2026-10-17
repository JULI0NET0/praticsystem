import { describe, expect, it } from 'vitest'
import { filterMaterials, formatFileSize, materialAction, splitFeatured } from './instagramMaterials'

const m = (title: string, created_at: string, type: 'text' | 'file' | 'link' = 'text', description: string | null = null) => ({
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  created_at,
  material_type: type,
  description
})

describe('splitFeatured', () => {
  it('põe o mais recente em destaque e ordena o resto do mais novo ao mais antigo', () => {
    const { featured, others } = splitFeatured([
      m('Antigo', '2026-08-01T10:00:00Z'),
      m('Novo', '2026-10-15T10:00:00Z'),
      m('Meio', '2026-09-10T10:00:00Z')
    ])
    expect(featured?.title).toBe('Novo')
    expect(others.map((x) => x.title)).toEqual(['Meio', 'Antigo'])
  })

  it('lida com lista vazia e com um único material', () => {
    expect(splitFeatured([])).toEqual({ featured: null, others: [] })
    expect(splitFeatured([m('Só', '2026-10-01T00:00:00Z')]).others).toEqual([])
  })
})

describe('filterMaterials', () => {
  const list = [
    m('Roteiro de vídeo', '2026-10-01T00:00:00Z', 'text', 'Passo a passo para reels'),
    m('Planilha de metas', '2026-10-02T00:00:00Z', 'file'),
    m('Curso Edição no Automático', '2026-10-03T00:00:00Z', 'link')
  ]

  it('filtra por tipo', () => {
    expect(filterMaterials(list, { type: 'file', query: '' }).map((x) => x.title)).toEqual(['Planilha de metas'])
    expect(filterMaterials(list, { type: 'all', query: '' })).toHaveLength(3)
  })

  it('busca ignorando acento e caixa, no título e na descrição', () => {
    expect(filterMaterials(list, { type: 'all', query: 'edicao' }).map((x) => x.title)).toEqual(['Curso Edição no Automático'])
    expect(filterMaterials(list, { type: 'all', query: 'REELS' }).map((x) => x.title)).toEqual(['Roteiro de vídeo'])
    expect(filterMaterials(list, { type: 'link', query: 'planilha' })).toEqual([])
  })
})

describe('formatFileSize / materialAction', () => {
  it('formata tamanhos', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(20 * 1024)).toBe('20 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2,5 MB')
  })

  it('escolhe a ação certa por tipo', () => {
    expect(materialAction({ slug: 'a', material_type: 'text' })).toMatchObject({ label: 'Ver e copiar', href: '/materiais/a' })
    expect(materialAction({ slug: 'a', material_type: 'file' })).toMatchObject({ label: 'Baixar', href: '/api/materiais/a/download' })
    expect(materialAction({ slug: 'a', material_type: 'link' })).toMatchObject({ label: 'Acessar', external: true })
  })
})
